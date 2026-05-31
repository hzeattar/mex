<?php
declare(strict_types=1);
require_once __DIR__ . '/site_bootstrap.php';

$lang = 'en';
$rtl  = false;
try {
  require_once __DIR__ . '/includes/shared/site-helpers.php';
  $lang = site_locale();
  $rtl  = site_is_rtl($lang);
} catch (Throwable $e) {
  $l    = strtolower((string)($_GET['lang'] ?? $_COOKIE['vp_lang'] ?? 'en'));
  $lang = in_array($l, ['en','ar','ru','tr','fr','de','es','it','pt','nl','pl','zh','ja','ko','vi'],true) ? $l : 'en';
  $rtl  = $lang === 'ar';
}

$isLoggedIn = false;
try { $isLoggedIn = session_user_id() > 0; } catch (Throwable $e) {}

function _h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

$txt = function(string $key) use ($lang): string {
  static $T = null;
  if ($T === null) { $T = [
    'hero_kicker'     =>['en'=>'MEX GROUP TRADING DESK','ar'=>'مكتب تداول MEX GROUP','ru'=>'ТОРГОВЫЙ СТОЛ MEX GROUP','tr'=>'MEX GROUP TİCARET MASASI','fr'=>'BUREAU DE TRADING MEX GROUP','de'=>'MEX GROUP HANDELSTISCH','es'=>'MESA DE TRADING MEX GROUP'],
    'hero_title_1'    =>['en'=>'Trade','ar'=>'تداول','ru'=>'Торгуйте','tr'=>'Ticaret','fr'=>'Tradez','de'=>'Handeln'],
    'hero_title_2'    =>['en'=>'Global Markets','ar'=>'الأسواق العالمية','ru'=>'Глобальными рынками','tr'=>'Küresel Piyasalar','fr'=>'Les Marchés Mondiaux','de'=>'Globale Märkte'],
    'hero_title_3'    =>['en'=>'From One Account','ar'=>'من حساب واحد','ru'=>'Из одного счёта','tr'=>'Tek Hesaptan','fr'=>'Depuis un Seul Compte','de'=>'Von einem Konto'],
    'hero_subtitle'   =>['en'=>'Access 70+ instruments across crypto, forex, stocks, and commodities with professional charts, instant execution, and institutional-grade security. Start with a free demo.','ar'=>'وصول لأكثر من 70 أداة عبر الكريبتو والفوركس والأسهم والسلع مع شارت احترافي وتنفيذ فوري وأمان مؤسسي. ابدأ بحساب ديمو مجاني.','ru'=>'Доступ к 70+ инструментам — криптовалюта, форекс, акции, товары. Профессиональные графики, мгновенное исполнение. Начните с бесплатного демо.'],
    'hero_cta_primary'=>['en'=>'Start trading','ar'=>'ابدأ التداول','ru'=>'Начать торговлю','tr'=>'Ticarete Başla','fr'=>'Commencer à trader','de'=>'Jetzt handeln'],
    'hero_cta_second' =>['en'=>'View features','ar'=>'شاهد المزايا','ru'=>'Посмотреть функции','tr'=>'Özellikleri Gör','fr'=>'Voir les fonctionnalités','de'=>'Funktionen ansehen'],
    'trust_title'     =>['en'=>'Why MEX Group','ar'=>'لماذا MEX Group','ru'=>'Почему MEX Group','tr'=>'Neden MEX Group','fr'=>'Pourquoi MEX Group','de'=>'Warum MEX Group'],
    'multi'           =>['en'=>'Multi-Asset Trading','ar'=>'تداول متعدد الأصول','ru'=>'Мультиактивная торговля'],
    'multi_text'      =>['en'=>'Crypto, forex, stocks and commodities — all from one account with unified P&L.','ar'=>'الكريبتو والفوركس والأسهم والسلع — كلها من حساب واحد مع ربح وخسارة موحدة.','ru'=>'Крипта, форекс, акции, товары — всё из одного счёта.'],
    'pricing'         =>['en'=>'Transparent Pricing','ar'=>'تسعير شفاف','ru'=>'Прозрачные цены'],
    'pricing_text'    =>['en'=>'Live quotes from multiple providers with clear source labels and real-time refresh.','ar'=>'أسعار مباشرة من مزودين متعددين مع تسميات مصادر واضحة وتحديث فوري.','ru'=>'Прямые котировки от нескольких провайдеров.'],
    'secure'          =>['en'=>'Institutional Security','ar'=>'أمان مؤسسي','ru'=>'Институциональная безопасность'],
    'secure_text'     =>['en'=>'KYC verification, encrypted sessions, and manual funding review on every transaction.','ar'=>'تحقق KYC وجلسات مشفرة ومراجعة يدوية لكل معاملة تمويلية.','ru'=>'Верификация KYC, зашифрованные сессии и ручная проверка средств.'],
    'copy'            =>['en'=>'Copy Trading','ar'=>'نسخ الصفقات','ru'=>'Копирование сделок'],
    'copy_text'       =>['en'=>'Follow verified signal providers with transparent performance metrics and one-click subscribe.','ar'=>'تابع مزودي إشارات موثقين بمقاييس أداء شفافة واشتراك بنقرة واحدة.','ru'=>'Следите за проверенными поставщиками сигналов.'],
    'markets_live'    =>['en'=>'Live Prices','ar'=>'أسعار مباشرة','ru'=>'Цены в реальном времени'],
    'markets_sub'     =>['en'=>'Real-time and delayed quotes from our multi-provider engine, updated every 15 seconds.','ar'=>'أسعار مباشرة ومتأخرة من محركنا متعدد المزودين، تُحدَّث كل 15 ثانية.','ru'=>'Котировки от нашего многоуровневого движка обновляются каждые 15 сек.'],
    'how_title'       =>['en'=>'How It Works','ar'=>'كيف يعمل','ru'=>'Как это работает'],
    'step1_title'     =>['en'=>'Create Account','ar'=>'أنشئ حسابك','ru'=>'Создайте счёт'],
    'step1_text'      =>['en'=>'Register in minutes. Start with a free $10,000 demo account — no card required.','ar'=>'سجّل في دقائق. ابدأ بحساب ديمو مجاني بقيمة 10,000$ — بدون بطاقة.','ru'=>'Зарегистрируйтесь за несколько минут. Демо-счёт $10,000 бесплатно.'],
    'step2_title'     =>['en'=>'Verify Identity','ar'=>'تحقق من هويتك','ru'=>'Подтвердите личность'],
    'step2_text'      =>['en'=>'Upload KYC documents online to unlock real trading, deposits, and withdrawals.','ar'=>'ارفع وثائق KYC عبر الإنترنت لتفعيل التداول الحقيقي والإيداع والسحب.','ru'=>'Загрузите документы KYC для доступа к реальной торговле.'],
    'step3_title'     =>['en'=>'Start Trading','ar'=>'ابدأ التداول','ru'=>'Начните торговлю'],
    'step3_text'      =>['en'=>'Access 70+ markets with professional charts, real-time prices, and instant order execution.','ar'=>'وصّل لأكثر من 70 سوقاً بشارت احترافي وأسعار فورية وتنفيذ أوامر فوري.','ru'=>'70+ рынков, профессиональные графики, мгновенное исполнение.'],
    'cta_title'       =>['en'=>'Ready to start?','ar'=>'مستعد للبدء؟','ru'=>'Готовы начать?'],
    'cta_sub'         =>['en'=>'Open your MEX Group account in minutes and access global markets today.','ar'=>'افتح حساب MEX Group في دقائق وادخل الأسواق العالمية اليوم.','ru'=>'Откройте счёт MEX Group за несколько минут.'],
    'cta_btn'         =>['en'=>'Create free account','ar'=>'إنشاء حساب مجاني','ru'=>'Создать аккаунт'],
    'footer_desc'     =>['en'=>'Professional multi-asset trading platform with transparent pricing and institutional-grade security.','ar'=>'منصة تداول احترافية متعددة الأصول بتسعير شفاف وأمان مؤسسي.','ru'=>'Профессиональная мультиактивная платформа с прозрачными ценами.'],
    'footer_disclaimer'=>['en'=>'Trading involves significant risk. Past performance does not guarantee future results.','ar'=>'التداول يحمل مخاطر كبيرة. الأداء السابق لا يضمن النتائج المستقبلية.','ru'=>'Торговля сопряжена со значительным риском.'],
  ]; }
  return $T[$key][$lang] ?? $T[$key]['en'] ?? $key;
};

