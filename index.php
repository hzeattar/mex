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
    'meta' => 'MEX Group client trading platform for crypto, forex, stocks, commodities, copy trading, contracts, deposits, withdrawals, and account management.',
    'login' => 'Log in',
    'register' => 'Create account',
    'dashboard' => 'Open dashboard',
    'logout' => 'Log out',
    'nav_markets' => 'Markets',
    'nav_platform' => 'Platform',
    'nav_earn' => 'Earn',
    'nav_funding' => 'Funding',
    'nav_support' => 'Support',
    'kicker' => 'MEX Group trading desk',
    'title' => 'One secure workspace for markets, copy trading, and client funding.',
    'subtitle' => 'VertexPluse runs inside the MEX Group experience: fast quotes, professional charts, internal demo and real trading, KYC, deposits, withdrawals, contracts, and support from one clean client portal.',
    'primary' => 'Start trading',
    'secondary' => 'View platform',
    'stat_1' => 'Multi-asset desk',
    'stat_2' => 'Manual funding review',
    'stat_3' => 'Copy and contracts',
    'markets_title' => 'Live market snapshot',
    'markets_sub' => 'Curated instruments for the client dashboard, warmed through the platform quote authority.',
    'platform_title' => 'Built for serious client operations',
    'platform_sub' => 'A lightweight web platform rebuilt for speed, clarity, and mobile-first trading workflows.',
    'feature_trade' => 'Trading workspace',
    'feature_trade_text' => 'Watchlists, chart, order ticket, positions, orders, and history in one focused screen.',
    'feature_wallet' => 'Funding and wallet',
    'feature_wallet_text' => 'Manual deposits and withdrawals with proof, status timelines, ledger history, and optional Stripe card checkout.',
    'feature_earn' => 'Copy trading and contracts',
    'feature_earn_text' => 'Real-only copy desk, KYC gates, level-based contracts, and transparent account eligibility.',
    'feature_admin' => 'Operations admin',
    'feature_admin_text' => 'Users, KYC, deposits, withdrawals, markets, signals, contracts, support, ledger, and audit logs.',
    'earn_title' => 'Copy signals and level contracts',
    'earn_sub' => 'Demo users can preview the desk. Real account users with approved KYC can copy signals or subscribe to level-gated contracts.',
    'funding_title' => 'Funding that stays auditable',
    'funding_sub' => 'Client requests stay visible from creation to approval. Card payments use Stripe Checkout when enabled, and manual methods remain available.',
    'support_title' => 'Launch your client area',
    'support_sub' => 'Log in to manage trades, verification, deposits, withdrawals, copy subscriptions, contracts, support tickets, and account settings.',
    'footer' => 'Trading involves risk. Real execution is internal to the platform unless separately integrated with an external broker or exchange.',
    'loading' => 'Loading',
  ],
  'ar' => [
    'meta' => 'منصة تداول عملاء MEX Group للكريبتو والفوركس والأسهم والسلع ونسخ الصفقات والعقود والإيداع والسحب وإدارة الحساب.',
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
    'title' => 'مساحة واحدة آمنة للأسواق ونسخ الصفقات وتمويل العملاء.',
    'subtitle' => 'VertexPluse تعمل داخل تجربة MEX Group: أسعار سريعة، شارت احترافي، تداول تجريبي وحقيقي داخلي، توثيق، إيداع، سحب، عقود، ودعم من بوابة عميل واحدة.',
    'primary' => 'ابدأ التداول',
    'secondary' => 'شاهد المنصة',
    'stat_1' => 'أسواق متعددة',
    'stat_2' => 'مراجعة تمويل يدوية',
    'stat_3' => 'نسخ وعقود',
    'markets_title' => 'لقطة مباشرة للأسواق',
    'markets_sub' => 'رموز مختارة للوحة العميل يتم تسخين أسعارها عبر مصدر الأسعار الموحد داخل المنصة.',
    'platform_title' => 'مصممة لتشغيل عملاء حقيقي',
    'platform_sub' => 'منصة ويب خفيفة أعيد بناؤها للسرعة والوضوح وتجربة تداول ممتازة على الموبايل.',
    'feature_trade' => 'مساحة التداول',
    'feature_trade_text' => 'قوائم مراقبة، شارت، تذكرة أوامر، مراكز، أوامر، وسجل داخل شاشة واحدة واضحة.',
    'feature_wallet' => 'المحفظة والتمويل',
    'feature_wallet_text' => 'إيداع وسحب يدوي مع إثبات، مراحل حالة، سجل محاسبي، ودفع بطاقة عبر Stripe عند التفعيل.',
    'feature_earn' => 'نسخ الصفقات والعقود',
    'feature_earn_text' => 'نسخ للحساب الحقيقي فقط، بوابات KYC، عقود حسب المستوى، ووضوح في أهلية الحساب.',
    'feature_admin' => 'إدارة التشغيل',
    'feature_admin_text' => 'المستخدمون، KYC، الإيداعات، السحوبات، الأسواق، الإشارات، العقود، الدعم، السجل المالي، والتدقيق.',
    'earn_title' => 'إشارات نسخ وعقود حسب المستوى',
    'earn_sub' => 'مستخدمو الديمو يمكنهم المعاينة. مستخدمو الحساب الحقيقي مع KYC معتمد يمكنهم نسخ الإشارات أو الاشتراك في العقود.',
    'funding_title' => 'تمويل قابل للمراجعة',
    'funding_sub' => 'طلبات العملاء تظل واضحة من الإنشاء حتى الاعتماد. الدفع بالبطاقة يتم عبر Stripe Checkout عند تفعيله، والطرق اليدوية متاحة.',
    'support_title' => 'ادخل إلى منطقة العميل',
    'support_sub' => 'سجل الدخول لإدارة التداول، التوثيق، الإيداعات، السحوبات، نسخ الصفقات، العقود، تذاكر الدعم، وإعدادات الحساب.',
    'footer' => 'التداول يحتوي على مخاطر. التنفيذ الحقيقي داخلي داخل المنصة ما لم يتم ربط وسيط أو بورصة خارجية لاحقًا.',
    'loading' => 'جار التحميل',
  ],
];

