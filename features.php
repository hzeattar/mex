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

$nav = function(string $key, string $fallback) use ($lang): string {
  return function_exists('site_t') ? site_t($key, $lang) : $fallback;
};

$txt = function(string $key) use ($lang): string {
  static $T = null;
  if ($T === null) { $T = [
    'meta_title'    =>['en'=>'Features — MEX Group','ar'=>'المزايا — MEX Group','ru'=>'Возможности — MEX Group'],
    'hero_kicker'   =>['en'=>'Platform Features','ar'=>'مزايا المنصة','ru'=>'Возможности платформы'],
    'hero_h1'       =>['en'=>'Everything you need to <span class="accent">trade</span> professionally','ar'=>'كل ما تحتاجه <span class="accent">للتداول</span> باحترافية','ru'=>'Всё для <span class="accent">профессиональной</span> торговли'],
    'nav_home'      =>['en'=>'Home','ar'=>'الرئيسية','ru'=>'Главная'],
    'nav_markets'   =>['en'=>'Markets','ar'=>'الأسواق','ru'=>'Рынки'],
    'nav_features'  =>['en'=>'Features','ar'=>'المزايا','ru'=>'Возможности'],
    'nav_about'     =>['en'=>'About','ar'=>'من نحن','ru'=>'О нас'],
    'nav_contact'   =>['en'=>'Contact','ar'=>'تواصل معنا','ru'=>'Контакты'],
    'nav_login'     =>['en'=>'Log in','ar'=>'تسجيل الدخول','ru'=>'Вход'],
    'nav_create'    =>['en'=>'Create Account','ar'=>'إنشاء حساب','ru'=>'Создать счёт'],
    'nav_openapp'   =>['en'=>'Open App','ar'=>'فتح التطبيق','ru'=>'Открыть приложение'],
    'hero_sub'      =>['en'=>'A complete suite of tools built for speed, clarity, and control — from chart analysis to order execution.','ar'=>'مجموعة أدوات متكاملة مبنية للسرعة والوضوح والتحكم — من تحليل الشارت إلى تنفيذ الأوامر.','ru'=>'Полный набор инструментов для скорости, ясности и контроля — от анализа графиков до исполнения ордеров.'],
    'core_kicker'   =>['en'=>'Core Features','ar'=>'المزايا الأساسية','ru'=>'Основные возможности'],
    'core_title'    =>['en'=>'What you get','ar'=>'ماذا تحصل عليه','ru'=>'Что вы получаете'],
    'f_charts_t'    =>['en'=>'Professional Charts','ar'=>'شارت احترافي','ru'=>'Профессиональные графики'],
    'f_charts_p'    =>['en'=>'Candlestick charts with MA lines, volume bars, crosshair OHLCV tooltip, and multiple timeframes from 1m to 1W.','ar'=>'شارت شموع مع خطوط المتوسطات وأعمدة الحجم وتلميح OHLCV ومدد زمنية متعددة من دقيقة إلى أسبوع.','ru'=>'Свечные графики с линиями MA, объёмами, подсказкой OHLCV и таймфреймами от 1м до 1н.'],
    'f_exec_t'      =>['en'=>'Instant Execution','ar'=>'تنفيذ فوري','ru'=>'Мгновенное исполнение'],
    'f_exec_p'      =>['en'=>'One-click market orders with real-time confirmation, leverage control up to 1:500, and TP/SL pre-configuration.','ar'=>'أوامر سوق بنقرة واحدة مع تأكيد فوري وتحكم في الرافعة حتى 1:500 وضبط مسبق لوقف الخسارة وجني الأرباح.','ru'=>'Рыночные ордера в один клик с подтверждением, плечом до 1:500 и настройкой TP/SL.'],
    'f_copy_t'      =>['en'=>'AI Trading Bot','ar'=>'بوت التداول الذكي','ru'=>'ИИ-торговый бот'],
    'f_copy_p'      =>['en'=>'Activate our AI trading bot with transparent win rates, drawdown stats, and one-tap activation from $10.','ar'=>'فعّل بوت التداول الذكي بمعدلات ربح شفافة وإحصاءات تراجع وتفعيل بنقرة من 10$.','ru'=>'Активируйте ИИ-торгового бота с прозрачной статистикой и активацией в один тап от $10.'],
    'f_kyc_t'       =>['en'=>'KYC Verification','ar'=>'التحقق من الهوية KYC','ru'=>'Верификация KYC'],
    'f_kyc_p'       =>['en'=>'Multi-step online identity verification with document upload, face match, and real-time status tracking.','ar'=>'تحقق هوية متعدد الخطوات عبر الإنترنت مع رفع المستندات ومطابقة الوجه وتتبع الحالة فورياً.','ru'=>'Многоэтапная онлайн-верификация с загрузкой документов и отслеживанием статуса.'],
    'f_fund_t'      =>['en'=>'Funding & Withdrawals','ar'=>'الإيداع والسحب','ru'=>'Пополнение и вывод'],
    'f_fund_p'      =>['en'=>'Manual deposits with proof upload and full audit trail. Withdrawals processed with admin review and status updates.','ar'=>'إيداعات يدوية مع رفع إثبات وسجل تدقيق كامل. السحوبات تُعالَج بمراجعة الإدارة وتحديثات الحالة.','ru'=>'Ручные депозиты с загрузкой подтверждения и аудитом. Вывод средств с проверкой администратором.'],
    'f_contract_t'  =>['en'=>'Investment Contracts','ar'=>'عقود الاستثمار','ru'=>'Инвестиционные контракты'],
    'f_contract_p'  =>['en'=>'Fixed-term investment plans with multiple tiers and automated compound options.','ar'=>'خطط استثمار محددة المدة بمستويات متعددة وخيارات مضاعفة تلقائية.','ru'=>'Срочные инвестиционные планы с несколькими уровнями и авто-капитализацией.'],
    'cmp_kicker'    =>['en'=>'Comparison','ar'=>'مقارنة','ru'=>'Сравнение'],
    'cmp_title'     =>['en'=>'MEX Group vs Typical Broker','ar'=>'MEX Group مقابل وسيط تقليدي','ru'=>'MEX Group против обычного брокера'],
    'cmp_feature'   =>['en'=>'Feature','ar'=>'الميزة','ru'=>'Функция'],
    'cmp_typical'   =>['en'=>'Typical Broker','ar'=>'وسيط تقليدي','ru'=>'Обычный брокер'],
    'cmp_r1_l'      =>['en'=>'Asset types','ar'=>'أنواع الأصول','ru'=>'Типы активов'],
    'cmp_r1_m'      =>['en'=>'Crypto + Forex + Stocks + Commodities','ar'=>'كريبتو + فوركس + أسهم + سلع','ru'=>'Крипто + Форекс + Акции + Товары'],
    'cmp_r1_t'      =>['en'=>'Usually 1–2 asset types','ar'=>'عادة نوع أو نوعان','ru'=>'Обычно 1–2 типа'],
    'cmp_r2_l'      =>['en'=>'Demo account','ar'=>'حساب تجريبي','ru'=>'Демо-счёт'],
    'cmp_r2_m'      =>['en'=>'Free forever, $10,000 balance','ar'=>'مجاني دائماً برصيد 10,000$','ru'=>'Бесплатно навсегда, баланс $10,000'],
    'cmp_r2_t'      =>['en'=>'Limited time or paid','ar'=>'لفترة محدودة أو مدفوع','ru'=>'Ограничено или платно'],
    'cmp_r3_l'      =>['en'=>'AI trading bot','ar'=>'بوت التداول الذكي','ru'=>'ИИ-торговый бот'],
    'cmp_r3_m'      =>['en'=>'Built-in, from $10','ar'=>'مدمج، من 10$','ru'=>'Встроено, от $10'],
    'cmp_r3_t'      =>['en'=>'Often a paid add-on','ar'=>'غالباً إضافة مدفوعة','ru'=>'Часто платное дополнение'],
    'cmp_r4_l'      =>['en'=>'KYC process','ar'=>'إجراء KYC','ru'=>'Процесс KYC'],
    'cmp_r4_m'      =>['en'=>'Online, same-day review','ar'=>'عبر الإنترنت، مراجعة في نفس اليوم','ru'=>'Онлайн, проверка в тот же день'],
    'cmp_r4_t'      =>['en'=>'Manual, days-long','ar'=>'يدوي، يستغرق أياماً','ru'=>'Вручную, несколько дней'],
    'cmp_r5_l'      =>['en'=>'Investment contracts','ar'=>'عقود الاستثمار','ru'=>'Инвестиционные контракты'],
    'cmp_r5_m'      =>['en'=>'Tiered fixed-return plans','ar'=>'خطط عوائد ثابتة متدرجة','ru'=>'Многоуровневые планы фикс. дохода'],
    'cmp_r5_t'      =>['en'=>'Not available','ar'=>'غير متاح','ru'=>'Недоступно'],
    'cmp_r6_l'      =>['en'=>'Languages','ar'=>'اللغات','ru'=>'Языки'],
    'cmp_r6_m'      =>['en'=>'15 languages','ar'=>'15 لغة','ru'=>'15 языков'],
    'cmp_r6_t'      =>['en'=>'Usually 2–5','ar'=>'عادة 2–5','ru'=>'Обычно 2–5'],
    'cmp_r7_l'      =>['en'=>'Chart MA lines','ar'=>'خطوط المتوسطات','ru'=>'Линии MA на графике'],
    'cmp_r7_m'      =>['en'=>'MA7 + MA25 built-in','ar'=>'MA7 + MA25 مدمجة','ru'=>'MA7 + MA25 встроены'],
    'cmp_r7_t'      =>['en'=>'Requires 3rd party plugin','ar'=>'يتطلب إضافة خارجية','ru'=>'Требует стороннего плагина'],
    'cmp_r8_l'      =>['en'=>'24/7 Support','ar'=>'دعم 24/7','ru'=>'Поддержка 24/7'],
    'cmp_r8_m'      =>['en'=>'Ticket system + live chat','ar'=>'نظام تذاكر + دردشة مباشرة','ru'=>'Тикеты + онлайн-чат'],
    'cmp_r8_t'      =>['en'=>'Limited hours','ar'=>'ساعات محدودة','ru'=>'Ограниченные часы'],
    'cmp_cta'       =>['en'=>'Try for free — no deposit','ar'=>'جرّب مجاناً — بدون إيداع','ru'=>'Попробуйте бесплатно — без депозита'],
    'foot_desc'     =>['en'=>'Professional multi-asset trading platform with transparent pricing.','ar'=>'منصة تداول احترافية متعددة الأصول بتسعير شفاف.','ru'=>'Профессиональная мультиактивная платформа с прозрачными ценами.'],
    'foot_products' =>['en'=>'Products','ar'=>'المنتجات','ru'=>'Продукты'],
    'foot_trading'  =>['en'=>'Trading Desk','ar'=>'مكتب التداول','ru'=>'Торговый стол'],
    'foot_copy'     =>['en'=>'AI Trading Bot','ar'=>'بوت التداول الذكي','ru'=>'ИИ-торговый бот'],
    'foot_contracts'=>['en'=>'Contracts','ar'=>'العقود','ru'=>'Контракты'],
    'foot_funding'  =>['en'=>'Funding','ar'=>'التمويل','ru'=>'Пополнение'],
    'foot_company'  =>['en'=>'Company','ar'=>'الشركة','ru'=>'Компания'],
    'foot_about'    =>['en'=>'About','ar'=>'من نحن','ru'=>'О нас'],
    'foot_features' =>['en'=>'Features','ar'=>'المزايا','ru'=>'Возможности'],
    'foot_contact'  =>['en'=>'Contact','ar'=>'تواصل معنا','ru'=>'Контакты'],
    'foot_legal'    =>['en'=>'Legal','ar'=>'قانوني','ru'=>'Правовое'],
    'foot_terms'    =>['en'=>'Terms','ar'=>'الشروط','ru'=>'Условия'],
    'foot_privacy'  =>['en'=>'Privacy','ar'=>'الخصوصية','ru'=>'Конфиденциальность'],
    'foot_risk'     =>['en'=>'Risk','ar'=>'المخاطر','ru'=>'Риски'],
    'foot_disclaimer'=>['en'=>'Trading involves significant risk of loss.','ar'=>'التداول ينطوي على مخاطر خسارة كبيرة.','ru'=>'Торговля сопряжена со значительным риском убытков.'],
  ]; }
  return $T[$key][$lang] ?? $T[$key]['en'] ?? $key;
};
?>
<!doctype html>
<html lang="<?php echo _h($lang); ?>" dir="<?php echo $rtl ? 'rtl' : 'ltr'; ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title><?php echo _h($txt('meta_title')); ?></title>
  <link rel="stylesheet" href="/assets/css/public-site.css?v=<?php echo @filemtime(__DIR__.'/assets/css/public-site.css')?: time(); ?>">