$tickerSymbols = [
  ['BTCUSDT','crypto'],['ETHUSDT','crypto'],['BNBUSDT','crypto'],['SOLUSDT','crypto'],
  ['EURUSD','forex'],['GBPUSD','forex'],['USDJPY','forex'],['XAUUSD','commodities'],
  ['AAPL','stocks'],['TSLA','stocks'],['NVDA','stocks'],
  ['USOIL','commodities'],['NATGAS','commodities'],['DOGEUSDT','crypto'],
];
$allTickerSymbols = array_merge($tickerSymbols, $tickerSymbols, $tickerSymbols);

$marketCards = [
  ['BTCUSDT','Bitcoin','crypto'],['ETHUSDT','Ethereum','crypto'],
  ['EURUSD','Euro / Dollar','forex'],['GBPUSD','Pound / Dollar','forex'],
  ['XAUUSD','Gold Spot','commodities'],['AAPL','Apple Inc.','stocks'],
];
?>
<!doctype html>
<html lang="<?php echo _h($lang); ?>" dir="<?php echo $rtl?'rtl':'ltr'; ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#060b18">
  <meta name="description" content="MEX Group — Professional multi-asset trading platform for crypto, forex, stocks, and commodities.">
  <title>MEX Group | Professional Trading Platform</title>
  <link rel="stylesheet" href="/assets/css/public-site.css?v=<?php echo @filemtime(__DIR__.'/assets/css/public-site.css')?: time(); ?>">
