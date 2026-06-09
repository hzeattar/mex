<?php
/**
 * Create Admin User Script
 * Run this once to create an admin user for testing
 * URL: /api/admin/setup.php?key=SETUP_ADMIN_2026
 */
require_once __DIR__ . '/../lib/common.php';

// Simple security check - use a setup key
$setupKey = $_GET['key'] ?? '';
if ($setupKey !== 'SETUP_ADMIN_2026') {
    json_response(['ok' => false, 'error' => 'Invalid setup key'], 403);
}

$pdo = db();

try {
    // Check if admin already exists
    $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $check->execute(['admin@mex.ae']);
    $existing = $check->fetch(PDO::FETCH_ASSOC);
    
    if ($existing) {
        // Update to admin
        $pdo->prepare("UPDATE users SET role = 'admin', kyc_status = 'approved' WHERE id = ?")
            ->execute([$existing['id']]);
        json_response(['ok' => true, 'message' => 'Admin user updated', 'user_id' => $existing['id']]);
    }
    
    // Create new admin user
    $passwordHash = password_hash('Admin@2026', PASSWORD_DEFAULT);
    
    $stmt = $pdo->prepare("INSERT INTO users 
        (email, password_hash, first_name, last_name, role, kyc_status, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");
    
    $stmt->execute([
        'admin@mex.ae',
        $passwordHash,
        'System',
        'Administrator',
        'admin',
        'approved',
        'active'
    ]);
    
    $adminId = $pdo->lastInsertId();
    
    // Create wallet for admin
    $pdo->prepare("INSERT INTO wallets (user_id, real_usdt, demo_usdt, created_at) VALUES (?, 100000, 50000, NOW())")
        ->execute([$adminId]);
    
    json_response([
        'ok' => true,
        'message' => 'Admin user created successfully',
        'admin' => [
            'id' => $adminId,
            'email' => 'admin@mex.ae',
            'password' => 'Admin@2026',
            'role' => 'admin'
        ]
    ]);
    
} catch (Exception $e) {
    json_response(['ok' => false, 'error' => $e->getMessage()], 500);
}
