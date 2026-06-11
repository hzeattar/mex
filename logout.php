<?php
declare(strict_types=1);
require_once __DIR__ . '/_common.php';

require_method('POST');
clear_session_user_id();
json_response(['ok'=>true]);
