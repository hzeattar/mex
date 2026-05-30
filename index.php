<?php
declare(strict_types=1);

require_once __DIR__ . '/site_bootstrap.php';

$isLoggedIn = false;
try {
  $isLoggedIn = session_user_id() > 0;
} catch (Throwable $e) {
  $isLoggedIn = false;
}

$lang = strtolower((string)($_GET['lang'] ?? $_COOKIE['vp_lang'] ?? 'en'));
$lang = in_array($lang, ['en', 'ar'], true) ? $lang : 'en';
$isRtl = $lang === 'ar';
$next = rawurlencode('/app.php#/home');

$copy = [
  'en' => [
    'meta' => 'MEX Group — Professional multi-asset trading platform for crypto, forex, stocks, commodities, copy trading, and investment contracts.',
    'login' => 'Log in',
    'register' => 'Create account',
    'dashboard' => 'Open dashboard',
    'logout' => 'Log out',
    'nav_markets' => 'Markets',
    'nav_platform' => 'Platform',
    'nav_earn' => 'Earn',
    'nav_funding' => 'Funding',
    'nav_support' => 'Support',
    'kicker' => 'MEX Group Trading Desk',
    'title_1' => 'Trade',
    'title_2' => 'Global',
    'title_3' => 'Markets',
    'subtitle' => 'Access 70+ instruments across crypto, forex, stocks, and commodities from one professional workspace. Fast execution, transparent pricing, and institutional-grade security.',
    'primary' => 'Start trading',
    'secondary' => 'View platform',
    'stat_markets' => '70+',
    'stat_markets_label' => 'Markets',
    'stat_uptime' => '24/7',
    'stat_uptime_label' => 'Operations',
    'stat_kyc' => 'KYC',
    'stat_kyc_label' => 'Verified',
    'markets_title' => 'Live market prices',
    'markets_sub' => 'Real-time and delayed prices from our multi-provider quote engine. Auto-refreshing every 15 seconds.',
    'platform_title' => 'Built for serious traders',
    'platform_sub' => 'A lightweight web platform rebuilt for speed, clarity, and mobile-first trading workflows.',
    'feature_trade' => 'Trading workspace',
    'feature_trade_text' => 'Professional charts, order ticket with instant confirmation, positions tracking, and full trade history.',
    'feature_wallet' => 'Funding & wallet',
    'feature_wallet_text' => 'Manual deposits and withdrawals with proof upload, status timelines, ledger history, and optional Stripe card checkout.',
    'feature_earn' => 'Copy trading & contracts',
    'feature_earn_text' => 'Follow top signal providers, subscribe to level-gated investment contracts, and earn passively.',
    'feature_admin' => 'Operations admin',
    'feature_admin_text' => 'Full control: users, KYC, deposits, withdrawals, markets, signals, contracts, support, and audit logs.',
    'trust_title' => 'Why traders choose MEX Group',
    'trust_1' => 'Multi-asset coverage',
    'trust_1_text' => 'Crypto, forex, stocks, commodities, and futures — all from one account.',
    'trust_2' => 'Transparent pricing',
    'trust_2_text' => 'Live quotes from multiple providers with clear source labels and price age indicators.',
    'trust_3' => 'Secure operations',
    'trust_3_text' => 'KYC verification, protected sessions, and manual funding review for every transaction.',
    'trust_4' => 'Copy trading',
    'trust_4_text' => 'Follow verified signal providers with transparent performance metrics and risk indicators.',
    'earn_title' => 'Copy signals and level contracts',
    'earn_sub' => 'Demo users can preview the desk. Real account users with approved KYC can copy signals or subscribe to level-gated contracts.',
    'funding_title' => 'Funding that stays auditable',
    'funding_sub' => 'Client requests stay visible from creation to approval. Card payments use Stripe Checkout when enabled, and manual methods remain available.',
    'support_title' => 'Launch your client area',
    'support_sub' => 'Log in to manage trades, verification, deposits, withdrawals, copy subscriptions, contracts, support tickets, and account settings.',
    'footer_company' => 'Company',
    'footer_products' => 'Products',
    'footer_resources' => 'Resources',
    'footer_legal' => 'Legal',
    'footer_about' => 'About MEX Group',
    'footer_about_text' => 'Professional multi-asset trading platform serving global clients with transparent pricing and institutional-grade operations.',
    'footer_trade' => 'Trading Desk',
    'footer_copy' => 'Copy Trading',
    'footer_invest' => 'Investment Contracts',
    'footer_funding' => 'Funding',
    'footer_kyc' => 'KYC Verification',
    'footer_support' => 'Support Center',
    'footer_api' => 'API Documentation',
    'footer_terms' => 'Terms of Service',
    'footer_privacy' => 'Privacy Policy',
    'footer_risk' => 'Risk Disclosure',
    'footer_disclaimer' => 'Trading involves significant risk. Real execution is internal to the platform unless separately integrated with an external broker or exchange. Past performance does not guarantee future results.',
    'last_updated' => 'Last updated',
    'seconds_ago' => 'seconds ago',
    'loading' => 'Loading',
    'live' => 'Live',
    'delayed' => 'Delayed',
  ],
  'ar' => [
    'meta' => 'MEX Group — منصة تداول احترافية متعددة الأصول للكريبتو والفوركس والأسهم والسلع ونسخ الصفقات والعقود الاستثمارية.',
    'login' => 'تسجيل الدخول',
    'register' => 'إنشاء حساب',
    'dashboard' => 'فتح لوحة التحكم',
    'logout' => 'تسجيل الخروج',
    'nav_markets' => 'الأسواق',
    'nav_platform' => 'المنصة',
    'nav_earn' => 'العقود والنسخ',
    'nav_funding' => 'التمويل',
    'nav_support' => 'الدعم',
    'kicker' => 'مكتب تداول MEX Group',
    'title_1' => 'تداول',
    'title_2' => 'الأسواق',
    'title_3' => 'العالمية',
    'subtitle' => 'وصول لـ 70+ أداة عبر الكريبتو والفوركس والأسهم والسلع من مساحة عمل واحدة احترافية. تنفيذ سريع، تسعير شفاف، وأمان بمستوى مؤسسي.',
    'primary' => 'ابدأ التداول',
    'secondary' => 'شاهد المنصة',
    'stat_markets' => '70+',
    'stat_markets_label' => 'أسواق',
    'stat_uptime' => '24/7',
    'stat_uptime_label' => 'عمليات',
    'stat_kyc' => 'KYC',
    'stat_kyc_label' => 'موثق',
    'markets_title' => 'أسعار الأسواق المباشرة',
    'markets_sub' => 'أسعار مباشرة ومتأخرة من محرك تسعير متعدد المزودين. تحديث تلقائي كل 15 ثانية.',
    'platform_title' => 'مصممة للمتداولين المحترفين',
    'platform_sub' => 'منصة ويب خفيفة أعيد بناؤها للسرعة والوضوح وتجربة تداول ممتازة على الموبايل.',
    'feature_trade' => 'مساحة التداول',
    'feature_trade_text' => 'شارت احترافي، تذكرة أوامر مع تأكيد فوري، متابعة المراكز، وسجل كامل للصفقات.',
    'feature_wallet' => 'المحفظة والتمويل',
    'feature_wallet_text' => 'إيداع وسحب يدوي مع رفع إثبات، مراحل حالة، سجل محاسبي، ودفع بطاقة عبر Stripe عند التفعيل.',
    'feature_earn' => 'نسخ الصفقات والعقود',
    'feature_earn_text' => 'تابع أفضل مزودي الإشارات، اشترك في عقود استثمارية حسب المستوى، واكسب بشكل سلبي.',
    'feature_admin' => 'إدارة التشغيل',
    'feature_admin_text' => 'تحكم كامل: المستخدمون، KYC، الإيداعات، السحوبات، الأسواق، الإشارات، العقود، الدعم، وسجل التدقيق.',
    'trust_title' => 'لماذا يختار المتداولون MEX Group',
    'trust_1' => 'تغطية متعددة الأصول',
    'trust_1_text' => 'كريبتو، فوركس، أسهم، سلع، وعقود آجلة — كلها من حساب واحد.',
    'trust_2' => 'تسعير شفاف',
    'trust_2_text' => 'أسعار مباشرة من مزودين متعددين مع تسمية المصدر ومؤشر عمر السعر.',
    'trust_3' => 'عمليات آمنة',
    'trust_3_text' => 'تحقق KYC، جلسات محمية، ومراجعة يدوية للتمويل لكل معاملة.',
    'trust_4' => 'نسخ الصفقات',
    'trust_4_text' => 'تابع مزودي إشارات موثقين بمقاييس أداء شفافة ومؤشرات مخاطر.',
    'earn_title' => 'إشارات نسخ وعقود حسب المستوى',
    'earn_sub' => 'مستخدمو الديمو يمكنهم المعاينة. مستخدمو الحساب الحقيقي مع KYC معتمد يمكنهم نسخ الإشارات أو الاشتراك في العقود.',
    'funding_title' => 'تمويل قابل للمراجعة',
    'funding_sub' => 'طلبات العملاء تظل واضحة من الإنشاء حتى الاعتماد. الدفع بالبطاقة عبر Stripe Checkout عند التفعيل، والطرق اليدوية متاحة.',
    'support_title' => 'ادخل إلى منطقة العميل',
    'support_sub' => 'سجل الدخول لإدارة التداول، التوثيق، الإيداعات، السحوبات، نسخ الصفقات، العقود، تذاكر الدعم، وإعدادات الحساب.',
    'footer_company' => 'الشركة',
    'footer_products' => 'المنتجات',
    'footer_resources' => 'الموارد',
    'footer_legal' => 'قانوني',
    'footer_about' => 'عن MEX Group',
    'footer_about_text' => 'منصة تداول احترافية متعددة الأصول تخدم عملاء عالميين بتسعير شفاف وعمليات بمستوى مؤسسي.',
    'footer_trade' => 'مكتب التداول',
    'footer_copy' => 'نسخ الصفقات',
    'footer_invest' => 'العقود الاستثمارية',
    'footer_funding' => 'التمويل',
    'footer_kyc' => 'تحقق KYC',
    'footer_support' => 'مركز الدعم',
    'footer_api' => 'توثيق API',
    'footer_terms' => 'شروط الخدمة',
    'footer_privacy' => 'سياسة الخصوصية',
    'footer_risk' => 'إفصاح المخاطر',
    'footer_disclaimer' => 'التداول يحتوي على مخاطر كبيرة. التنفيذ الحقيقي داخلي داخل المنصة ما لم يتم ربط وسيط أو بورصة خارجية. الأداء السابق لا يضمن النتائج المستقبلية.',
    'last_updated' => 'آخر تحديث',
    'seconds_ago' => 'ثانية مضت',
    'loading' => 'جار التحميل',
    'live' => 'مباشر',
    'delayed' => 'متأخر',
  ],
];

