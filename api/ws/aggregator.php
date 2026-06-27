<?php
declare(strict_types=1);

@ini_set('output_buffering', '0');
@ini_set('implicit_flush', '1');
while (ob_get_level() > 0) @ob_end_flush();

/**
 * WS Aggregator — Server-side WebSocket daemon for real-time price feeds.
 *
 * Connects to:
 *   - Binance WebSocket (crypto) — free, no key needed
 *   - Twelve Data WebSocket (all other markets) — needs QUOTES_TWELVEDATA_KEY
 *
 * Uses pure-PHP RFC 6455 WebSocket client (no external dependencies).
 * Writes prices directly to the central cache (file + DB) so all
 * user-facing endpoints (SSE, quote_focus, markets) serve near-zero-latency data.
 *
 * Run as: php api/ws/aggregator.php
 * Or via Docker with env WS_AGGREGATOR_ENABLED=1
 */

require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/quote_central.php';
require_once __DIR__ . '/../lib/quotes.php';

// ── Config ──────────────────────────────────────────────────────────────────

$TWELVE_KEY    = trim((string)getenv('QUOTES_TWELVEDATA_KEY') ?? '');
$FINNHUB_KEY   = trim((string)getenv('FINNHUB_KEY') ?? '');
$BINANCE_SYMBOLS = [];
$TWELVE_SYMBOLS  = [];
$FINNHUB_SYMBOLS = []; // forex + stocks via Finnhub WS (free tier)
$TICK_INTERVAL   = 5;
$MAX_RUNTIME     = (int)getenv('WS_AGGREGATOR_MAX_RUNTIME') ?: 3600;
$RECONNECT_DELAY = 3;
$FEEDS_RAW       = strtolower(trim((string)(getenv('WS_AGGREGATOR_FEEDS') ?: ($TWELVE_KEY !== '' ? 'twelvedata' : 'binance'))));
$ENABLED_FEEDS   = array_values(array_filter(array_map('trim', explode(',', $FEEDS_RAW))));
$TWELVE_WS_LIMIT = max(1, min(500, (int)(getenv('TWELVEDATA_WS_SYMBOL_LIMIT') ?: 500)));

// ── Pure PHP WebSocket Client (RFC 6455) ────────────────────────────────────

class WsClient {
  private $fp = null;
  private string $host = '';
  private int $port = 443;
  private string $path = '/';
  private string $origin = '';
  private bool $secure = false;
  private string $buffer = '';
  private bool $connected = false;
  public string $lastError = '';

  public function connect(string $url): bool {
    $parsed = parse_url($url);
    $this->secure = ($parsed['scheme'] ?? '') === 'wss';
    $this->host = $parsed['host'] ?? '';
    $this->port = $parsed['port'] ?? ($this->secure ? 443 : 80);
    $this->path = ($parsed['path'] ?? '/') . (isset($parsed['query']) ? '?' . $parsed['query'] : '');
    $this->origin = ($this->secure ? 'https' : 'http') . '://' . $this->host;

    $socketHost = ($this->secure ? 'ssl://' : '') . $this->host;
    $ctx = stream_context_create([
      'ssl' => ['verify_peer' => false, 'verify_peer_name' => false, 'allow_self_signed' => true],
    ]);

    $this->fp = @stream_socket_client(
      "{$socketHost}:{$this->port}",
      $errno, $errstr, 10, STREAM_CLIENT_CONNECT, $ctx
    );

    if (!$this->fp) {
      $this->lastError = "connect: {$errstr} ({$errno})";
      echo "  [WS] Connect failed: {$errstr} ({$errno})\n";
      flush();
      return false;
    }

    stream_set_blocking($this->fp, true);

    // RFC 6455 handshake
    $key = base64_encode(random_bytes(16));
    $headers = [
      "GET {$this->path} HTTP/1.1",
      "Host: {$this->host}:{$this->port}",
      "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "Accept-Language: en-US,en;q=0.9",
      "Upgrade: websocket",
      "Connection: Upgrade",
      "Origin: {$this->origin}",
      "Sec-WebSocket-Key: {$key}",
      "Sec-WebSocket-Version: 13",
      "Sec-WebSocket-Extensions: permessage-deflate; client_max_window_bits",
      "Cache-Control: no-cache",
      "Pragma: no-cache",
      "",
      "",
    ];

    $handshake = implode("\r\n", $headers);
    fwrite($this->fp, $handshake);

    // Read server response
    $response = '';
    $deadline = time() + 5;
    while (time() < $deadline) {
      $chunk = fgets($this->fp, 4096);
      if ($chunk === false) break;
      $response .= $chunk;
      if (strpos($response, "\r\n\r\n") !== false) break;
    }

    if (strpos($response, '101') === false) {
      $this->lastError = 'handshake: ' . trim(substr($response, 0, 200));
      echo "  [WS] Handshake failed: " . substr($response, 0, 200) . "\n";
      flush();
      $this->disconnect();
      return false;
    }

    // Switch to non-blocking for data reads
    stream_set_blocking($this->fp, false);
    $this->connected = true;
    $this->buffer = '';
    return true;
  }

