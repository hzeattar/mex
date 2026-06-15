<?php
// Delete tier_1 level if it exists
require_once __DIR__ . '/../bootstrap.php';
header('Content-Type: application/json');

$pdo = db_pdo();
$driver = db_driver();

try {
  $stmt = $pdo->prepare("DELETE FROM customer_levels WHERE level_code = 'tier_1' OR name_en = 'Tier 1' OR name_en LIKE '%Tier 1%'");
  $stmt->execute();
  $deleted = $stmt->rowCount();
  
  echo json_encode([
    'ok' => true,
    'deleted' => $deleted,
    'message' => $deleted > 0 ? "Deleted {$deleted} Tier 1 level(s)" : "No Tier 1 level found"
  ]);
} catch (Throwable $e) {
  echo json_encode([
    'ok' => false,
    'error' => $e->getMessage()
  ]);
}
