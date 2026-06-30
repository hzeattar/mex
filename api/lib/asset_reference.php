<?php
declare(strict_types=1);

if (!function_exists('vp_asset_ref_normalize_type')) {
  function vp_asset_ref_normalize_type(string $type): string {
    if (function_exists('vp_normalize_asset_type')) return vp_normalize_asset_type($type);
    $t = strtolower(trim($type));
    if ($t === 'fx') return 'forex';
    if ($t === 'index') return 'indices';
    if ($t === 'perp' || $t === 'perpetual') return 'futures';
    return $t !== '' ? $t : 'crypto';
  }
}

if (!function_exists('vp_asset_ref_provider_type')) {
  function vp_asset_ref_provider_type(string $type): string {
    if (function_exists('vp_provider_asset_type')) return vp_provider_asset_type($type);
    $t = vp_asset_ref_normalize_type($type);
    return $t === 'arab' ? 'stocks' : $t;
  }
}

if (!function_exists('vp_asset_reference')) {
  function vp_asset_reference(string $symbol, string $type = '', array $meta = []): array {
    $symbol = strtoupper(trim($symbol));
    $type = vp_asset_ref_normalize_type($type ?: (string)($meta['type'] ?? 'crypto'));
    $providerType = vp_asset_ref_provider_type($type);

    $ref = [
      'symbol' => $symbol,
      'type' => $type,
      'provider_type' => $providerType,
      'trade_supported' => true,
      'unsupported_reason' => '',
      'price_provider' => '',
      'candles_provider' => '',
      'tv_symbol' => trim((string)($meta['tv_symbol'] ?? '')),
      'twelvedata_ticker' => trim((string)($meta['twelvedata_ticker'] ?? '')),
      'eodhd_symbol' => trim((string)($meta['eodhd_symbol'] ?? $meta['provider_symbol_eodhd'] ?? '')),
      'yahoo_ticker' => '',
    ];

    if ($symbol === '') {
      $ref['trade_supported'] = false;
      $ref['unsupported_reason'] = 'missing_symbol';
      return $ref;
    }

    if ($providerType === 'crypto') {
      $ref['price_provider'] = 'binance';
      $ref['candles_provider'] = 'binance';
      $ref['tv_symbol'] = $ref['tv_symbol'] ?: 'BINANCE:' . $symbol;
      return $ref;
    }

    if ($providerType === 'forex') {
      if (preg_match('/^([A-Z]{3})([A-Z]{3})$/', $symbol, $m)) {
        $ref['price_provider'] = 'twelvedata';
        $ref['candles_provider'] = 'twelvedata';
        $ref['twelvedata_ticker'] = $ref['twelvedata_ticker'] ?: $m[1] . '/' . $m[2];
        $ref['eodhd_symbol'] = $ref['eodhd_symbol'] ?: $symbol . '.FOREX';
        $ref['tv_symbol'] = $ref['tv_symbol'] ?: 'FX:' . $symbol;
      } else {
        $ref['trade_supported'] = false;
        $ref['unsupported_reason'] = 'unsupported_forex_symbol';
      }
      return $ref;
    }

    if ($providerType === 'commodities') {
      $tdMap = [
        'XAUUSD' => ['XAU/USD', 'OANDA:XAUUSD'],
        'XAUEUR' => ['XAU/EUR', 'TVC:XAUEUR'],
        'XAUGBP' => ['XAU/GBP', 'TVC:XAUGBP'],
        'XAUJPY' => ['XAU/JPY', 'TVC:XAUJPY'],
        'XAUAUD' => ['XAU/AUD', 'TVC:XAUAUD'],
        'XAUCAD' => ['XAU/CAD', 'TVC:XAUCAD'],
        'XAUCHF' => ['XAU/CHF', 'TVC:XAUCHF'],
        'XAUHKD' => ['XAU/HKD', 'TVC:XAUHKD'],
        'XAUNZD' => ['XAU/NZD', 'TVC:XAUNZD'],
        'XAUSGD' => ['XAU/SGD', 'TVC:XAUSGD'],
        'XAGUSD' => ['XAG/USD', 'OANDA:XAGUSD'],
        'XAGEUR' => ['XAG/EUR', 'TVC:XAGEUR'],
        'XAGGBP' => ['XAG/GBP', 'TVC:XAGGBP'],
        'XAGAUD' => ['XAG/AUD', 'TVC:XAGAUD'],
        'XAGCAD' => ['XAG/CAD', 'TVC:XAGCAD'],
        'XAGCHF' => ['XAG/CHF', 'TVC:XAGCHF'],
        'XAGTRY' => ['XAG/TRY', 'TVC:XAGTRY'],
        'GAUUSD' => ['GAU/USD', 'TVC:GAUUSD'],
        'GAUEUR' => ['GAU/EUR', 'TVC:GAUEUR'],
        'GAUGBP' => ['GAU/GBP', 'TVC:GAUGBP'],
        'GAUIDR' => ['GAU/IDR', 'TVC:GAUIDR'],
        'GAUTRY' => ['GAU/TRY', 'TVC:GAUTRY'],
        'XAUXAG' => ['XAU/XAG', 'TVC:XAUXAG'],
        'XAGGUSD' => ['XAGg/USD', 'TVC:XAGGUSD'],
        'XAGGEUR' => ['XAGg/EUR', 'TVC:XAGGEUR'],
        'XAGGTRY' => ['XAGg/TRY', 'TVC:XAGGTRY'],
        'XPTUSD' => ['XPT/USD', 'OANDA:XPTUSD'],
        'XPDUSD' => ['XPD/USD', 'OANDA:XPDUSD'],
        'USOIL' => ['WTI/USD', 'TVC:USOIL'],
        'WTI' => ['WTI/USD', 'TVC:USOIL'],
        'UKOIL' => ['XBR/USD', 'TVC:UKOIL'],
        'BRENT' => ['XBR/USD', 'TVC:UKOIL'],
        'URALS' => ['URALS/USD', 'TVC:URALS'],
      ];
      if (isset($tdMap[$symbol])) {
        $ref['price_provider'] = 'twelvedata';
        $ref['candles_provider'] = 'twelvedata';
        $ref['twelvedata_ticker'] = $ref['twelvedata_ticker'] ?: $tdMap[$symbol][0];
        $ref['tv_symbol'] = $ref['tv_symbol'] ?: $tdMap[$symbol][1];
      } else {
        $ref['trade_supported'] = false;
        $ref['unsupported_reason'] = 'unsupported_commodity_provider';
      }
      return $ref;
    }

    if ($type === 'arab') {
      if (preg_match('/^[0-9]{3,6}$/', $symbol)) {
        $ref['price_provider'] = 'twelvedata';
        $ref['candles_provider'] = 'twelvedata';
        $ref['eodhd_symbol'] = $ref['eodhd_symbol'] ?: $symbol . '.SR';
        $ref['twelvedata_ticker'] = $ref['twelvedata_ticker'] ?: $symbol . ':TADAWUL';
        $ref['tv_symbol'] = $ref['tv_symbol'] ?: 'TADAWUL:' . $symbol;
      } else {
        $ref['trade_supported'] = false;
        $ref['unsupported_reason'] = 'unsupported_arab_symbol';
      }
      return $ref;
    }

    if ($providerType === 'stocks') {
      if (preg_match('/^[A-Z0-9._-]{1,16}$/', $symbol)) {
        $ref['price_provider'] = strtolower((string)env('STOCK_QUOTES_PROVIDER', env('STOCKS_QUOTES_PROVIDER', 'twelvedata')));
        if ($ref['price_provider'] === '') $ref['price_provider'] = 'twelvedata';
        $ref['candles_provider'] = $ref['price_provider'] === 'eodhd' ? 'eodhd' : 'twelvedata';
        $ref['twelvedata_ticker'] = $ref['twelvedata_ticker'] ?: $symbol;
        $ref['eodhd_symbol'] = $ref['eodhd_symbol'] ?: $symbol . '.US';
      } else {
        $ref['trade_supported'] = false;
        $ref['unsupported_reason'] = 'unsupported_stock_symbol';
      }
      return $ref;
    }

    if ($providerType === 'futures') {
      $tdMap = [
        'GC_F' => ['XAU/USD', 'COMEX:GC1!'],
        'SI_F' => ['XAG/USD', 'COMEX:SI1!'],
        'CL_F' => ['WTI/USD', 'NYMEX:CL1!'],
        'BZ_F' => ['XBR/USD', 'ICEEUR:BRN1!'],
        'PL_F' => ['XPT/USD', 'COMEX:PL1!'],
        'PA_F' => ['XPD/USD', 'COMEX:PA1!'],
      ];
      $eodMap = [
        'ES_F' => 'ES.F', 'NQ_F' => 'NQ.F', 'YM_F' => 'YM.F', 'CL_F' => 'CL.F',
        'BZ_F' => 'BZ.F', 'GC_F' => 'GC.F', 'SI_F' => 'SI.F', 'NG_F' => 'NG.F',
        'HG_F' => 'HG.F', 'ZC_F' => 'ZC.F', 'ZS_F' => 'ZS.F', 'ZW_F' => 'ZW.F',
        'PL_F' => 'PL.F', 'PA_F' => 'PA.F',
      ];
      if (isset($tdMap[$symbol])) {
        $ref['price_provider'] = 'twelvedata';
        $ref['candles_provider'] = 'twelvedata';
        $ref['twelvedata_ticker'] = $ref['twelvedata_ticker'] ?: $tdMap[$symbol][0];
        $ref['tv_symbol'] = $ref['tv_symbol'] ?: $tdMap[$symbol][1];
        $ref['eodhd_symbol'] = $ref['eodhd_symbol'] ?: ($eodMap[$symbol] ?? '');
        return $ref;
      }
      $ref['trade_supported'] = false;
      $ref['unsupported_reason'] = isset($eodMap[$symbol]) ? 'futures_provider_unavailable' : 'unsupported_future_symbol';
      $ref['price_provider'] = '';
      $ref['candles_provider'] = '';
      $ref['twelvedata_ticker'] = '';
      $ref['eodhd_symbol'] = $ref['eodhd_symbol'] ?: ($eodMap[$symbol] ?? '');
      return $ref;
    }

    $ref['trade_supported'] = false;
    $ref['unsupported_reason'] = 'unsupported_asset_type';
    return $ref;
  }
}

if (!function_exists('vp_asset_trade_supported')) {
  function vp_asset_trade_supported(string $symbol, string $type = '', array $meta = []): bool {
    $ref = vp_asset_reference($symbol, $type, $meta);
    return !empty($ref['trade_supported']);
  }
}
