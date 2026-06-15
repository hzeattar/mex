<?php
/**
 * api/lib/quote_polygon.php
 * Polygon.io provider for US stocks
 * Free tier: 5 API calls/minute
 */

if (!function_exists('polygon_enabled')) {
  function polygon_enabled(): bool {
    return (bool)(getenv('POLYGON_ENABLED') ?: '0');
  }
}

if (!function_exists('polygon_key')) {
  function polygon_key(): string {
    return (string)(getenv('POLYGON_API_KEY') ?: '');
  }
}

if (!function_exists('polygon_base')) {
  function polygon_base(): string {
    return rtrim((string)(getenv('POLYGON_API_BASE') ?: 'https://api.polygon.io/v2'), '/');
  }
}

if (!function_exists('polygon_fetch')) {
  function polygon_fetch(string $endpoint, array $params = []): array {
    $key = polygon_key();
    if ($key === '') return ['ok'=>false,'error'=>'No POLYGON_API_KEY'];
    
    $params['apiKey'] = $key;
    $url = polygon_base() . $endpoint . '?' . http_build_query($params);
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT => 8,
      CURLOPT_CONNECTTIMEOUT => 3,
      CURLOPT_FOLLOWLOCATION => true,
      CURLOPT_SSL_VERIFYPEER => true,
      CURLOPT_HTTPHEADER => ['Accept: application/json'],
    ]);
    $body = curl_exec($ch);
    $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http !== 200 || $body === false) {
      return ['ok'=>false,'error'=>"HTTP {$http}"];
    }
    
    $data = json_decode($body, true);
    if (!is_array($data)) {
      return ['ok'=>false,'error'=>'Invalid JSON'];
    }
    
    return ['ok'=>true,'data'=>$data];
  }
}

if (!function_exists('polygon_stock_latest')) {
  /**
   * Fetch latest stock prices from Polygon.io
   * @param string[] $symbols e.g. ['AAPL','TSLA']
   * @return array [symbol=>['price','change_pct','source'], ...]
   */
  function polygon_stock_latest(array $symbols): array {
    if (!polygon_enabled() || empty($symbols)) return [];
    
    $result = [];
    // Polygon supports batch requests via /snapshot/locale/us/markets/stocks/tickers
    // But free tier is limited to 5 calls/min, so we fetch one by one or use aggregates
    
    foreach ($symbols as $sym) {
      $sym = strtoupper($sym);
      // Use previous close for change calculation + last trade for price
      $resp = polygon_fetch("/aggs/ticker/{$sym}/prev", []);
      
      if (!$resp['ok']) continue;
      
      $data = $resp['data'];
      $results = $data['results'] ?? [];
      if (empty($results)) continue;
      
      $r = $results[0];
      $price = (float)($r['c'] ?? 0); // close
      $open = (float)($r['o'] ?? 0);
      $change = $open > 0 ? (($price - $open) / $open) * 100 : 0;
      
      if ($price > 0) {
        $result[$sym] = [
          'price' => $price,
          'change_pct' => round($change, 4),
          'source' => 'polygon',
          'timing_class' => 'live',
        ];
      }
      
      // Rate limit: max 5 calls/min on free tier
      usleep(200000); // 200ms delay between calls
    }
    
    return $result;
  }
}