$t = $copy[$lang];
$brand = 'MEX Group';
$product = 'MEX Group';
$brandEsc = htmlspecialchars($brand, ENT_QUOTES, 'UTF-8');
$productEsc = htmlspecialchars($product, ENT_QUOTES, 'UTF-8');

function e(string $value): string {
  return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

// Ticker symbols for the marquee
$tickerSymbols = [
  ['BTCUSDT','crypto'],['ETHUSDT','crypto'],['BNBUSDT','crypto'],['XRPUSDT','crypto'],
  ['EURUSD','forex'],['GBPUSD','forex'],['USDJPY','forex'],
  ['XAUUSD','commodities'],['USOIL','commodities'],
  ['AAPL','stocks'],['TSLA','stocks'],
];
?>
<!doctype html>
<html lang="<?php echo e($lang); ?>" dir="<?php echo $isRtl ? 'rtl' : 'ltr'; ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#060b18">
  <meta name="description" content="<?php echo e($t['meta']); ?>">
  <title><?php echo $brandEsc; ?> | <?php echo $productEsc; ?></title>
  <link rel="stylesheet" href="/assets/css/public-site.css?v=<?php echo @filemtime(__DIR__ . '/assets/css/public-site.css') ?: time(); ?>">
</head>
<body class="mex-landing-page <?php echo $isRtl ? 'is-rtl' : ''; ?>">

  <!-- Header -->
  <header class="mex-landing-top">
    <a class="mex-landing-brand" href="/?lang=<?php echo e($lang); ?>" aria-label="<?php echo $brandEsc; ?>">
      <img src="/assets/img/mexgroup_logo.svg" alt="" onerror="this.style.display='none'">
      <span>
        <strong><?php echo $brandEsc; ?></strong>
        <small><?php echo $productEsc; ?></small>
      </span>
    </a>
    <nav class="mex-landing-nav" aria-label="Primary">
      <a href="#markets"><?php echo e($t['nav_markets']); ?></a>
      <a href="#platform"><?php echo e($t['nav_platform']); ?></a>
      <a href="#earn"><?php echo e($t['nav_earn']); ?></a>
      <a href="#funding"><?php echo e($t['nav_funding']); ?></a>
      <a href="#support"><?php echo e($t['nav_support']); ?></a>
    </nav>
    <div class="mex-landing-actions">
      <a class="mex-lang-pill" href="/?lang=<?php echo $lang === 'ar' ? 'en' : 'ar'; ?>"><?php echo $lang === 'ar' ? 'EN' : 'AR'; ?></a>
      <?php if ($isLoggedIn): ?>
        <a class="mex-btn mex-btn-soft" href="/logout.php"><?php echo e($t['logout']); ?></a>
        <a class="mex-btn mex-btn-primary" href="/app.php#/home"><?php echo e($t['dashboard']); ?></a>
      <?php else: ?>
        <a class="mex-btn mex-btn-soft" href="/login.php?lang=<?php echo e($lang); ?>&next=<?php echo $next; ?>"><?php echo e($t['login']); ?></a>
        <a class="mex-btn mex-btn-primary" href="/register.php?lang=<?php echo e($lang); ?>&next=<?php echo $next; ?>"><?php echo e($t['register']); ?></a>
      <?php endif; ?>
    </div>
  </header>

  <!-- Live Ticker Strip -->
  <div class="mex-ticker-strip" id="ticker-strip">
    <div class="mex-ticker-track">
      <div class="mex-ticker-items" id="ticker-items">
        <?php for ($i = 0; $i < 3; $i++): ?>
        <?php foreach ($tickerSymbols as $ts): ?>
          <span class="mex-ticker-item" data-ticker-symbol="<?php echo e($ts[0]); ?>" data-ticker-type="<?php echo e($ts[1]); ?>">
            <b><?php echo e($ts[0]); ?></b>
            <em class="mex-ticker-price" data-price-symbol="<?php echo e($ts[0]); ?>">--</em>
            <i class="mex-ticker-change" data-change-symbol="<?php echo e($ts[0]); ?>">0.00%</i>
          </span>
        <?php endforeach; ?>
        <?php endfor; ?>
      </div>
    </div>
  </div>

  <main>
    <!-- Hero Section -->
    <section class="mex-hero">
      <div class="mex-hero-copy">
        <span class="mex-kicker"><?php echo e($t['kicker']); ?></span>
        <h1><span class="hero-line"><?php echo e($t['title_1']); ?></span> <span class="mex-accent"><?php echo e($t['title_2']); ?></span> <span class="hero-line"><?php echo e($t['title_3']); ?></span></h1>
        <p><?php echo e($t['subtitle']); ?></p>
        <div class="mex-hero-actions">
          <a class="mex-btn mex-btn-primary" href="<?php echo $isLoggedIn ? '/app.php#/trade' : '/register.php?lang=' . e($lang) . '&next=' . $next; ?>"><?php echo e($t['primary']); ?></a>
          <a class="mex-btn mex-btn-soft" href="<?php echo $isLoggedIn ? '/app.php#/home' : '/login.php?lang=' . e($lang) . '&next=' . $next; ?>"><?php echo e($t['secondary']); ?></a>
        </div>
        <div class="mex-hero-stats">
          <div><strong><?php echo e($t['stat_markets']); ?></strong><span><?php echo e($t['stat_markets_label']); ?></span></div>
          <div><strong><?php echo e($t['stat_uptime']); ?></strong><span><?php echo e($t['stat_uptime_label']); ?></span></div>
          <div><strong><?php echo e($t['stat_kyc']); ?></strong><span><?php echo e($t['stat_kyc_label']); ?></span></div>
        </div>
      </div>
      <div class="mex-hero-terminal" aria-label="Market terminal preview">
        <div class="mex-terminal-top">
          <span></span><span></span><span></span>
          <strong><?php echo $productEsc; ?> Desk</strong>
        </div>
        <div class="mex-terminal-chart">
          <i style="height:38%"></i><i style="height:52%"></i><i style="height:46%"></i><i style="height:67%"></i><i style="height:58%"></i><i style="height:74%"></i><i style="height:61%"></i><i style="height:82%"></i><i style="height:78%"></i><i style="height:70%"></i><i style="height:84%"></i><i style="height:76%"></i>
        </div>
        <div class="mex-terminal-row"><span>BTCUSDT</span><strong data-price-symbol="BTCUSDT">--</strong><em><?php echo e($t['live']); ?></em></div>
        <div class="mex-terminal-row"><span>EURUSD</span><strong data-price-symbol="EURUSD">--</strong><em><?php echo e($t['delayed']); ?></em></div>
        <div class="mex-terminal-row"><span>XAUUSD</span><strong data-price-symbol="XAUUSD">--</strong><em>Metals</em></div>
      </div>
    </section>

    <!-- Markets Section -->
    <section id="markets" class="mex-section">
      <div class="mex-section-head">
        <span class="mex-kicker"><?php echo e($t['nav_markets']); ?></span>
        <h2><?php echo e($t['markets_title']); ?></h2>
        <p><?php echo e($t['markets_sub']); ?></p>
        <div class="mex-price-age" id="price-age" style="display:none">
          <small><?php echo e($t['last_updated']); ?>: <span id="price-age-sec">0</span> <?php echo e($t['seconds_ago']); ?></small>
        </div>
      </div>
      <div class="mex-market-grid">
        <?php foreach ([
          ['BTCUSDT', 'Bitcoin / Tether', 'crypto'],
          ['ETHUSDT', 'Ethereum / Tether', 'crypto'],
          ['EURUSD', 'Euro / Dollar', 'forex'],
          ['GBPUSD', 'Pound / Dollar', 'forex'],
          ['XAUUSD', 'Gold Spot', 'commodities'],
          ['USOIL', 'WTI Crude Oil', 'commodities'],
          ['AAPL', 'Apple Inc.', 'stocks'],
          ['TSLA', 'Tesla Inc.', 'stocks'],
        ] as $m): ?>
          <article class="mex-market-card mex-market-card-live">
            <div class="mex-market-icon"><?php echo e(substr($m[0], 0, 2)); ?></div>
            <div>
              <strong><?php echo e($m[0]); ?></strong>
              <span><?php echo e($m[1]); ?></span>
            </div>
            <div class="mex-market-price">
              <strong data-price-symbol="<?php echo e($m[0]); ?>" data-price-type="<?php echo e($m[2]); ?>">--</strong>
              <small data-change-symbol="<?php echo e($m[0]); ?>"><?php echo e($t['loading']); ?></small>
            </div>
          </article>
        <?php endforeach; ?>
      </div>
    </section>

    <!-- Trust Section -->
    <section id="trust" class="mex-section">
      <div class="mex-section-head" style="text-align:center">
        <span class="mex-kicker"><?php echo e($t['trust_title']); ?></span>
        <h2><?php echo e($t['trust_title']); ?></h2>
      </div>
      <div class="mex-trust-grid">
        <article class="mex-trust-card">
          <div class="mex-trust-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
          </div>
          <h3><?php echo e($t['trust_1']); ?></h3>
          <p><?php echo e($t['trust_1_text']); ?></p>
        </article>
        <article class="mex-trust-card">
          <div class="mex-trust-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          </div>
          <h3><?php echo e($t['trust_2']); ?></h3>
          <p><?php echo e($t['trust_2_text']); ?></p>
        </article>
        <article class="mex-trust-card">
          <div class="mex-trust-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </div>
          <h3><?php echo e($t['trust_3']); ?></h3>
          <p><?php echo e($t['trust_3_text']); ?></p>
        </article>
        <article class="mex-trust-card">
          <div class="mex-trust-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          </div>
          <h3><?php echo e($t['trust_4']); ?></h3>
          <p><?php echo e($t['trust_4_text']); ?></p>
        </article>
      </div>
    </section>

    <!-- Platform Features Section -->
    <section id="platform" class="mex-section mex-feature-section">
      <div class="mex-section-head">
        <span class="mex-kicker"><?php echo $productEsc; ?></span>
        <h2><?php echo e($t['platform_title']); ?></h2>
        <p><?php echo e($t['platform_sub']); ?></p>
      </div>
      <div class="mex-feature-grid">
        <article><span>01</span><h3><?php echo e($t['feature_trade']); ?></h3><p><?php echo e($t['feature_trade_text']); ?></p></article>
        <article><span>02</span><h3><?php echo e($t['feature_wallet']); ?></h3><p><?php echo e($t['feature_wallet_text']); ?></p></article>
        <article><span>03</span><h3><?php echo e($t['feature_earn']); ?></h3><p><?php echo e($t['feature_earn_text']); ?></p></article>
        <article><span>04</span><h3><?php echo e($t['feature_admin']); ?></h3><p><?php echo e($t['feature_admin_text']); ?></p></article>
      </div>
    </section>

    <!-- Earn Section -->
    <section id="earn" class="mex-section mex-split-section">
      <div>
        <span class="mex-kicker">Earn</span>
        <h2><?php echo e($t['earn_title']); ?></h2>
        <p><?php echo e($t['earn_sub']); ?></p>
      </div>
      <a class="mex-btn mex-btn-primary" href="<?php echo $isLoggedIn ? '/app.php#/invest' : '/register.php?lang=' . e($lang) . '&next=' . rawurlencode('/app.php#/invest'); ?>"><?php echo e($t['nav_earn']); ?></a>
    </section>

    <!-- Funding Section -->
    <section id="funding" class="mex-section mex-split-section">
      <div>
        <span class="mex-kicker">Funding</span>
        <h2><?php echo e($t['funding_title']); ?></h2>
        <p><?php echo e($t['funding_sub']); ?></p>
      </div>
      <a class="mex-btn mex-btn-soft" href="<?php echo $isLoggedIn ? '/app.php#/deposit' : '/login.php?lang=' . e($lang) . '&next=' . rawurlencode('/app.php#/deposit'); ?>"><?php echo e($t['nav_funding']); ?></a>
    </section>

    <!-- Support / CTA Section -->
    <section id="support" class="mex-section mex-cta">
      <span class="mex-kicker">Client area</span>
      <h2><?php echo e($t['support_title']); ?></h2>
      <p><?php echo e($t['support_sub']); ?></p>
      <div class="mex-hero-actions">
        <a class="mex-btn mex-btn-primary" href="<?php echo $isLoggedIn ? '/app.php#/home' : '/login.php?lang=' . e($lang) . '&next=' . $next; ?>"><?php echo $isLoggedIn ? e($t['dashboard']) : e($t['login']); ?></a>
        <a class="mex-btn mex-btn-soft" href="/app.php#/support"><?php echo e($t['nav_support']); ?></a>
      </div>
    </section>
  </main>

  <!-- Footer -->
  <footer class="mex-landing-footer-full">
    <div class="mex-footer-grid">
      <div class="mex-footer-col mex-footer-brand-col">
        <strong class="mex-footer-logo"><?php echo $brandEsc; ?></strong>
        <p><?php echo e($t['footer_about_text']); ?></p>
      </div>
      <div class="mex-footer-col">
        <h4><?php echo e($t['footer_products']); ?></h4>
        <a href="/app.php#/trade"><?php echo e($t['footer_trade']); ?></a>
        <a href="/app.php#/invest"><?php echo e($t['footer_copy']); ?></a>
        <a href="/app.php#/invest"><?php echo e($t['footer_invest']); ?></a>
        <a href="/app.php#/deposit"><?php echo e($t['footer_funding']); ?></a>
      </div>
      <div class="mex-footer-col">
        <h4><?php echo e($t['footer_resources']); ?></h4>
        <a href="/app.php#/kyc"><?php echo e($t['footer_kyc']); ?></a>
        <a href="/app.php#/support"><?php echo e($t['footer_support']); ?></a>
        <a href="#"><?php echo e($t['footer_api']); ?></a>
      </div>
      <div class="mex-footer-col">
        <h4><?php echo e($t['footer_legal']); ?></h4>
        <a href="#"><?php echo e($t['footer_terms']); ?></a>
        <a href="#"><?php echo e($t['footer_privacy']); ?></a>
        <a href="#"><?php echo e($t['footer_risk']); ?></a>
      </div>
    </div>
    <div class="mex-footer-bottom">
      <span>&copy; <?php echo date('Y'); ?> <?php echo $brandEsc; ?>. All rights reserved.</span>
      <small><?php echo e($t['footer_disclaimer']); ?></small>
    </div>
  </footer>

  <script>
  (function(){
    var lastPriceTime = 0;
    var priceAgeEl = document.getElementById('price-age');
    var priceAgeSec = document.getElementById('price-age-sec');

    function fmt(v){
      var n = Number(v);
      if (!isFinite(n) || n <= 0) return '--';
      if (n >= 1000) return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
      if (n >= 1) return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 4 });
      return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 6 });
    }

    function fetchPrices(){
      var symbols = Array.from(document.querySelectorAll('[data-price-symbol]')).map(function(el){
        return el.getAttribute('data-price-symbol');
      });
      symbols = Array.from(new Set(symbols.filter(Boolean)));
      if (!symbols.length) return;

      fetch('/api/quotes.php?symbols=' + encodeURIComponent(symbols.join(',')) + '&type=all&purpose=landing', {
        headers: { Accept: 'application/json' }
      })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        if (!data) return;
        var quotes = data.quotes || data.data || data.items || [];
        if (!Array.isArray(quotes) && typeof quotes === 'object') quotes = Object.values(quotes);

        lastPriceTime = Date.now();
        if (priceAgeEl) priceAgeEl.style.display = '';

        quotes.forEach(function(q){
          var sym = String(q.symbol || q.market || '').toUpperCase();
          var price = q.price || q.last || q.bid || q.close;
          var change = q.change_pct || q.changePercent || q.change || 0;
          var c = Number(change);

          document.querySelectorAll('[data-price-symbol="' + sym + '"]').forEach(function(el){
            var oldText = el.textContent;
            var newText = fmt(price);
            if (oldText !== '--' && oldText !== newText) {
              el.classList.remove('price-flash-up', 'price-flash-down');
              void el.offsetWidth;
              el.classList.add(c >= 0 ? 'price-flash-up' : 'price-flash-down');
            }
            el.textContent = newText;
          });

          document.querySelectorAll('[data-change-symbol="' + sym + '"]').forEach(function(el){
            el.textContent = isFinite(c) ? ((c >= 0 ? '+' : '') + c.toFixed(2) + '%') : 'Delayed';
            el.className = c < 0 ? 'down' : 'up';
          });

          // Update ticker
          document.querySelectorAll('[data-ticker-symbol="' + sym + '"]').forEach(function(el){
            var priceEl = el.querySelector('.mex-ticker-price');
            var changeEl = el.querySelector('.mex-ticker-change');
            if (priceEl) priceEl.textContent = fmt(price);
            if (changeEl) {
              changeEl.textContent = isFinite(c) ? ((c >= 0 ? '+' : '') + c.toFixed(2) + '%') : '';
              changeEl.className = 'mex-ticker-change ' + (c < 0 ? 'down' : 'up');
            }
          });
        });
      })
      .catch(function(){});
    }

    // Update age indicator
    setInterval(function(){
      if (lastPriceTime && priceAgeSec) {
        priceAgeSec.textContent = Math.round((Date.now() - lastPriceTime) / 1000);
      }
    }, 1000);

    // Initial fetch + 15s interval
    fetchPrices();
    setInterval(fetchPrices, 15000);
  })();
  </script>
</body>
</html>