</head>
<body class="mex-landing-page<?php echo $rtl?' is-rtl':''; ?>">

<!-- ══ HEADER ══════════════════════════════════════════════════ -->
<header class="mex-header" id="mex-header">
  <div class="mex-header-inner">
    <a class="mex-logo" href="/?lang=<?php echo _h($lang); ?>" aria-label="MEX Group">
      <img src="/assets/img/mexgroup_logo.svg" alt="" loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">
      <span class="mex-logo-fallback" style="display:none">MX</span>
      <strong>MEX Group</strong>
    </a>
    <nav class="mex-header-nav" aria-label="Main navigation">
      <a class="mex-nav-link is-active" href="/?lang=<?php echo _h($lang); ?>">Home</a>
      <a class="mex-nav-link" href="/markets.php?lang=<?php echo _h($lang); ?>">Markets</a>
      <a class="mex-nav-link" href="/features.php?lang=<?php echo _h($lang); ?>">Features</a>
      <a class="mex-nav-link" href="/about.php?lang=<?php echo _h($lang); ?>">About</a>
      <a class="mex-nav-link" href="/contact.php?lang=<?php echo _h($lang); ?>">Contact</a>
    </nav>
    <div class="mex-header-actions">
      <div class="mex-lang-wrap">
        <button class="mex-lang-btn" id="mex-lang-trigger" aria-haspopup="listbox" aria-expanded="false">
          <span class="mex-lang-current"><?php echo strtoupper(_h($lang)); ?></span>
          <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
        <div class="mex-lang-dropdown" id="mex-lang-dropdown" role="listbox">
          <?php foreach(['en'=>'English','ar'=>'العربية','ru'=>'Русский','tr'=>'Türkçe','fr'=>'Français','de'=>'Deutsch','es'=>'Español','it'=>'Italiano','pt'=>'Português','nl'=>'Nederlands','pl'=>'Polski','zh'=>'中文','ja'=>'日本語','ko'=>'한국어','vi'=>'Tiếng Việt'] as $c=>$n): ?>
            <a class="mex-lang-opt<?php echo $c===$lang?' is-active':''; ?>"
               href="?lang=<?php echo _h($c); ?>"><?php echo _h($n); ?></a>
          <?php endforeach; ?>
        </div>
      </div>
      <?php if($isLoggedIn): ?>
        <a class="mex-btn mex-btn-primary mex-btn-sm" href="/app.php#/home">Open App</a>
      <?php else: ?>
        <div class="mex-header-btns">
          <a class="mex-btn mex-btn-soft mex-btn-sm" href="/login.php?lang=<?php echo _h($lang); ?>">Log in</a>
          <a class="mex-btn mex-btn-primary mex-btn-sm" href="/register.php?lang=<?php echo _h($lang); ?>">Create Account</a>
        </div>
      <?php endif; ?>
      <button class="mex-hamburger" id="mex-hamburger" aria-label="Menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>

