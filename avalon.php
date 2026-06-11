<?php
// Backward-compatible entrypoint for older Avalon admin links.
// The maintained Avalon AI Trading Bot desk lives in admin/signals.php and uses
// the standard admin session guard. Keeping this redirect prevents the legacy
// user-session page from logging admins out or showing a false access-denied.
require_once __DIR__ . '/admin/includes/auth.php';

admin_require();
header('Location: /admin/signals.php', true, 302);
exit;
