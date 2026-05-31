<?php
session_start();
require_once __DIR__ . '/includes/auth.php';
if (admin_is_logged_in()) {
  header('Location: /admin/dashboard.php');
} else {
  header('Location: /admin/login.php');
}
exit;
