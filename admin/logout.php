<?php
require_once __DIR__ . '/includes/auth.php';
admin_logout_now();
header('Location: /admin/login.php');
exit;
