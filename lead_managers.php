<?php
require_once __DIR__ . '/admin/includes/auth.php';
admin_require();
$body = "<div class='card'><h2>Lead module disabled</h2><p>تم تعطيل هذا القسم في هذه النسخة، لأن نظام إدارة العملاء المحتملين يعمل في مشروع منفصل. تُدار طلبات مديري التسويق وعملاؤهم من خلال صفحة <a href='/admin/managers.php'>Marketing Managers</a>.</p></div>";
admin_layout('Lead module disabled', $body);