<!-- ══ HERO ════════════════════════════════════════════════════ -->
<section class="mex-hero-v2">
  <div class="mex-hero-grid">
    <div class="mex-hero-text">
      <span class="mex-kicker"><?php echo _h($txt('hero_kicker')); ?></span>
      <h1>
        <span class="accent"><?php echo _h($txt('hero_title_1')); ?></span>
        <?php echo _h($txt('hero_title_2')); ?><br><?php echo _h($txt('hero_title_3')); ?>
      </h1>
      <p><?php echo _h($txt('hero_subtitle')); ?></p>
      <div class="mex-hero-actions">
        <a class="mex-btn mex-btn-primary"
           href="<?php echo $isLoggedIn?'/app.php#/trade':'/register.php?lang='._h($lang).'&next='.rawurlencode('/app.php#/trade'); ?>">
          <?php echo _h($txt('hero_cta_primary')); ?>
        </a>
        <a class="mex-btn mex-btn-soft" href="/features.php?lang=<?php echo _h($lang); ?>">
          <?php echo _h($txt('hero_cta_second')); ?>
        </a>
      </div>
    </div>
    <div class="mex-hero-terminal" aria-label="Market terminal preview">
      <div class="mex-terminal-top"><span></span><span></span><span></span><strong>MEX Group Desk</strong></div>
      <div class="mex-terminal-chart">
        <i style="height:38%"></i><i style="height:52%"></i><i style="height:46%"></i>
        <i style="height:67%"></i><i style="height:58%"></i><i style="height:74%"></i>
        <i style="height:61%"></i><i style="height:82%"></i><i style="height:78%"></i>
        <i style="height:70%"></i><i style="height:84%"></i><i style="height:76%"></i>
      </div>
      <div class="mex-terminal-row"><span>BTCUSDT</span><strong data-price-symbol="BTCUSDT">--</strong><em>LIVE</em></div>
      <div class="mex-terminal-row"><span>EURUSD</span><strong data-price-symbol="EURUSD">--</strong><em>FX</em></div>
      <div class="mex-terminal-row"><span>XAUUSD</span><strong data-price-symbol="XAUUSD">--</strong><em>Metals</em></div>
    </div>
  </div>
</section>

<!-- ══ TICKER ══════════════════════════════════════════════════ -->
<div class="mex-ticker-strip" id="ticker-strip">
  <div class="mex-ticker-track">
    <?php foreach($allTickerSymbols as $ts): ?>
      <span class="mex-ticker-item" data-ticker-symbol="<?php echo _h($ts[0]); ?>">
        <b><?php echo _h($ts[0]); ?></b>
        <em class="mex-ticker-price" data-price-symbol="<?php echo _h($ts[0]); ?>">--</em>
        <i class="mex-ticker-change" data-change-symbol="<?php echo _h($ts[0]); ?>">0.00%</i>
      </span>
    <?php endforeach; ?>
  </div>
</div>

<!-- ══ STATS ROW ═══════════════════════════════════════════════ -->
<div class="mex-stats-row">
  <div class="mex-stat-card">
    <strong><span class="mex-stat-num" data-count="70">70</span>+</strong>
    <small>Instruments</small>
  </div>
  <div class="mex-stat-card">
    <strong><span class="mex-stat-num" data-count="180">180</span>+</strong>
    <small>Countries</small>
  </div>
  <div class="mex-stat-card">
    <strong><span class="mex-stat-num" data-count="99" data-suffix=".9%">99</span><span style="font-size:20px;-webkit-text-fill-color:inherit;background:none">.9%</span></strong>
    <small>Uptime</small>
  </div>
  <div class="mex-stat-card">
    <strong style="-webkit-text-fill-color:inherit;background:none;font-size:28px">24/7</strong>
    <small>Support</small>
  </div>
</div>

