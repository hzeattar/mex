<?php
declare(strict_types=1);
// Free CoinGecko spot-metal proxy (tokenized gold/silver) used as a fallback
// when EODHD/TwelveData spot-metal feeds return stale previous-close only.
require_once __DIR__ . '/common.php';

function coingecko_base(): string { return 'https://api.coingecko.com/api/v3'; }

function coingecko_spot_metal_supported(string $symbol): ?string {
  $symbol = strtoupper(trim($symbol));
  return match ($symbol) {
    'XAUUSD' => 'pax-gold',
    'XAGUSD' => null, // no reliable free tokenized silver; handled separately
    default => null,
  };
}

/**
 * Fetch a single spot-metal price from CoinGecko (tokenized bullion).
 * Returns null if symbol unsupported or API fails.
 */
function coingecko_spot_metal_quote(string $symbol): ?array {
  $coinId = coingecko_spot_metal_supported($symbol);
  if ($coinId === null) return null;
  $apiKey = trim((string)env('COINGECKO_API_KEY', ''));
  $url = coingecko_base() . '/simple/price?ids=' . urlencode($coinId) . '&vs_currencies=usd&include_24hr_change=true';
  if ($apiKey !== '') {
    $url .= '&x_cg_demo_api_key=' . urlencode($apiKey);
  }
  try {
    $raw = http_get_json($url, ['Accept: application/json']);
  } catch (Throwable $e) { return null; }
  $coinKey = str_replace('_', '-', $coinId);
  $data = $raw[$coinKey] ?? null;
  if (!is_array($data) || !isset($data['usd'])) return null;
  $price = (float)$data['usd'];
  if (!($price > 0)) return null;
  $chg = (float)($data['usd_24h_change'] ?? 0.0);
  $now = time();
  return [
    'symbol' => $symbol,
    'price' => $price,
    'change_pct' => $chg,
    'updated_at' => $now,
    'source' => 'coingecko_metal',
  ];
}

/**
 * Bulk spot-metal quotes via CoinGecko. Only returns supported symbols.
 */
function coingecko_spot_metal_quote_many(array $symbols): array {
  $out = [];
  foreach (array_values(array_unique(array_map('strtoupper', array_map('trim', $symbols)))) as $sym) {
    if (!$sym || !vp_is_spot_metal_symbol($sym, 'commodities')) continue;
    try {
      $q = coingecko_spot_metal_quote($sym);
      if (is_array($q) && (float)($q['price'] ?? 0) > 0) {
        $out[$sym] = $q;
      }
    } catch (Throwable $e) {}
  }
  return $out;
}