</head>
<body class="mex-landing-page">
<header class="mex-header" id="mex-header">
  <div class="mex-header-inner">
    <a class="mex-logo" href="/?lang=<?php echo _h($lang); ?>">
      <img src="/assets/img/mex_global_logo.png" alt="MEX Global" loading="eager" onerror="this.style.display='none'">
      <strong>MEX Group</strong>
    </a>
    <nav class="mex-header-nav">
      <a class="mex-nav-link" href="/?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_home')); ?></a>
      <a class="mex-nav-link" href="/markets.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_markets')); ?></a>
      <a class="mex-nav-link is-active" href="/features.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_features')); ?></a>
      <a class="mex-nav-link" href="/about.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_about')); ?></a>
      <a class="mex-nav-link" href="/contact.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_contact')); ?></a>
    </nav>
    <div class="mex-header-actions">
      <div class="mex-lang-wrap">
        <button class="mex-lang-btn" id="mex-lang-trigger" aria-expanded="false">
          <span class="mex-lang-current"><?php echo strtoupper(_h($lang)); ?></span>
          <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
        <div class="mex-lang-dropdown" id="mex-lang-dropdown">
          <?php foreach(['en'=>'English','ar'=>'العربية','ru'=>'Русский','tr'=>'Türkçe','fr'=>'Français','de'=>'Deutsch','es'=>'Español','it'=>'Italiano','pt'=>'Português','nl'=>'Nederlands','pl'=>'Polski','zh'=>'中文','ja'=>'日本語','ko'=>'한국어','vi'=>'Tiếng Việt'] as $c=>$n): ?>
            <a class="mex-lang-opt<?php echo $c===$lang?' is-active':''; ?>" href="?lang=<?php echo _h($c); ?>"><?php echo _h($n); ?></a>
          <?php endforeach; ?>
        </div>
      </div>
      <?php if($isLoggedIn): ?>
        <a class="mex-btn mex-btn-primary mex-btn-sm" href="/app.php#/home"><?php echo _h($txt('nav_openapp')); ?></a>
      <?php else: ?>
        <div class="mex-header-btns">
          <a class="mex-btn mex-btn-soft mex-btn-sm" href="/login.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_login')); ?></a>
          <a class="mex-btn mex-btn-primary mex-btn-sm" href="/register.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_create')); ?></a>
        </div>
      <?php endif; ?>
      <button class="mex-hamburger" id="mex-hamburger" aria-expanded="false"><span></span><span></span><span></span></button>
    </div>
  </div>
