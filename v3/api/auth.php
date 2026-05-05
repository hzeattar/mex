<?php
/**
 * V3 Auth API
 * POST /api/auth (login/register)
 * GET /api/auth (check session)
 */
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Check session
    $uid = get_user_id();
    if ($uid) {
        $stmt = $pdo->prepare("SELECT id, email, name, created_at FROM users WHERE id = ?");
        $stmt->execute([$uid]);
        $user = $stmt->fetch();
        json_response(['ok' => true, 'user' => $user]);
    } else {
        json_response(['ok' => false, 'error' => 'Not logged in']);
    }
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';

    if ($action === 'login') {
        $email = filter_var($data['email'] ?? '', FILTER_SANITIZE_EMAIL);
        $password = $data['password'] ?? '';

        $stmt = $pdo->prepare("SELECT id, email, name, password FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password'])) {
            session_start();
            $_SESSION['user_id'] = $user['id'];
            unset($user['password']);
            json_response(['ok' => true, 'user' => $user]);
        } else {
            json_response(['ok' => false, 'error' => 'Invalid credentials'], 401);
        }
    }

    if ($action === 'register') {
        $email = filter_var($data['email'] ?? '', FILTER_SANITIZE_EMAIL);
        $password = $data['password'] ?? '';
        $name = trim($data['name'] ?? '');

        if (strlen($password) < 6) {
            json_response(['ok' => false, 'error' => 'Password must be at least 6 characters']);
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);

        try {
            $stmt = $pdo->prepare("INSERT INTO users (email, password, name, created_at) VALUES (?, ?, ?, ?)");
            $stmt->execute([$email, $hash, $name, $now]);
            $userId = $pdo->lastInsertId();
            
            // Create default wallet
            $stmt = $pdo->prepare("INSERT INTO wallets (user_id, currency, balance) VALUES (?, 'USDT', 10000)");
            $stmt->execute([$userId]);

            session_start();
            $_SESSION['user_id'] = $userId;
            json_response(['ok' => true, 'user' => ['id' => $userId, 'email' => $email, 'name' => $name]]);
        } catch (PDOException $e) {
            json_response(['ok' => false, 'error' => 'Email already exists']);
        }
    }

    if ($action === 'logout') {
        session_start();
        session_destroy();
        json_response(['ok' => true]);
    }
}

json_response(['ok' => false, 'error' => 'Invalid action']);
