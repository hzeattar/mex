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
    'meta_title'    =>['en'=>'About — MEX Group','ar'=>'من نحن — MEX Group','ru'=>'О нас — MEX Group'],
    'nav_home'      =>['en'=>'Home','ar'=>'الرئيسية','ru'=>'Главная'],
    'nav_markets'   =>['en'=>'Markets','ar'=>'الأسواق','ru'=>'Рынки'],
    'nav_features'  =>['en'=>'Features','ar'=>'المزايا','ru'=>'Возможности'],
    'nav_about'     =>['en'=>'About','ar'=>'من نحن','ru'=>'О нас'],
    'nav_contact'   =>['en'=>'Contact','ar'=>'تواصل معنا','ru'=>'Контакты'],
    'nav_login'     =>['en'=>'Log in','ar'=>'تسجيل الدخول','ru'=>'Вход'],
    'nav_create'    =>['en'=>'Create Account','ar'=>'إنشاء حساب','ru'=>'Создать счёт'],
    'nav_openapp'   =>['en'=>'Open App','ar'=>'فتح التطبيق','ru'=>'Открыть приложение'],
    'hero_kicker'   =>['en'=>'About MEX Group','ar'=>'عن MEX Group','ru'=>'О MEX Group'],
    'hero_h1'       =>['en'=>'Built for <span class="accent">serious</span> traders','ar'=>'مصمَّمة للمتداولين <span class="accent">الجادّين</span>','ru'=>'Создано для <span class="accent">серьёзных</span> трейдеров'],
    'hero_sub'      =>['en'=>'MEX Group delivers institutional-grade trading technology to retail investors worldwide, with transparent pricing and professional tools at every tier.','ar'=>'تقدّم MEX Group تقنية تداول بمستوى المؤسسات للمستثمرين الأفراد حول العالم، مع تسعير شفاف وأدوات احترافية في كل المستويات.','ru'=>'MEX Group предоставляет торговые технологии институционального уровня частным инвесторам по всему миру с прозрачными ценами и профессиональными инструментами на каждом уровне.'],
    'story_kicker'  =>['en'=>'Our Story','ar'=>'قصتنا','ru'=>'Наша история'],
    'story_title'   =>['en'=>'Who we are','ar'=>'من نحن','ru'=>'Кто мы'],
    'mission_t'     =>['en'=>'Our Mission','ar'=>'مهمتنا','ru'=>'Наша миссия'],
    'mission_p'     =>['en'=>'To democratize access to global financial markets by providing professional-grade tools, transparent pricing, and institutional-level security — regardless of portfolio size or experience.','ar'=>'إتاحة الوصول إلى الأسواق المالية العالمية للجميع عبر أدوات بمستوى احترافي وتسعير شفاف وأمان بمستوى المؤسسات — بغضّ النظر عن حجم المحفظة أو الخبرة.','ru'=>'Сделать доступ к мировым финансовым рынкам общедоступным благодаря профессиональным инструментам, прозрачным ценам и безопасности институционального уровня — независимо от размера портфеля или опыта.'],
    'tech_t'        =>['en'=>'Our Technology','ar'=>'تقنيتنا','ru'=>'Наши технологии'],
    'tech_p'        =>['en'=>'Multi-provider price aggregation (Binance + Yahoo + Frankfurter) for best-effort real-time quotes. TradingView-powered charts, instant order matching engine, end-to-end encrypted sessions, and manual KYC flow for compliance.','ar'=>'تجميع أسعار من مزوّدين متعددين (Binance + Yahoo + Frankfurter) للحصول على أسعار لحظية قدر الإمكان. شارت مدعوم من TradingView، ومحرّك مطابقة أوامر فوري، وجلسات مشفّرة من طرف إلى طرف، وإجراء KYC يدوي للامتثال.','ru'=>'Агрегация цен от нескольких поставщиков (Binance + Yahoo + Frankfurter) для котировок в реальном времени. Графики на базе TradingView, мгновенный движок сопоставления ордеров, end-to-end шифрование сессий и ручная проверка KYC.'],
    'nums_kicker'   =>['en'=>'By the numbers','ar'=>'بالأرقام','ru'=>'В цифрах'],
    'nums_title'    =>['en'=>'Platform at a glance','ar'=>'المنصة في لمحة','ru'=>'Платформа кратко'],
    'stat1_p'       =>['en'=>'Tradeable instruments across crypto, forex, stocks, and commodities','ar'=>'أداة قابلة للتداول عبر الكريبتو والفوركس والأسهم والسلع','ru'=>'Торговых инструментов: крипто, форекс, акции и товары'],
    'stat2_p'       =>['en'=>'Countries served with localized interfaces and 15-language support','ar'=>'دولة نخدمها بواجهات محلية ودعم 15 لغة','ru'=>'Стран обслуживания с локализованным интерфейсом и поддержкой 15 языков'],
    'stat3_p'       =>['en'=>'Platform uptime with redundant infrastructure and automatic failover','ar'=>'زمن تشغيل المنصة مع بنية تحتية احتياطية وتحويل تلقائي عند الأعطال','ru'=>'Время безотказной работы с резервной инфраструктурой и автопереключением'],
    'stat4_p'       =>['en'=>'Support coverage with ticket system and fast response times','ar'=>'تغطية دعم مع نظام تذاكر وأوقات استجابة سريعة','ru'=>'Поддержка с системой тикетов и быстрым временем ответа'],
    'values_kicker' =>['en'=>'Our Values','ar'=>'قيمنا','ru'=>'Наши ценности'],
    'values_title'  =>['en'=>'What drives us','ar'=>'ما الذي يحرّكنا','ru'=>'Что нами движет'],
    'val1_t'        =>['en'=>'Transparency','ar'=>'الشفافية','ru'=>'Прозрачность'],
    'val1_p'        =>['en'=>'Every price has a visible source label. Every fee is disclosed. No hidden spreads or surprise charges.','ar'=>'لكل سعر مصدر ظاهر. كل رسوم معلَنة. لا فروق أسعار خفية ولا رسوم مفاجئة.','ru'=>'У каждой цены виден источник. Все комиссии раскрыты. Никаких скрытых спредов или неожиданных сборов.'],
    'val2_t'        =>['en'=>'Security','ar'=>'الأمان','ru'=>'Безопасность'],
    'val2_p'        =>['en'=>'KYC verification, encrypted sessions, manual funding review, and audit logs on every transaction.','ar'=>'تحقق KYC، وجلسات مشفّرة، ومراجعة يدوية للإيداعات، وسجلات تدقيق لكل عملية.','ru'=>'Верификация KYC, шифрование сессий, ручная проверка пополнений и журналы аудита для каждой операции.'],
    'val3_t'        =>['en'=>'Innovation','ar'=>'الابتكار','ru'=>'Инновации'],
    'val3_p'        =>['en'=>'Continuously shipping features: copy trading, investment contracts, multi-language support, and more.','ar'=>'نطلق مزايا باستمرار: نسخ الصفقات، وعقود الاستثمار، ودعم متعدد اللغات، والمزيد.','ru'=>'Постоянно выпускаем новые функции: копи-трейдинг, инвестиционные контракты, многоязычную поддержку и многое другое.'],
    'team_kicker'   =>['en'=>'Leadership','ar'=>'القيادة','ru'=>'Руководство'],
    'team_title'    =>['en'=>'The team','ar'=>'الفريق','ru'=>'Команда'],
    'team1_p'       =>['en'=>'CEO — 15+ years in digital asset markets and fintech','ar'=>'الرئيس التنفيذي — أكثر من 15 عامًا في أسواق الأصول الرقمية والتقنية المالية','ru'=>'CEO — более 15 лет на рынках цифровых активов и в финтехе'],
    'team2_p'       =>['en'=>'CTO — Former lead engineer at a major crypto exchange','ar'=>'المدير التقني — مهندس رئيسي سابق في منصة كريبتو كبرى','ru'=>'CTO — бывший ведущий инженер крупной криптобиржи'],
    'team3_p'       =>['en'=>'Head of Compliance — KYC/AML specialist, regulated markets background','ar'=>'رئيس الامتثال — متخصص KYC/AML بخلفية في الأسواق المنظَّمة','ru'=>'Руководитель комплаенса — специалист KYC/AML с опытом в регулируемых рынках'],
    'team4_p'       =>['en'=>'Head of Trading — Quant strategies, market making, and risk systems','ar'=>'رئيس التداول — استراتيجيات كميّة وصناعة سوق وأنظمة مخاطر','ru'=>'Руководитель трейдинга — количественные стратегии, маркет-мейкинг и риск-системы'],
    'foot_desc'     =>['en'=>'Professional multi-asset trading platform with transparent pricing.','ar'=>'منصة تداول احترافية متعددة الأصول بتسعير شفاف.','ru'=>'Профессиональная мультиактивная платформа с прозрачными ценами.'],
    'foot_products' =>['en'=>'Products','ar'=>'المنتجات','ru'=>'Продукты'],
    'foot_trading'  =>['en'=>'Trading Desk','ar'=>'مكتب التداول','ru'=>'Торговый стол'],
    'foot_copy'     =>['en'=>'Copy Trading','ar'=>'نسخ الصفقات','ru'=>'Копи-трейдинг'],
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
      <a class="mex-nav-link" href="/features.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_features')); ?></a>
      <a class="mex-nav-link is-active" href="/about.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_about')); ?></a>
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
        <h1 style="max-width:700px;margin:0 auto 16px"><?php echo $txt('hero_h1'); ?></h1>
        <p style="max-width:560px;margin:0 auto">
          <?php echo _h($txt('hero_sub')); ?>
        </p>
      </div>
    </div>
  </section>

  <section class="mex-section">
    <div class="mex-section-head"><span class="mex-kicker"><?php echo _h($txt('story_kicker')); ?></span><h2><?php echo _h($txt('story_title')); ?></h2></div>
    <div style="max-width:800px;margin:0 auto;display:grid;gap:24px">
      <div style="background:#0a1122;border:1px solid rgba(64,125,181,.12);border-radius:16px;padding:32px" class="mex-reveal">
        <h3 style="color:#e2e8f0;margin:0 0 12px;font-size:20px"><?php echo _h($txt('mission_t')); ?></h3>
        <p style="color:#8ea9d8;line-height:1.8;margin:0"><?php echo _h($txt('mission_p')); ?></p>
      </div>
      <div style="background:#0a1122;border:1px solid rgba(64,125,181,.12);border-radius:16px;padding:32px" class="mex-reveal">
        <h3 style="color:#e2e8f0;margin:0 0 12px;font-size:20px"><?php echo _h($txt('tech_t')); ?></h3>
        <p style="color:#8ea9d8;line-height:1.8;margin:0"><?php echo _h($txt('tech_p')); ?></p>
      </div>
    </div>
  </section>

  <section class="mex-section alt">
    <div class="mex-section-head"><span class="mex-kicker"><?php echo _h($txt('nums_kicker')); ?></span><h2><?php echo _h($txt('nums_title')); ?></h2></div>
    <div class="mex-trust-grid-v2">
      <div class="mex-trust-card-v2 mex-reveal"><div class="mex-trust-ico-v2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg></div><h3>70+</h3><p><?php echo _h($txt('stat1_p')); ?></p></div>
      <div class="mex-trust-card-v2 mex-reveal"><div class="mex-trust-ico-v2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div><h3>180+</h3><p><?php echo _h($txt('stat2_p')); ?></p></div>
      <div class="mex-trust-card-v2 mex-reveal"><div class="mex-trust-ico-v2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><h3>99.9%</h3><p><?php echo _h($txt('stat3_p')); ?></p></div>
      <div class="mex-trust-card-v2 mex-reveal"><div class="mex-trust-ico-v2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div><h3>24/7</h3><p><?php echo _h($txt('stat4_p')); ?></p></div>
    </div>
  </section>

  <section class="mex-section">
    <div class="mex-section-head"><span class="mex-kicker"><?php echo _h($txt('values_kicker')); ?></span><h2><?php echo _h($txt('values_title')); ?></h2></div>
    <div class="mex-values-grid">
      <div class="mex-value-card mex-reveal">
        <div class="mex-value-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
        <h3><?php echo _h($txt('val1_t')); ?></h3>
        <p><?php echo _h($txt('val1_p')); ?></p>
      </div>
      <div class="mex-value-card mex-reveal">
        <div class="mex-value-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div>
        <h3><?php echo _h($txt('val2_t')); ?></h3>
        <p><?php echo _h($txt('val2_p')); ?></p>
      </div>
      <div class="mex-value-card mex-reveal">
        <div class="mex-value-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
        <h3><?php echo _h($txt('val3_t')); ?></h3>
        <p><?php echo _h($txt('val3_p')); ?></p>
      </div>
    </div>
  </section>

  <section class="mex-section alt">
    <div class="mex-section-head"><span class="mex-kicker"><?php echo _h($txt('team_kicker')); ?></span><h2><?php echo _h($txt('team_title')); ?></h2></div>
    <div class="mex-trust-grid-v2" style="max-width:900px">
      <div class="mex-trust-card-v2 mex-reveal"><div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#5d7cff,#00c087);margin:0 auto 12px;display:grid;place-items:center;color:#fff;font-size:20px;font-weight:900">AK</div><h3>Ahmed K.</h3><p><?php echo _h($txt('team1_p')); ?></p></div>
      <div class="mex-trust-card-v2 mex-reveal"><div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#5d7cff,#00c087);margin:0 auto 12px;display:grid;place-items:center;color:#fff;font-size:20px;font-weight:900">SM</div><h3>Sara M.</h3><p><?php echo _h($txt('team2_p')); ?></p></div>
      <div class="mex-trust-card-v2 mex-reveal"><div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#5d7cff,#00c087);margin:0 auto 12px;display:grid;place-items:center;color:#fff;font-size:20px;font-weight:900">RH</div><h3>Rami H.</h3><p><?php echo _h($txt('team3_p')); ?></p></div>
      <div class="mex-trust-card-v2 mex-reveal"><div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#5d7cff,#00c087);margin:0 auto 12px;display:grid;place-items:center;color:#fff;font-size:20px;font-weight:900">LW</div><h3>Lina W.</h3><p><?php echo _h($txt('team4_p')); ?></p></div>
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