</header>

<main class="mex-page">
  <section class="mex-hero-v2" style="padding:60px 0 50px">
    <div class="mex-hero-grid" style="grid-template-columns:1fr;text-align:center">
      <div class="mex-hero-text">
        <span class="mex-kicker"><?php echo _h($txt('hero_kicker')); ?></span>
        <h1 style="max-width:700px;margin:0 auto 16px">
          <?php echo $txt('hero_h1'); ?>
        </h1>
        <p style="max-width:560px;margin:0 auto">
          <?php echo _h($txt('hero_sub')); ?>
        </p>
      </div>
    </div>
  </section>

  <section class="mex-section alt">
    <div class="mex-section-head"><span class="mex-kicker"><?php echo _h($txt('core_kicker')); ?></span><h2><?php echo _h($txt('core_title')); ?></h2></div>
    <div class="mex-features-grid">
      <div class="mex-feature-card mex-reveal">
        <div class="mex-feature-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div>
        <h4><?php echo _h($txt('f_charts_t')); ?></h4>
        <p><?php echo _h($txt('f_charts_p')); ?></p>
      </div>
      <div class="mex-feature-card mex-reveal">
        <div class="mex-feature-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
        <h4><?php echo _h($txt('f_exec_t')); ?></h4>
        <p><?php echo _h($txt('f_exec_p')); ?></p>
      </div>
      <div class="mex-feature-card mex-reveal">
        <div class="mex-feature-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div>
        <h4><?php echo _h($txt('f_copy_t')); ?></h4>
        <p><?php echo _h($txt('f_copy_p')); ?></p>
      </div>
      <div class="mex-feature-card mex-reveal">
        <div class="mex-feature-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
        <h4><?php echo _h($txt('f_kyc_t')); ?></h4>
        <p><?php echo _h($txt('f_kyc_p')); ?></p>
      </div>
      <div class="mex-feature-card mex-reveal">
        <div class="mex-feature-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div>
        <h4><?php echo _h($txt('f_fund_t')); ?></h4>
        <p><?php echo _h($txt('f_fund_p')); ?></p>
      </div>
      <div class="mex-feature-card mex-reveal">
        <div class="mex-feature-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg></div>
        <h4><?php echo _h($txt('f_contract_t')); ?></h4>
        <p><?php echo _h($txt('f_contract_p')); ?></p>
      </div>
    </div>
  </section>

  <!-- Comparison Table -->
  <section class="mex-section">
    <div class="mex-section-head"><span class="mex-kicker"><?php echo _h($txt('cmp_kicker')); ?></span><h2><?php echo _h($txt('cmp_title')); ?></h2></div>
    <div class="mex-compare-wrap">
      <table class="mex-compare-table">
        <thead>
          <tr>
            <th><?php echo _h($txt('cmp_feature')); ?></th>
            <th>MEX Group</th>
            <th><?php echo _h($txt('cmp_typical')); ?></th>
          </tr>
        </thead>
        <tbody>
          <tr><td><?php echo _h($txt('cmp_r1_l')); ?></td><td class="chk">✓ <?php echo _h($txt('cmp_r1_m')); ?></td><td><?php echo _h($txt('cmp_r1_t')); ?></td></tr>
          <tr><td><?php echo _h($txt('cmp_r2_l')); ?></td><td class="chk">✓ <?php echo _h($txt('cmp_r2_m')); ?></td><td><?php echo _h($txt('cmp_r2_t')); ?></td></tr>
          <tr><td><?php echo _h($txt('cmp_r3_l')); ?></td><td class="chk">✓ <?php echo _h($txt('cmp_r3_m')); ?></td><td><?php echo _h($txt('cmp_r3_t')); ?></td></tr>
          <tr><td><?php echo _h($txt('cmp_r4_l')); ?></td><td class="chk">✓ <?php echo _h($txt('cmp_r4_m')); ?></td><td><?php echo _h($txt('cmp_r4_t')); ?></td></tr>
          <tr><td><?php echo _h($txt('cmp_r5_l')); ?></td><td class="chk">✓ <?php echo _h($txt('cmp_r5_m')); ?></td><td class="cross">✗ <?php echo _h($txt('cmp_r5_t')); ?></td></tr>
          <tr><td><?php echo _h($txt('cmp_r6_l')); ?></td><td class="chk">✓ <?php echo _h($txt('cmp_r6_m')); ?></td><td><?php echo _h($txt('cmp_r6_t')); ?></td></tr>
          <tr><td><?php echo _h($txt('cmp_r7_l')); ?></td><td class="chk">✓ <?php echo _h($txt('cmp_r7_m')); ?></td><td><?php echo _h($txt('cmp_r7_t')); ?></td></tr>
          <tr><td><?php echo _h($txt('cmp_r8_l')); ?></td><td class="chk">✓ <?php echo _h($txt('cmp_r8_m')); ?></td><td><?php echo _h($txt('cmp_r8_t')); ?></td></tr>
        </tbody>
      </table>
    </div>
    <div style="text-align:center;margin-top:28px">
      <a class="mex-btn mex-btn-primary" href="/register.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('cmp_cta')); ?></a>
    </div>
  </section>