  public function send(string $payload): bool {
    if (!$this->connected || !$this->fp) return false;
    $frame = $this->encodeFrame($payload, 0x1); // text frame
    return @fwrite($this->fp, $frame) !== false;
  }

  public function receiveMessages(): array {
    if (!$this->connected || !$this->fp) return [];

    $data = @fread($this->fp, 262144);
    if ($data !== false && $data !== '') {
      $this->buffer .= $data;
    }

    // Check if connection closed
    if (feof($this->fp)) {
      $this->connected = false;
      return [];
    }

    $messages = [];
    while (strlen($this->buffer) >= 2) {
      $result = $this->decodeFrame();
      if ($result === null) break; // incomplete frame

      [$payload, $opcode, $frameLen] = $result;
      $this->buffer = substr($this->buffer, $frameLen);

      if ($opcode === 0x8) { // close
        $this->connected = false;
        break;
      }
      if ($opcode === 0x9) { // ping → send pong
        $this->sendFrame($payload, 0xA);
        continue;
      }
      if ($opcode === 0xA) { // pong
        continue;
      }
      if ($opcode === 0x1 || $opcode === 0x2) { // text or binary
        $messages[] = $payload;
      }
    }

    return $messages;
  }

  public function isConnected(): bool {
    return $this->connected && $this->fp && !feof($this->fp);
  }

  public function disconnect(): void {
    if ($this->fp) {
      try { $this->sendFrame('', 0x8); } catch (Throwable $e) {}
      @fclose($this->fp);
    }
    $this->fp = null;
    $this->connected = false;
    $this->buffer = '';
  }

  private function encodeFrame(string $payload, int $opcode): string {
    $mask = true;
    $frame = chr(0x80 | $opcode); // FIN + opcode

    $len = strlen($payload);
    if ($len < 126) {
      $frame .= chr(($mask ? 0x80 : 0) | $len);
    } elseif ($len < 65536) {
      $frame .= chr(($mask ? 0x80 : 0) | 126) . pack('n', $len);
    } else {
      $frame .= chr(($mask ? 0x80 : 0) | 127) . pack('J', $len);
    }

    if ($mask) {
      $maskKey = random_bytes(4);
      $frame .= $maskKey;
      $masked = '';
      for ($i = 0; $i < $len; $i++) {
        $masked .= chr(ord($payload[$i]) ^ ord($maskKey[$i % 4]));
      }
      $frame .= $masked;
    } else {
      $frame .= $payload;
    }

    return $frame;
  }

  private function sendFrame(string $payload, int $opcode): void {
    if (!$this->fp) return;
    @fwrite($this->fp, $this->encodeFrame($payload, $opcode));
  }

