<?php
require_once __DIR__ . '/admin/includes/auth.php';
admin_require();
$pdo = db();
$msg = '';
$selectedId = (int)($_GET['id'] ?? $_POST['ticket_id'] ?? 0);
$statusFilter = strtolower(trim((string)($_GET['status'] ?? 'open')));
$q = trim((string)($_GET['q'] ?? ''));

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  try {
    admin_verify_csrf();
    $ticketId = (int)($_POST['ticket_id'] ?? 0);
    $action = trim((string)($_POST['ticket_action'] ?? 'save'));
    $reply = trim((string)($_POST['reply'] ?? ''));
    $adminNote = trim((string)($_POST['admin_note'] ?? ''));
    $priority = strtolower(trim((string)($_POST['priority'] ?? 'normal')));
    if (!in_array($priority, ['low','normal','high','urgent'], true)) $priority = 'normal';
    if ($ticketId > 0) {
      $st = $pdo->prepare('SELECT * FROM support_tickets WHERE id=? LIMIT 1');
      $st->execute([$ticketId]);
      $ticket = $st->fetch(PDO::FETCH_ASSOC) ?: null;
      if ($ticket) {
        $nextStatus = (string)($ticket['status'] ?? 'open');
        if (in_array($action, ['open','pending','resolved','closed'], true)) $nextStatus = $action;
        $now = time();
        $pdo->prepare('UPDATE support_tickets SET status=?, priority=?, admin_note=?, updated_at=?, admin_last_viewed_at=? WHERE id=?')->execute([$nextStatus,$priority,$adminNote,$now,$now,$ticketId]);
        if ($reply !== '') {
          $reply = mb_substr($reply, 0, 4000);
          $pdo->prepare('INSERT INTO support_messages(ticket_id,sender,msg_type,content,created_at) VALUES (?,?,?,?,?)')->execute([$ticketId,'admin','text',$reply,$now]);
          $pdo->prepare('UPDATE support_tickets SET last_message_at=?, updated_at=?, admin_last_viewed_at=? WHERE id=?')->execute([$now,$now,$now,$ticketId]);
        }
        admin_audit_log('support_'.$action, 'support_ticket', $ticketId, 'Support ticket updated', ['status'=>$nextStatus,'priority'=>$priority,'reply'=>($reply!==''?'sent':''),'note_len'=>strlen($adminNote)]);
        $msg = "<div class='card'><span class='pill ok'>Support ticket updated</span></div>";
        $selectedId = $ticketId;
      }
    }
  } catch (Throwable $e) {
    $msg = "<div class='card'><span class='pill bad'>" . admin_h($e->getMessage()) . "</span></div>";
  }
}

$where = [];
$params = [];
if ($statusFilter !== '' && $statusFilter !== 'all') { $where[] = 'LOWER(t.status)=?'; $params[] = $statusFilter; }
if ($q !== '') {
  $where[] = '(LOWER(COALESCE(t.subject,\'\')) LIKE ? OR LOWER(COALESCE(u.email,\'\')) LIKE ? OR LOWER(COALESCE(u.username,\'\')) LIKE ?)';
  $like = '%' . strtolower($q) . '%';
  array_push($params, $like, $like, $like);
}
$sql = 'SELECT t.*, u.email, u.username, u.first_name, u.last_name FROM support_tickets t LEFT JOIN users u ON u.id=t.user_id';
if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
$sql .= ' ORDER BY COALESCE(t.last_message_at,t.updated_at,t.created_at) DESC, t.id DESC LIMIT 150';
$st = $pdo->prepare($sql); $st->execute($params); $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
$lastMsgStmt = $pdo->prepare('SELECT sender,content,created_at FROM support_messages WHERE ticket_id=? ORDER BY id DESC LIMIT 1');
$unreadAdminStmt = $pdo->prepare('SELECT COUNT(*) FROM support_messages WHERE ticket_id=? AND sender=? AND created_at>?');
foreach ($rows as &$row) {
  try {
    $ticketId = (int)($row['id'] ?? 0);
    $lastMsgStmt->execute([$ticketId]);
    $last = $lastMsgStmt->fetch(PDO::FETCH_ASSOC) ?: null;
    $row['last_message_sender'] = $last ? (string)($last['sender'] ?? '') : '';
    $row['last_message_preview'] = $last ? mb_substr(trim((string)($last['content'] ?? '')), 0, 140) : '';
    $row['last_message_created_at'] = $last ? (int)($last['created_at'] ?? 0) : 0;
    $adminSeenAt = (int)($row['admin_last_viewed_at'] ?? 0);
    $unreadAdminStmt->execute([$ticketId, 'user', $adminSeenAt]);
    $row['admin_unread_count'] = (int)$unreadAdminStmt->fetchColumn();
  } catch (Throwable $e) {
    $row['last_message_sender'] = '';
    $row['last_message_preview'] = '';
    $row['last_message_created_at'] = 0;
    $row['admin_unread_count'] = 0;
  }
}
unset($row);

