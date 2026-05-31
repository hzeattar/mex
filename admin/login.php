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

$errHtml = $error ? "<div class='admin-login-error'><span class='pill bad'>" . htmlspecialchars($error, ENT_QUOTES, 'UTF-8') . "</span></div>" : '';
$body = $errHtml . "
<div class='admin-login-shell'>
  <div class='admin-login-card'>
    <section class='admin-login-hero'>
      <div class='admin-login-mark'><span class='admin-login-logo'>M</span><span>MEX Group</span></div>
      <h1>Operations console</h1>
      <p>Review clients, KYC, deposits, withdrawals, markets, copy signals, contracts, support, and audit trails from one protected workspace.</p>
      <div class='admin-login-points'>
        <span>Ledger-first financial controls</span>
        <span>Signals and contracts management</span>
        <span>Funding, support, and compliance queues</span>
      </div>
    </section>
    <section class='admin-login-form'>
      <h2>Admin sign in</h2>
      <p>Use the Railway environment credentials for this deployment. Do not expose admin access inside the client app.</p>
      <form method='post' autocomplete='on'>
        <input name='email' placeholder='Admin email' type='email' required>
        <input name='password' placeholder='Password' type='password' required>
        <button class='btn' type='submit'>Open console</button>
      </form>
      <p class='small muted'>Set ADMIN_EMAIL and ADMIN_PASSWORD in the Railway mex service variables.</p>
    </section>
  </div>
</div>";
admin_layout('Admin Login', $body);