  private function decodeFrame(): ?array {
    $bufLen = strlen($this->buffer);
    if ($bufLen < 2) return null;

    $b0 = ord($this->buffer[0]);
    $b1 = ord($this->buffer[1]);

    $opcode = $b0 & 0x0F;
    $masked = ($b1 & 0x80) !== 0;
    $payloadLen = $b1 & 0x7F;

    $offset = 2;

    if ($payloadLen === 126) {
      if ($bufLen < 4) return null;
      $payloadLen = unpack('n', substr($this->buffer, 2, 2))[1];
      $offset = 4;
    } elseif ($payloadLen === 127) {
      if ($bufLen < 10) return null;
      $payloadLen = unpack('J', substr($this->buffer, 2, 8))[1];
      $offset = 10;
    }

    if ($masked) {
      if ($bufLen < $offset + 4) return null;
      $maskKey = substr($this->buffer, $offset, 4);
      $offset += 4;
    }

    if ($bufLen < $offset + $payloadLen) return null;

    $payload = substr($this->buffer, $offset, $payloadLen);

    if ($masked) {
      $unmasked = '';
      for ($i = 0; $i < $payloadLen; $i++) {
        $unmasked .= chr(ord($payload[$i]) ^ ord($maskKey[$i % 4]));
      }
      $payload = $unmasked;
    }

    return [$payload, $opcode, $offset + $payloadLen];
  }
}

// ── Symbol Collection ───────────────────────────────────────────────────────

