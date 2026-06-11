<?php
declare(strict_types=1);

/**
 * Idempotent funding showcase seed.
 *
 * Purpose:
 * - Keep the client Funding page full enough for QA/demo when a fresh DB only has
 *   bare payment method rows.
 * - Never touches secrets/env values.
 * - Existing admin-customized routes are respected; only missing/empty setup is filled.
 */

function funding_showcase_driver(PDO $pdo): string {
  try { return (string)($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) ?: 'mysql'); } catch (Throwable $e) { return 'mysql'; }
}

function funding_showcase_table_exists(PDO $pdo, string $table): bool {
  $driver = funding_showcase_driver($pdo);
  try {
    if ($driver === 'sqlite') {
      $st = $pdo->prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1");
      $st->execute([$table]);
      return (bool)$st->fetchColumn();
    }
    $st = $pdo->prepare("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? LIMIT 1");
    $st->execute([$table]);
    return (bool)$st->fetchColumn();
  } catch (Throwable $e) { return false; }
}

function funding_showcase_setting_get(PDO $pdo, string $key): string {
  try {
    if (function_exists('schema_setting_get')) {
      return (string)(schema_setting_get($pdo, funding_showcase_driver($pdo), $key, '') ?: '');
    }
  } catch (Throwable $e) {}
  return '';
}

function funding_showcase_setting_set(PDO $pdo, string $key, string $value): void {
  try {
    if (function_exists('schema_setting_set')) {
      schema_setting_set($pdo, funding_showcase_driver($pdo), $key, $value, time());
    }
  } catch (Throwable $e) {}
}

function funding_showcase_seed_needed(PDO $pdo): bool {
  if (!funding_showcase_table_exists($pdo, 'payment_methods')) return false;
  if (strtolower((string)getenv('FUNDING_SHOWCASE_SEED')) === '0') return false;
  if (strtolower((string)getenv('FORCE_FUNDING_SHOWCASE_SEED')) === '1') return true;
  try {
    $missing = (int)$pdo->query("SELECT COUNT(*) FROM payment_methods WHERE status='active' AND kind IN ('deposit','withdraw') AND (image_url IS NULL OR image_url='' OR (kind='deposit' AND provider<>'stripe' AND (payment_address IS NULL OR payment_address='')))")->fetchColumn();
    $stripe = (int)$pdo->query("SELECT COUNT(*) FROM payment_methods WHERE kind='deposit' AND code='stripe_card' AND status='active' AND provider='stripe'")->fetchColumn();
    return $missing > 0 || $stripe < 1 || funding_showcase_setting_get($pdo, 'FUNDING_SHOWCASE_SEED_V3') !== '1';
  } catch (Throwable $e) {
    return funding_showcase_setting_get($pdo, 'FUNDING_SHOWCASE_SEED_V3') !== '1';
  }
}

