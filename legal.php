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

$isLoggedIn = false; try { $isLoggedIn = session_user_id() > 0; } catch (Throwable $e) { $isLoggedIn = false; }
function _h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }
$pages = ['terms'=>['Terms of Service','شروط الاستخدام','Условия использования'],'privacy'=>['Privacy Policy','سياسة الخصوصية','Политика конфиденциальности'],'risk'=>['Risk Disclosure','إفصاح المخاطر','Раскрытие рисков']];
$page = $_GET['page'] ?? 'terms';
if(!isset($pages[$page])) $page='terms';
$title = is_array($pages[$page]) ? ($pages[$page][$lang==='ar'?1:($lang==='ru'?2:0)] ?? reset($pages[$page])) : $pages[$page];

$txt = function(string $key) use ($lang): string {
  static $T = null;
  if ($T === null) { $T = [
    'nav_home'     =>['en'=>'Home','ar'=>'الرئيسية','ru'=>'Главная'],
    'nav_markets'  =>['en'=>'Markets','ar'=>'الأسواق','ru'=>'Рынки'],
    'nav_features' =>['en'=>'Features','ar'=>'المزايا','ru'=>'Возможности'],
    'nav_about'    =>['en'=>'About','ar'=>'من نحن','ru'=>'О нас'],
    'nav_contact'  =>['en'=>'Contact','ar'=>'تواصل معنا','ru'=>'Контакты'],
    'nav_login'    =>['en'=>'Log in','ar'=>'تسجيل الدخول','ru'=>'Вход'],
    'nav_create'   =>['en'=>'Create Account','ar'=>'إنشاء حساب','ru'=>'Создать счёт'],
    'nav_openapp'  =>['en'=>'Open App','ar'=>'فتح التطبيق','ru'=>'Открыть приложение'],
    'kicker'       =>['en'=>'Legal','ar'=>'قانوني','ru'=>'Правовое'],
    'tab_terms'    =>['en'=>'Terms','ar'=>'الشروط','ru'=>'Условия'],
    'tab_privacy'  =>['en'=>'Privacy','ar'=>'الخصوصية','ru'=>'Конфиденциальность'],
    'tab_risk'     =>['en'=>'Risk','ar'=>'المخاطر','ru'=>'Риски'],
    // ---- Terms ----
    'terms_h2'     =>['en'=>'Terms of Service','ar'=>'شروط الاستخدام','ru'=>'Условия использования'],
    'terms_intro'  =>['en'=>'Welcome to MEX Group. By accessing or using our platform, you agree to be bound by these terms. If you do not agree, you must not use the platform.','ar'=>'مرحبًا بك في MEX Group. بدخولك إلى منصتنا أو استخدامها فإنك توافق على الالتزام بهذه الشروط. إذا كنت لا توافق، فيجب عليك عدم استخدام المنصة.','ru'=>'Добро пожаловать в MEX Group. Получая доступ к платформе или используя её, вы соглашаетесь соблюдать настоящие условия. Если вы не согласны, вы не должны использовать платформу.'],
    'terms_1_t'    =>['en'=>'1. Eligibility','ar'=>'1. الأهلية','ru'=>'1. Право на использование'],
    'terms_1_p'    =>['en'=>'You must be at least 18 years old and able to form legally binding contracts to use our services.','ar'=>'يجب أن يكون عمرك 18 عامًا على الأقل وأن تكون قادرًا على إبرام عقود ملزمة قانونًا لاستخدام خدماتنا.','ru'=>'Вам должно быть не менее 18 лет, и вы должны быть способны заключать юридически обязывающие договоры для использования наших услуг.'],
    'terms_2_t'    =>['en'=>'2. Account','ar'=>'2. الحساب','ru'=>'2. Учётная запись'],
    'terms_2_p'    =>['en'=>'You are responsible for maintaining the confidentiality of your account credentials. Notify us immediately of any unauthorized access.','ar'=>'أنت مسؤول عن الحفاظ على سرية بيانات اعتماد حسابك. أبلغنا فورًا بأي وصول غير مصرّح به.','ru'=>'Вы несёте ответственность за сохранение конфиденциальности учётных данных. Немедленно сообщайте нам о любом несанкционированном доступе.'],
    'terms_3_t'    =>['en'=>'3. Risk','ar'=>'3. المخاطر','ru'=>'3. Риск'],
    'terms_3_p'    =>['en'=>'Trading involves significant risk. You may lose your entire investment. Past performance is not indicative of future results.','ar'=>'ينطوي التداول على مخاطر كبيرة. قد تخسر استثمارك بالكامل. الأداء السابق لا يدل على النتائج المستقبلية.','ru'=>'Торговля сопряжена со значительным риском. Вы можете потерять все инвестиции. Прошлые результаты не гарантируют будущих.'],
    'terms_4_t'    =>['en'=>'4. Prohibited Activities','ar'=>'4. الأنشطة المحظورة','ru'=>'4. Запрещённые действия'],
    'terms_4_p'    =>['en'=>'You may not use the platform for money laundering, fraud, market manipulation, or any illegal activity. We reserve the right to suspend accounts for suspected violations.','ar'=>'لا يجوز استخدام المنصة لغسل الأموال أو الاحتيال أو التلاعب بالسوق أو أي نشاط غير قانوني. نحتفظ بالحق في تعليق الحسابات عند الاشتباه في المخالفات.','ru'=>'Запрещено использовать платформу для отмывания денег, мошенничества, манипулирования рынком или любой незаконной деятельности. Мы оставляем за собой право приостанавливать счета при подозрении на нарушения.'],
    'terms_5_t'    =>['en'=>'5. Changes','ar'=>'5. التعديلات','ru'=>'5. Изменения'],
    'terms_5_p'    =>['en'=>'We may modify these terms at any time. Continued use after changes constitutes acceptance.','ar'=>'يجوز لنا تعديل هذه الشروط في أي وقت. استمرار الاستخدام بعد التعديلات يُعدّ قبولًا بها.','ru'=>'Мы можем изменять эти условия в любое время. Продолжение использования после изменений означает их принятие.'],
    // ---- Privacy ----
    'priv_h2'      =>['en'=>'Privacy Policy','ar'=>'سياسة الخصوصية','ru'=>'Политика конфиденциальности'],
    'priv_intro'   =>['en'=>'MEX Group is committed to protecting your personal information. This policy explains how we collect, use, and safeguard your data.','ar'=>'تلتزم MEX Group بحماية معلوماتك الشخصية. توضح هذه السياسة كيفية جمعنا لبياناتك واستخدامها وحمايتها.','ru'=>'MEX Group обязуется защищать вашу личную информацию. Эта политика объясняет, как мы собираем, используем и защищаем ваши данные.'],
    'priv_1_t'     =>['en'=>'1. Information We Collect','ar'=>'1. المعلومات التي نجمعها','ru'=>'1. Какие данные мы собираем'],
    'priv_1_p'     =>['en'=>'We collect registration information, KYC documents, transaction history, device information, and user activity data.','ar'=>'نجمع معلومات التسجيل ومستندات KYC وسجل المعاملات ومعلومات الجهاز وبيانات نشاط المستخدم.','ru'=>'Мы собираем регистрационные данные, документы KYC, историю транзакций, информацию об устройстве и данные о действиях пользователя.'],
    'priv_2_t'     =>['en'=>'2. How We Use It','ar'=>'2. كيف نستخدمها','ru'=>'2. Как мы их используем'],
    'priv_2_p'     =>['en'=>'Data is used to provide services, verify identity, prevent fraud, comply with regulations, and improve the platform.','ar'=>'تُستخدم البيانات لتقديم الخدمات والتحقق من الهوية ومنع الاحتيال والامتثال للوائح وتحسين المنصة.','ru'=>'Данные используются для предоставления услуг, проверки личности, предотвращения мошенничества, соблюдения нормативов и улучшения платформы.'],
    'priv_3_t'     =>['en'=>'3. Sharing','ar'=>'3. المشاركة','ru'=>'3. Передача данных'],
    'priv_3_p'     =>['en'=>'We do not sell your data. We may share it with regulators, payment processors, and service providers who agree to confidentiality.','ar'=>'نحن لا نبيع بياناتك. قد نشاركها مع الجهات التنظيمية ومعالجي المدفوعات ومزوّدي الخدمات الذين يلتزمون بالسرية.','ru'=>'Мы не продаём ваши данные. Мы можем передавать их регуляторам, платёжным провайдерам и поставщикам услуг, соблюдающим конфиденциальность.'],
    'priv_4_t'     =>['en'=>'4. Security','ar'=>'4. الأمان','ru'=>'4. Безопасность'],
    'priv_4_p'     =>['en'=>'We use encryption, secure servers, access controls, and regular audits to protect your data.','ar'=>'نستخدم التشفير والخوادم الآمنة وضوابط الوصول والتدقيق المنتظم لحماية بياناتك.','ru'=>'Мы используем шифрование, защищённые серверы, контроль доступа и регулярные аудиты для защиты ваших данных.'],
    'priv_5_t'     =>['en'=>'5. Your Rights','ar'=>'5. حقوقك','ru'=>'5. Ваши права'],
    'priv_5_p'     =>['en'=>'You have the right to access, correct, or delete your personal data. Contact us for requests.','ar'=>'لديك الحق في الوصول إلى بياناتك الشخصية أو تصحيحها أو حذفها. تواصل معنا لتقديم الطلبات.','ru'=>'Вы имеете право на доступ, исправление или удаление ваших персональных данных. Свяжитесь с нами для подачи запросов.'],
    // ---- Risk ----
    'risk_h2'      =>['en'=>'Risk Disclosure','ar'=>'إفصاح المخاطر','ru'=>'Раскрытие рисков'],
    'risk_intro'   =>['en'=>'Trading leveraged financial instruments carries a high risk of losing money rapidly. Consider whether you understand how these products work and whether you can afford the high risk.','ar'=>'ينطوي تداول الأدوات المالية بالرافعة المالية على مخاطر عالية لخسارة الأموال بسرعة. فكّر فيما إذا كنت تفهم كيفية عمل هذه المنتجات وما إذا كان بإمكانك تحمّل هذه المخاطر العالية.','ru'=>'Торговля финансовыми инструментами с кредитным плечом несёт высокий риск быстрой потери средств. Убедитесь, что вы понимаете, как работают эти продукты, и можете позволить себе высокий риск.'],
    'risk_1_t'     =>['en'=>'Market Risk','ar'=>'مخاطر السوق','ru'=>'Рыночный риск'],
    'risk_1_p'     =>['en'=>'Prices may change rapidly due to macroeconomic events, geopolitical developments, liquidity gaps, and technical issues. Stop losses may not execute at your desired price.','ar'=>'قد تتغير الأسعار بسرعة بسبب الأحداث الاقتصادية الكلية والتطورات الجيوسياسية وفجوات السيولة والمشكلات التقنية. قد لا تُنفَّذ أوامر إيقاف الخسارة عند السعر المطلوب.','ru'=>'Цены могут быстро меняться из-за макроэкономических событий, геополитических факторов, разрывов ликвидности и технических проблем. Стоп-лоссы могут не исполниться по желаемой цене.'],
    'risk_2_t'     =>['en'=>'Leverage Risk','ar'=>'مخاطر الرافعة المالية','ru'=>'Риск кредитного плеча'],
    'risk_2_p'     =>['en'=>'Leverage amplifies both gains and losses. A small adverse price movement can result in a total loss of your margin.','ar'=>'تضخّم الرافعة المالية الأرباح والخسائر معًا. قد تؤدي حركة سعرية صغيرة معاكسة إلى خسارة كامل هامشك.','ru'=>'Кредитное плечо увеличивает как прибыль, так и убытки. Небольшое неблагоприятное движение цены может привести к полной потере маржи.'],
    'risk_3_t'     =>['en'=>'Provider Risk','ar'=>'مخاطر المزوّد','ru'=>'Риск поставщика'],
    'risk_3_p'     =>['en'=>'Price quotes are sourced from third-party providers. Delays, outages, or inaccuracies may occur.','ar'=>'تُستمد أسعار العروض من مزوّدين خارجيين. قد تحدث تأخيرات أو انقطاعات أو أخطاء.','ru'=>'Котировки цен поступают от сторонних поставщиков. Возможны задержки, перебои или неточности.'],
    'risk_4_t'     =>['en'=>'Platform Risk','ar'=>'مخاطر المنصة','ru'=>'Риск платформы'],
    'risk_4_p'     =>['en'=>'Technical failures, maintenance windows, network issues, or force majeure events may prevent trading.','ar'=>'قد تمنع الأعطال التقنية أو فترات الصيانة أو مشكلات الشبكة أو أحداث القوة القاهرة التداول.','ru'=>'Технические сбои, периоды обслуживания, проблемы с сетью или форс-мажор могут помешать торговле.'],
    'risk_5_t'     =>['en'=>'No Guarantees','ar'=>'لا ضمانات','ru'=>'Никаких гарантий'],
    'risk_5_p'     =>['en'=>'This platform does not provide investment advice. All trading decisions are yours alone.','ar'=>'لا تقدّم هذه المنصة استشارات استثمارية. جميع قرارات التداول مسؤوليتك وحدك.','ru'=>'Эта платформа не предоставляет инвестиционных советов. Все торговые решения принимаете только вы.'],
    // ---- Footer ----
    'foot_desc'    =>['en'=>'Professional multi-asset trading platform.','ar'=>'منصة تداول احترافية متعددة الأصول.','ru'=>'Профессиональная мультиактивная торговая платформа.'],
    'foot_products'=>['en'=>'Products','ar'=>'المنتجات','ru'=>'Продукты'],
    'foot_trading' =>['en'=>'Trading Desk','ar'=>'مكتب التداول','ru'=>'Торговый стол'],
    'foot_copy'    =>['en'=>'Copy Trading','ar'=>'نسخ الصفقات','ru'=>'Копи-трейдинг'],
    'foot_contracts'=>['en'=>'Contracts','ar'=>'العقود','ru'=>'Контракты'],
    'foot_funding' =>['en'=>'Funding','ar'=>'التمويل','ru'=>'Пополнение'],
    'foot_resources'=>['en'=>'Resources','ar'=>'الموارد','ru'=>'Ресурсы'],
    'foot_verif'   =>['en'=>'Verification','ar'=>'التحقق','ru'=>'Верификация'],
    'foot_support' =>['en'=>'Support Center','ar'=>'مركز الدعم','ru'=>'Центр поддержки'],
    'foot_legal'   =>['en'=>'Legal','ar'=>'قانوني','ru'=>'Правовое'],
    'foot_terms'   =>['en'=>'Terms','ar'=>'الشروط','ru'=>'Условия'],
    'foot_privacy' =>['en'=>'Privacy','ar'=>'الخصوصية','ru'=>'Конфиденциальность'],
    'foot_risk'    =>['en'=>'Risk','ar'=>'المخاطر','ru'=>'Риски'],
    'foot_disclaimer'=>['en'=>'Trading involves significant risk.','ar'=>'التداول ينطوي على مخاطر كبيرة.','ru'=>'Торговля сопряжена со значительным риском.'],
  ]; }
  return $T[$key][$lang] ?? $T[$key]['en'] ?? $key;
};
?>
<!doctype html>
<html lang="<?php echo _h($lang); ?>" dir="<?php echo $rtl ? 'rtl' : 'ltr'; ?>">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title><?php echo _h($title); ?> — MEX Group</title><link rel="stylesheet" href="/assets/css/public-site.css?v=<?php echo @filemtime(__DIR__ . '/assets/css/public-site.css') ?: time(); ?>"></head>
<body class="mex-landing-page">
<header class="mex-header"><div class="mex-header-inner"><a class="mex-logo" href="/?lang=<?php echo _h($lang); ?>"><img src="/assets/img/mex_global_logo.png" alt="MEX Global" onerror="this.style.display='none'"><strong>MEX Group</strong></a>
<nav class="mex-header-nav"><a class="mex-nav-link" href="/?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_home')); ?></a><a class="mex-nav-link" href="/markets.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_markets')); ?></a><a class="mex-nav-link" href="/features.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_features')); ?></a><a class="mex-nav-link" href="/about.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_about')); ?></a><a class="mex-nav-link" href="/contact.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_contact')); ?></a></nav>
<div class="mex-header-actions"><div class="mex-lang-wrap"><button class="mex-lang-btn" id="mex-lang-trigger"><span class="mex-lang-current"><?php echo strtoupper(_h($lang)); ?></span><svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5"/></svg></button><div class="mex-lang-dropdown" id="mex-lang-dropdown"><?php foreach(['en'=>'English','ar'=>'العربية','ru'=>'Русский','tr'=>'Türkçe','fr'=>'Français','de'=>'Deutsch','es'=>'Español','it'=>'Italiano','pt'=>'Português','nl'=>'Nederlands','pl'=>'Polski','zh'=>'中文','ja'=>'日本語','ko'=>'한국어','vi'=>'Tiếng Việt'] as $c=>$n): ?><a class="mex-lang-opt<?php echo $c===$lang?' is-active':''; ?>" href="?lang=<?php echo _h($c); ?>&page=<?php echo _h($page); ?>"><?php echo _h($n); ?></a><?php endforeach; ?></div></div><?php if($isLoggedIn): ?><a class="mex-btn mex-btn-primary mex-btn-sm" href="/app.php#/home"><?php echo _h($txt('nav_openapp')); ?></a><?php else: ?><div class="mex-header-btns"><a class="mex-btn mex-btn-soft mex-btn-sm" href="/login.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_login')); ?></a><a class="mex-btn mex-btn-primary mex-btn-sm" href="/register.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_create')); ?></a></div><?php endif; ?><button class="mex-hamburger" id="mex-hamburger"><span></span><span></span><span></span></button></div>
</div></header>
<main class="mex-page">
  <section class="mex-hero-v2" style="padding:50px 0 30px"><div class="mex-hero-grid" style="grid-template-columns:1fr;text-align:center"><div class="mex-hero-text"><span class="mex-kicker"><?php echo _h($txt('kicker')); ?></span><h1 style="max-width:700px;margin:0 auto 10px"><?php echo _h($title); ?></h1></div></div></section>
  <section class="mex-section"><div class="mex-legal-nav" style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-bottom:24px">
    <a class="mex-nav-link<?php echo $page==='terms'?' is-active':''; ?>" href="/legal.php?page=terms&lang=<?php echo _h($lang); ?>"><?php echo _h($txt('tab_terms')); ?></a>
    <a class="mex-nav-link<?php echo $page==='privacy'?' is-active':''; ?>" href="/legal.php?page=privacy&lang=<?php echo _h($lang); ?>"><?php echo _h($txt('tab_privacy')); ?></a>
    <a class="mex-nav-link<?php echo $page==='risk'?' is-active':''; ?>" href="/legal.php?page=risk&lang=<?php echo _h($lang); ?>"><?php echo _h($txt('tab_risk')); ?></a>
  </div>
  <div class="mex-legal-body">