<!-- ══ TRUST ════════════════════════════════════════════════════ -->
<section class="mex-section">
  <div class="mex-section-head">
    <span class="mex-kicker">MEX Group</span>
    <h2><?php echo _h($txt('trust_title')); ?></h2>
  </div>
  <div class="mex-trust-grid-v2">
    <div class="mex-trust-card-v2 mex-reveal">
      <div class="mex-trust-ico-v2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
        </svg>
      </div>
      <h3><?php echo _h($txt('multi')); ?></h3>
      <p><?php echo _h($txt('multi_text')); ?></p>
    </div>
    <div class="mex-trust-card-v2 mex-reveal">
      <div class="mex-trust-ico-v2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
        </svg>
      </div>
      <h3><?php echo _h($txt('pricing')); ?></h3>
      <p><?php echo _h($txt('pricing_text')); ?></p>
    </div>
    <div class="mex-trust-card-v2 mex-reveal">
      <div class="mex-trust-ico-v2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      </div>
      <h3><?php echo _h($txt('secure')); ?></h3>
      <p><?php echo _h($txt('secure_text')); ?></p>
    </div>
    <div class="mex-trust-card-v2 mex-reveal">
      <div class="mex-trust-ico-v2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
      </div>
      <h3><?php echo _h($txt('copy')); ?></h3>
      <p><?php echo _h($txt('copy_text')); ?></p>
    </div>
  </div>
</section>

<!-- ══ HOW IT WORKS ═══════════════════════════════════════════════ -->
<section class="mex-section alt">
  <div class="mex-section-head">
    <span class="mex-kicker">Get started</span>
    <h2><?php echo _h($txt('how_title')); ?></h2>
  </div>
  <div class="mex-steps-grid">
    <div class="mex-step mex-reveal">
      <div class="mex-step-num">01</div>
      <h3><?php echo _h($txt('step1_title')); ?></h3>
      <p><?php echo _h($txt('step1_text')); ?></p>
    </div>
    <div class="mex-step mex-reveal">
      <div class="mex-step-num">02</div>
      <h3><?php echo _h($txt('step2_title')); ?></h3>
      <p><?php echo _h($txt('step2_text')); ?></p>
    </div>
    <div class="mex-step mex-reveal">
      <div class="mex-step-num">03</div>
      <h3><?php echo _h($txt('step3_title')); ?></h3>
      <p><?php echo _h($txt('step3_text')); ?></p>
    </div>
  </div>
</section>

<!-- ══ LIVE MARKETS ═══════════════════════════════════════════════ -->
<section class="mex-section" id="markets">
  <div class="mex-section-head">
    <span class="mex-kicker">Markets</span>
    <h2><?php echo _h($txt('markets_live')); ?></h2>
    <p><?php echo _h($txt('markets_sub')); ?></p>
  </div>
  <div class="mex-market-grid-v2">
    <?php foreach($marketCards as $m): ?>
      <div class="mex-market-card-v2 is-loading" data-type="<?php echo _h($m[2]); ?>">
        <div class="mc-top">
          <span class="mc-symbol"><?php echo _h($m[0]); ?></span>
          <span class="mc-badge"><?php echo _h(strtoupper($m[2])); ?></span>
          <span class="mc-live-dot" title="Live price feed"></span>
        </div>
        <strong class="mc-price mex-skeleton" data-price-symbol="<?php echo _h($m[0]); ?>">--</strong>
        <span class="mc-change mex-skeleton" data-change-symbol="<?php echo _h($m[0]); ?>">0.00%</span>
        <span class="mc-name"><?php echo _h($m[1]); ?></span>
        <a class="mc-trade-btn"
           href="<?php echo $isLoggedIn?'/app.php#/trade?symbol='._h($m[0]):'/register.php?lang='._h($lang).'&next='.rawurlencode('/app.php#/trade?symbol='.$m[0]); ?>">
          Trade <?php echo _h($m[0]); ?> →
        </a>
      </div>
    <?php endforeach; ?>
  </div>
  <p style="text-align:center;margin-top:20px">
    <small style="color:#4d6a8f;font-size:12px">
      Last update: <span id="price-age-sec">0</span>s ago •
      <a href="/markets.php?lang=<?php echo _h($lang); ?>" style="color:#5d7cff;text-decoration:none">View all 70+ markets →</a>
    </small>
  </p>
</section>