$stats = [
  'Open' => (int)$pdo->query("SELECT COUNT(*) FROM support_tickets WHERE status='open'")->fetchColumn(),
  'Pending' => (int)$pdo->query("SELECT COUNT(*) FROM support_tickets WHERE status='pending'")->fetchColumn(),
  'Resolved' => (int)$pdo->query("SELECT COUNT(*) FROM support_tickets WHERE status='resolved'")->fetchColumn(),
  'Closed' => (int)$pdo->query("SELECT COUNT(*) FROM support_tickets WHERE status='closed'")->fetchColumn(),
];
$supportUnreadForAdmin = 0;
try {
  $supportUnreadForAdmin = (int)$pdo->query("SELECT COUNT(*) FROM support_tickets WHERE COALESCE(last_message_at,0) > COALESCE(admin_last_viewed_at,0) AND id IN (SELECT ticket_id FROM support_messages WHERE sender='user')")->fetchColumn();
} catch (Throwable $e) {}
$stats['New client replies'] = $supportUnreadForAdmin;

$selected = null; $messages = [];
if ($selectedId > 0) {
  $st = $pdo->prepare('SELECT t.*, u.email, u.username, u.first_name, u.last_name FROM support_tickets t LEFT JOIN users u ON u.id=t.user_id WHERE t.id=? LIMIT 1');
  $st->execute([$selectedId]);
  $selected = $st->fetch(PDO::FETCH_ASSOC) ?: null;
  if ($selected) {
    $now = time();
    try {
      $pdo->prepare('UPDATE support_tickets SET admin_last_viewed_at=? WHERE id=?')->execute([$now,$selectedId]);
      $selected['admin_last_viewed_at'] = $now;
    } catch (Throwable $e) {}
    $ms = $pdo->prepare('SELECT * FROM support_messages WHERE ticket_id=? ORDER BY id ASC LIMIT 500');
    $ms->execute([$selectedId]);
    $messages = $ms->fetchAll(PDO::FETCH_ASSOC) ?: [];
  }
}

$body = $msg;
$body .= "<div class='split'><div><h1 class='section-title'>Support Tickets</h1><div class='muted small'>Review client conversations, reply from the backoffice, and move tickets through a cleaner support lifecycle.</div></div><a class='btn' href='/admin/support_contacts.php'>Support contacts</a></div>";
$body .= "<div class='stats-grid'>";
foreach ($stats as $label => $value) $body .= admin_stat_card($label, (string)$value, 'Current ticket count');
$body .= "</div>";
$body .= "<form method='get' class='card toolbar'><label><span>Status</span><select name='status'><option value='all'" . ($statusFilter==='all'?' selected':'') . ">All</option><option value='open'" . ($statusFilter==='open'?' selected':'') . ">Open</option><option value='pending'" . ($statusFilter==='pending'?' selected':'') . ">Pending</option><option value='resolved'" . ($statusFilter==='resolved'?' selected':'') . ">Resolved</option><option value='closed'" . ($statusFilter==='closed'?' selected':'') . ">Closed</option></select></label><label class='grow'><span>Search</span><input name='q' value='" . admin_h($q) . "' placeholder='email, username, subject' /></label><div><button class='btn primary' type='submit'>Apply</button></div></form>";
$body .= "<div class='card'><div class='table-wrap'><table><thead><tr><th>ID</th><th>User</th><th>Subject</th><th>Status</th><th>Priority</th><th>Unread</th><th>Updated</th><th></th></tr></thead><tbody>";
if (!$rows) {
  $body .= "<tr><td colspan='8'><div class='empty'>No support tickets found.</div></td></tr>";
} else {
  foreach ($rows as $row) {
    $name = admin_name_for_row($row);
    $unread = (int)($row['admin_unread_count'] ?? 0);
    $unreadPill = $unread > 0 ? "<span class='pill warn'>" . $unread . " new</span>" : "<span class='pill'>0</span>";
    $body .= "<tr><td>#" . (int)$row['id'] . "</td><td><div>" . admin_h($name) . "</div><div class='muted small'>" . admin_h((string)($row['email'] ?? '')) . "</div></td><td><div>" . admin_h((string)($row['subject'] ?: $row['reason_code'])) . "</div><div class='muted small'>" . admin_h((string)($row['last_message_preview'] ?? '')) . "</div></td><td>" . admin_status_pill((string)($row['status'] ?? 'open')) . "</td><td>" . admin_h((string)($row['priority'] ?? 'normal')) . "</td><td>" . $unreadPill . "</td><td>" . admin_format_ts($row['updated_at'] ?? $row['created_at'] ?? 0) . "</td><td><a class='btn' href='/admin/support_tickets.php?id=" . (int)$row['id'] . "&status=" . urlencode($statusFilter) . "&q=" . urlencode($q) . "'>Open</a></td></tr>";
  }
}
$body .= "</tbody></table></div></div>";