<?php if($page==='terms'): ?>
<h2><?php echo _h($txt('terms_h2')); ?></h2>
<p><?php echo _h($txt('terms_intro')); ?></p>
<h3><?php echo _h($txt('terms_1_t')); ?></h3>
<p><?php echo _h($txt('terms_1_p')); ?></p>
<h3><?php echo _h($txt('terms_2_t')); ?></h3>
<p><?php echo _h($txt('terms_2_p')); ?></p>
<h3><?php echo _h($txt('terms_3_t')); ?></h3>
<p><?php echo _h($txt('terms_3_p')); ?></p>
<h3><?php echo _h($txt('terms_4_t')); ?></h3>
<p><?php echo _h($txt('terms_4_p')); ?></p>
<h3><?php echo _h($txt('terms_5_t')); ?></h3>
<p><?php echo _h($txt('terms_5_p')); ?></p>
<?php elseif($page==='privacy'): ?>
<h2><?php echo _h($txt('priv_h2')); ?></h2>
<p><?php echo _h($txt('priv_intro')); ?></p>
<h3><?php echo _h($txt('priv_1_t')); ?></h3>
<p><?php echo _h($txt('priv_1_p')); ?></p>
<h3><?php echo _h($txt('priv_2_t')); ?></h3>
<p><?php echo _h($txt('priv_2_p')); ?></p>
<h3><?php echo _h($txt('priv_3_t')); ?></h3>
<p><?php echo _h($txt('priv_3_p')); ?></p>
<h3><?php echo _h($txt('priv_4_t')); ?></h3>
<p><?php echo _h($txt('priv_4_p')); ?></p>
<h3><?php echo _h($txt('priv_5_t')); ?></h3>
<p><?php echo _h($txt('priv_5_p')); ?></p>
<?php else: ?>
<h2><?php echo _h($txt('risk_h2')); ?></h2>
<p><?php echo _h($txt('risk_intro')); ?></p>
<h3><?php echo _h($txt('risk_1_t')); ?></h3>
<p><?php echo _h($txt('risk_1_p')); ?></p>
<h3><?php echo _h($txt('risk_2_t')); ?></h3>
<p><?php echo _h($txt('risk_2_p')); ?></p>
<h3><?php echo _h($txt('risk_3_t')); ?></h3>
<p><?php echo _h($txt('risk_3_p')); ?></p>
<h3><?php echo _h($txt('risk_4_t')); ?></h3>
<p><?php echo _h($txt('risk_4_p')); ?></p>
<h3><?php echo _h($txt('risk_5_t')); ?></h3>
<p><?php echo _h($txt('risk_5_p')); ?></p>
<?php endif; ?>
  </div></section>