<!-- ══ CTA ════════════════════════════════════════════════════════ -->
<section class="mex-cta-section">
  <span class="mex-kicker">MEX Group</span>
  <h2><?php echo _h($txt('cta_title')); ?></h2>
  <p><?php echo _h($txt('cta_sub')); ?></p>
  <div class="mex-cta-row">
    <a class="mex-btn mex-btn-primary"
       href="<?php echo $isLoggedIn?'/app.php#/home':'/register.php?lang='._h($lang); ?>">
      <?php echo _h($txt('cta_btn')); ?>
    </a>
    <a class="mex-btn mex-btn-soft" href="/contact.php?lang=<?php echo _h($lang); ?>">Contact us</a>
  </div>
</section>

<!-- ══ FOOTER ═════════════════════════════════════════════════════ -->
<footer class="mex-footer">
  <div class="mex-footer-inner">
    <div class="mex-footer-main">
      <div class="mex-footer-brand">
        <a class="mex-footer-logo" href="/?lang=<?php echo _h($lang); ?>">
          <img src="/assets/img/mexgroup_logo.svg" alt="" loading="lazy">
          <strong>MEX Group</strong>
        </a>
        <p><?php echo _h($txt('footer_desc')); ?></p>
      </div>
      <div class="mex-footer-col">
        <h4>Products</h4>
        <a href="/app.php#/trade">Trading Desk</a>
        <a href="/app.php#/invest">Copy Trading</a>
        <a href="/app.php#/invest">Investment Contracts</a>
        <a href="/app.php#/deposit">Funding</a>
      </div>
      <div class="mex-footer-col">
        <h4>Company</h4>
        <a href="/about.php?lang=<?php echo _h($lang); ?>">About Us</a>
        <a href="/features.php?lang=<?php echo _h($lang); ?>">Features</a>
        <a href="/contact.php?lang=<?php echo _h($lang); ?>">Contact</a>
      </div>
      <div class="mex-footer-col">
        <h4>Legal</h4>
        <a href="/legal.php?page=terms&lang=<?php echo _h($lang); ?>">Terms of Service</a>
        <a href="/legal.php?page=privacy&lang=<?php echo _h($lang); ?>">Privacy Policy</a>
        <a href="/legal.php?page=risk&lang=<?php echo _h($lang); ?>">Risk Disclosure</a>
      </div>
    </div>
    <div class="mex-footer-bottom">
      <span>&copy; <?php echo date('Y'); ?> MEX Group. <?php echo _h($txt('footer_disclaimer')); ?></span>
    </div>
  </div>
</footer>

