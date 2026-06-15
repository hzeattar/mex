<?php
// Admin endpoint to delete tier_1 level
require_once __DIR__ . '/../bootstrap.php';
header('Content-Type: application/json');

// Require admin auth
$uid = 0;
try { $uid = session_user_id(); } catch (Throwable $e) {}
if ($uid <= 0) {
  http_response_code(401);
  echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
  exit;
}

// Check if user is admin
$pdo = db_pdo();
try {
  $isAdmin = (int)($pdo->prepare("SELECT is_admin FROM users WHERE id=?")->execute([$uid]) ? $pdo->prepare("SELECT is_admin FROM users WHERE id=?")->fetchColumn() : 0);
} catch (Throwable $e) { $isAdmin = 0; }

if (!$isAdmin) {
  http_response_code(403);
  echo json_encode(['ok' => false, 'error' => 'Admin only']);
  exit;
}

$deleted = 0;
$messages = [];

try {
  // Delete tier_1 by level_code or name
  $stmt = $pdo->prepare("DELETE FROM customer_levels WHERE level_code = 'tier_1' OR name_en = 'Tier 1' OR name_en LIKE '%Tier 1%'");
  $stmt->execute();
  $deleted += $stmt->rowCount();
  
  // Also check for any numeric tier levels
  $stmt2 = $pdo->prepare("DELETE FROM customer_levels WHERE level_code REGEXP '^tier_[0-9]+$' OR name_en REGEXP '^Tier [0-9]+$'");
  $stmt2->execute();
  $deleted += $stmt2->rowCount();
  
  echo json_encode([
    'ok' => true,
    'deleted' => $deleted,
    'message' => $deleted > 0 ? "Deleted {$deleted} Tier level(s)" : "No Tier levels found"
  ]);
} catch (Throwable $e) {
  echo json_encode([
    'ok' => false,
    'error' => $e->getMessage()
  ]);
}