</main>
<footer class="mex-footer"><div class="mex-footer-inner"><div class="mex-footer-main"><div class="mex-footer-brand"><a class="mex-footer-logo" href="/"><img src="/assets/img/mex_global_logo.png" alt="MEX Global"><strong>MEX Group</strong></a><p><?php echo _h($txt('foot_desc')); ?></p></div><div class="mex-footer-col"><h4><?php echo _h($txt('foot_products')); ?></h4><a href="/app.php#/trade"><?php echo _h($txt('foot_trading')); ?></a><a href="/app.php#/invest"><?php echo _h($txt('foot_copy')); ?></a><a href="/app.php#/invest"><?php echo _h($txt('foot_contracts')); ?></a><a href="/app.php#/deposit"><?php echo _h($txt('foot_funding')); ?></a></div><div class="mex-footer-col"><h4><?php echo _h($txt('foot_resources')); ?></h4><a href="/app.php#/kyc"><?php echo _h($txt('foot_verif')); ?></a><a href="/app.php#/support"><?php echo _h($txt('foot_support')); ?></a></div><div class="mex-footer-col"><h4><?php echo _h($txt('foot_legal')); ?></h4><a href="/legal.php?page=terms&lang=<?php echo _h($lang); ?>"><?php echo _h($txt('foot_terms')); ?></a><a href="/legal.php?page=privacy&lang=<?php echo _h($lang); ?>"><?php echo _h($txt('foot_privacy')); ?></a><a href="/legal.php?page=risk&lang=<?php echo _h($lang); ?>"><?php echo _h($txt('foot_risk')); ?></a></div></div><div class="mex-footer-bottom"><span>&copy; <?php echo date('Y'); ?> MEX Group. <?php echo _h($txt('foot_disclaimer')); ?></span></div></div></footer>
<script>(function(){var lb=document.getElementById('mex-lang-trigger'),ld=document.getElementById('mex-lang-dropdown');if(lb&&ld){lb.addEventListener('click',function(e){e.stopPropagation();var o=lb.getAttribute('aria-expanded')==='true';lb.setAttribute('aria-expanded',o?'false':'true');ld.classList.toggle('is-open',!o);});document.addEventListener('click',function(){lb.setAttribute('aria-expanded','false');ld.classList.remove('is-open');});}var h=document.getElementById('mex-hamburger'),n=document.querySelector('.mex-header-nav');if(h&&n){h.addEventListener('click',function(){var o=h.getAttribute('aria-expanded')==='true';h.setAttribute('aria-expanded',o?'false':'true');n.classList.toggle('is-open',!o);h.classList.toggle('is-active',!o);});n.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){h.setAttribute('aria-expanded','false');n.classList.remove('is-open');h.classList.remove('is-active');});});}})();</script>
<script src="/assets/js/public-site.js?v=<?php echo @filemtime(__DIR__.'/assets/js/public-site.js')?: time(); ?>" defer></script>
</body></html>
