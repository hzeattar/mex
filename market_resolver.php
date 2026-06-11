<?php
declare(strict_types=1);

if (!function_exists('vp_normalize_asset_type')) {
  function vp_normalize_asset_type(string $typeRaw): string {
    $t = strtolower(trim($typeRaw));
    if ($t === 'fx') return 'forex';
    if ($t === 'index' || $t === 'indices') return 'indices';
    if ($t === 'perpetual' || $t === 'perp') return 'futures';
    if ($t === '') return 'crypto';
    return $t;
  }
}

if (!function_exists('vp_provider_asset_type')) {
  function vp_provider_asset_type(string $typeRaw, string $market = 'spot'): string {
    $t = vp_normalize_asset_type($typeRaw);
    if ($t === 'arab') return 'stocks';
    if ($t === 'futures') return 'futures';
    return $t;
  }
}

if (!function_exists('vp_is_binance_style_crypto_symbol')) {
  function vp_is_binance_style_crypto_symbol(string $symbol): bool {
    $s = strtoupper(trim($symbol));
    if ($s === '') return false;
    return (bool)preg_match('/^[A-Z0-9]{5,20}(USDT|USDC|BUSD|FDUSD|BTC|ETH)$/', $s);
  }
}


if (!function_exists('vp_is_spot_metal_symbol')) {
  function vp_is_spot_metal_symbol(string $symbol, string $typeRaw = ''): bool {
    $symbol = strtoupper(trim($symbol));
    $assetType = vp_normalize_asset_type($typeRaw);
    if ($assetType !== 'commodities' && $assetType !== 'forex' && $assetType !== '') return false;
    return in_array($symbol, ['XAUUSD','XAGUSD','XPTUSD','XPDUSD'], true);
  }
}

if (!function_exists('vp_is_crypto_perp_context')) {
  function vp_is_crypto_perp_context(string $symbol, string $typeRaw = '', string $market = 'spot', array $meta = []): bool {
    $symbol = strtoupper(trim($symbol));
    $assetType = vp_normalize_asset_type($typeRaw);
    $market = strtolower(trim($market));
    if ($symbol === '') return false;
    if ($assetType === 'crypto') return $market === 'perp' && vp_is_binance_style_crypto_symbol($symbol);
    if ($assetType !== 'futures') return false;
    if (preg_match('/(_F|1!)$/', $symbol)) return false;
    if (!vp_is_binance_style_crypto_symbol($symbol)) return false;
    $tv = strtoupper(trim((string)($meta['tv_symbol'] ?? '')));
    $providerSymbol = strtoupper(trim((string)($meta['provider_symbol'] ?? $meta['binance_symbol'] ?? '')));
    if ($tv !== '' && str_starts_with($tv, 'BINANCE:')) return true;
    if ($providerSymbol !== '' && str_starts_with($providerSymbol, 'BINANCE:')) return true;
    return true;
  }
}

if (!function_exists('vp_market_context')) {
  function vp_market_context(string $symbol, string $typeRaw = '', string $market = 'spot', array $meta = []): array {
    $symbol = strtoupper(trim($symbol));
    $assetType = vp_normalize_asset_type($typeRaw);
    $market = strtolower(trim($market));
    if ($market !== 'perp') $market = 'spot';
    $providerType = vp_provider_asset_type($assetType, $market);
    $isCryptoPerp = vp_is_crypto_perp_context($symbol, $assetType, $market, $meta);
    if ($isCryptoPerp) {
      $providerType = 'crypto';
      $market = 'perp';
    } elseif ($providerType !== 'crypto') {
      $market = 'spot';
    }
    return [
      'symbol' => $symbol,
      'asset_type' => $assetType,
      'provider_type' => $providerType,
      'market' => $market,
      'effective_market' => $market,
      'is_crypto_perp' => $isCryptoPerp,
    ];
  }
}
