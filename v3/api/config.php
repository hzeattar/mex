<?php
/**
 * V3 Platform - Main Config
 * Clean, minimal, fast
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Database config
$dbHost = 'localhost';
$dbName = 'vertexpluse_meg';
$dbUser = 'vertexpluse_mega';
$dbPass = '2372005@Hh';

try {
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    json_response(['ok' => false, 'error' => 'Database connection failed']);
    exit;
}

// Helper functions
function json_response($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function sanitize_symbol($sym) {
    $sym = strtoupper(trim((string)$sym));
    return preg_match('/^[A-Z0-9:._-]{2,32}$/', $sym) ? $sym : null;
}

function round_price($price) {
    return round((float)$price, 8);
}

function round_pct($pct) {
    return round((float)$pct, 4);
}

// Get authenticated user (simple session-based)
function get_user_id() {
    session_start();
    return $_SESSION['user_id'] ?? null;
}

function require_auth() {
    $uid = get_user_id();
    if (!$uid) {
        json_response(['ok' => false, 'error' => 'Unauthorized'], 401);
    }
    return $uid;
}
