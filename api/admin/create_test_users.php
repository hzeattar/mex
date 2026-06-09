<?php
/**
 * Create Test Users Script
 * Creates demo users with different roles for testing
 * URL: /api/admin/create_test_users.php?key=SETUP_ADMIN_2026
 */
require_once __DIR__ . '/../lib/common.php';

$setupKey = $_GET['key'] ?? '';
if ($setupKey !== 'SETUP_ADMIN_2026') {
    json_response(['ok' => false, 'error' => 'Invalid setup key'], 403);
}

$pdo = db();
$created = [];

try {
    // Test users data
    $testUsers = [
        [
            'email' => 'user1@test.com',
            'password' => 'User@2026',
            'first_name' => 'Test',
            'last_name' => 'User 1',
            'role' => 'user',
            'kyc_status' => 'approved',
            'real_balance' => 10000,
            'demo_balance' => 5000
        ],
        [
            'email' => 'user2@test.com',
            'password' => 'User@2026',
            'first_name' => 'Test',
            'last_name' => 'User 2',
            'role' => 'user',
            'kyc_status' => 'pending',
            'real_balance' => 5000,
            'demo_balance' => 10000
        ],
        [
            'email' => 'trader@test.com',
            'password' => 'Trader@2026',
            'first_name' => 'Pro',
            'last_name' => 'Trader',
            'role' => 'trader',
            'kyc_status' => 'approved',
            'real_balance' => 50000,
            'demo_balance' => 25000
        ],
        [
            'email' => 'support@mex.ae',
            'password' => 'Support@2026',
            'first_name' => 'Support',
            'last_name' => 'Team',
            'role' => 'support',
            'kyc_status' => 'approved',
            'real_balance' => 1000,
            'demo_balance' => 1000
        ]
    ];
    
    foreach ($testUsers as $user) {
        // Check if exists
        $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $check->execute([$user['email']]);
        $existing = $check->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            $created[] = ['email' => $user['email'], 'status' => 'already_exists', 'id' => $existing['id']];
            continue;
        }
        
        // Create user
        $passwordHash = password_hash($user['password'], PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users 
            (email, password_hash, first_name, last_name, role, kyc_status, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'active', NOW())");
        
        $stmt->execute([
            $user['email'],
            $passwordHash,
            $user['first_name'],
            $user['last_name'],
            $user['role'],
            $user['kyc_status']
        ]);
        
        $userId = $pdo->lastInsertId();
        
        // Create wallet
        $pdo->prepare("INSERT INTO wallets (user_id, real_usdt, demo_usdt, created_at) VALUES (?, ?, ?, NOW())")
            ->execute([$userId, $user['real_balance'], $user['demo_balance']]);
        
        $created[] = [
            'email' => $user['email'],
            'password' => $user['password'],
            'role' => $user['role'],
            'status' => 'created',
            'id' => $userId
        ];
    }
    
    json_response([
        'ok' => true,
        'message' => 'Test users created',
        'users' => $created
    ]);
    
} catch (Exception $e) {
    json_response(['ok' => false, 'error' => $e->getMessage(), 'users' => $created], 500);
}
