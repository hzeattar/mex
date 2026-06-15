<?php
/**
 * api/lib/quote_currencyfreaks.php
 * CurrencyFreaks provider for forex rates
 * Free tier: 1,000 requests/month, updated every 60 minutes
 */

if (!function_exists('currencyfreaks_enabled')) {
  function currencyfreaks_enabled(): bool {
    return (bool)(getenv('CURRENCYFREAKS_ENABLED') ?: '0');
  }
}

if (!function_exists('currencyfreaks_key')) {
  function currencyfreaks_key(): string {
    return (string)(getenv('CURRENCYFREAKS_KEY') ?: '');
  }
}

if (!function_exists('currencyfreaks_base')) {
  function currencyfreaks_base(): string {
    return rtrim((string)(getenv('CURRENCYFREAKS_BASE') ?: 'https://api.currencyfreaks.com/v2.0'), '/');
  }
}

if (!function_exists('currencyfreaks_fetch')) {
  function currencyfreaks_fetch(array $symbols = []): array {
    $key = currencyfreaks_key();
    if ($key === '') return ['ok'=>false,'error'=>'No CURRENCYFREAKS_KEY'];
    
    $url = currencyfreaks_base() . '/rates/latest?apikey=' . urlencode($key);
    if (!empty($symbols)) {
      $url .= '&symbols=' . urlencode(implode(',', $symbols));
    }
    
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
    if (!is_array($data) || !isset($data['rates'])) {
      return ['ok'=>false,'error'=>'Invalid response'];
    }
    
    return ['ok'=>true,'rates'=>($data['rates'] ?? []),'base'=>($data['base'] ?? 'USD'),'date'=>($data['date'] ?? '')];
  }
}

if (!function_exists('currencyfreaks_forex_latest')) {
  /**
   * Fetch forex rates from CurrencyFreaks
   * Returns rates against USD base
   * @param string[] $pairs e.g. ['EURUSD','GBPUSD']
   * @return array [symbol=>['price','change_pct','source'], ...]
   */
  function currencyfreaks_forex_latest(array $pairs): array {
    if (!currencyfreaks_enabled() || empty($pairs)) return [];
    
    // Extract unique currencies from pairs
    $currencies = [];
    foreach ($pairs as $pair) {
      $pair = strtoupper($pair);
      if (strlen($pair) === 6) {
        $currencies[] = substr($pair, 0, 3);
        $currencies[] = substr($pair, 3, 3);
      }
    }
    $currencies = array_unique(array_filter($currencies));
    
    $resp = currencyfreaks_fetch($currencies);
    if (!$resp['ok']) return [];
    
    $rates = $resp['rates'];
    $result = [];
    
    foreach ($pairs as $pair) {
      $pair = strtoupper($pair);
      if (strlen($pair) !== 6) continue;
      
      $base = substr($pair, 0, 3);
      $quote = substr($pair, 3, 3);
      
      // CurrencyFreaks returns rates as USD per unit (e.g. EUR = 1.08 means 1 EUR = 1.08 USD)
      $baseRate = isset($rates[$base]) ? (float)$rates[$base] : 0;
      $quoteRate = isset($rates[$quote]) ? (float)$rates[$quote] : 0;
      
      if ($baseRate > 0 && $quoteRate > 0) {
        // Calculate cross rate: (USD/quote) / (USD/base) = base/quote
        $price = $quoteRate / $baseRate;
        
        if ($price > 0) {
          $result[$pair] = [
            'price' => round($price, 6),
            'change_pct' => 0, // CurrencyFreaks free tier doesn't provide change
            'source' => 'currencyfreaks',
            'timing_class' => 'live',
          ];
        }
      }
    }
    
    return $result;
  }
}
