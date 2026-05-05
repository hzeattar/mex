<?php
declare(strict_types=1);
/**
 * Common functions and database connection
 * 
 * This is a minimal version for the new V3 API structure.
 * Copy this to api/lib/common.php
 */

// Environment variables
function env(string $key, mixed $default = ''): mixed {
    $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key) ?: $default;
    return $value;
}

// Database connection (PDO)
function db(): PDO {
    static $pdo = null;
    
    if ($pdo === null) {
        $host = env('DB_HOST', 'localhost');
        $dbname = env('DB_NAME', 'mex');
        $user = env('DB_USER', 'root');
        $pass = env('DB_PASS', '');
        
        $dsn = 'mysql:host=' . $host . ';dbname=' . $dbname . ';charset=utf8mb4';
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        
        $pdo = new PDO($dsn, $user, $pass, $options);
    }
    
    return $pdo;
}

// JSON response helper
function json_response(mixed $data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
}

// Normalize asset type
function vp_normalize_asset_type(string $type): string {
    $type = strtolower(trim($type));
    $map = [
        'cryptocurrency' => 'crypto',
        'forex' => 'forex',
        'fx' => 'forex',
        'stock' => 'stocks',
        'index' => 'stocks',
        'commodity' => 'commodities',
        'future' => 'futures',
        'arab' => 'arab',
        'tadawul' => 'arab',
    ];
    return $map[$type] ?? $type;
}