<?php
/**
 * V3 Cron - Update Prices
 * Runs every minute
 */
require_once __DIR__ . '/../config.php';

$now = time();
$updated = 0;

echo "=== V3 Price Update Cron ===\n";
echo "Time: " . date('Y-m-d H:i:s') . "\n\n";

// 1. Update Crypto from Binance
echo "1. Updating Crypto from Binance...\n";
try {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://fapi.binance.com/fapi/v1/premiumIndex');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
    $data = curl_exec($ch);
    curl_close($ch);

    $prices = json_decode($data, true);
    if (is_array($prices)) {
        $priceMap = [];
        foreach ($prices as $p) {
            $sym = str_replace('USDT', '', $p['symbol']);
            $priceMap[$sym] = [
                'price' => $p['markPrice'] ?? $p['lastPrice'] ?? 0,
                'index' => $p['indexPrice'] ?? 0,
                'funding' => $p['lastFundingRate'] ?? 0,
            ];
        }

        // Get all crypto symbols from DB
        $stmt = $pdo->query("SELECT symbol FROM markets WHERE type='crypto' AND status='active'");
        $cryptoSymbols = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $updateStmt = $pdo->prepare("
            UPDATE markets 
            SET price = ?, mark_price = ?, index_price = ?, funding_rate = ?, 
                updated_at = ?, source = 'binance'
            WHERE symbol = ?
        ");

        foreach ($cryptoSymbols as $sym) {
            if (isset($priceMap[$sym]) && $priceMap[$sym]['price'] > 0) {
                $updateStmt->execute([
                    $priceMap[$sym]['price'],
                    $priceMap[$sym]['price'],
                    $priceMap[$sym]['index'],
                    $priceMap[$sym]['funding'],
                    $now,
                    $sym
                ]);
                $updated++;
            }
        }
        echo "   Updated $updated crypto symbols\n";
    }
} catch (Exception $e) {
    echo "   Error: " . $e->getMessage() . "\n";
}

// 2. Update other types from existing market_quotes table (seed data)
echo "\n2. Syncing other types from market_quotes...\n";
try {
    $types = ['forex', 'stocks', 'futures', 'arab', 'commodities', 'indices'];
    
    foreach ($types as $type) {
        $stmt = $pdo->prepare("
            UPDATE markets m
            JOIN market_quotes q ON q.symbol = m.symbol
            SET m.price = q.price, 
                m.change_pct = q.change_pct,
                m.updated_at = q.updated_at,
                m.source = q.source
            WHERE m.type = ? AND m.status = 'active' AND q.price > 0
        ");
        $stmt->execute([$type]);
        $count = $stmt->rowCount();
        echo "   $type: $count updated\n";
        $updated += $count;
    }
} catch (Exception $e) {
    echo "   Error: " . $e->getMessage() . "\n";
}

echo "\n=== Done ===\n";
echo "Total updated: $updated\n";
echo "Timestamp: $now\n";
