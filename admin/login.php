<?php
require_once __DIR__ . '/includes/auth.php';

if (admin_is_logged_in()) {
  header('Location: /admin/dashboard.php');
  exit;
}

$error = '';
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  $email = trim((string)($_POST['email'] ?? ''));
  $pass = (string)($_POST['password'] ?? '');
  if (admin_credentials_ok($email, $pass)) {
    $_SESSION['admin_ok'] = true;
    $_SESSION['admin_email'] = $email;
    header('Location: /admin/dashboard.php');
    exit;
  }
  $error = 'Invalid credentials';
}

$errHtml = $error ? "<div class='card'><span class='pill bad'>{$error}</span></div>" : '';
$body = $errHtml . "
<div class='card' style='max-width:520px;margin:40px auto'>
  <h2 style='margin-top:0'>Admin login</h2>
  <form method='post'>
    <div style='display:grid;gap:10px'>
      <input name='email' placeholder='Email' required>
      <input name='password' placeholder='Password' type='password' required>
      <button class='btn' type='submit'>Login</button>
    </div>
  </form>
  <p style='opacity:.8;margin-bottom:0'>Tip: set ADMIN_EMAIL + ADMIN_PASSWORD in .env</p>
</div>";
admin_layout('Admin Login', $body);