if ($selected) {
  $selectedUnread = 0;
  try {
    $unreadAdminStmt->execute([(int)$selected['id'], 'user', (int)($selected['admin_last_viewed_at'] ?? 0)]);
    $selectedUnread = (int)$unreadAdminStmt->fetchColumn();
  } catch (Throwable $e) {}
  $body .= "<div class='card'><div class='split'><div><h2 style='margin:0 0 6px'>Ticket #" . (int)$selected['id'] . "</h2><div class='muted small'>" . admin_h((string)($selected['subject'] ?: $selected['reason_code'])) . "</div></div><div class='inline-actions'>" . admin_status_pill((string)$selected['status']) . "<span class='pill'>" . admin_h((string)($selected['priority'] ?? 'normal')) . "</span>" . ($selectedUnread > 0 ? "<span class='pill warn'>" . $selectedUnread . " unread</span>" : "") . "</div></div>";
  $body .= "<div class='grid' style='grid-template-columns:1.1fr .9fr; gap:14px; margin-top:14px'>";
  $body .= "<div class='card' style='margin:0'><div class='section-subtitle'>Conversation</div>";
  if (!$messages) {
    $body .= "<div class='empty' style='margin-top:12px'>No messages yet.</div>";
  } else {
    foreach ($messages as $m) {
      $sender = strtolower((string)($m['sender'] ?? 'user'));
      $tone = $sender === 'admin' ? 'good-text' : 'warn-text';
      $body .= "<div style='padding:12px 0;border-bottom:1px solid #1f2937'><div class='split'><strong class='" . $tone . "'>" . admin_h(ucfirst($sender)) . "</strong><span class='muted small'>" . admin_format_ts($m['created_at'] ?? 0) . "</span></div><div class='admin-note' style='margin-top:8px'>" . nl2br(admin_h((string)($m['content'] ?? ''))) . "</div></div>";
    }
  }
  $body .= "</div>";
  $body .= "<div class='card' style='margin:0'><form method='post' class='stack'>" . admin_csrf_input() . "<input type='hidden' name='ticket_id' value='" . (int)$selected['id'] . "' /><div><div class='muted small'>Client</div><div>" . admin_h(admin_name_for_row($selected)) . "</div><div class='muted small'>" . admin_h((string)($selected['email'] ?? '')) . "</div></div><label><span class='muted small'>Priority</span><select name='priority'><option value='low'" . ((($selected['priority'] ?? '')==='low')?' selected':'') . ">Low</option><option value='normal'" . ((($selected['priority'] ?? 'normal')==='normal')?' selected':'') . ">Normal</option><option value='high'" . ((($selected['priority'] ?? '')==='high')?' selected':'') . ">High</option><option value='urgent'" . ((($selected['priority'] ?? '')==='urgent')?' selected':'') . ">Urgent</option></select></label><label><span class='muted small'>Admin note</span><textarea name='admin_note' rows='4'>" . admin_h((string)($selected['admin_note'] ?? '')) . "</textarea></label><label><span class='muted small'>Reply to client</span><textarea name='reply' rows='6' placeholder='Type your reply here'></textarea></label><div class='inline-actions'><button class='btn primary' type='submit' name='ticket_action' value='save'>Save</button><button class='btn' type='submit' name='ticket_action' value='pending'>Mark pending</button><button class='btn' type='submit' name='ticket_action' value='resolved'>Resolve</button><button class='btn danger' type='submit' name='ticket_action' value='closed'>Close</button><button class='btn' type='submit' name='ticket_action' value='open'>Reopen</button></div></form></div>";
  $body .= "</div></div>";
}

admin_layout('Support Tickets', $body);
