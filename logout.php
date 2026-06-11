<?php
declare(strict_types=1);
require_once __DIR__ . '/_common.php';

// Accept POST (API-style) and GET (plain link fallback) so logout always works.
clear_session_user_id();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if ($method === 'POST') {
  json_response(['ok' => true]);
}
header('Location: /', true, 302);
exit;