$t = $copy[$lang];
$brand = 'MEX Group';
$product = 'VertexPluse';
$brandEsc = htmlspecialchars($brand, ENT_QUOTES, 'UTF-8');
$productEsc = htmlspecialchars($product, ENT_QUOTES, 'UTF-8');

function e(string $value): string {
  return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}
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

  <main>
    <section class="mex-hero">
      <div class="mex-hero-copy">
        <span class="mex-kicker"><?php echo e($t['kicker']); ?></span>
        <h1><?php echo e($t['title']); ?></h1>
        <p><?php echo e($t['subtitle']); ?></p>
        <div class="mex-hero-actions">
          <a class="mex-btn mex-btn-primary" href="<?php echo $isLoggedIn ? '/app.php#/trade' : '/register.php?lang=' . e($lang) . '&next=' . $next; ?>"><?php echo e($t['primary']); ?></a>
          <a class="mex-btn mex-btn-soft" href="<?php echo $isLoggedIn ? '/app.php#/home' : '/login.php?lang=' . e($lang) . '&next=' . $next; ?>"><?php echo e($t['secondary']); ?></a>
        </div>
        <div class="mex-hero-stats">
          <div><strong>70+</strong><span><?php echo e($t['stat_1']); ?></span></div>
          <div><strong>24/7</strong><span><?php echo e($t['stat_2']); ?></span></div>
          <div><strong>KYC</strong><span><?php echo e($t['stat_3']); ?></span></div>
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
        <div class="mex-terminal-row"><span>BTCUSDT</span><strong data-price-symbol="BTCUSDT">--</strong><em>Binance</em></div>
        <div class="mex-terminal-row"><span>EURUSD</span><strong data-price-symbol="EURUSD">--</strong><em>Delayed</em></div>
        <div class="mex-terminal-row"><span>XAUUSD</span><strong data-price-symbol="XAUUSD">--</strong><em>Metals</em></div>
      </div>
    </section>

    <section id="markets" class="mex-section">
      <div class="mex-section-head">
        <span class="mex-kicker">Markets</span>
        <h2><?php echo e($t['markets_title']); ?></h2>
        <p><?php echo e($t['markets_sub']); ?></p>
      </div>
      <div class="mex-market-grid">
        <?php foreach ([
          ['BTCUSDT', 'Bitcoin / Tether', 'crypto'],
          ['ETHUSDT', 'Ethereum / Tether', 'crypto'],
          ['EURUSD', 'Euro / Dollar', 'forex'],
          ['AAPL', 'Apple Inc.', 'stocks'],
          ['XAUUSD', 'Gold Spot', 'commodities'],
          ['USOIL', 'WTI Crude Oil', 'commodities'],
          ['ES_F', 'S&P 500 Futures', 'futures'],
          ['2222', 'Saudi Aramco', 'arab'],
        ] as $m): ?>
          <article class="mex-market-card">
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

    <section id="earn" class="mex-section mex-split-section">
      <div>
        <span class="mex-kicker">Earn</span>
        <h2><?php echo e($t['earn_title']); ?></h2>
        <p><?php echo e($t['earn_sub']); ?></p>
      </div>
      <a class="mex-btn mex-btn-primary" href="<?php echo $isLoggedIn ? '/app.php#/invest' : '/register.php?lang=' . e($lang) . '&next=' . rawurlencode('/app.php#/invest'); ?>"><?php echo e($t['nav_earn']); ?></a>
    </section>

    <section id="funding" class="mex-section mex-split-section">
      <div>
        <span class="mex-kicker">Funding</span>
        <h2><?php echo e($t['funding_title']); ?></h2>
        <p><?php echo e($t['funding_sub']); ?></p>
      </div>
      <a class="mex-btn mex-btn-soft" href="<?php echo $isLoggedIn ? '/app.php#/deposit' : '/login.php?lang=' . e($lang) . '&next=' . rawurlencode('/app.php#/deposit'); ?>"><?php echo e($t['nav_funding']); ?></a>
    </section>

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

  <footer class="mex-landing-footer">
    <strong><?php echo $brandEsc; ?></strong>
    <span><?php echo e($t['footer']); ?></span>
  </footer>

  <script>
    (function(){
      var symbols = Array.from(document.querySelectorAll('[data-price-symbol]')).map(function(el){ return el.getAttribute('data-price-symbol'); });
      symbols = Array.from(new Set(symbols.filter(Boolean)));
      if (!symbols.length) return;
      function fmt(v){
        var n = Number(v);
        if (!isFinite(n) || n <= 0) return '--';
        if (n >= 1000) return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
        if (n >= 1) return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 4 });
        return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 6 });
      }
      fetch('/api/quotes.php?symbols=' + encodeURIComponent(symbols.join(',')) + '&purpose=landing', { headers: { Accept: 'application/json' } })
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(data){
          if (!data) return;
          var quotes = data.quotes || data.data || data.items || [];
          if (!Array.isArray(quotes) && typeof quotes === 'object') quotes = Object.values(quotes);
          quotes.forEach(function(q){
            var sym = String(q.symbol || q.market || '').toUpperCase();
            var price = q.price || q.last || q.bid || q.close;
            var change = q.change_pct || q.changePercent || q.change || 0;
            document.querySelectorAll('[data-price-symbol="' + sym + '"]').forEach(function(el){ el.textContent = fmt(price); });
            document.querySelectorAll('[data-change-symbol="' + sym + '"]').forEach(function(el){
              var c = Number(change);
              el.textContent = isFinite(c) ? ((c >= 0 ? '+' : '') + c.toFixed(2) + '%') : 'Delayed';
              el.className = c < 0 ? 'down' : 'up';
            });
          });
        })
        .catch(function(){});
    })();
  </script>
</body>
</html>
