<?php
declare(strict_types=1);

/**
 * Simple isolated perp risk helpers.
 * Lightweight for shared hosting.
 */

require_once __DIR__ . '/settings.php';

/**
 * Tiny settings cache (request-scope) to avoid repeated DB calls.
 */
function _sget(string $key, mixed $default = null): mixed {
  static $cache = [];
  if (array_key_exists($key, $cache)) return $cache[$key];
  $v = setting_get($key, $default);
  $cache[$key] = $v;
  return $v;
}

function clamp_int(int $v, int $min, int $max): int {
  return max($min, min($max, $v));
}

function clamp_float(float $v, float $min, float $max): float {
  return max($min, min($max, $v));
}

function perp_maintenance_margin_rate(): float {
  // 0.5% default
  $v = _sget('PERP_MAINTENANCE_MARGIN_RATE', null);
  if ($v !== null && $v !== '') return max(0.0, (float)$v);
  return (float)env('PERP_MAINTENANCE_MARGIN_RATE', '0.005');
}

function perp_calc_initial_margin(float $qty, float $price, int $leverage): float {
  if ($qty <= 0 || $price <= 0) return 0.0;
  $lev = max(1, $leverage);
  return ($qty * $price) / $lev;
}

function perp_calc_liquidation_price(float $entry, float $qty, string $side, int $leverage): ?float {
  if ($entry <= 0 || $qty <= 0) return null;
  $mmr = perp_maintenance_margin_rate();
  $lev = max(1, $leverage);
  $side = strtoupper(trim($side));
  if ($side === 'BUY' || $side === 'LONG') {
    // P_liq = entry*(1 + mmr - 1/lev)
    return max(0.00000001, $entry * (1.0 + $mmr - (1.0 / $lev)));
  }
  // short: P_liq = entry*(1 - mmr + 1/lev)
  return max(0.00000001, $entry * (1.0 - $mmr + (1.0 / $lev)));
}

function perp_calc_pnl(float $entry, float $mark, float $qty, string $side): float {
  $side = strtoupper(trim($side));
  if ($side === 'SELL' || $side === 'SHORT') return ($entry - $mark) * $qty;
  return ($mark - $entry) * $qty;
}

function trade_fee_rate(string $marketType, string $orderType = 'MARKET'): float {
  // Fees can be toggled off (default OFF). The project will start with zero fees.
  // Enable by setting TRADING_FEES_ENABLED=1 (in settings table or .env), and then
  // configure SPOT/PERP maker/taker fee rates.
  $feesEnabled = (int)(_sget('TRADING_FEES_ENABLED', env('TRADING_FEES_ENABLED','0')));
  if ($feesEnabled !== 1) return 0.0;
  $marketType = strtolower($marketType);
  $orderType = strtoupper($orderType);
  // Defaults close to common exchanges (taker higher). Keep tiny for demo realism.
  $spotMaker = (float)(_sget('SPOT_MAKER_FEE', env('SPOT_MAKER_FEE', '0.0002')));
  $spotTaker = (float)(_sget('SPOT_TAKER_FEE', env('SPOT_TAKER_FEE', '0.0004')));
  $perpMaker = (float)(_sget('PERP_MAKER_FEE', env('PERP_MAKER_FEE', '0.0002')));
  $perpTaker = (float)(_sget('PERP_TAKER_FEE', env('PERP_TAKER_FEE', '0.0004')));
  $isMaker = ($orderType === 'LIMIT');
  if ($marketType === 'perp') return max(0.0, $isMaker ? $perpMaker : $perpTaker);
  return max(0.0, $isMaker ? $spotMaker : $spotTaker);
}

function trade_calc_fee(float $notional, float $rate): float {
  if ($notional <= 0) return 0.0;
  return max(0.0, $notional * max(0.0, $rate));
}
