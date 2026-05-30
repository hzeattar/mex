<?php
// Ultra-minimal health check — NO dependencies, NO database
header('Content-Type: application/json');
echo json_encode([
  'ok' => true,
  'service' => 'mexgroup',
  'time' => time(),
  'port' => $_SERVER['SERVER_PORT'] ?? 'unknown',
  'php' => PHP_VERSION,
]);
