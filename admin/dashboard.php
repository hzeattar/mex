
<?php
require_once __DIR__ . '/includes/auth.php';
admin_require();

$pdo = db();
$u = (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
$dPending = (int)$pdo->query("SELECT COUNT(*) FROM deposits WHERE status IN ('pending','requested')")->fetchColumn();
$wRequested = (int)$pdo->query("SELECT COUNT(*) FROM withdrawals WHERE status IN ('requested','pending','review','risk_review','approved','processing')")->fetchColumn();
$kycPending = (int)$pdo->query("SELECT COUNT(*) FROM kyc_requests WHERE status IN ('pending','under_review')")->fetchColumn();
$signalsActive = 0;
try { $signalsActive = (int)$pdo->query("SELECT COUNT(*) FROM trading_signals WHERE status='active'")->fetchColumn(); } catch (Throwable $e) {}
$fundingMethodsActive = 0;
try { $fundingMethodsActive = (int)$pdo->query("SELECT COUNT(*) FROM payment_methods WHERE status='active'")->fetchColumn(); } catch (Throwable $e) {}
$marketsActive = 0;
try { $marketsActive = (int)$pdo->query("SELECT COUNT(*) FROM markets WHERE status='active'")->fetchColumn(); } catch (Throwable $e) {}
$supportOpen = 0;
try { $supportOpen = (int)$pdo->query("SELECT COUNT(*) FROM support_tickets WHERE status IN ('open','pending')")->fetchColumn(); } catch (Throwable $e) {}
$supportUnread = 0;
try { $supportUnread = (int)$pdo->query("SELECT COUNT(*) FROM support_tickets WHERE COALESCE(last_message_at,0) > COALESCE(admin_last_viewed_at,0) AND id IN (SELECT ticket_id FROM support_messages WHERE sender='user')")->fetchColumn(); } catch (Throwable $e) {}
$contractsActive = 0;
try { $contractsActive = (int)$pdo->query("SELECT COUNT(*) FROM invest_plans WHERE COALESCE(product_kind,'plan')='contract' AND status='active'")->fetchColumn(); } catch (Throwable $e) {}
$levelsActive = 0;
try { $levelsActive = (int)$pdo->query("SELECT COUNT(*) FROM customer_levels WHERE status='active'")->fetchColumn(); } catch (Throwable $e) {}
$signalDeskActive = 0;
try { $signalDeskActive = (int)$pdo->query("SELECT COUNT(*) FROM trading_signals WHERE status='active' AND COALESCE(bot_enabled,0)=1")->fetchColumn(); } catch (Throwable $e) {}
$copySubscriptions = 0;
try { $copySubscriptions = (int)$pdo->query("SELECT COUNT(*) FROM trading_bot_subscriptions WHERE status IN ('active','armed','copied')")->fetchColumn(); } catch (Throwable $e) {}
$newsPublished = 0;
try { $newsPublished = (int)$pdo->query("SELECT COUNT(*) FROM announcements WHERE status='published'")->fetchColumn(); } catch (Throwable $e) {}
$latestSupport = [];
try { $latestSupport = $pdo->query("SELECT id,subject,reason_code,status,priority,updated_at FROM support_tickets ORDER BY COALESCE(last_message_at,updated_at,created_at) DESC, id DESC LIMIT 6")->fetchAll(PDO::FETCH_ASSOC) ?: []; } catch (Throwable $e) {}
$latestNews = [];
try { $latestNews = $pdo->query("SELECT id,title_en,title_ar,title_ru,status,pinned,published_at,updated_at FROM announcements ORDER BY pinned DESC, published_at DESC, id DESC LIMIT 6")->fetchAll(PDO::FETCH_ASSOC) ?: []; } catch (Throwable $e) {}
$audit = admin_recent_audit(8);

$body = "<div class='split'><div><h1 class='section-title'>Admin Dashboard</h1><div class='muted small'>Operations overview for funding, verification, signals, and the latest backoffice actions.</div></div><div class='inline-actions'><a class='btn' href='/admin/deposits.php'>Review deposits</a><a class='btn' href='/admin/withdrawals.php'>Review withdrawals</a><a class='btn' href='/admin/kyc.php'>Open KYC queue</a></div></div>";
$body .= "<div class='stats-grid'>";
$body .= admin_stat_card('Users', (string)$u, 'Registered client accounts in the platform database.');
$body .= admin_stat_card('Deposits pending', (string)$dPending, 'Requests that still need operator review or confirmation.');
$body .= admin_stat_card('Withdrawals queue', (string)$wRequested, 'Requested + approved withdrawals still in progress.');
$body .= admin_stat_card('KYC queue', (string)$kycPending, 'Identity submissions still waiting for a decision.');
$body .= admin_stat_card('Active signals', (string)$signalsActive, 'Published trading signals currently visible to clients.');
$body .= admin_stat_card('Support queue', (string)$supportOpen, 'Open or pending support conversations that need a reply.');
$body .= admin_stat_card('Signal desk', (string)$signalDeskActive, 'Copy-ready platform signals currently published to clients.');
$body .= admin_stat_card('Contracts', (string)$contractsActive, 'Premium contracts currently available in Earn.');
$body .= admin_stat_card('Customer levels', (string)$levelsActive, 'Active level tiers used to gate premium contracts.');
$body .= admin_stat_card('Copy subscriptions', (string)$copySubscriptions, 'Active, armed, or copied signal subscriptions.');
$body .= admin_stat_card('Unread support', (string)$supportUnread, 'Tickets with fresh client replies since the last admin view.');
$body .= admin_stat_card('Published news', (string)$newsPublished, 'Client-facing announcements currently visible in the app.');
$body .= admin_stat_card('Funding methods', (string)$fundingMethodsActive, 'Active admin-configured payment methods exposed to clients.');
$body .= admin_stat_card('Market catalog', (string)$marketsActive, 'Active markets exposed across watchlists, trade, and home surfaces.');
$body .= admin_stat_card('Audit entries', (string)count($audit), 'Most recent admin actions recorded for traceability.');
$body .= "</div>";

$body .= "<div class='card'><div class='split'><div><h2 style='margin:0 0 6px'>Quick actions</h2><div class='muted small'>Jump straight into the highest-impact operating queues and revenue products.</div></div></div><div class='inline-actions' style='margin-top:12px'><a class='btn' href='/admin/deposits.php?status=pending'>Pending deposits</a><a class='btn' href='/admin/withdrawals.php?status=requested'>Withdrawal requests</a><a class='btn' href='/admin/kyc.php?status=pending'>Pending KYC</a><a class='btn' href='/admin/signals.php'>Signal desk</a><a class='btn' href='/admin/contracts.php'>Contracts</a><a class='btn' href='/admin/customer_levels.php'>Customer levels</a><a class='btn' href='/admin/payment_methods.php'>Payment methods</a><a class='btn' href='/admin/support_tickets.php'>Support tickets</a><a class='btn' href='/admin/news.php'>News</a><a class='btn' href='/admin/audit_logs.php'>Audit logs</a></div></div>";

$body .= "<div class='card'><div class='split'><div><h2 style='margin:0 0 6px'>Feature control matrix</h2><div class='muted small'>Every premium surface in the client app now points to a dedicated admin page so operators can control content, pricing, visibility, and risk decisions without touching code.</div></div><a class='btn' href='/admin/site_settings.php'>Open platform settings</a></div><div class='table-wrap' style='margin-top:12px'><table><thead><tr><th>Client surface</th><th>Admin owner</th><th>Primary control</th><th>Notes</th></tr></thead><tbody>";
$body .= "<tr><td>Signal desk</td><td><a href='/admin/signals.php'>Signals</a></td><td>Publish / hide / pin copy-ready signals</td><td>Live cards, copy dialog, and history all read from this queue.</td></tr>";
$body .= "<tr><td>Premium contracts</td><td><a href='/admin/contracts.php'>Contracts</a></td><td>Return, duration, min/max, level gating</td><td>Client Earn cards and contract subscriptions respect these values.</td></tr>";
$body .= "<tr><td>Customer levels</td><td><a href='/admin/customer_levels.php'>Customer levels</a></td><td>Tier names, thresholds, perks, access tone</td><td>Used in dashboard strips, Earn gating, and contract visibility.</td></tr>";
$body .= "<tr><td>News center</td><td><a href='/admin/news.php'>News</a> + <a href='/admin/news_settings.php'>Controls</a></td><td>Publish feed, ticker, toast, images, CTA</td><td>Drives dashboard ticker, notifications, and the dedicated News page.</td></tr>";
$body .= "<tr><td>Deposits / withdrawals</td><td><a href='/admin/payment_methods.php'>Payment methods</a> + queues</td><td>Methods, statuses, proofs, processing</td><td>Client wallet flows follow the admin-configured methods.</td></tr>";
$body .= "<tr><td>Markets & symbols</td><td><a href='/admin/markets.php'>Markets</a></td><td>Catalog visibility, labels, categories</td><td>Used by watchlists, symbol drawers, and market landing pages.</td></tr>";
$body .= "<tr><td>Support center</td><td><a href='/admin/support_tickets.php'>Support tickets</a></td><td>Reply queue, priorities, internal notes</td><td>Unread counters and client notifications are derived here.</td></tr>";
$body .= "</tbody></table></div></div>";
$body .= "<div class='card'><div class='split'><div><h2 style='margin:0 0 6px'>News center controls</h2><div class='muted small'>Control whether the feed appears in the app menu, dashboard ticker, and in-app toasts. Use the news manager to publish, pin, archive, or schedule multilingual announcements with images.</div></div><div class='inline-actions'><a class='btn' href='/admin/news.php'>Manage news</a><a class='btn' href='/admin/news_settings.php'>Open controls</a></div></div></div>";
$body .= "<div class='admin-two-col'>";
$body .= "<div class='card'><div class='split'><div><h2 style='margin:0 0 6px'>Latest support tickets</h2><div class='muted small'>Newest conversations that may need an operator response.</div></div><a class='btn' href='/admin/support_tickets.php'>Open support</a></div>";
if (!$latestSupport) {
  $body .= "<div class='empty' style='margin-top:12px'>No support tickets yet.</div>";
} else {
  $body .= "<div class='table-wrap' style='margin-top:12px'><table><thead><tr><th>ID</th><th>Subject</th><th>Status</th><th>Updated</th></tr></thead><tbody>";
  foreach ($latestSupport as $row) {
    $title = trim((string)($row['subject'] ?: $row['reason_code'] ?: ('Ticket #' . (int)$row['id'])));
    $body .= "<tr><td><a href='/admin/support_tickets.php?id=" . (int)$row['id'] . "'>#" . (int)$row['id'] . "</a></td><td>" . admin_h($title) . "</td><td>" . admin_status_pill((string)($row['status'] ?? 'open')) . "</td><td>" . admin_format_ts($row['updated_at'] ?? 0) . "</td></tr>";
  }
  $body .= "</tbody></table></div>";
}
$body .= "</div>";
$body .= "<div class='card'><div class='split'><div><h2 style='margin:0 0 6px'>Latest announcements</h2><div class='muted small'>Newest published or drafted client-facing news items.</div></div><a class='btn' href='/admin/news.php'>Open news</a></div>";
if (!$latestNews) {
  $body .= "<div class='empty' style='margin-top:12px'>No announcements yet.</div>";
} else {
  $body .= "<div class='table-wrap' style='margin-top:12px'><table><thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Published</th></tr></thead><tbody>";
  foreach ($latestNews as $row) {
    $title = trim((string)($row['title_en'] ?: $row['title_ar'] ?: $row['title_ru'] ?: ('Announcement #' . (int)$row['id'])));
    $body .= "<tr><td><a href='/admin/news.php?id=" . (int)$row['id'] . "'>#" . (int)$row['id'] . "</a></td><td>" . admin_h($title) . ((int)($row['pinned'] ?? 0)===1 ? " <span class='pill ok'>Pinned</span>" : "") . "</td><td>" . admin_status_pill((string)($row['status'] ?? 'draft')) . "</td><td>" . admin_format_ts(($row['published_at'] ?? $row['updated_at'] ?? 0)) . "</td></tr>";
  }
  $body .= "</tbody></table></div>";
}
$body .= "</div></div>";
$body .= "<div class='card'><div class='split'><div><h2 style='margin:0 0 6px'>Recent admin activity</h2><div class='muted small'>Best-effort audit feed for review actions, notes, and other sensitive changes.</div></div><a class='btn' href='/admin/audit_logs.php'>Open full log</a></div>";
if (!$audit) {
  $body .= "<div class='empty' style='margin-top:12px'>No audit entries recorded yet.</div>";
} else {
  $body .= "<div class='table-wrap' style='margin-top:12px'><table><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Summary</th></tr></thead><tbody>";
  foreach ($audit as $row) {
    $body .= "<tr><td>" . admin_format_ts($row['created_at']) . "</td><td>" . admin_h($row['admin_email']) . "</td><td>" . admin_h($row['action']) . "</td><td>" . admin_h($row['entity']) . " #" . (int)$row['entity_id'] . "</td><td>" . admin_h($row['summary']) . "</td></tr>";
  }
  $body .= "</tbody></table></div>";
}
$body .= "</div>";

admin_layout('Admin Dashboard', $body);