</main>
<footer class="mex-footer">
  <div class="mex-footer-inner">
    <div class="mex-footer-main">
      <div class="mex-footer-brand">
        <a class="mex-footer-logo" href="/"><img src="/assets/img/mex_global_logo.png" alt="MEX Global"><strong>MEX Group</strong></a>
        <p><?php echo _h($txt('foot_desc')); ?></p>
      </div>
      <div class="mex-footer-col"><h4><?php echo _h($txt('foot_products')); ?></h4><a href="/app.php#/trade"><?php echo _h($txt('foot_trading')); ?></a><a href="/app.php#/invest"><?php echo _h($txt('foot_copy')); ?></a><a href="/app.php#/invest"><?php echo _h($txt('foot_contracts')); ?></a><a href="/app.php#/deposit"><?php echo _h($txt('foot_funding')); ?></a></div>
      <div class="mex-footer-col"><h4><?php echo _h($txt('foot_company')); ?></h4><a href="/about.php"><?php echo _h($txt('foot_about')); ?></a><a href="/features.php"><?php echo _h($txt('foot_features')); ?></a><a href="/contact.php"><?php echo _h($txt('foot_contact')); ?></a></div>
      <div class="mex-footer-col"><h4><?php echo _h($txt('foot_legal')); ?></h4><a href="/legal.php?page=terms"><?php echo _h($txt('foot_terms')); ?></a><a href="/legal.php?page=privacy"><?php echo _h($txt('foot_privacy')); ?></a><a href="/legal.php?page=risk"><?php echo _h($txt('foot_risk')); ?></a></div>
    </div>
    <div class="mex-footer-bottom"><span>&copy; <?php echo date('Y'); ?> MEX Group. <?php echo _h($txt('foot_disclaimer')); ?></span></div>
  </div>