function collectSymbols(): void {
  global $BINANCE_SYMBOLS, $TWELVE_SYMBOLS, $FINNHUB_SYMBOLS;

  $defs = [];
  if (function_exists('vp_supported_market_defs')) {
    $defs = vp_supported_market_defs();
  }
  if (!$defs) {
    try {
      $st = db()->query("SELECT symbol, type, meta FROM markets WHERE status='active' ORDER BY type, sort_order, id");
      $defs = $st ? ($st->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
    } catch (Throwable $e) {
      $defs = [];
    }
  }
  $binanceSet = [];
  $twelveSet  = [];
  $finnhubSet = [];

  foreach ($defs as $d) {
    $sym = strtoupper(trim((string)($d['symbol'] ?? '')));
    $type = strtolower(trim((string)($d['type'] ?? '')));
    if (!$sym || !$type) continue;

    if ($type === 'crypto') {
      $bsym = strtolower(preg_replace('/[^A-Z0-9]/i', '', $sym));
      if ($bsym) $binanceSet[$bsym] = $sym;
    } else {
      // Twelve Data takes precedence if key available
      $meta = function_exists('market_meta') ? market_meta($d['meta'] ?? null) : [];
      $tdsym = function_exists('twelvedata_symbol_for_market')
        ? (twelvedata_symbol_for_market($sym, $type, $meta) ?: mapToTwelveData($sym, $type))
        : mapToTwelveData($sym, $type);
      if ($tdsym) $twelveSet[$tdsym] = ['original' => $sym, 'type' => $type];

      // Finnhub covers forex/stocks via free WS (250 symbols free tier)
      if ($type === 'forex' || $type === 'stocks') {
        $fsym = mapToFinnhub($sym, $type);
        if ($fsym) $finnhubSet[$fsym] = ['original' => $sym, 'type' => $type];
      }
    }
  }

  $BINANCE_SYMBOLS = $binanceSet;
  $TWELVE_SYMBOLS  = $twelveSet;
  $FINNHUB_SYMBOLS = $finnhubSet;
}

function aggregator_status_write(string $feed, array $data): void {
  $dir = __DIR__ . '/../data/status';
  if (!is_dir($dir)) @mkdir($dir, 0777, true);
  $file = $dir . '/ws_aggregator.json';
  $existing = [];
  if (is_file($file)) {
    $raw = @file_get_contents($file);
    $decoded = $raw ? json_decode($raw, true) : null;
    if (is_array($decoded)) $existing = $decoded;
  }
  $existing[$feed] = $data + [
    'feed' => $feed,
    'updated_at' => time(),
  ];
  @file_put_contents($file, json_encode($existing, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

function twelveDataPriority(string $tdsym, array $info): int {
  $original = strtoupper((string)($info['original'] ?? $tdsym));
  $type = strtolower((string)($info['type'] ?? ''));
  $typeScore = match ($type) {
    'forex' => 5000,
    'commodities' => 4000,
    'futures' => 3000,
    'stocks' => 2000,
    'arab' => 1000,
    default => 0,
  };
  $hot = [
    'EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','USDCAD','NZDUSD','EURGBP','EURJPY','GBPJPY',
    'XAUUSD','XAGUSD','XPTUSD','XPDUSD','USOIL','UKOIL','NGAS','COPPER',
    'AAPL','MSFT','NVDA','TSLA','AMZN','GOOGL','META','NFLX','AMD','INTC',
    'ES_F','NQ_F','YM_F','GC_F','CL_F','SI_F','NG_F',
  ];
  $hotScore = array_search($original, $hot, true);
  return $typeScore + ($hotScore === false ? 0 : (1000 - $hotScore));
}

function twelveDataOrderedSymbols(): array {
  global $TWELVE_SYMBOLS;
  $symbols = array_keys($TWELVE_SYMBOLS);
  usort($symbols, static function(string $a, string $b): int {
    global $TWELVE_SYMBOLS;
    $pa = twelveDataPriority($a, (array)($TWELVE_SYMBOLS[$a] ?? []));
    $pb = twelveDataPriority($b, (array)($TWELVE_SYMBOLS[$b] ?? []));
    if ($pa === $pb) return strcmp($a, $b);
    return $pb <=> $pa;
  });
  return $symbols;
}

function mapToFinnhub(string $symbol, string $type): string {
  if ($type === 'forex') {
    $s = str_replace('USDT', 'USD', $symbol);
    if (strlen($s) >= 6) return 'OANDA:' . substr($s, 0, 3) . '_' . substr($s, 3, 6);
    return 'OANDA:' . $s;
  }
  return $symbol; // stocks
}

function mapToTwelveData(string $symbol, string $type): string {
  if ($type === 'forex') {
    $s = str_replace('USDT', 'USD', $symbol);
    if (strlen($s) >= 6) return substr($s, 0, 3) . '/' . substr($s, 3, 6);
    return $s;
  }
  if ($type === 'commodities') {
    if (str_starts_with($symbol, 'XAU')) return 'XAU/USD';
    if (str_starts_with($symbol, 'XAG')) return 'XAG/USD';
    if (str_starts_with($symbol, 'XPT')) return 'XPT/USD';
    if (str_starts_with($symbol, 'XPD')) return 'XPD/USD';
    return $symbol;
  }
  if ($type === 'futures') {
    $map = [
      'GC=F' => 'GC1!', 'CL=F' => 'CL1!', 'SI=F' => 'SI1!', 'HG=F' => 'HG1!',
      'NG=F' => 'NG1!', 'ZC=F' => 'ZC1!', 'ZW=F' => 'ZW1!', 'ZS=F' => 'ZS1!',
      'ES=F' => 'ES1!', 'NQ=F' => 'NQ1!', 'YM=F' => 'YM1!', 'RTY=F' => 'RTY1!',
      'DX=F' => 'DX1!', 'ZF=F' => 'ZF1!', 'ZN=F' => 'ZN1!', 'ZB=F' => 'ZB1!',
      '6E=F' => '6E1!', '6J=F' => '6J1!', '6B=F' => '6B1!', '6A=F' => '6A1!',
      '6C=F' => '6C1!', '6S=F' => '6S1!', 'CC=F' => 'CC1!', 'KC=F' => 'KC1!',
      'SB=F' => 'SB1!', 'CT=F' => 'CT1!', 'LBS=F' => 'LBS1!', 'HE=F' => 'HE1!',
      'LE=F' => 'LE1!', 'GF=F' => 'GF1!',
    ];
    return $map[$symbol] ?? $symbol;
  }
  return $symbol;
}

// ── Price Write ─────────────────────────────────────────────────────────────

function writePrice(string $symbol, string $type, float $price, float $changePct = 0, float $open = 0, float $prevClose = 0, string $source = 'ws_aggregator'): void {
  if ($price <= 0) return;
  $now = time();

  $entry = [
    'symbol' => strtoupper($symbol),
    'type' => strtolower($type),
    'price' => $price,
    'change_pct' => $changePct,
    'open' => $open,
    'prev_close' => $prevClose,
    'updated_at' => $now,
    'source' => $source,
    'central_ts' => $now,
    'received_at' => $now,
    'ingested_at' => $now,
  ];
  quote_central_write(strtoupper($symbol), $type, $entry);

  // Write to DB
  try {
    quote_upsert(strtoupper($symbol), $type, $price, $changePct, $now, [
      'source' => $source,
      'as_of' => $now,
      'ingested_at' => $now,
      'prev_close' => $prevClose,
    ]);
  } catch (Throwable $e) {
    // DB write failure is non-fatal
  }
}

// ── Binance WebSocket ───────────────────────────────────────────────────────

function runBinanceWs(): int {
  global $BINANCE_SYMBOLS;
  if (empty($BINANCE_SYMBOLS)) return 0;

  // Build combined stream URL (max 200 streams per connection)
  $streams = [];
  foreach (array_keys($BINANCE_SYMBOLS) as $bsym) {
    $streams[] = "{$bsym}@miniTicker";
  }

  // Use first 100 streams (Binance limit per connection)
  $chunk = array_slice($streams, 0, 100);
  $streamPath = implode('/', $chunk);
  $url = "wss://stream.binance.com:9443/stream?streams={$streamPath}";

  echo "[" . date('H:i:s') . "] Binance WS: connecting to " . count($chunk) . " streams...\n";

  $ws = new WsClient();
  if (!$ws->connect($url)) {
    echo "  [Binance WS] Connection failed\n";
    return 0;
  }

  echo "  [Binance WS] Connected!\n";
  $msgCount = 0;
  $lastTick = time();

  while ($ws->isConnected()) {
    $messages = $ws->receiveMessages();

    foreach ($messages as $raw) {
      $msg = json_decode($raw, true);
      if (!$msg) continue;

      // Combined stream format: {stream, data}
      $d = $msg['data'] ?? $msg;
      if (!is_array($d)) continue;

      $sym = strtoupper(trim((string)($d['s'] ?? '')));
      if (!$sym) continue;

      $price = (float)($d['c'] ?? 0);
      $changePct = (float)($d['P'] ?? 0);
      $open = (float)($d['o'] ?? 0);
      $prevClose = (float)($d['x'] ?? 0);

      if ($price <= 0) continue;

      $original = $BINANCE_SYMBOLS[strtolower($sym)] ?? $sym;
      writePrice($original, 'crypto', $price, $changePct, $open, $prevClose, 'binance_ws');
      $msgCount++;
    }

    // Small sleep to avoid CPU spin
    usleep(5000);

    // Periodic status
    if (time() - $lastTick >= $TICK_INTERVAL) {
      $lastTick = time();
      if ($msgCount > 0 && $msgCount % 500 < 10) {
        echo "  [Binance WS] Processed {$msgCount} messages\n";
      }
    }
  }

  $ws->disconnect();
  echo "  [Binance WS] Disconnected after {$msgCount} messages\n";
  return $msgCount;
}

// ── Twelve Data WebSocket ───────────────────────────────────────────────────

function runTwelveDataWs(): int {
  global $TWELVE_SYMBOLS, $TWELVE_KEY, $TWELVE_WS_LIMIT;
  if (!$TWELVE_KEY) {
    echo "  [Twelve Data WS] No API key, skipping\n";
    return 0;
  }
  if (empty($TWELVE_SYMBOLS)) return 0;

  $batch = array_slice(twelveDataOrderedSymbols(), 0, $TWELVE_WS_LIMIT);
  $url = "wss://ws.twelvedata.com/v1/quotes/price?apikey={$TWELVE_KEY}";

  echo "[" . date('H:i:s') . "] Twelve Data WS: connecting to " . count($batch) . " symbols...\n";

  $ws = new WsClient();
  if (!$ws->connect($url)) {
    echo "  [Twelve Data WS] Connection failed\n";
    flush();
    aggregator_status_write('twelvedata', ['status' => 'connect_failed', 'symbols' => count($batch), 'messages' => 0, 'error' => $ws->lastError]);
    return 0;
  }

  echo "  [Twelve Data WS] Connected! Sending subscribe...\n";

  // Send subscribe message
  $symbolsStr = implode(',', $batch);
  $ws->send(json_encode(['action' => 'subscribe', 'params' => ['symbols' => $symbolsStr]]));
  aggregator_status_write('twelvedata', ['status' => 'connected', 'symbols' => count($batch), 'messages' => 0]);

  $msgCount = 0;
  $lastTick = time();
  $subscribed = false;

  while ($ws->isConnected()) {
    $messages = $ws->receiveMessages();

    foreach ($messages as $raw) {
      $msg = json_decode($raw, true);
      if (!$msg) continue;

      // Handle subscribe confirmation
      if (($msg['event'] ?? '') === 'subscribe') {
        $subscribed = true;
        echo "  [Twelve Data WS] Subscribed to " . count($batch) . " symbols\n";
        aggregator_status_write('twelvedata', ['status' => 'subscribed', 'symbols' => count($batch), 'messages' => $msgCount]);
        continue;
      }

      // Handle heartbeat/ping
      if (($msg['event'] ?? '') === 'heartbeat') continue;

      // Handle price update
      if (($msg['event'] ?? '') === 'price' && isset($msg['price'])) {
        $tdsym = $msg['symbol'] ?? '';
        $price = (float)($msg['price'] ?? 0);
        $changePct = (float)($msg['change_percent'] ?? $msg['change_pct'] ?? 0);
        $open = (float)($msg['open'] ?? 0);
        $prevClose = (float)($msg['close'] ?? $msg['previous_close'] ?? 0);

        if ($price <= 0) continue;

        $info = $TWELVE_SYMBOLS[$tdsym] ?? null;
        $original = $info['original'] ?? $tdsym;
        $type = $info['type'] ?? 'forex';

        writePrice($original, $type, $price, $changePct, $open, $prevClose, 'twelvedata_ws');
        $msgCount++;
        if (($msgCount % 25) === 0) {
          aggregator_status_write('twelvedata', [
            'status' => 'streaming',
            'symbols' => count($batch),
            'messages' => $msgCount,
            'last_symbol' => $original,
            'last_price_at' => time(),
          ]);
        }
      }

      // Handle error
      if (($msg['event'] ?? '') === 'error') {
        echo "  [Twelve Data WS] Error: " . ($msg['message'] ?? 'unknown') . "\n";
        aggregator_status_write('twelvedata', ['status' => 'error', 'symbols' => count($batch), 'messages' => $msgCount, 'error' => (string)($msg['message'] ?? 'unknown')]);
      }
    }

    usleep(10000); // 10ms

    // Heartbeat tick
    if (time() - $lastTick >= $TICK_INTERVAL) {
      $lastTick = time();
      $ws->send(json_encode(['action' => 'heartbeat']));
    }
  }

  $ws->disconnect();
  echo "  [Twelve Data WS] Disconnected after {$msgCount} messages\n";
  aggregator_status_write('twelvedata', ['status' => 'disconnected', 'symbols' => count($batch), 'messages' => $msgCount]);
  return $msgCount;
}

// ── Finnhub WebSocket ───────────────────────────────────────────────────────

function runFinnhubWs(): int {
  global $FINNHUB_SYMBOLS, $FINNHUB_KEY;
  if (!$FINNHUB_KEY) {
    echo "  [Finnhub WS] No API key, skipping\n";
    return 0;
  }
  if (empty($FINNHUB_SYMBOLS)) return 0;

  // Free tier: 250 symbols max, 1 connection
  $batch = array_slice(array_keys($FINNHUB_SYMBOLS), 0, 240);
  $url = "wss://ws.finnhub.io?token={$FINNHUB_KEY}";

  echo "[" . date('H:i:s') . "] Finnhub WS: connecting to " . count($batch) . " symbols...\n";

  $ws = new WsClient();
  if (!$ws->connect($url)) {
    echo "  [Finnhub WS] Connection failed\n";
    return 0;
  }

  echo "  [Finnhub WS] Connected! Sending subscribe...\n";

  // Subscribe after open
  foreach ($batch as $fsym) {
    $ws->send(json_encode(['type' => 'subscribe', 'symbol' => $fsym]));
  }

  $msgCount = 0;
  $lastTick = time();

  while ($ws->isConnected()) {
    $messages = $ws->receiveMessages();

    foreach ($messages as $raw) {
      $msg = json_decode($raw, true);
      if (!$msg) continue;

      if (($msg['type'] ?? '') !== 'trade' || !is_array($msg['data'])) continue;

      $t = $msg['data'][0] ?? null;
      if (!$t || !(($t['p'] ?? 0) > 0)) continue;

      $fsym = strtoupper(trim((string)($t['s'] ?? '')));
      $info = $FINNHUB_SYMBOLS[$fsym] ?? null;
      $original = $info['original'] ?? $fsym;
      $type = $info['type'] ?? 'stocks';

      // Compute change_pct if not provided
      $changePct = 0.0;
      $price = (float)$t['p'];

      writePrice($original, $type, $price, $changePct, 0, 0, 'finnhub_ws');
      $msgCount++;
    }

    usleep(5000);

    if (time() - $lastTick >= $TICK_INTERVAL) {
      $lastTick = time();
      if ($msgCount > 0 && $msgCount % 100 < 10) {
        echo "  [Finnhub WS] Processed {$msgCount} messages\n";
      }
    }
  }

  $ws->disconnect();
  echo "  [Finnhub WS] Disconnected after {$msgCount} messages\n";
  return $msgCount;
}

// ── Main Loop ───────────────────────────────────────────────────────────────

echo "=== WS Aggregator Starting ===\n"; flush();
aggregator_status_write('process', ['status' => 'starting', 'feeds' => $ENABLED_FEEDS, 'messages' => 0]);
echo "Collecting symbols from market definitions...\n"; flush();
collectSymbols();
aggregator_status_write('process', [
  'status' => 'symbols_collected',
  'feeds' => $ENABLED_FEEDS,
  'binance_symbols' => count($BINANCE_SYMBOLS),
  'twelvedata_symbols' => count($TWELVE_SYMBOLS),
  'finnhub_symbols' => count($FINNHUB_SYMBOLS),
  'messages' => 0,
]);
echo "Binance symbols: " . count($BINANCE_SYMBOLS) . "\n"; flush();
echo "Twelve Data symbols: " . count($TWELVE_SYMBOLS) . "\n"; flush();
echo "Finnhub symbols: " . count($FINNHUB_SYMBOLS) . "\n"; flush();
echo "Enabled feeds: " . implode(',', $ENABLED_FEEDS) . "\n"; flush();

$startTime = time();

// Run both WebSocket connections with auto-reconnect
while (true) {
  if ((time() - $startTime) >= $MAX_RUNTIME) {
    echo "Max runtime reached ({$MAX_RUNTIME}s), exiting for restart...\n";
    break;
  }

  foreach ($ENABLED_FEEDS as $feed) {
    if ((time() - $startTime) >= $MAX_RUNTIME) break 2;
    try {
      if ($feed === 'twelvedata' || $feed === 'twelve') {
        runTwelveDataWs();
      } elseif ($feed === 'binance') {
        runBinanceWs();
      } elseif ($feed === 'finnhub') {
        runFinnhubWs();
      }
    } catch (Throwable $e) {
      echo "  [{$feed} WS] Error: " . $e->getMessage() . "\n";
    }
  }

  // Reconnect delay
  echo "Reconnecting in {$RECONNECT_DELAY} seconds...\n";
  sleep($RECONNECT_DELAY);

  // Refresh symbols periodically
  if ((time() - $startTime) % 300 < 10) {
    collectSymbols();
  }
}

echo "=== WS Aggregator Stopped ===\n";