<!-- ══ SCRIPTS ════════════════════════════════════════════════════ -->
<script>
(function(){
  'use strict';

  // ── price tracking map (to detect up/down flash) ──────────────
  var prevPrices = {};
  var lastFetchTime = 0;
  var secEl = document.getElementById('price-age-sec');

  // ── tick the "last update X seconds ago" counter ──────────────
  setInterval(function(){
    if (lastFetchTime && secEl) {
      secEl.textContent = Math.round((Date.now() - lastFetchTime) / 1000);
    }
  }, 1000);

  // ── price formatter ───────────────────────────────────────────
  function fmt(v) {
    var n = Number(v);
    if (!isFinite(n) || n <= 0) return '--';
    if (n >= 1000) return '$' + n.toLocaleString(undefined, {maximumFractionDigits:2});
    if (n >= 1)    return '$' + n.toLocaleString(undefined, {maximumFractionDigits:4});
    return '$' + n.toLocaleString(undefined, {maximumFractionDigits:6});
  }

  // ── update single price element with flash ─────────────────────
  function updateEl(el, newPrice, sym) {
    var oldPrice = prevPrices[sym] || 0;
    var fmtd = fmt(newPrice);
    if (el.textContent === fmtd) return; // no change
    el.textContent = fmtd;
    // Remove skeleton
    el.classList.remove('mex-skeleton');
    if (oldPrice > 0 && newPrice > 0 && newPrice !== oldPrice) {
      var cls = newPrice > oldPrice ? 'flash-up' : 'flash-down';
      el.classList.remove('flash-up', 'flash-down');
      requestAnimationFrame(function(){
        el.classList.add(cls);
        setTimeout(function(){ el.classList.remove(cls); }, 900);
      });
    }
  }

  // ── fetch from our dedicated public endpoint ──────────────────
  function fetchPrices() {
    var symbols = [];
    document.querySelectorAll('[data-price-symbol]').forEach(function(el){
      var s = el.getAttribute('data-price-symbol');
      if (s) symbols.push(s);
    });
    symbols = [...new Set(symbols)];
    if (!symbols.length) return;

    fetch('/api/public_prices.php?symbols=' + encodeURIComponent(symbols.join(',')), {
      headers: { Accept: 'application/json' }
    })
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(data){
      if (!data || !Array.isArray(data.items)) return;
      lastFetchTime = Date.now();

      data.items.forEach(function(q){
        var sym    = String(q.symbol || '').toUpperCase();
        var price  = (q.price != null && q.price > 0) ? Number(q.price) : 0;
        var change = Number(q.change_pct || 0);

        // Update price elements
        document.querySelectorAll('[data-price-symbol="' + sym + '"]').forEach(function(el){
          updateEl(el, price, sym);
        });

        // Update change elements
        document.querySelectorAll('[data-change-symbol="' + sym + '"]').forEach(function(el){
          var txt = isFinite(change) ? ((change >= 0 ? '+' : '') + change.toFixed(2) + '%') : '--';
          el.textContent = txt;
          el.classList.remove('mex-skeleton');
          el.className = el.className.replace(/\bdown\b/,'').trim();
          if (change < 0) el.classList.add('down');
        });

        // Update ticker items
        document.querySelectorAll('[data-ticker-symbol="' + sym + '"]').forEach(function(el){
          var pe = el.querySelector('.mex-ticker-price');
          var ce = el.querySelector('.mex-ticker-change');
          if (pe) pe.textContent = fmt(price);
          if (ce) {
            ce.textContent = isFinite(change) ? ((change >= 0 ? '+' : '') + change.toFixed(2) + '%') : '';
            ce.className   = 'mex-ticker-change ' + (change < 0 ? 'down' : 'up');
          }
        });

        // Remove loading skeletons from card
        var card = document.querySelector('[data-price-symbol="' + sym + '"]');
        if (card) {
          var parent = card.closest('.mex-market-card-v2');
          if (parent) parent.classList.remove('is-loading');
        }

        prevPrices[sym] = price;
      });
    })
    .catch(function(){});
  }

  fetchPrices();
  setInterval(fetchPrices, 15000);

  // ── scroll reveal ─────────────────────────────────────────────
  if ('IntersectionObserver' in window) {
    var revealObs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          revealObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.mex-reveal').forEach(function(el){
      revealObs.observe(el);
    });
  } else {
    document.querySelectorAll('.mex-reveal').forEach(function(el){
      el.classList.add('is-visible');
    });
  }

  // ── animated counter ──────────────────────────────────────────
  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-count') || el.textContent, 10);
    var suffix = el.getAttribute('data-suffix') || '';
    var duration = 1200;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window) {
    var cntObs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting) {
          var nums = e.target.querySelectorAll('.mex-stat-num');
          nums.forEach(animateCounter);
          cntObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('.mex-stats-row').forEach(function(el){ cntObs.observe(el); });
  }

  // ── language dropdown ─────────────────────────────────────────
  var lb = document.getElementById('mex-lang-trigger');
  var ld = document.getElementById('mex-lang-dropdown');
  if (lb && ld) {
    lb.addEventListener('click', function(e){
      e.stopPropagation();
      var open = lb.getAttribute('aria-expanded') === 'true';
      lb.setAttribute('aria-expanded', open ? 'false' : 'true');
      ld.classList.toggle('is-open', !open);
    });
    document.addEventListener('click', function(){
      lb.setAttribute('aria-expanded','false');
      ld.classList.remove('is-open');
    });
    ld.addEventListener('click', function(e){ e.stopPropagation(); });
  }

  // ── mobile hamburger ──────────────────────────────────────────
  var hb = document.getElementById('mex-hamburger');
  var nav = document.querySelector('.mex-header-nav');
  if (hb && nav) {
    hb.addEventListener('click', function(){
      var open = hb.getAttribute('aria-expanded') === 'true';
      hb.setAttribute('aria-expanded', open ? 'false' : 'true');
      nav.classList.toggle('is-open', !open);
      hb.classList.toggle('is-active', !open);
    });
    nav.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        hb.setAttribute('aria-expanded','false');
        nav.classList.remove('is-open');
        hb.classList.remove('is-active');
      });
    });
  }

})();
</script>
</body>
</html>
