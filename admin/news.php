<?php
require_once __DIR__ . '/includes/auth.php';
admin_require();
$pdo = db();
$msg = '';
$editId = (int)($_GET['id'] ?? $_POST['id'] ?? 0);

function news_field(array $row, string $base, string $fallback = ''): string {
  return trim((string)($row[$base] ?? $fallback));
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  try {
    admin_verify_csrf();
    $action = trim((string)($_POST['news_action'] ?? 'save'));
    if ($action === 'delete' && $editId > 0) {
      $st = $pdo->prepare('SELECT image_url FROM announcements WHERE id=? LIMIT 1');
      $st->execute([$editId]);
      $existing = $st->fetch(PDO::FETCH_ASSOC) ?: [];
      admin_delete_uploaded_asset((string)($existing['image_url'] ?? ''));
      $pdo->prepare('DELETE FROM announcements WHERE id=?')->execute([$editId]);
      admin_audit_log('news_delete', 'announcement', $editId, 'Announcement deleted');
      $msg = "<div class='card'><span class='pill ok'>Announcement deleted</span></div>";
      $editId = 0;
    } else {
      $titleEn = trim((string)($_POST['title_en'] ?? ''));
      $titleAr = trim((string)($_POST['title_ar'] ?? ''));
      $titleRu = trim((string)($_POST['title_ru'] ?? ''));
      $bodyEn = trim((string)($_POST['body_en'] ?? ''));
      $bodyAr = trim((string)($_POST['body_ar'] ?? ''));
      $bodyRu = trim((string)($_POST['body_ru'] ?? ''));
      $slug = trim((string)($_POST['slug'] ?? ''));
      $status = trim((string)($_POST['status'] ?? 'draft'));
      if (!in_array($status, ['draft','published','archived'], true)) $status = 'draft';
      $pinned = isset($_POST['pinned']) ? 1 : 0;
      $publishedAt = (int)($_POST['published_at'] ?? 0);
      $sourceLabel = trim((string)($_POST['source_label'] ?? (string)setting_get('news.default_source_label', 'Trading Desk')));
      $ctaUrl = trim((string)($_POST['cta_url'] ?? ''));
      $imageUrl = trim((string)($_POST['image_url'] ?? ''));
      $now = time();
      if ($status === 'published' && $publishedAt <= 0) $publishedAt = $now;
      if ($titleEn === '' && $titleAr === '' && $titleRu === '') throw new RuntimeException('At least one title is required.');
      $current = [];
      if ($editId > 0) {
        $st = $pdo->prepare('SELECT * FROM announcements WHERE id=? LIMIT 1');
        $st->execute([$editId]);
        $current = $st->fetch(PDO::FETCH_ASSOC) ?: [];
      }
      if (!empty($_POST['remove_image']) && !empty($current['image_url'])) {
        admin_delete_uploaded_asset((string)$current['image_url']);
        $imageUrl = '';
      } elseif ($imageUrl === '' && !empty($current['image_url'])) {
        $imageUrl = (string)$current['image_url'];
      }
      $up = admin_store_uploaded_image('image_file', 'news', 'news_');
      if (!empty($up['error'])) throw new RuntimeException((string)$up['error']);
      if (!empty($up['ok']) && !empty($up['path'])) {
        if (!empty($current['image_url']) && $current['image_url'] !== $up['path']) admin_delete_uploaded_asset((string)$current['image_url']);
        $imageUrl = (string)$up['path'];
      }
      if ($editId > 0) {
        $pdo->prepare('UPDATE announcements SET slug=?, title_en=?, title_ar=?, title_ru=?, body_en=?, body_ar=?, body_ru=?, image_url=?, cta_url=?, source_label=?, status=?, pinned=?, published_at=?, updated_at=? WHERE id=?')
            ->execute([$slug,$titleEn,$titleAr,$titleRu,$bodyEn,$bodyAr,$bodyRu,$imageUrl ?: null,$ctaUrl ?: null,$sourceLabel,$status,$pinned,$publishedAt,$now,$editId]);
        admin_audit_log('news_update', 'announcement', $editId, 'Announcement updated', ['status'=>$status,'pinned'=>$pinned]);
      } else {
        $pdo->prepare('INSERT INTO announcements(slug,title_en,title_ar,title_ru,body_en,body_ar,body_ru,image_url,cta_url,source_label,status,pinned,published_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
            ->execute([$slug,$titleEn,$titleAr,$titleRu,$bodyEn,$bodyAr,$bodyRu,$imageUrl ?: null,$ctaUrl ?: null,$sourceLabel,$status,$pinned,$publishedAt,$now,$now]);
        $editId = (int)$pdo->lastInsertId();
        admin_audit_log('news_create', 'announcement', $editId, 'Announcement created', ['status'=>$status,'pinned'=>$pinned]);
      }
      $msg = "<div class='card'><span class='pill ok'>Announcement saved</span></div>";
    }
  } catch (Throwable $e) {
    $msg = "<div class='card'><span class='pill bad'>" . admin_h($e->getMessage()) . "</span></div>";
  }
}

$editing = ['slug'=>'','title_en'=>'','title_ar'=>'','title_ru'=>'','body_en'=>'','body_ar'=>'','body_ru'=>'','status'=>'draft','pinned'=>0,'published_at'=>0,'image_url'=>'','cta_url'=>'','source_label'=>''];
if ($editId > 0) {
  $st = $pdo->prepare('SELECT * FROM announcements WHERE id=? LIMIT 1');
  $st->execute([$editId]);
  $editing = array_merge($editing, $st->fetch(PDO::FETCH_ASSOC) ?: []);
}
$rows = $pdo->query('SELECT * FROM announcements ORDER BY pinned DESC, published_at DESC, id DESC LIMIT 100')->fetchAll(PDO::FETCH_ASSOC) ?: [];
$published = (int)$pdo->query("SELECT COUNT(*) FROM announcements WHERE status='published'")->fetchColumn();
$drafts = (int)$pdo->query("SELECT COUNT(*) FROM announcements WHERE status='draft'")->fetchColumn();
$archived = (int)$pdo->query("SELECT COUNT(*) FROM announcements WHERE status='archived'")->fetchColumn();

$body = $msg;
$body .= "<div class='split'><div><h1 class='section-title'>News & Announcements</h1><div class='muted small'>Publish multilingual in-app updates with images, optional deep links, and a pinned priority order for the client news center.</div></div><div class='inline-actions'><a class='btn' href='/admin/news_settings.php'>News controls</a><a class='btn' href='/admin/dashboard.php'>Back to dashboard</a></div></div>";
$body .= "<div class='stats-grid'>";
$body .= admin_stat_card('Published', (string)$published, 'Visible to clients now.');
$body .= admin_stat_card('Drafts', (string)$drafts, 'Still private.');
$body .= admin_stat_card('Archived', (string)$archived, 'Kept for history.');
$body .= "</div>";

$previewImg = trim((string)($editing['image_url'] ?? ''));
$body .= "<form method='post' enctype='multipart/form-data' class='card stack'>" . admin_csrf_input();
$body .= "<input type='hidden' name='id' value='" . (int)$editId . "' />";
$body .= "<div class='split'><div><h2 style='margin:0'>" . ($editId > 0 ? 'Edit announcement' : 'Create announcement') . "</h2><div class='muted small'>Client-facing content supports EN / AR / RU with fallback to English. Upload a local image or paste an external image URL.</div></div><div class='inline-actions'><label class='small muted'><input type='checkbox' name='pinned' value='1'" . ((int)($editing['pinned'] ?? 0)===1 ? ' checked' : '') . "> Pin on top</label></div></div>";
$body .= "<div class='grid' style='grid-template-columns:1fr 1fr 1fr'>";
$body .= "<label><span class='muted small'>Slug</span><input name='slug' value='" . admin_h((string)$editing['slug']) . "' placeholder='platform-update-march' /></label>";
$body .= "<label><span class='muted small'>Status</span><select name='status'><option value='draft'" . ((($editing['status'] ?? '')==='draft') ? ' selected' : '') . ">Draft</option><option value='published'" . ((($editing['status'] ?? '')==='published') ? ' selected' : '') . ">Published</option><option value='archived'" . ((($editing['status'] ?? '')==='archived') ? ' selected' : '') . ">Archived</option></select></label>";
$body .= "<label><span class='muted small'>Published at (unix timestamp)</span><input name='published_at' value='" . admin_h((string)($editing['published_at'] ?? 0)) . "' /></label>";
$body .= "</div>";
$body .= "<div class='grid' style='grid-template-columns:1fr 1fr 1fr'>";
$body .= "<label><span class='muted small'>Image URL</span><input name='image_url' value='" . admin_h((string)$previewImg) . "' placeholder='https://... or /assets/img/news/file.jpg' /></label>";
$body .= "<label><span class='muted small'>Upload image</span><input type='file' name='image_file' accept='image/*' /></label>";
$body .= "<label><span class='muted small'>CTA URL</span><input name='cta_url' value='" . admin_h((string)($editing['cta_url'] ?? '')) . "' placeholder='#/trade or https://...' /></label>";
$body .= "</div>";
$body .= "<div class='grid' style='grid-template-columns:1fr 1fr'>";
$body .= "<label><span class='muted small'>Source label</span><input name='source_label' value='" . admin_h((string)($editing['source_label'] ?? '')) . "' placeholder='Trading Desk' /></label>";
$body .= "<label><span class='muted small'>Image controls</span><span class='muted small' style='display:block;padding-top:10px'><input type='checkbox' name='remove_image' value='1'> Remove current image</span></label>";
$body .= "</div>";
if ($previewImg !== '') {
  $body .= "<div class='card' style='padding:14px;border:1px solid rgba(148,163,184,.18);background:rgba(8,16,32,.55)'><div class='muted small' style='margin-bottom:8px'>Current image preview</div><img src='" . admin_h($previewImg) . "' style='display:block;width:100%;max-height:220px;object-fit:cover;border-radius:16px;border:1px solid rgba(148,163,184,.16)' /></div>";
}
$body .= "<div class='grid' style='grid-template-columns:1fr 1fr 1fr'>";
$body .= "<div><div class='muted small'>Title EN</div><input name='title_en' value='" . admin_h((string)$editing['title_en']) . "' /></div>";
$body .= "<div><div class='muted small'>Title AR</div><input name='title_ar' value='" . admin_h((string)$editing['title_ar']) . "' /></div>";
$body .= "<div><div class='muted small'>Title RU</div><input name='title_ru' value='" . admin_h((string)$editing['title_ru']) . "' /></div>";
$body .= "</div>";
$body .= "<div class='grid' style='grid-template-columns:1fr 1fr 1fr'>";
$body .= "<div><div class='muted small'>Body EN</div><textarea name='body_en' rows='7'>" . admin_h((string)$editing['body_en']) . "</textarea></div>";
$body .= "<div><div class='muted small'>Body AR</div><textarea name='body_ar' rows='7'>" . admin_h((string)$editing['body_ar']) . "</textarea></div>";
$body .= "<div><div class='muted small'>Body RU</div><textarea name='body_ru' rows='7'>" . admin_h((string)$editing['body_ru']) . "</textarea></div>";
$body .= "</div>";
$body .= "<div class='inline-actions'><button class='btn primary' type='submit' name='news_action' value='save'>Save</button>";
if ($editId > 0) {
  $body .= "<button class='btn danger' type='submit' name='news_action' value='delete' onclick='return confirm(&quot;Delete this announcement?&quot;)'>Delete</button>";
}
$body .= "</div></form>";

$body .= "<div class='card'><div class='table-wrap'><table><thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Pinned</th><th>Image</th><th>Published</th><th></th></tr></thead><tbody>";
if (!$rows) {
  $body .= "<tr><td colspan='7'><div class='empty'>No announcements yet.</div></td></tr>";
} else {
  foreach ($rows as $row) {
    $title = trim((string)($row['title_en'] ?: $row['title_ar'] ?: $row['title_ru'] ?: 'Untitled'));
    $thumb = !empty($row['image_url']) ? ("<img src='" . admin_h((string)$row['image_url']) . "' style='width:68px;height:42px;object-fit:cover;border-radius:10px;border:1px solid #334155'>") : "<span class='muted'>—</span>";
    $body .= "<tr><td>#" . (int)$row['id'] . "</td><td>" . admin_h($title) . ((!empty($row['source_label'])) ? ("<div class='muted small'>" . admin_h((string)$row['source_label']) . "</div>") : '') . "</td><td>" . admin_status_pill((string)$row['status']) . "</td><td>" . ((int)$row['pinned']===1 ? "<span class='pill ok'>Pinned</span>" : "<span class='pill'>No</span>") . "</td><td>" . $thumb . "</td><td>" . admin_format_ts((int)($row['published_at'] ?? 0)) . "</td><td><a class='btn' href='/admin/news.php?id=" . (int)$row['id'] . "'>Edit</a></td></tr>";
  }
}
$body .= "</tbody></table></div></div>";
admin_layout('News & Announcements', $body);