</footer>
<script>
(function(){
  var lb=document.getElementById('mex-lang-trigger'),ld=document.getElementById('mex-lang-dropdown');
  if(lb&&ld){lb.addEventListener('click',function(e){e.stopPropagation();var o=lb.getAttribute('aria-expanded')==='true';lb.setAttribute('aria-expanded',o?'false':'true');ld.classList.toggle('is-open',!o);});document.addEventListener('click',function(){lb.setAttribute('aria-expanded','false');ld.classList.remove('is-open');});ld.addEventListener('click',function(e){e.stopPropagation();});}
  var hb=document.getElementById('mex-hamburger'),nav=document.querySelector('.mex-header-nav');
  if(hb&&nav){hb.addEventListener('click',function(){var o=hb.getAttribute('aria-expanded')==='true';hb.setAttribute('aria-expanded',o?'false':'true');nav.classList.toggle('is-open',!o);hb.classList.toggle('is-active',!o);});nav.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){hb.setAttribute('aria-expanded','false');nav.classList.remove('is-open');hb.classList.remove('is-active');});});}
  if('IntersectionObserver' in window){var obs=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('is-visible');obs.unobserve(e.target);}});},{threshold:.15});document.querySelectorAll('.mex-reveal').forEach(function(el){obs.observe(el);});}else{document.querySelectorAll('.mex-reveal').forEach(function(el){el.classList.add('is-visible');});}
})();
</script>
<script src="/assets/js/public-site.js?v=<?php echo @filemtime(__DIR__.'/assets/js/public-site.js')?: time(); ?>" defer></script>
</body>
</html>