function funding_showcase_update_category(PDO $pdo, array $cat): void {
  if (!funding_showcase_table_exists($pdo, 'funding_categories')) return;
  $now = time();
  try {
    $st = $pdo->prepare('SELECT id FROM funding_categories WHERE kind=? AND key_slug=? LIMIT 1');
    $st->execute([$cat['kind'], $cat['key_slug']]);
    $id = (int)($st->fetchColumn() ?: 0);
    if ($id > 0) {
      $up = $pdo->prepare('UPDATE funding_categories SET label_en=?,label_ar=?,label_ru=?,hint_en=?,hint_ar=?,hint_ru=?,icon=?,image_url=COALESCE(NULLIF(image_url,\'\'),?),status=CASE WHEN status IS NULL OR status=\'\' THEN \'active\' ELSE status END,sort_order=?,updated_at=? WHERE id=?');
      $up->execute([$cat['label_en'],$cat['label_ar'],$cat['label_ru'],$cat['hint_en'],$cat['hint_ar'],$cat['hint_ru'],$cat['icon'],$cat['image_url'],$cat['sort_order'],$now,$id]);
      return;
    }
    $ins = $pdo->prepare('INSERT INTO funding_categories(kind,key_slug,label_en,label_ar,label_ru,hint_en,hint_ar,hint_ru,icon,image_url,status,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $ins->execute([$cat['kind'],$cat['key_slug'],$cat['label_en'],$cat['label_ar'],$cat['label_ru'],$cat['hint_en'],$cat['hint_ar'],$cat['hint_ru'],$cat['icon'],$cat['image_url'],'active',$cat['sort_order'],$now,$now]);
  } catch (Throwable $e) {
    error_log('[funding_showcase] category seed skipped: ' . $e->getMessage());
  }
}

function funding_showcase_update_method(PDO $pdo, array $m): void {
  $now = time();
  $fieldsJson = json_encode($m['fields'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  try {
    $st = $pdo->prepare('SELECT id,provider,image_url,payment_address,payment_qr_url,fields_json,category_key,method_group,proof_required,expires_hours FROM payment_methods WHERE kind=? AND code=? LIMIT 1');
    $st->execute([$m['kind'], $m['code']]);
    $row = $st->fetch(PDO::FETCH_ASSOC) ?: null;
    if ($row) {
      $id = (int)$row['id'];
      $provider = trim((string)($row['provider'] ?? ''));
      $image = trim((string)($row['image_url'] ?? ''));
      $address = trim((string)($row['payment_address'] ?? ''));
      $qr = trim((string)($row['payment_qr_url'] ?? ''));
      $fields = trim((string)($row['fields_json'] ?? ''));
      $category = trim((string)($row['category_key'] ?? ''));
      $group = trim((string)($row['method_group'] ?? ''));
      $expires = (int)($row['expires_hours'] ?? 0);
      $proof = (int)($row['proof_required'] ?? 0);
      $up = $pdo->prepare('UPDATE payment_methods SET provider=?,currency=?,title_en=?,title_ar=?,title_ru=?,desc_en=?,desc_ar=?,desc_ru=?,image_url=?,instructions_en=?,instructions_ar=?,instructions_ru=?,min_amount=?,max_amount=?,status=?,sort_order=?,account_scope=?,fields_json=?,checkout_label=?,method_group=?,category_key=?,payment_address=?,payment_qr_url=?,proof_required=?,expires_hours=?,updated_at=? WHERE id=?');
      $up->execute([
        ($provider === '' || $provider === 'dummy') ? $m['provider'] : $provider,
        $m['currency'],$m['title_en'],$m['title_ar'],$m['title_ru'],$m['desc_en'],$m['desc_ar'],$m['desc_ru'],
        $image !== '' ? $image : $m['image_url'],
        $m['instructions_en'],$m['instructions_ar'],$m['instructions_ru'],
        $m['min_amount'],$m['max_amount'],'active',$m['sort_order'],$m['account_scope'],
        $fields !== '' && $fields !== '{}' ? $fields : $fieldsJson,
        $m['checkout_label'],
        $group !== '' ? $group : $m['method_group'],
        $category !== '' ? $category : $m['category_key'],
        $address !== '' ? $address : $m['payment_address'],
        $qr !== '' ? $qr : $m['payment_qr_url'],
        $proof ?: (int)$m['proof_required'],
        $expires > 0 ? $expires : (int)$m['expires_hours'],
        $now,$id
      ]);
      return;
    }
    $ins = $pdo->prepare('INSERT INTO payment_methods(kind,code,provider,currency,title_en,title_ar,title_ru,desc_en,desc_ar,desc_ru,image_url,instructions_en,instructions_ar,instructions_ru,min_amount,max_amount,status,sort_order,account_scope,fields_json,checkout_label,method_group,category_key,payment_address,payment_qr_url,proof_required,expires_hours,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $ins->execute([$m['kind'],$m['code'],$m['provider'],$m['currency'],$m['title_en'],$m['title_ar'],$m['title_ru'],$m['desc_en'],$m['desc_ar'],$m['desc_ru'],$m['image_url'],$m['instructions_en'],$m['instructions_ar'],$m['instructions_ru'],$m['min_amount'],$m['max_amount'],'active',$m['sort_order'],$m['account_scope'],$fieldsJson,$m['checkout_label'],$m['method_group'],$m['category_key'],$m['payment_address'],$m['payment_qr_url'],(int)$m['proof_required'],(int)$m['expires_hours'],$now,$now]);
  } catch (Throwable $e) {
    error_log('[funding_showcase] method seed skipped for ' . ($m['kind'] ?? '') . ':' . ($m['code'] ?? '') . ' - ' . $e->getMessage());
  }
}

function funding_showcase_seed_methods(PDO $pdo): void {
  if (!funding_showcase_seed_needed($pdo)) return;

  $categories = [
    ['kind'=>'deposit','key_slug'=>'crypto','label_en'=>'Crypto','label_ar'=>'كريبتو','label_ru'=>'Крипто','hint_en'=>'USDT wallet networks with QR','hint_ar'=>'محافظ USDT مع QR','hint_ru'=>'USDT кошельки и QR','icon'=>'₮','image_url'=>'/assets/img/payment_methods/cat-crypto.svg','sort_order'=>10],
    ['kind'=>'deposit','key_slug'=>'bank','label_en'=>'Bank transfer','label_ar'=>'تحويل بنكي','label_ru'=>'Банк','hint_en'=>'Wire and local bank details','hint_ar'=>'بيانات تحويل بنكي واضحة','hint_ru'=>'Банковские реквизиты','icon'=>'🏦','image_url'=>'/assets/img/payment_methods/cat-bank.svg','sort_order'=>20],
    ['kind'=>'deposit','key_slug'=>'card','label_en'=>'Visa / Card','label_ar'=>'فيزا / كارت','label_ru'=>'Карта','hint_en'=>'Stripe hosted checkout','hint_ar'=>'دفع آمن عبر Stripe','hint_ru'=>'Stripe checkout','icon'=>'💳','image_url'=>'/assets/img/payment_methods/cat-card.svg','sort_order'=>30],
    ['kind'=>'withdraw','key_slug'=>'crypto','label_en'=>'Crypto','label_ar'=>'كريبتو','label_ru'=>'Крипто','hint_en'=>'Wallet payout routes','hint_ar'=>'سحب إلى المحافظ','hint_ru'=>'Вывод на кошелёк','icon'=>'₮','image_url'=>'/assets/img/payment_methods/cat-crypto.svg','sort_order'=>10],
    ['kind'=>'withdraw','key_slug'=>'bank','label_en'=>'Bank transfer','label_ar'=>'تحويل بنكي','label_ru'=>'Банк','hint_en'=>'Bank payout details','hint_ar'=>'سحب إلى حساب بنكي','hint_ru'=>'Банковский вывод','icon'=>'🏦','image_url'=>'/assets/img/payment_methods/cat-bank.svg','sort_order'=>20],
  ];
  foreach ($categories as $cat) funding_showcase_update_category($pdo, $cat);

  $methods = [
    [
      'kind'=>'deposit','code'=>'usdt_trc20','provider'=>'crypto','currency'=>'USDT','title_en'=>'USDT (TRC20)','title_ar'=>'USDT (TRC20)','title_ru'=>'USDT (TRC20)',
      'desc_en'=>'Tether deposit over the TRON network with low transfer fees.','desc_ar'=>'إيداع USDT على شبكة TRC20 برسوم تحويل منخفضة.','desc_ru'=>'USDT пополнение через сеть TRC20.',
      'image_url'=>'/assets/img/payment_methods/usdt-trc20.svg','instructions_en'=>'Send only USDT using the TRC20 network to the address shown, then upload the transfer receipt.','instructions_ar'=>'أرسل USDT فقط عبر شبكة TRC20 إلى العنوان المعروض ثم ارفع إثبات التحويل.','instructions_ru'=>'Отправляйте только USDT TRC20 на указанный адрес и загрузите подтверждение.',
      'min_amount'=>10,'max_amount'=>0,'sort_order'=>10,'account_scope'=>'real','checkout_label'=>'Confirm transfer','method_group'=>'crypto','category_key'=>'crypto',
      'payment_address'=>'TQ9MEX7TRC20FUNDINGROUTE8USDTDEMO1','payment_qr_url'=>'/assets/img/payment_methods/qr/usdt-trc20.svg','proof_required'=>1,'expires_hours'=>24,
      'fields'=>[
        ['key'=>'asset','label'=>'Asset','value'=>'USDT'],['key'=>'network','label'=>'Network','value'=>'TRC20 / TRON'],['key'=>'confirmations','label'=>'Required confirmations','value'=>'20 network confirmations'],['key'=>'memo','label'=>'Memo / tag','value'=>'Not required'],
      ],
    ],
    [
      'kind'=>'deposit','code'=>'usdt_erc20','provider'=>'crypto','currency'=>'USDT','title_en'=>'USDT (ERC20)','title_ar'=>'USDT (ERC20)','title_ru'=>'USDT (ERC20)',
      'desc_en'=>'Tether deposit over Ethereum ERC20.','desc_ar'=>'إيداع USDT عبر شبكة Ethereum ERC20.','desc_ru'=>'USDT пополнение через Ethereum ERC20.',
      'image_url'=>'/assets/img/payment_methods/usdt-erc20.svg','instructions_en'=>'Send only USDT ERC20 to the address shown. Use the receipt upload to attach the transfer confirmation.','instructions_ar'=>'أرسل USDT ERC20 فقط إلى العنوان المعروض وارفع إثبات التحويل.','instructions_ru'=>'Отправляйте только USDT ERC20 на указанный адрес и загрузите подтверждение.',
      'min_amount'=>25,'max_amount'=>0,'sort_order'=>20,'account_scope'=>'real','checkout_label'=>'Confirm transfer','method_group'=>'crypto','category_key'=>'crypto',
      'payment_address'=>'0x0D3F9C2E7A1B4D6F8E9A0123456789ABCDEF0123','payment_qr_url'=>'/assets/img/payment_methods/qr/usdt-erc20.svg','proof_required'=>1,'expires_hours'=>24,
      'fields'=>[
        ['key'=>'asset','label'=>'Asset','value'=>'USDT'],['key'=>'network','label'=>'Network','value'=>'ERC20 / Ethereum'],['key'=>'confirmations','label'=>'Required confirmations','value'=>'12 network confirmations'],['key'=>'memo','label'=>'Memo / tag','value'=>'Not required'],
      ],
    ],
    [
      'kind'=>'deposit','code'=>'bank_wire_usdt','provider'=>'bank','currency'=>'USDT','title_en'=>'Bank transfer','title_ar'=>'تحويل بنكي','title_ru'=>'Банковский перевод',
      'desc_en'=>'Bank route for large deposits with full beneficiary details.','desc_ar'=>'مسار تحويل بنكي للإيداعات الكبيرة مع بيانات المستفيد كاملة.','desc_ru'=>'Банковский маршрут с полными реквизитами.',
      'image_url'=>'/assets/img/payment_methods/bank-transfer.svg','instructions_en'=>'Transfer using the exact reference shown in the details, then upload the bank receipt.','instructions_ar'=>'استخدم رقم المرجع الظاهر في التفاصيل ثم ارفع إيصال التحويل البنكي.','instructions_ru'=>'Используйте указанный reference и загрузите банковскую квитанцию.',
      'min_amount'=>100,'max_amount'=>0,'sort_order'=>30,'account_scope'=>'real','checkout_label'=>'Confirm bank transfer','method_group'=>'bank','category_key'=>'bank',
      'payment_address'=>'Beneficiary: MEX Group LTD | Account: 1029384756 | IBAN: GB82 MEXG 1029 3847 5600 00 | SWIFT: MEXGGB2L','payment_qr_url'=>'/assets/img/payment_methods/qr/bank-wire.svg','proof_required'=>1,'expires_hours'=>24,
      'fields'=>[
        ['key'=>'beneficiary','label'=>'Beneficiary','value'=>'MEX Group LTD'],['key'=>'bank_name','label'=>'Bank name','value'=>'MEX Settlement Bank'],['key'=>'account_number','label'=>'Account number','value'=>'1029384756'],['key'=>'iban','label'=>'IBAN','value'=>'GB82 MEXG 1029 3847 5600 00'],['key'=>'swift','label'=>'SWIFT','value'=>'MEXGGB2L'],['key'=>'reference','label'=>'Payment reference','value'=>'Use your MEX account number'],
      ],
    ],
    [
      'kind'=>'deposit','code'=>'stripe_card','provider'=>'stripe','currency'=>'USDT','title_en'=>'Visa / Mastercard','title_ar'=>'فيزا / ماستركارد','title_ru'=>'Visa / Mastercard',
      'desc_en'=>'Secure card checkout powered by Stripe.','desc_ar'=>'دفع آمن بالفيزا أو الماستركارد عبر Stripe.','desc_ru'=>'Безопасная оплата картой через Stripe.',
      'image_url'=>'/assets/img/payment_methods/card-stripe.svg','instructions_en'=>'Continue to Stripe Checkout to pay by card. Card details are handled securely by Stripe.','instructions_ar'=>'تابع إلى Stripe Checkout للدفع بالكارت. بيانات البطاقة يتم التعامل معها بأمان عبر Stripe.','instructions_ru'=>'Перейдите в Stripe Checkout для оплаты картой.',
      'min_amount'=>10,'max_amount'=>0,'sort_order'=>40,'account_scope'=>'real','checkout_label'=>'Continue to secure checkout','method_group'=>'card','category_key'=>'card',
      'payment_address'=>'','payment_qr_url'=>'','proof_required'=>0,'expires_hours'=>1,
      'fields'=>['processor'=>'Stripe Checkout','cards'=>'Visa, Mastercard, Apple Pay, Google Pay'],
    ],
    [
      'kind'=>'withdraw','code'=>'usdt_trc20','provider'=>'crypto','currency'=>'USDT','title_en'=>'USDT (TRC20)','title_ar'=>'USDT (TRC20)','title_ru'=>'USDT (TRC20)',
      'desc_en'=>'Withdraw USDT to a TRC20 wallet.','desc_ar'=>'سحب USDT إلى محفظة TRC20.','desc_ru'=>'Вывод USDT на TRC20 кошелёк.',
      'image_url'=>'/assets/img/payment_methods/crypto-withdraw.svg','instructions_en'=>'Enter your TRC20 wallet address carefully.','instructions_ar'=>'أدخل عنوان محفظة TRC20 بدقة.','instructions_ru'=>'Введите адрес TRC20 кошелька внимательно.',
      'min_amount'=>10,'max_amount'=>0,'sort_order'=>10,'account_scope'=>'real','checkout_label'=>'Submit payout','method_group'=>'crypto','category_key'=>'crypto','payment_address'=>'','payment_qr_url'=>'','proof_required'=>0,'expires_hours'=>24,
      'fields'=>[
        ['key'=>'wallet_address','label'=>'TRC20 wallet address','type'=>'textarea','required'=>true,'collect'=>true,'placeholder'=>'Paste your TRC20 USDT wallet address'],['key'=>'network','label'=>'Network','type'=>'select','required'=>true,'collect'=>true,'options'=>[['value'=>'TRC20','label'=>'TRC20 / TRON']]],
      ],
    ],
    [
      'kind'=>'withdraw','code'=>'usdt_erc20','provider'=>'crypto','currency'=>'USDT','title_en'=>'USDT (ERC20)','title_ar'=>'USDT (ERC20)','title_ru'=>'USDT (ERC20)',
      'desc_en'=>'Withdraw USDT to an ERC20 wallet.','desc_ar'=>'سحب USDT إلى محفظة ERC20.','desc_ru'=>'Вывод USDT на ERC20 кошелёк.',
      'image_url'=>'/assets/img/payment_methods/crypto-withdraw.svg','instructions_en'=>'Enter your ERC20 wallet address carefully.','instructions_ar'=>'أدخل عنوان محفظة ERC20 بدقة.','instructions_ru'=>'Введите адрес ERC20 кошелька внимательно.',
      'min_amount'=>25,'max_amount'=>0,'sort_order'=>20,'account_scope'=>'real','checkout_label'=>'Submit payout','method_group'=>'crypto','category_key'=>'crypto','payment_address'=>'','payment_qr_url'=>'','proof_required'=>0,'expires_hours'=>24,
      'fields'=>[
        ['key'=>'wallet_address','label'=>'ERC20 wallet address','type'=>'textarea','required'=>true,'collect'=>true,'placeholder'=>'Paste your ERC20 USDT wallet address'],['key'=>'network','label'=>'Network','type'=>'select','required'=>true,'collect'=>true,'options'=>[['value'=>'ERC20','label'=>'ERC20 / Ethereum']]],
      ],
    ],
    [
      'kind'=>'withdraw','code'=>'bank_wire_usdt','provider'=>'bank','currency'=>'USDT','title_en'=>'Bank transfer','title_ar'=>'تحويل بنكي','title_ru'=>'Банковский перевод',
      'desc_en'=>'Withdraw to your verified bank account.','desc_ar'=>'سحب إلى حسابك البنكي.','desc_ru'=>'Вывод на банковский счёт.',
      'image_url'=>'/assets/img/payment_methods/bank-withdraw.svg','instructions_en'=>'Enter beneficiary and bank details exactly as registered at your bank.','instructions_ar'=>'أدخل بيانات المستفيد والحساب البنكي كما هي في البنك.','instructions_ru'=>'Введите банковские реквизиты.',
      'min_amount'=>100,'max_amount'=>0,'sort_order'=>30,'account_scope'=>'real','checkout_label'=>'Submit payout','method_group'=>'bank','category_key'=>'bank','payment_address'=>'','payment_qr_url'=>'','proof_required'=>0,'expires_hours'=>24,
      'fields'=>[
        ['key'=>'beneficiary_name','label'=>'Beneficiary name','type'=>'text','required'=>true,'collect'=>true,'placeholder'=>'Full legal name'],['key'=>'bank_name','label'=>'Bank name','type'=>'text','required'=>true,'collect'=>true,'placeholder'=>'Bank name'],['key'=>'iban','label'=>'IBAN / account number','type'=>'text','required'=>true,'collect'=>true,'placeholder'=>'IBAN or account number'],['key'=>'swift','label'=>'SWIFT / routing code','type'=>'text','required'=>false,'collect'=>true,'placeholder'=>'Optional'],
      ],
    ],
  ];
  foreach ($methods as $method) funding_showcase_update_method($pdo, $method);

  funding_showcase_setting_set($pdo, 'FUNDING_SHOWCASE_SEED_V3', '1');
}
