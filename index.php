<?php
declare(strict_types=1);
require_once __DIR__ . '/site_bootstrap.php';
$lang = 'en'; $rtl = false;
try {
  require_once __DIR__ . '/includes/shared/site-helpers.php';
  $lang = site_locale(); $rtl  = site_is_rtl($lang);
} catch (Throwable $e) {
  $l = strtolower((string)($_GET['lang'] ?? $_COOKIE['vp_lang'] ?? 'en'));
  $lang = in_array($l, ['en','ar','ru','tr','fr','de','es','it','pt','nl','pl','zh','ja','ko','vi'], true) ? $l : 'en';
  $rtl  = $lang === 'ar';
}
$isLoggedIn = false;
try { $isLoggedIn = session_user_id() > 0; } catch (Throwable $e) {}
function _h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }
$txt = function(string $key) use ($lang): string {
  static $T = null;
  if ($T === null) { $T = [
    'hero_kicker' => ['en'=>'MEX GROUP TRADING DESK','ar'=>'مكتب تداول MEX GROUP','ru'=>'ТОРГОВЫЙ СТОЛ MEX GROUP'],
    'hero_title_1'=> ['en'=>'Life is Better','ar'=>'الحياة أفضل','ru'=>'Жизнь лучше'],
    'hero_title_2'=> ['en'=>'with Trading','ar'=>'مع التداول','ru'=>'с торговлей'],
    'hero_subtitle'=> ['en'=>'Trade with the world\'s most regulated FX and CFD Broker. Access 217+ instruments across crypto, forex, stocks, commodities, and futures.','ar'=>'تداول مع أكبر وسيط فوركس وعقود فروقات منظم في العالم. وصول لأكثر من 217 أداة عبر الكريبتو والفوركس والأسهم والسلع.','ru'=>'Торгуйте с самым регулируемым FX и CFD брокером. 217+ инструментов.'],
    'hero_cta_primary'=> ['en'=>'Open a Live Account','ar'=>'افتح حساب حقيقي','ru'=>'Открыть живой счёт'],
    'hero_cta_second' => ['en'=>'Try Risk-Free Demo','ar'=>'جرّب الديمو المجاني','ru'=>'Бесплатный демо'],
    'products_title' => ['en'=>'Trade Our Top Performing Products','ar'=>'تداول أفضل المنتجات أداءً','ru'=>'Торгуйте лучшими продуктами'],
    'products_sub'   => ['en'=>'Confidently trade with MEX Group cutting-edge platforms offering groundbreaking levels of stability and reliability.','ar'=>'تداول بثقة مع منصات MEX Group المتطورة التي تقدم مستويات غير مسبوقة من الاستقرار والموثوقية.','ru'=>'Торгуйте уверенно с передовыми платформами MEX Group.'],
    'forex_title'  => ['en'=>'Invest in Forex','ar'=>'استثمر في الفوركس','ru'=>'Инвестируйте в Форекс'],
    'forex_text'   => ['en'=>'Trade over 55 major, cross, and exotic Forex pairs, and benefit from the tightest spreads in the industry.','ar'=>'تداول أكثر من 55 زوج فوركس رئيسي ومتقاطع وغريب واستفد من أضيق الفروقات في الصناعة.','ru'=>'Торгуйте 55+ валютными парами с самыми узкими спредами.'],
    'leverage'     => ['en'=>'Up to 500:1','ar'=>'حتى 500:1','ru'=>'До 500:1'],
    'leverage_sub' => ['en'=>'Highest levels of leverage','ar'=>'أعلى مستويات الرافعة المالية','ru'=>'Максимальное кредитное плечо'],
    'spreads'      => ['en'=>'0.0* Pips','ar'=>'0.0* نقطة','ru'=>'0.0* пунктов'],
    'spreads_sub'  => ['en'=>'Tightest spreads in the industry','ar'=>'أضيق فروقات في الصناعة','ru'=>'Узчайшие спреды'],
    'platforms_title' => ['en'=>'Explore our Mobile Trading Platforms','ar'=>'استكشف منصات التداول المحمولة','ru'=>'Мобильные торговые платформы'],
    'platforms_sub'   => ['en'=>'Get a smarter and faster mobile trading experience on the go, designed for you as a modern investor.','ar'=>'احصل على تجربة تداول محمول أذكى وأسرع، مصممة لك كمستثمر عصري.','ru'=>'Умный и быстрый мобильный трейдинг.'],
    'step1_title'   => ['en'=>'Download Mobile App','ar'=>'حمّل التطبيق','ru'=>'Скачайте приложение'],
    'step1_text'    => ['en'=>'From App Store or Google Play','ar'=>'من App Store أو Google Play','ru'=>'Из App Store или Google Play'],
    'step2_title'   => ['en'=>'Register','ar'=>'سجّل حسابك','ru'=>'Зарегистрируйтесь'],
    'step2_text'    => ['en'=>'Open a live account in simple steps','ar'=>'افتح حساب حقيقي بخطوات بسيطة','ru'=>'Откройте счёт за несколько шагов'],
    'step3_title'   => ['en'=>'Fund & Start Trading','ar'=>'موّل وابدأ التداول','ru'=>'Пополните и торгуйте'],
    'step3_text'    => ['en'=>'Choose your suitable payment method to fund your account','ar'=>'اختر طريقة الدفع المناسبة لتمويل حسابك','ru'=>'Выберите метод пополнения'],
    'accounts_title' => ['en'=>'Select an Account That Suits Your Trading Style','ar'=>'اختر حساباً يناسب أسلوبك في التداول','ru'=>'Выберите счёт по своему стилю'],
    'accounts_sub'  => ['en'=>'From a risk-free demo to professional execution — start where you are comfortable and upgrade anytime.','ar'=>'من حساب تجريبي بدون مخاطر إلى تنفيذ احترافي — ابدأ من حيث تشعر بالراحة وارتقِ في أي وقت.','ru'=>'От демо до профессионального исполнения.'],
    'bonus_title'   => ['en'=>'25% Deposit Bonus','ar'=>'مكافأة إيداع 25%','ru'=>'25% бонус на депозит'],
    'bonus_sub'     => ['en'=>'Receive up to $40,000 in tradable and withdrawable bonuses','ar'=>'احصل على حتى 40,000$ كمكافآت قابلة للتداول والسحب','ru'=>'Получите до $40,000 бонусов'],
    'cta_title'     => ['en'=>'Ready to start?','ar'=>'مستعد للبدء؟','ru'=>'Готовы начать?'],
    'cta_sub'       => ['en'=>'Open your MEX Group account in minutes and access global markets today.','ar'=>'افتح حساب MEX Group في دقائق وادخل الأسواق العالمية اليوم.','ru'=>'Откройте счёт MEX Group за несколько минут.'],
    'cta_btn'       => ['en'=>'Create free account','ar'=>'إنشاء حساب مجاني','ru'=>'Создать аккаунт'],
    'trust_title'   => ['en'=>'Why MEX Group','ar'=>'لماذا MEX Group','ru'=>'Почему MEX Group'],
    'multi'         => ['en'=>'Multi-Asset Trading','ar'=>'تداول متعدد الأصول','ru'=>'Мультиактивная торговля'],
    'multi_text'    => ['en'=>'Crypto, forex, stocks and commodities — all from one account with unified P&L.','ar'=>'الكريبتو والفوركس والأسهم والسلع — كلها من حساب واحد مع ربح وخسارة موحدة.','ru'=>'Крипта, форекс, акции, товары — всё из одного счёта.'],
    'pricing'       => ['en'=>'Transparent Pricing','ar'=>'تسعير شفاف','ru'=>'Прозрачные цены'],
    'pricing_text'  => ['en'=>'Live quotes from multiple providers with clear source labels and real-time refresh.','ar'=>'أسعار مباشرة من مزودين متعددين مع تسميات مصادر واضحة وتحديث فوري.','ru'=>'Прямые котировки от нескольких провайдеров.'],
    'secure'        => ['en'=>'Institutional Security','ar'=>'أمان مؤسسي','ru'=>'Институциональная безопасность'],
    'secure_text'   => ['en'=>'KYC verification, encrypted sessions, and manual funding review on every transaction.','ar'=>'تحقق KYC وجلسات مشفرة ومراجعة يدوية لكل معاملة تمويلية.','ru'=>'Верификация KYC, зашифрованные сессии и ручная проверка средств.'],
    'copy'          => ['en'=>'AI Trading Bot','ar'=>'بوت التداول الذكي','ru'=>'ИИ-торговый бот'],
    'copy_text'     => ['en'=>'Let our AI trading bot run proven strategies automatically with transparent performance metrics.','ar'=>'دع بوت التداول الذكي ينفّذ استراتيجيات مثبتة تلقائياً بمقاييس أداء شفافة.','ru'=>'ИИ-бот автоматически запускает проверенные стратегии.'],
    'nav_home'      => ['en'=>'Home','ar'=>'الرئيسية','ru'=>'Главная'],
    'nav_markets'   => ['en'=>'Markets','ar'=>'الأسواق','ru'=>'Рынки'],
    'nav_features'  => ['en'=>'Features','ar'=>'المزايا','ru'=>'Возможности'],
    'nav_about'     => ['en'=>'About','ar'=>'من نحن','ru'=>'О нас'],
    'nav_contact'   => ['en'=>'Contact','ar'=>'تواصل معنا','ru'=>'Контакты'],
    'nav_login'     => ['en'=>'Log in','ar'=>'تسجيل الدخول','ru'=>'Вход'],
    'nav_create'    => ['en'=>'Create Account','ar'=>'إنشاء حساب','ru'=>'Создать счёт'],
    'nav_openapp'   => ['en'=>'Open App','ar'=>'فتح التطبيق','ru'=>'Открыть приложение'],
    'foot_products' => ['en'=>'Products','ar'=>'المنتجات','ru'=>'Продукты'],
    'foot_trading'  => ['en'=>'Trading Desk','ar'=>'مكتب التداول','ru'=>'Торговый стол'],
    'foot_copy'     => ['en'=>'AI Trading Bot','ar'=>'بوت التداول الذكي','ru'=>'ИИ-торговый бот'],
    'foot_contracts'=>['en'=>'Contracts','ar'=>'العقود','ru'=>'Контракты'],
    'foot_funding'  => ['en'=>'Funding','ar'=>'التمويل','ru'=>'Пополнение'],
    'foot_company'  => ['en'=>'Company','ar'=>'الشركة','ru'=>'Компания'],
    'foot_about'    => ['en'=>'About','ar'=>'من نحن','ru'=>'О нас'],
    'foot_features' => ['en'=>'Features','ar'=>'المزايا','ru'=>'Возможности'],
    'foot_contact'  => ['en'=>'Contact','ar'=>'تواصل معنا','ru'=>'Контакты'],
    'foot_legal'    => ['en'=>'Legal','ar'=>'قانوني','ru'=>'Правовое'],
    'foot_terms'    => ['en'=>'Terms','ar'=>'الشروط','ru'=>'Условия'],
    'foot_privacy'  => ['en'=>'Privacy','ar'=>'الخصوصية','ru'=>'Конфиденциальность'],
    'foot_risk'     => ['en'=>'Risk','ar'=>'المخاطر','ru'=>'Риски'],
    'footer_desc'   => ['en'=>'Professional multi-asset trading platform with transparent pricing and institutional-grade security.','ar'=>'منصة تداول احترافية متعددة الأصول بتسعير شفاف وأمان مؤسسي.','ru'=>'Профессиональная мультиактивная платформа.'],
    'footer_disclaimer'=> ['en'=>'Trading involves significant risk. Past performance does not guarantee future results.','ar'=>'التداول يحمل مخاطر كبيرة. الأداء السابق لا يضمن النتائج المستقبلية.','ru'=>'Торговля сопряжена со значительным риском.'],
    'view_more'     => ['en'=>'View More','ar'=>'عرض المزيد','ru'=>'Подробнее'],
    'open_live'     => ['en'=>'Open a Live Account','ar'=>'افتح حساب حقيقي','ru'=>'Открыть живой счёт'],
    'try_demo'      => ['en'=>'Try Risk-Free Demo','ar'=>'جرّب الديمو','ru'=>'Бесплатный демо'],
    'instant_exec'  => ['en'=>'Instant execution','ar'=>'تنفيذ فوري','ru'=>'Мгновенное исполнение'],
    'flex_lev'      => ['en'=>'Flexible leverage','ar'=>'رافعة مرنة','ru'=>'Гибкое плечо'],
    'support_247'   => ['en'=>'24/7 support','ar'=>'دعم 24/7','ru'=>'Поддержка 24/7'],
    'free_forever'  => ['en'=>'Free forever','ar'=>'مجاني دائماً','ru'=>'Бесплатно навсегда'],
    'full_markets'  => ['en'=>'Full markets','ar'=>'كل الأسواق','ru'=>'Все рынки'],
    'no_card'       => ['en'=>'No card required','ar'=>'بدون بطاقة','ru'=>'Без карты'],
    'tight_spreads' => ['en'=>'Tight spreads','ar'=>'فروقات ضيقة','ru'=>'Узкие спреды'],
    'pro_tools'     => ['en'=>'Professional tools','ar'=>'أدوات احترافية','ru'=>'Профессиональные инструменты'],
    'acc_manager'   => ['en'=>'Account manager','ar'=>'مدير حساب','ru'=>'Менеджер счёта'],
    'raw_spreads'   => ['en'=>'Raw spreads','ar'=>'فروقات خام','ru'=>'Сырые спреды'],
    'ecn_exec'      => ['en'=>'ECN execution','ar'=>'تنفيذ ECN','ru'=>'ECN исполнение'],
    'priority_sup'  => ['en'=>'Priority support','ar'=>'دعم ذو أولوية','ru'=>'Приоритетная поддержка'],
    'forex'=> ['en'=>'Forex','ar'=>'الفوركس','ru'=>'Форекс'],
    'metals'=> ['en'=>'Metals','ar'=>'المعادن','ru'=>'Металлы'],
    'shares'=> ['en'=>'Shares','ar'=>'الأسهم','ru'=>'Акции'],
    'indices'=> ['en'=>'Indices','ar'=>'المؤشرات','ru'=>'Индексы'],
    'commodities'=> ['en'=>'Commodities','ar'=>'السلع','ru'=>'Товары'],
  ]; }
  return $T[$key][$lang] ?? $T[$key]['en'] ?? $key;
};
$marketCards = [
  ['BTCUSDT','Bitcoin','crypto'],['ETHUSDT','Ethereum','crypto'],
  ['EURUSD','Euro / Dollar','forex'],['GBPUSD','Pound / Dollar','forex'],
  ['XAUUSD','Gold Spot','commodities'],['USOIL','Crude Oil WTI','commodities'],
  ['AAPL','Apple Inc.','stocks'],['TSLA','Tesla Inc.','stocks'],
];
$forexPairs = [
  ['EURUSD','Euro vs US Dollar','1.15444','+0.28'],
  ['NZDUSD','New Zealand Dollar','0.58391','+0.96'],
  ['GBPUSD','Great Britain Pound','1.33615','+0.30'],
  ['USDCAD','US Dollar vs Canada','1.39367','+0.04'],
  ['AUDUSD','Australian Dollar','0.70577','+0.44'],
  ['USDCHF','US Dollar vs Swiss','0.79644','+0.17'],
];
?>
<!doctype html>
<html lang="<?php echo _h($lang); ?>" dir="<?php echo $rtl ? 'rtl' : 'ltr'; ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#060b18">
  <meta name="description" content="MEX Group — Professional multi-asset trading platform for crypto, forex, stocks, and commodities.">
  <title>MEX Group | Professional Trading Platform</title>
  <link rel="stylesheet" href="/assets/css/public-site.css?v=<?php echo @filemtime(__DIR__.'/assets/css/public-site.css')?: time(); ?>">
  <style>
    /* ── Animated Hero ── */
    .mex-hero-pro{position:relative;overflow:hidden;min-height:620px;display:flex;align-items:center;padding:100px 0 80px}
    .mex-hero-pro::before{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;
      background:radial-gradient(ellipse 900px 600px at 30% 20%,rgba(93,124,255,.2),transparent 55%),
      radial-gradient(ellipse 700px 500px at 75% 80%,rgba(0,192,135,.14),transparent 50%);
      animation:heroMeshFloat 12s ease-in-out infinite}
    @keyframes heroMeshFloat{0%{opacity:.8}50%{opacity:1}100%{opacity:.8}}
    .mex-hero-pro::after{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;
      background:url('/assets/img/landing-hero-skyline.jpg') center bottom/cover no-repeat;opacity:.12;
      mask-image:linear-gradient(180deg,transparent 0%,rgba(0,0,0,.5) 60%,rgba(0,0,0,.8) 100%);-webkit-mask-image:linear-gradient(180deg,transparent 0%,rgba(0,0,0,.5) 60%,rgba(0,0,0,.8) 100%)}
    .mex-hero-pro>*{position:relative;z-index:1}
    .hero-content{width:min(1280px,calc(100% - 32px));margin:0 auto;display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center}
    .hero-text-side{padding:0 20px}
    .hero-kicker{color:#6ee7ff;font-size:13px;font-weight:950;letter-spacing:.14em;text-transform:uppercase;margin-bottom:18px}
    .hero-main-title{font-size:clamp(44px,6vw,84px);font-weight:900;line-height:.96;letter-spacing:-.03em;margin:0 0 20px;color:#fff}
    .hero-main-title .accent{background:linear-gradient(135deg,#5d7cff,#00c087);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .hero-main-sub{max-width:560px;font-size:19px;line-height:1.7;color:#c6d8f3;margin:0 0 32px}
    .hero-btns{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:28px}
    .store-badges{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    .store-badge{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:10px;border:1px solid rgba(93,124,255,.2);background:rgba(7,14,30,.8);color:#7a9bc8;font-size:13px;font-weight:700;text-decoration:none;transition:.18s}
    .store-badge:hover{border-color:rgba(93,124,255,.4);color:#d5e3ff;background:rgba(93,124,255,.1)}
    .hero-platform-pill{display:inline-flex;align-items:center;gap:10px;padding:10px 16px;border-radius:14px;background:rgba(10,20,44,.78);border:1px solid rgba(135,166,220,.12);color:#c6d8f3;font-size:14px;font-weight:800;transition:.2s}
    .hero-platform-pill:hover{border-color:rgba(93,124,255,.35)}
    .hero-platform-icon{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(93,124,255,.3),rgba(0,192,135,.2));font-size:14px}
    /* Hero Visual Side - Terminal */
    .hero-visual-side{display:grid;place-items:center;position:relative}
    .hero-terminal{width:100%;max-width:480px;border:1px solid rgba(135,166,220,.16);border-radius:24px;background:linear-gradient(180deg,rgba(17,35,66,.92),rgba(9,18,35,.94));box-shadow:0 32px 90px rgba(0,0,0,.36);overflow:hidden;animation:terminalFloat 6s ease-in-out infinite}
    @keyframes terminalFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
    .hero-terminal-top{display:flex;align-items:center;gap:7px;padding:14px 18px;border-bottom:1px solid rgba(135,166,220,.1);font-size:12px;color:#8ea9d8}
    .hero-terminal-top span{width:10px;height:10px;border-radius:50%}
    .hero-terminal-top span:nth-child(1){background:#ff5f75}
    .hero-terminal-top span:nth-child(2){background:#fcd535}
    .hero-terminal-top span:nth-child(3){background:#00c087}
    .hero-terminal-top strong{margin-inline-start:auto;font-weight:800}
    .hero-terminal-chart{height:280px;padding:20px;position:relative;
      background:repeating-linear-gradient(90deg,rgba(135,166,220,.04) 0 1px,transparent 1px 60px),
      repeating-linear-gradient(0deg,rgba(135,166,220,.04) 0 1px,transparent 1px 50px)}
    .hero-chart-line{position:absolute;left:20px;right:20px;bottom:60px;height:160px}
    .hero-chart-line svg{width:100%;height:100%}
    .hero-terminal-prices{padding:8px 18px 16px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .hero-price-row{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-radius:10px;background:rgba(5,12,26,.5);font-size:13px}
    .hero-price-row span{color:#8ea9d8;font-weight:700}
    .hero-price-row strong{color:#fff;font-variant-numeric:tabular-nums}
    .hero-price-row em{font-style:normal;font-weight:800;font-size:11px;padding:3px 6px;border-radius:6px}
    .hero-price-row em.up{color:#00e49b;background:rgba(0,228,155,.1)}
    .hero-price-row em.down{color:#ff5f75;background:rgba(255,95,117,.1)}

    /* ── Live Ticker Strip ── */
    .mex-ticker-strip{overflow:hidden;background:rgba(5,10,22,.92);border-bottom:1px solid rgba(135,166,220,.1);padding:10px 0;position:relative;z-index:15}
    .mex-ticker-track{display:flex;width:max-content;animation:tickerScroll 45s linear infinite}
    .mex-ticker-track:hover{animation-play-state:paused}
    @keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
    .mex-ticker-item{display:inline-flex;align-items:center;gap:8px;padding:6px 22px;white-space:nowrap;font-size:13px}
    .mex-ticker-item b{color:#d5e3ff;font-weight:900}
    .mex-ticker-price{color:#fff;font-weight:900}
    .mex-ticker-change{font-weight:900;font-size:12px;color:#00e49b}
    .mex-ticker-change.down{color:#ff5f75}
    .mex-ticker-sep{color:rgba(135,166,220,.15);margin:0 4px}

    /* ── Stats Bar ── */
    .mex-stats-row{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;background:rgba(7,14,30,.8);border-top:1px solid rgba(135,166,220,.08);border-bottom:1px solid rgba(135,166,220,.08);padding:0}
    .mex-stat-card{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 40px;border-right:1px solid rgba(135,166,220,.08);text-align:center;min-width:150px}
    .mex-stat-card:last-child{border-right:none}
    .mex-stat-card strong{font-size:36px;font-weight:900;line-height:1;background:linear-gradient(135deg,#5d7cff,#00c087);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;display:inline-block}
    .mex-stat-card small{color:#6b87b0;font-size:12px;margin-top:6px;display:block;font-weight:700;letter-spacing:.06em;text-transform:uppercase}

    /* ── Product Tabs ── */
    .product-tabs{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:36px}
    .product-tab{padding:10px 22px;border-radius:100px;font-size:14px;font-weight:800;cursor:pointer;
      border:1px solid rgba(135,166,220,.18);background:rgba(9,17,38,.7);color:#7a9bc8;transition:.18s;appearance:none}
    .product-tab:hover{border-color:rgba(93,124,255,.35);color:#d5e3ff}
    .product-tab.is-active{background:linear-gradient(90deg,#5d7cff,#00c087);border-color:transparent;color:#fff;box-shadow:0 8px 24px rgba(93,124,255,.22)}

    /* ── Product Split ── */
    .product-split{display:grid;grid-template-columns:1.05fr .95fr;gap:40px;align-items:center}
    .product-copy h3{font-size:clamp(28px,4vw,44px);line-height:1.15;margin:0 0 14px;font-weight:900}
    .product-copy h3 .accent{color:#5d7cff}
    .product-copy p{color:#a9bce4;font-size:16px;line-height:1.7;margin:0 0 24px;max-width:520px}
    .product-highlights{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:28px}
    .product-highlight{padding:18px;border-radius:16px;border:1px solid rgba(135,166,220,.12);background:rgba(5,12,26,.5)}
    .product-highlight strong{display:block;font-size:22px;font-weight:900;color:#fff;margin-bottom:4px}
    .product-highlight small{color:#8ea9d8;font-size:13px}
    .product-visual{position:relative;min-height:400px;display:grid;place-items:center}
    .product-img-frame{width:100%;max-width:440px;aspect-ratio:4/3;border-radius:20px;overflow:hidden;border:1px solid rgba(135,166,220,.12);background:linear-gradient(180deg,rgba(7,17,38,.7),rgba(5,12,26,.9));position:relative}
    .product-img-frame img{width:100%;height:100%;object-fit:cover;opacity:.85}
    .product-img-overlay{position:absolute;inset:0;background:linear-gradient(180deg,transparent 50%,rgba(5,12,26,.8) 100%)}
    .product-pair-list{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:20px}
    .product-pair-item{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:12px;background:rgba(5,12,26,.55);border:1px solid rgba(135,166,220,.1);transition:.15s}
    .product-pair-item:hover{border-color:rgba(93,124,255,.3);transform:translateY(-1px)}
    .pair-flag{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:10px;font-weight:900;background:linear-gradient(135deg,rgba(93,124,255,.25),rgba(0,192,135,.15));color:#fff}
    .pair-info span{display:block;color:#a9bce4;font-size:11px;font-weight:700}
    .pair-info strong{display:block;color:#fff;font-size:14px}
    .pair-change{margin-inline-start:auto;font-weight:800;font-size:12px}
    .pair-change.up{color:#00e49b}
    .pair-change.down{color:#ff5f75}

    /* ── Platform Section ── */
    .platform-split{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
    .platform-copy h3{font-size:clamp(28px,4vw,44px);line-height:1.15;margin:0 0 14px;font-weight:900}
    .platform-copy p{color:#a9bce4;font-size:16px;line-height:1.7;margin:0 0 28px;max-width:480px}
    .platform-steps{display:flex;flex-direction:column;gap:20px;margin-bottom:32px}
    .platform-step{display:flex;align-items:flex-start;gap:16px}
    .platform-step-num{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,#5d7cff,#00c087);color:#fff;font-size:18px;font-weight:900;flex-shrink:0}
    .markets-on-desktop{display:inline-flex}
    @media (max-width:1040px){
      .mex-header-nav.is-open .markets-on-desktop{display:none}
    }
    .platform-step p{margin:0;color:#7a9bc8;font-size:14px;line-height:1.6}
    .platform-img-wrapper{position:relative;border-radius:18px;overflow:hidden}
    .platform-img-wrapper img{display:block;width:100%;transition:transform .4s ease}
    .platform-img-wrapper:hover img{transform:scale(1.03)}
    .platform-img-glow{position:absolute;inset:0;pointer-events:none;border-radius:18px;background:linear-gradient(180deg,transparent 60%,rgba(93,124,255,.12));transition:opacity .3s}
    .platform-img-wrapper:hover .platform-img-glow{opacity:.6}


    /* ── Accounts Cards ── */
    .accounts-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:40px}
    .account-card{position:relative;overflow:hidden;border-radius:24px;padding:32px 28px;background:linear-gradient(135deg,rgba(18,37,78,.95),rgba(13,25,53,.9));border:1px solid rgba(135,166,220,.12);display:flex;flex-direction:column;align-items:center;text-align:center;transition:.3s ease}
    .account-card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px}
    .account-card.standard::before{background:linear-gradient(90deg,#cc57ff,#7c4dff)}
    .account-card.pro::before{background:linear-gradient(90deg,#ff9a3d,#ffd46e)}
    .account-card.ecn::before{background:linear-gradient(90deg,#5d7cff,#00c087)}
    .account-card:hover{transform:translateY(-6px);border-color:rgba(93,124,255,.3);box-shadow:0 20px 50px rgba(0,0,0,.35)}
    .account-icon{width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg,rgba(93,124,255,.2),rgba(0,192,135,.12));border:1px solid rgba(93,124,255,.15);display:grid;place-items:center;font-size:28px;margin-bottom:20px}
    .account-card h3{font-size:26px;font-weight:900;margin:0 0 4px;color:#fff}
    .account-card h3 span{display:block;font-size:14px;color:#7a9bc8;font-weight:500;margin-top:4px}
    .account-card p{color:#8ea9d8;font-size:14px;line-height:1.6;margin:0 0 20px}
    .account-points{width:100%;text-align:start;margin-bottom:24px}
    .account-point{display:flex;align-items:center;gap:12px;padding:8px 0;color:#a9bce4;font-size:14px}
    .account-point i{width:20px;height:20px;border-radius:50%;background:rgba(0,228,155,.12);color:#00e49b;display:grid;place-items:center;font-size:11px;font-style:normal;flex-shrink:0}

    /* ── Bonus Band ── */
    .bonus-band{display:grid;grid-template-columns:1fr 1.3fr;gap:24px;align-items:center;margin-top:48px}
    .bonus-card{border-radius:24px;padding:40px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:220px;background:linear-gradient(135deg,rgba(93,124,255,.18),rgba(0,192,135,.1));border:1px solid rgba(93,124,255,.2)}
    .bonus-card strong{font-size:72px;line-height:.95;background:linear-gradient(135deg,#5d7cff,#00c087);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .bonus-card span{font-size:28px;color:#5d7cff;font-weight:900;margin-top:4px}
    .bonus-card small{font-size:16px;color:#c6d8f3;font-weight:800;margin-top:8px}
    .bonus-cta-card{border-radius:24px;padding:40px;min-height:220px;display:flex;flex-direction:column;justify-content:center;background:linear-gradient(135deg,rgba(17,35,66,.95),rgba(9,18,35,.94));border:1px solid rgba(135,166,220,.14)}
    .bonus-cta-card h3{font-size:32px;font-weight:900;margin:0 0 10px;color:#fff}
    .bonus-cta-card p{color:#8ea9d8;font-size:16px;line-height:1.7;margin:0 0 20px}

    /* ── Trust Grid ── */
    .trust-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:36px}
    .trust-card{padding:28px;border-radius:20px;border:1px solid rgba(135,166,220,.12);background:rgba(5,12,26,.52);text-align:center;transition:.25s;position:relative;overflow:hidden}
    .trust-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(93,124,255,.3),transparent)}
    .trust-card:hover{border-color:rgba(93,124,255,.3);transform:translateY(-4px);box-shadow:0 16px 40px rgba(0,0,0,.3)}
    .trust-ico{width:56px;height:56px;margin:0 auto 16px;border-radius:16px;background:linear-gradient(135deg,rgba(93,124,255,.18),rgba(0,192,135,.12));display:grid;place-items:center;color:#6ee7ff;font-size:24px}
    .trust-card h3{margin:0 0 8px;font-size:17px;font-weight:800;color:#e2e8f0}
    .trust-card p{margin:0;color:#8ea9d8;font-size:13px;line-height:1.7}

    /* ── CTA Section ── */
    .mex-cta-section{padding:80px 0;text-align:center;position:relative;overflow:hidden;
      background:radial-gradient(900px 400px at 50% 120%,rgba(93,124,255,.12),transparent 60%),radial-gradient(600px 300px at 85% 20%,rgba(0,192,135,.08),transparent 55%)}
    .mex-cta-section h2{font-size:clamp(28px,4vw,48px);font-weight:900;margin:0 0 12px}
    .mex-cta-section p{color:#8ea9d8;font-size:17px;max-width:560px;margin:0 auto 28px;line-height:1.7}
    .mex-cta-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
    .rocket-ico{display:inline-block;animation:rocketBounce 2s ease-in-out infinite;font-size:32px;margin-bottom:8px}
    @keyframes rocketBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}

    /* ── Section Reveal ── */
    .mex-reveal{opacity:0;transform:translateY(28px);transition:opacity .7s ease,transform .7s ease}
    .mex-reveal.is-visible{opacity:1;transform:none}
    .mex-reveal:nth-child(2){transition-delay:.1s}
    .mex-reveal:nth-child(3){transition-delay:.2s}
    .mex-reveal:nth-child(4){transition-delay:.3s}

    /* ── Responsive ── */
    @media(max-width:1040px){
      .hero-content{grid-template-columns:1fr;text-align:center}
      .hero-text-side{padding:0}
      .hero-main-sub{margin-inline:auto}
      .hero-btns{justify-content:center}
      .hero-platforms{justify-content:center}
      .hero-visual-side{display:none}
      .product-split,.platform-split{grid-template-columns:1fr;gap:32px}
      .product-visual{min-height:auto}
      .trust-grid{grid-template-columns:repeat(2,1fr)}
      .accounts-grid{grid-template-columns:1fr;max-width:420px;margin-inline:auto}
      .bonus-band{grid-template-columns:1fr}
    }
    @media(max-width:680px){
      .mex-hero-pro{min-height:auto;padding:60px 0 40px}
      .hero-main-title{font-size:clamp(32px,10vw,52px)}
      .hero-main-sub{font-size:15px}
      .mex-stat-card{min-width:50%;border-bottom:1px solid rgba(135,166,220,.08);padding:16px 20px}
      .mex-stat-card strong{font-size:28px}
      .trust-grid{grid-template-columns:1fr}
      .product-highlights{grid-template-columns:1fr}
      .product-pair-list{grid-template-columns:1fr}
      .phone-group{width:260px;height:340px}
      .phone-main{width:170px;height:300px}
      .phone-mini.left{width:90px;height:150px}
      .phone-mini.right{width:80px;height:140px}
      .bonus-card strong{font-size:48px}
      .bonus-card span{font-size:20px}
    }
  </style>
</head>
<body class="mex-landing-page<?php echo $rtl ? ' is-rtl' : ''; ?>">

<!-- ══ HEADER ═════════════════════════════════════════════════════════════ -->
<header class="mex-header" id="mex-header">
  <div class="mex-header-inner">
    <a class="mex-logo" href="/?lang=<?php echo _h($lang); ?>">
      <img src="/assets/img/mex_global_logo.png" alt="MEX Global" loading="eager" onerror="this.style.display='none'">
      <strong>MEX Group</strong>
    </a>
    <nav class="mex-header-nav">
      <a class="mex-nav-link is-active" href="/?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_home')); ?></a>
      <a class="mex-nav-link markets-on-desktop" href="/markets.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_markets')); ?></a>
      <a class="mex-nav-link" href="/features.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_features')); ?></a>
      <a class="mex-nav-link" href="/about.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_about')); ?></a>
      <a class="mex-nav-link" href="/contact.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_contact')); ?></a>
      <div class="mex-mobile-auth-bridge">
        <?php if($isLoggedIn): ?>
          <a class="mex-btn mex-btn-primary mex-btn-sm" style="width:100%;margin-top:6px" href="/app.php#/home"><?php echo _h($txt('nav_openapp')); ?></a>
        <?php else: ?>
          <a class="mex-btn mex-btn-soft mex-btn-sm" style="width:100%;margin-bottom:6px" href="/login.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_login')); ?></a>
          <a class="mex-btn mex-btn-primary mex-btn-sm" style="width:100%" href="/register.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_create')); ?></a>
        <?php endif; ?>
      </div>
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

<!-- ══ LIVE TICKER STRIP ══════════════════════════════════════════════════ -->
<div class="mex-ticker-strip">
  <div class="mex-ticker-track" id="tickerTrack">
    <?php for($i=0;$i<2;$i++): ?>
    <?php foreach($marketCards as $m): ?>
    <div class="mex-ticker-item">
      <b><?php echo _h($m[0]); ?></b>
      <span class="mex-ticker-price" data-ticker-price="<?php echo _h($m[0]); ?>">--</span>
      <span class="mex-ticker-change" data-ticker-change="<?php echo _h($m[0]); ?>">0.00%</span>
    </div>
    <?php endforeach; ?>
    <span class="mex-ticker-sep">|</span>
    <?php endfor; ?>
  </div>
</div>

<!-- ══ HERO ══════════════════════════════════════════════════════════════ -->
<section class="mex-hero-pro">
  <div class="hero-content">
    <div class="hero-text-side">
      <div class="hero-kicker"><?php echo _h($txt('hero_kicker')); ?></div>
      <h1 class="hero-main-title">
        <?php echo _h($txt('hero_title_1')); ?><br>
        <span class="accent"><?php echo _h($txt('hero_title_2')); ?></span>
      </h1>
      <p class="hero-main-sub"><?php echo _h($txt('hero_subtitle')); ?></p>
      <div class="hero-btns">
        <a class="mex-btn mex-btn-primary" style="min-height:52px;padding:0 32px;font-size:16px" href="<?php echo $isLoggedIn?'/app.php#/trade':'/register.php?lang='._h($lang); ?>"><?php echo _h($txt('hero_cta_primary')); ?></a>
        <a class="mex-btn mex-btn-soft" style="min-height:52px;padding:0 28px;font-size:16px" href="<?php echo $isLoggedIn?'/app.php#/trade':'/register.php?lang='._h($lang).'&next='.rawurlencode('/app.php#/trade'); ?>"><?php echo _h($txt('hero_cta_second')); ?></a>
      </div>
      <div class="hero-platforms">
        <div class="hero-platform-pill">
          <div class="hero-platform-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
          </div> MultiBank App
        </div>
        <div class="hero-platform-pill">
          <div class="hero-platform-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          </div> MetaTrader 4 & 5
        </div>
      </div>
    </div>
    <div class="hero-visual-side">
      <div class="hero-terminal">
        <div class="hero-terminal-top">
          <span></span><span></span><span></span>
          <strong>EURUSD</strong>
        </div>
        <div class="hero-terminal-chart">
          <div class="hero-chart-line">
            <svg viewBox="0 0 440 160" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#00e49b" stop-opacity=".3"/>
                  <stop offset="100%" stop-color="#00e49b" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <path d="M0,120 C30,110 50,80 80,85 C110,90 130,60 160,55 C190,50 210,70 240,45 C270,20 300,35 330,25 C360,15 390,30 420,10 L440,8" fill="none" stroke="#00e49b" stroke-width="2.5" stroke-linecap="round"/>
              <path d="M0,120 C30,110 50,80 80,85 C110,90 130,60 160,55 C190,50 210,70 240,45 C270,20 300,35 330,25 C360,15 390,30 420,10 L440,8 L440,160 L0,160Z" fill="url(#chartGrad)"/>
            </svg>
          </div>
        </div>
        <div class="hero-terminal-prices">
          <div class="hero-price-row"><span>EUR/USD</span><strong data-price-symbol="EURUSD">--</strong><em class="up" data-change-symbol="EURUSD">--</em></div>
          <div class="hero-price-row"><span>GBP/USD</span><strong data-price-symbol="GBPUSD">--</strong><em class="up" data-change-symbol="GBPUSD">--</em></div>
          <div class="hero-price-row"><span>XAU/USD</span><strong data-price-symbol="XAUUSD">--</strong><em class="up" data-change-symbol="XAUUSD">--</em></div>
          <div class="hero-price-row"><span>BTC/USDT</span><strong data-price-symbol="BTCUSDT">--</strong><em class="up" data-change-symbol="BTCUSDT">--</em></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ══ STATS BAR ═════════════════════════════════════════════════════════ -->
<div class="mex-stats-row">
  <div class="mex-stat-card"><strong>217+</strong><small><?php echo $rtl?'أدوات تداول':'Trading Instruments'; ?></small></div>
  <div class="mex-stat-card"><strong>500:1</strong><small><?php echo $rtl?'رافعة مالية':'Leverage'; ?></small></div>
  <div class="mex-stat-card"><strong>0.0*</strong><small><?php echo $rtl?'فروقات':'Pip Spreads'; ?></small></div>
  <div class="mex-stat-card"><strong>24/7</strong><small><?php echo $rtl?'دعم متواصل':'Support'; ?></small></div>
</div>

<!-- ══ PRODUCTS ═══════════════════════════════════════════════════════════ -->
<section class="mex-section mex-reveal" id="productsSection">
  <div class="mex-section-head"><span class="mex-kicker"><?php echo $rtl?'منتجاتنا':'OUR PRODUCTS'; ?></span><h2><?php echo _h($txt('products_title')); ?></h2><p><?php echo _h($txt('products_sub')); ?></p></div>
  <div class="product-tabs">
    <button class="product-tab is-active" data-product-tab="forex"><?php echo _h($txt('forex')); ?></button>
    <button class="product-tab" data-product-tab="metals"><?php echo _h($txt('metals')); ?></button>
    <button class="product-tab" data-product-tab="shares"><?php echo _h($txt('shares')); ?></button>
    <button class="product-tab" data-product-tab="indices"><?php echo _h($txt('indices')); ?></button>
    <button class="product-tab" data-product-tab="commodities"><?php echo _h($txt('commodities')); ?></button>
  </div>
  <div style="width:min(1280px,calc(100% - 32px));margin:0 auto">
    <div class="product-split" id="productSplit">
      <div class="product-copy" id="productCopy">
        <h3><?php echo _h($txt('forex_title')); ?></h3>
        <p><?php echo _h($txt('forex_text')); ?></p>
        <div class="product-highlights">
          <div class="product-highlight"><strong><?php echo _h($txt('leverage')); ?></strong><small><?php echo _h($txt('leverage_sub')); ?></small></div>
          <div class="product-highlight"><strong><?php echo _h($txt('spreads')); ?></strong><small><?php echo _h($txt('spreads_sub')); ?></small></div>
        </div>
        <a class="mex-btn mex-btn-primary" href="/markets.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('view_more')); ?></a>
      </div>
      <div class="product-visual">
        <div class="product-img-frame">
          <div style="padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <?php foreach($forexPairs as $p): ?>
            <div class="product-pair-item">
              <div class="pair-flag"><?php echo _h(substr($p[0],0,2)); ?></div>
              <div class="pair-info"><span><?php echo _h($p[1]); ?></span><strong data-price-symbol="<?php echo _h($p[0]); ?>">$<?php echo _h($p[2]); ?></strong></div>
              <span class="pair-change up" data-change-symbol="<?php echo _h($p[0]); ?>"><?php echo _h($p[3]); ?>%</span>
            </div>
            <?php endforeach; ?>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ══ WHY MEX GROUP ═══════════════════════════════════════════════════ -->
<section class="mex-section alt mex-reveal">
  <div class="mex-section-head"><span class="mex-kicker">MEX Group</span><h2><?php echo _h($txt('trust_title')); ?></h2></div>
  <div style="width:min(1100px,calc(100% - 32px));margin:0 auto">
    <div class="trust-grid">
      <div class="trust-card">
        <div class="trust-ico">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
        </div>
        <h3><?php echo _h($txt('multi')); ?></h3>
        <p><?php echo _h($txt('multi_text')); ?></p>
      </div>
      <div class="trust-card">
        <div class="trust-ico">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <h3><?php echo _h($txt('pricing')); ?></h3>
        <p><?php echo _h($txt('pricing_text')); ?></p>
      </div>
      <div class="trust-card">
        <div class="trust-ico">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h3><?php echo _h($txt('secure')); ?></h3>
        <p><?php echo _h($txt('secure_text')); ?></p>
      </div>
      <div class="trust-card">
        <div class="trust-ico">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
        </div>
        <h3><?php echo _h($txt('copy')); ?></h3>
        <p><?php echo _h($txt('copy_text')); ?></p>
      </div>
    </div>
  </div>
</section>

<!-- ══ PLATFORMS ═════════════════════════════════════════════════════════ -->
<section class="mex-section mex-reveal">
  <div class="mex-section-head"><span class="mex-kicker"><?php echo $rtl?'المنصات':'Platforms'; ?></span><h2><?php echo _h($txt('platforms_title')); ?></h2><p><?php echo _h($txt('platforms_sub')); ?></p></div>
  <div style="width:min(1100px,calc(100% - 32px));margin:0 auto">
    <div class="platform-split">
      <div class="platform-copy">
        <div class="platform-steps">
          <div class="platform-step">
            <div class="platform-step-num">1</div>
            <div><h4><?php echo _h($txt('step1_title')); ?></h4><p><?php echo _h($txt('step1_text')); ?></p>
              <div class="store-badges">
                <a href="/register.php?lang=<?php echo _h($lang); ?>" class="store-badge" aria-label="App Store">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  App Store
                </a>
                <a href="/register.php?lang=<?php echo _h($lang); ?>" class="store-badge" aria-label="Google Play">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 20.5v-17c0-.6.4-1 1-1 .2 0 .5.1.7.2l14.8 8.5c.5.3.6.9.4 1.4-.1.1-.2.2-.3.3L4.7 21.3c-.4.3-1 .2-1.3-.2-.2-.2-.4-.4-.4-.6zM16.2 12l-3.5-2V7l7 4-7 4v-3l3.5-2z"/></svg>
                  Google Play
                </a>
              </div>
            </div>
          </div>
          <div class="platform-step">
            <div class="platform-step-num">2</div>
            <div><h4><?php echo _h($txt('step2_title')); ?></h4><p><?php echo _h($txt('step2_text')); ?></p></div>
          </div>
          <div class="platform-step">
            <div class="platform-step-num">3</div>
            <div><h4><?php echo _h($txt('step3_title')); ?></h4><p><?php echo _h($txt('step3_text')); ?></p></div>
          </div>
        </div>
        <a class="mex-btn mex-btn-primary" href="<?php echo $isLoggedIn?'/app.php#/home':'/register.php?lang='._h($lang); ?>"><?php echo _h($txt('open_live')); ?></a>
      </div>
      <div class="platform-visual" data-platform-visual>
        <div class="platform-img-wrapper">
          <img src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=800&auto=format&fit=crop" alt="Trading platform dark" loading="lazy" style="width:100%;height:auto;border-radius:18px;border:1px solid rgba(93,124,255,.15);box-shadow:0 24px 60px rgba(0,0,0,.4)">
          <div class="platform-img-glow"></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ══ ACCOUNTS ═════════════════════════════════════════════════════════ -->
<section class="mex-section alt mex-reveal">
  <div class="mex-section-head"><span class="mex-kicker"><?php echo $rtl?'الحسابات':'Accounts'; ?></span><h2><?php echo _h($txt('accounts_title')); ?></h2></div>
  <p class="section-sub" style="margin-bottom:0"><?php echo _h($txt('accounts_sub')); ?></p>
  <div style="width:min(1100px,calc(100% - 32px));margin:0 auto">
    <div class="accounts-grid">
      <div class="account-card standard">
        <div class="account-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/></svg>
        </div>
        <h3><?php echo $rtl?'تجريبي':'Demo'; ?><span>$10,000</span></h3>
        <p><?php echo _h($txt('accounts_sub')); ?></p>
        <div class="account-points">
          <div class="account-point"><i><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></i> <?php echo _h($txt('free_forever')); ?></div>
          <div class="account-point"><i><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></i> <?php echo _h($txt('full_markets')); ?></div>
          <div class="account-point"><i><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></i> <?php echo _h($txt('no_card')); ?></div>
        </div>
        <a class="mex-btn mex-btn-soft" style="margin-top:auto;width:100%" href="<?php echo $isLoggedIn?'/app.php#/home':'/register.php?lang='._h($lang); ?>"><?php echo _h($txt('try_demo')); ?></a>
      </div>
      <div class="account-card pro">
        <div class="account-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </div>
        <h3><?php echo $rtl?'قياسي':'Standard'; ?><span><?php echo $rtl?'من $50':'From $50'; ?></span></h3>
        <p><?php echo $rtl?'217+ أداة برافعة حتى 1:500':'217+ instruments with leverage up to 1:500'; ?></p>
        <div class="account-points">
          <div class="account-point"><i><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></i> <?php echo _h($txt('instant_exec')); ?></div>
          <div class="account-point"><i><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></i> <?php echo _h($txt('flex_lev')); ?></div>
          <div class="account-point"><i><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></i> <?php echo _h($txt('support_247')); ?></div>
        </div>
        <a class="mex-btn mex-btn-primary" style="margin-top:auto;width:100%" href="<?php echo $isLoggedIn?'/app.php#/deposit':'/register.php?lang='._h($lang); ?>"><?php echo _h($txt('open_live')); ?></a>
      </div>
      <div class="account-card ecn">
        <div class="account-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
        </div>
        <h3><?php echo $rtl?'احترافي':'Pro'; ?><span><?php echo $rtl?'من $1,000':'From $1,000'; ?></span></h3>
        <p><?php echo _h($txt('tight_spreads')).' & '.mb_strtolower(_h($txt('pro_tools'))); ?></p>
        <div class="account-points">
          <div class="account-point"><i><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></i> <?php echo _h($txt('tight_spreads')); ?></div>
          <div class="account-point"><i><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></i> <?php echo _h($txt('pro_tools')); ?></div>
          <div class="account-point"><i><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></i> <?php echo _h($txt('acc_manager')); ?></div>
        </div>
        <a class="mex-btn mex-btn-soft" style="margin-top:auto;width:100%" href="<?php echo $isLoggedIn?'/app.php#/deposit':'/register.php?lang='._h($lang); ?>"><?php echo $rtl?'افتح حساب برو':'Open Pro Account'; ?></a>
      </div>
    </div>

    <!-- Bonus Band -->
    <div class="bonus-band">
      <div class="bonus-card">
        <strong>25%</strong>
        <span><?php echo _h($txt('bonus_title')); ?></span>
        <small><?php echo _h($txt('bonus_sub')); ?></small>
      </div>
      <div class="bonus-cta-card">
        <h3><?php echo _h($txt('cta_title')); ?></h3>
        <p><?php echo _h($txt('cta_sub')); ?></p>
        <div class="mex-cta-btns">
          <a class="mex-btn mex-btn-primary" style="min-height:50px;padding:0 28px" href="<?php echo $isLoggedIn?'/app.php#/home':'/register.php?lang='._h($lang); ?>"><?php echo _h($txt('cta_btn')); ?></a>
          <a class="mex-btn mex-btn-soft" href="/contact.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_contact')); ?></a>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ══ CTA ══════════════════════════════════════════════════════════════ -->
<section class="mex-cta-section mex-reveal">
  <div class="rocket-ico">
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
  </div>
  <h2><?php echo $rtl?'مستعد للبدء؟':'Want to get started?'; ?></h2>
  <p><?php echo _h($txt('cta_sub')); ?></p>
  <div class="mex-cta-btns">
    <a class="mex-btn mex-btn-primary" style="min-height:52px;padding:0 32px;font-size:16px" href="<?php echo $isLoggedIn?'/app.php#/home':'/register.php?lang='._h($lang); ?>"><?php echo _h($txt('cta_btn')); ?></a>
  </div>
</section>

<!-- ══ FOOTER ═══════════════════════════════════════════════════════════ -->
<footer class="mex-footer">
  <div class="mex-footer-inner">
    <div class="mex-footer-main">
      <div class="mex-footer-brand">
        <a class="mex-footer-logo" href="/?lang=<?php echo _h($lang); ?>">
          <img src="/assets/img/mex_global_logo.png" alt="MEX Global" onerror="this.style.display='none'">
          <strong>MEX Group</strong>
        </a>
        <p><?php echo _h($txt('footer_desc')); ?></p>
      </div>
      <div class="mex-footer-col">
        <h4><?php echo _h($txt('foot_products')); ?></h4>
        <a href="/app.php#/trade"><?php echo _h($txt('foot_trading')); ?></a>
        <a href="/app.php#/invest"><?php echo _h($txt('foot_copy')); ?></a>
        <a href="/app.php#/invest"><?php echo _h($txt('foot_contracts')); ?></a>
        <a href="/app.php#/deposit"><?php echo _h($txt('foot_funding')); ?></a>
      </div>
      <div class="mex-footer-col">
        <h4><?php echo _h($txt('foot_company')); ?></h4>
        <a href="/about.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('foot_about')); ?></a>
        <a href="/features.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('foot_features')); ?></a>
        <a href="/contact.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('foot_contact')); ?></a>
      </div>
      <div class="mex-footer-col">
        <h4><?php echo _h($txt('foot_legal')); ?></h4>
        <a href="/legal.php?page=terms"><?php echo _h($txt('foot_terms')); ?></a>
        <a href="/legal.php?page=privacy"><?php echo _h($txt('foot_privacy')); ?></a>
        <a href="/legal.php?page=risk"><?php echo _h($txt('foot_risk')); ?></a>
      </div>
    </div>
    <div class="mex-footer-bottom">
      <span>&copy; <?php echo date('Y'); ?> MEX Group. <?php echo _h($txt('footer_disclaimer')); ?></span>
    </div>
  </div>
</footer>

<script>
(function(){
  /* Hamburger */
  var hamburger = document.getElementById('mex-hamburger');
  var nav = document.querySelector('.mex-header-nav');
  var header = document.getElementById('mex-header');
  if(hamburger && nav){
    hamburger.addEventListener('click', function(){
      var open = nav.classList.toggle('is-open');
      hamburger.classList.toggle('is-active');
      document.body.style.overflow = open ? 'hidden' : '';
      if(header) header.classList.toggle('menu-open', open);
    });
    nav.querySelectorAll('a, button').forEach(function(link){
      link.addEventListener('click', function(){
        nav.classList.remove('is-open');
        hamburger.classList.remove('is-active');
        document.body.style.overflow = '';
        if(header) header.classList.remove('menu-open');
      });
    });
  }

  /* Language dropdown */
  var langTrigger = document.getElementById('mex-lang-trigger');
  var langDropdown = document.getElementById('mex-lang-dropdown');
  if(langTrigger && langDropdown){
    langTrigger.addEventListener('click', function(e){
      e.stopPropagation();
      var open = langDropdown.classList.toggle('is-open');
      langTrigger.setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', function(){ langDropdown.classList.remove('is-open'); langTrigger.setAttribute('aria-expanded','false'); });
  }

  /* Product Tabs */
  var productData = {
    forex: {title:'<?php echo _h($txt("forex_title")); ?>',text:'<?php echo _h($txt("forex_text")); ?>',a:'<?php echo _h($txt("leverage")); ?>',aSub:'<?php echo _h($txt("leverage_sub")); ?>',b:'<?php echo _h($txt("spreads")); ?>',bSub:'<?php echo _h($txt("spreads_sub")); ?>'},
    metals: {title:'<?php echo $rtl?"استثمر في المعادن":"Invest in Metals"; ?>',text:'<?php echo $rtl?"تداول الذهب والفضة والبلاتين بفروقات تنافسية وتنفيذ فوري.":"Trade Gold, Silver, and Platinum with competitive spreads and instant execution."; ?>',a:'<?php echo $rtl?"ذهب وفضة":"Gold & Silver"; ?>',aSub:'<?php echo $rtl?"أكثر المعادن طلباً":"Most demanded metals"; ?>',b:'0.0* Pips',bSub:'<?php echo _h($txt("spreads_sub")); ?>'},
    shares: {title:'<?php echo $rtl?"تداول الأسهم العالمية":"Trade Global Shares"; ?>',text:'<?php echo $rtl?"وصول لأسهم CFD سائلة مع تسعير حقيقي لأشهر الشركات المدرجة.":"Access liquid stock CFDs with real pricing across the most demanded listed names."; ?>',a:'<?php echo $rtl?"أفضل الأسهم الأمريكية والأوروبية":"Top US & EU"; ?>',aSub:'<?php echo $rtl?"الأسهم الأكثر متابعة":"Most-followed equities"; ?>',b:'<?php echo $rtl?"تنفيذ سريع":"Fast execution"; ?>',bSub:'<?php echo $rtl?"تدفق تعاملات ويب":"Web-first dealing flow"; ?>'},
    indices: {title:'<?php echo $rtl?"تداول المؤشرات":"Trade Indices"; ?>',text:'<?php echo $rtl?"تداول أبرز المؤشرات العالمية مثل S&P 500 و NASDAQ مع رافعة مالية مرنة.":"Trade major global indices like S&P 500 and NASDAQ with flexible leverage."; ?>',a:'S&P / NASDAQ',aSub:'<?php echo $rtl?"مؤشرات رئيسية":"Major indices"; ?>',b:'<?php echo $rtl?"رافعة مرنة":"Flexible leverage"; ?>',bSub:'<?php echo $rtl?"حتى 500:1":"Up to 500:1"; ?>'},
    commodities: {title:'<?php echo $rtl?"تتبع السلع":"Track Commodities"; ?>',text:'<?php echo $rtl?"تابع المعادن والسلع مع أسعار مباشرة وأدوات محفظة متكاملة.":"Follow metals and commodities with live pricing widgets and portfolio tracking."; ?>',a:'<?php echo $rtl?"ذهب وفضة":"Gold & Silver"; ?>',aSub:'<?php echo $rtl?"أكثر المعادن طلباً":"Most demanded metals"; ?>',b:'<?php echo $rtl?"أسعار مباشرة":"Live widgets"; ?>',bSub:'<?php echo $rtl?"بنية أسعار مشتركة":"Shared price infrastructure"; ?>'}
  };
  document.querySelectorAll('[data-product-tab]').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('[data-product-tab]').forEach(function(b){b.classList.remove('is-active')});
      btn.classList.add('is-active');
      var key = btn.getAttribute('data-product-tab');
      var d = productData[key] || productData.forex;
      var copy = document.getElementById('productCopy');
      if(copy){
        copy.querySelector('h3').innerHTML = d.title;
        copy.querySelector('p').textContent = d.text;
        var hls = copy.querySelectorAll('.product-highlight');
        if(hls[0]){hls[0].querySelector('strong').textContent=d.a;hls[0].querySelector('small').textContent=d.aSub}
        if(hls[1]){hls[1].querySelector('strong').textContent=d.b;hls[1].querySelector('small').textContent=d.bSub}
      }
    });
  });

  /* Live prices */
  function fmt(v){ var n=Number(v); if(!isFinite(n)||n<=0) return '--'; if(n>=1000) return '$'+n.toLocaleString(undefined,{maximumFractionDigits:2}); if(n>=1) return '$'+n.toLocaleString(undefined,{maximumFractionDigits:4}); return '$'+n.toLocaleString(undefined,{maximumFractionDigits:6}); }
  function fetchPrices(){
    var syms=[];
    document.querySelectorAll('[data-price-symbol]').forEach(function(el){ var s=el.getAttribute('data-price-symbol'); if(s) syms.push(s); });
    document.querySelectorAll('[data-ticker-price]').forEach(function(el){ var s=el.getAttribute('data-ticker-price'); if(s) syms.push(s); });
    syms=[...new Set(syms)];
    if(!syms.length) return;
    fetch('/api/public_prices.php?symbols='+encodeURIComponent(syms.join(',')),{headers:{Accept:'application/json'}})
    .then(function(r){ return r.ok?r.json():null; })
    .then(function(data){
      if(!data||!Array.isArray(data.items)) return;
      data.items.forEach(function(q){
        var sym=String(q.symbol||'').toUpperCase();
        var price=(q.price!=null&&q.price>0)?Number(q.price):0;
        var change=Number(q.change_pct||0);
        document.querySelectorAll('[data-price-symbol="'+sym+'"]').forEach(function(el){ el.textContent=fmt(price); el.classList.remove('mex-skeleton'); });
        document.querySelectorAll('[data-ticker-price="'+sym+'"]').forEach(function(el){ el.textContent=fmt(price); });
        document.querySelectorAll('[data-change-symbol="'+sym+'"], [data-ticker-change="'+sym+'"]').forEach(function(el){
          el.textContent=(change>=0?'+':'')+change.toFixed(2)+'%';
          el.className=(change<0?'pair-change down mex-ticker-change down':'pair-change up mex-ticker-change up');
        });
      });
    }).catch(function(){});
  }
  fetchPrices(); setInterval(fetchPrices,15000);

  /* Section Reveal on Scroll */
  if('IntersectionObserver' in window){
    var ro=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('is-visible'); ro.unobserve(e.target); } }); },{threshold:0.1});
    document.querySelectorAll('.mex-reveal').forEach(function(el){ ro.observe(el); });
  }

  /* Animate Stats Numbers */
  document.querySelectorAll('.mex-stat-card strong').forEach(function(el){
    var text = el.textContent.trim();
    var match = text.match(/^([\d.]+)/);
    if(!match) return;
    var target = parseFloat(match[1]);
    var suffix = text.replace(match[1],'');
    var start = 0;
    var duration = 1800;
    var startTime = null;
    function animate(ts){
      if(!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(start + (target - start) * eased * 10) / 10;
      el.textContent = (Number.isInteger(target) ? Math.round(current) : current.toFixed(1)) + suffix;
      if(progress < 1) requestAnimationFrame(animate);
      else el.textContent = text;
    }
    var observer = new IntersectionObserver(function(entries){
      if(entries[0].isIntersecting){ requestAnimationFrame(animate); observer.unobserve(el); }
    },{threshold:0.5});
    observer.observe(el);
  });
})();
</script>
</body>
</html>