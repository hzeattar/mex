<?php
// Quick delete tier_1 from customer_levels
require_once __DIR__ . '/../api/bootstrap.php';
header('Content-Type: application/json');

$pdo = db_pdo();
$deleted = 0;

try {
  // Delete tier_1
  $stmt = $pdo->prepare("DELETE FROM customer_levels WHERE level_code = 'tier_1' OR name_en = 'Tier 1' OR name_en LIKE '%Tier 1%'");
  $stmt->execute();
  $deleted += $stmt->rowCount();
  
  // Also delete any numeric tier levels
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
