<?php
/**
 * api/lib/quote_fcsapi.php
 * FCS API provider for forex, stocks, commodities, crypto
 * Free tier: 500 requests/month
 * Supports: forex, stocks, commodities, crypto
 */

if (!function_exists('fcsapi_enabled')) {
  function fcsapi_enabled(): bool {
    return (bool)(getenv('FCSAPI_ENABLED') ?: '0');
  }
}

if (!function_exists('fcsapi_key')) {
  function fcsapi_key(): string {
    return (string)(getenv('FCSAPI_KEY') ?: '');
  }
}

if (!function_exists('fcsapi_base')) {
  function fcsapi_base(): string {
    return rtrim((string)(getenv('FCSAPI_BASE') ?: 'https://fcsapi.com/api-v3'), '/');
  }
}

if (!function_exists('fcsapi_fetch')) {
  function fcsapi_fetch(string $endpoint, array $params = []): array {
    $key = fcsapi_key();
    if ($key === '') return ['ok'=>false,'error'=>'No FCSAPI_KEY'];
    
    $params['access_key'] = $key;
    $url = fcsapi_base() . $endpoint . '?' . http_build_query($params);
    
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
    
    if (($data['code'] ?? 0) !== 200) {
      return ['ok'=>false,'error'=>($data['msg'] ?? 'API error')];
    }
    
    return ['ok'=>true,'data'=>($data['response'] ?? [])];
  }
}

if (!function_exists('fcsapi_forex_latest')) {
  /**
   * Fetch latest forex rates from FCS API
   * @param string[] $pairs e.g. ['EUR/USD','GBP/USD']
   * @return array [symbol=>['price','change_pct','source'], ...]
   */
  function fcsapi_forex_latest(array $pairs): array {
    if (!fcsapi_enabled() || empty($pairs)) return [];
    
    $result = [];
    // FCS supports up to 50 symbols per request
    $chunks = array_chunk($pairs, 50);
    
    foreach ($chunks as $chunk) {
      $symbols = implode(',', $chunk);
      $resp = fcsapi_fetch('/forex/latest', ['symbol' => $symbols]);
      
      if (!$resp['ok']) continue;
      
      foreach ($resp['data'] ?? [] as $item) {
        $sym = strtoupper(str_replace('/', '', (string)($item['s'] ?? '')));
        $price = (float)($item['c'] ?? 0);
        $open = (float)($item['o'] ?? 0);
        $change = $open > 0 ? (($price - $open) / $open) * 100 : 0;
        
        if ($price > 0) {
          $result[$sym] = [
            'price' => $price,
            'change_pct' => round($change, 4),
            'source' => 'fcsapi',
            'timing_class' => 'live',
          ];
        }
      }
    }
    
    return $result;
  }
}

if (!function_exists('fcsapi_stock_latest')) {
  /**
   * Fetch latest stock prices from FCS API
   * @param string[] $symbols e.g. ['AAPL','TSLA']
   * @return array [symbol=>['price','change_pct','source'], ...]
   */
  function fcsapi_stock_latest(array $symbols): array {
    if (!fcsapi_enabled() || empty($symbols)) return [];
    
    $result = [];
    $chunks = array_chunk($symbols, 50);
    
    foreach ($chunks as $chunk) {
      $symStr = implode(',', $chunk);
      $resp = fcsapi_fetch('/stock/latest', ['symbol' => $symStr, 'exchange' => 'US']);
      
      if (!$resp['ok']) continue;
      
      foreach ($resp['data'] ?? [] as $item) {
        $sym = strtoupper((string)($item['s'] ?? ''));
        $price = (float)($item['c'] ?? 0);
        $open = (float)($item['o'] ?? 0);
        $change = $open > 0 ? (($price - $open) / $open) * 100 : 0;
        
        if ($price > 0) {
          $result[$sym] = [
            'price' => $price,
            'change_pct' => round($change, 4),
            'source' => 'fcsapi',
            'timing_class' => 'live',
          ];
        }
      }
    }
    
    return $result;
  }
}

if (!function_exists('fcsapi_commodity_latest')) {
  /**
   * Fetch latest commodity prices from FCS API
   * @param string[] $symbols e.g. ['XAU/USD','XAG/USD']
   * @return array [symbol=>['price','change_pct','source'], ...]
   */
  function fcsapi_commodity_latest(array $symbols): array {
    if (!fcsapi_enabled() || empty($symbols)) return [];
    
    $result = [];
    $chunks = array_chunk($symbols, 50);
    
    foreach ($chunks as $chunk) {
      $symStr = implode(',', $chunk);
      $resp = fcsapi_fetch('/forex/latest', ['symbol' => $symStr]);
      
      if (!$resp['ok']) continue;
      
      foreach ($resp['data'] ?? [] as $item) {
        $sym = strtoupper(str_replace('/', '', (string)($item['s'] ?? '')));
        $price = (float)($item['c'] ?? 0);
        $open = (float)($item['o'] ?? 0);
        $change = $open > 0 ? (($price - $open) / $open) * 100 : 0;
        
        if ($price > 0) {
          $result[$sym] = [
            'price' => $price,
            'change_pct' => round($change, 4),
            'source' => 'fcsapi',
            'timing_class' => 'live',
          ];
        }
      }
    }
    
    return $result;
  }
}
