<?php
// Simple TwelveData diagnostics - executed directly via PHP-FPM
$symbol = $_GET['symbol'] ?? 'XAUUSD';
$type = $_GET['type'] ?? 'commodities';
header('Content-Type: application/json');
echo json_encode(['hello' => true, 'symbol' => $symbol, 'type' => $type, 'time' => time()]);
