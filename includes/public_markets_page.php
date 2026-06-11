<?php
// Public marketing markets page. Included from /markets.php only when the
// request is a normal browser visit (API params still return JSON as before).
try { require_once __DIR__ . '/shared/site-helpers.php'; } catch (Throwable $e) {}
$lang = function_exists('site_locale') ? site_locale() : strtolower(substr((string)($_GET['lang'] ?? $_COOKIE['vp_lang'] ?? 'en'), 0, 2));
if (!in_array($lang, ['en','ar','ru','tr','fr','de','es','it','pt','nl','pl','zh','ja','ko','vi'], true)) $lang = 'en';
$rtl = function_exists('site_is_rtl') ? site_is_rtl($lang) : ($lang === 'ar');
$isLoggedIn = false;
try { $isLoggedIn = function_exists('session_user_id') && session_user_id() > 0; } catch (Throwable $e) {}
if (!function_exists('pm_h')) { function pm_h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); } }
$T = [
  'en' => [
    'title'=>'Markets','home'=>'Home','markets'=>'Markets','features'=>'Features','about'=>'About','contact'=>'Contact','login'=>'Log in','register'=>'Create Account','open'=>'Open App','kicker'=>'GLOBAL MARKETS','hero'=>'Trade multiple asset classes from one secure workspace','sub'=>'Browse supported forex pairs, metals, crypto assets, global shares, commodities, futures, indices and Arab equities. Prices are shown only when the platform has a valid quote; unavailable markets are clearly marked.','cta'=>'Start trading','demo'=>'Try demo','products'=>'Market categories','products_sub'=>'A clearer, richer public view for every market segment available inside MEX Group.','snapshot'=>'Live snapshot','snapshot_sub'=>'Selected instruments with quote status. Live, delayed and unavailable states are separated for transparency.','forex'=>'Forex','metals'=>'Metals','crypto'=>'Crypto','stocks'=>'Shares','commodities'=>'Commodities','indices'=>'Indices','futures'=>'Futures','arab'=>'Arab Stocks','why'=>'Why trade markets with MEX Group?','footer'=>'Trading involves significant risk. Do not trade with money you cannot afford to lose.','status_badge'=>'Live/Delayed Status','kyc_badge'=>'KYC Security','asset_badge'=>'Multi-Asset Desk','risk_badge'=>'Risk Controls','unavailable'=>'Unavailable','delayed'=>'Delayed','live'=>'Live'
  ],
  'ar' => [
    'title'=>'الأسواق','home'=>'الرئيسية','markets'=>'الأسواق','features'=>'المزايا','about'=>'من نحن','contact'=>'تواصل معنا','login'=>'تسجيل الدخول','register'=>'إنشاء حساب','open'=>'فتح المنصة','kicker'=>'الأسواق العالمية','hero'=>'تداول فئات أصول متعددة من مساحة آمنة واحدة','sub'=>'تصفح أزواج الفوركس والمعادن والعملات الرقمية والأسهم العالمية والسلع والعقود والمؤشرات والأسهم العربية. لا يتم عرض السعر إلا عندما تمتلك المنصة سعراً صالحاً، وأي سوق غير متاح يظهر بوضوح.','cta'=>'ابدأ التداول','demo'=>'جرّب الديمو','products'=>'تصنيفات الأسواق','products_sub'=>'عرض عام أوضح وأكثر امتلاءً لكل قطاع سوق متاح داخل MEX Group.','snapshot'=>'لمحة أسعار مباشرة','snapshot_sub'=>'أدوات مختارة مع حالة السعر. يتم فصل السعر المباشر والمتأخر وغير المتاح بشفافية.','forex'=>'الفوركس','metals'=>'المعادن','crypto'=>'الكريبتو','stocks'=>'الأسهم','commodities'=>'السلع','indices'=>'المؤشرات','futures'=>'العقود الآجلة','arab'=>'الأسهم العربية','why'=>'لماذا تتداول الأسواق مع MEX Group؟','footer'=>'التداول يحمل مخاطر كبيرة. لا تتداول بأموال لا يمكنك تحمل خسارتها.','status_badge'=>'حالة مباشر/متأخر','kyc_badge'=>'توثيق آمن','asset_badge'=>'مكتب متعدد الأصول','risk_badge'=>'إدارة المخاطر','unavailable'=>'غير متاح','delayed'=>'متأخر','live'=>'مباشر'
  ],
  'ru' => [
    'title'=>'Рынки','home'=>'Главная','markets'=>'Рынки','features'=>'Функции','about'=>'О нас','contact'=>'Контакты','login'=>'Войти','register'=>'Создать аккаунт','open'=>'Открыть','kicker'=>'ГЛОБАЛЬНЫЕ РЫНКИ','hero'=>'Торгуйте разными классами активов из одного защищенного кабинета','sub'=>'Просматривайте форекс, металлы, крипто, акции, товары, фьючерсы, индексы и арабские акции. Цена показывается только при наличии корректной котировки.','cta'=>'Начать торговлю','demo'=>'Демо','products'=>'Категории рынков','products_sub'=>'Более полный публичный обзор каждого рынка MEX Group.','snapshot'=>'Снимок рынка','snapshot_sub'=>'Выбранные инструменты со статусом котировки.','forex'=>'Forex','metals'=>'Металлы','crypto'=>'Крипто','stocks'=>'Акции','commodities'=>'Товары','indices'=>'Индексы','futures'=>'Фьючерсы','arab'=>'Арабские акции','why'=>'Почему MEX Group?','footer'=>'Торговля связана со значительным риском.','status_badge'=>'Статус Live/Delayed','kyc_badge'=>'KYC безопасность','asset_badge'=>'Мультиактивный кабинет','risk_badge'=>'Контроль рисков','unavailable'=>'Недоступно','delayed'=>'Delayed','live'=>'Live'
  ],
];
$t = $T[$lang] ?? $T['en'];
$cats = [
  ['forex','EURUSD / GBPUSD / USDJPY','Major, minor and cross currency pairs with platform quote status.','الفوركس'],
  ['metals','XAUUSD / XAGUSD','Gold and silver spot markets for macro and hedge strategies.','المعادن'],
  ['crypto','BTCUSDT / ETHUSDT / SOLUSDT','Crypto markets with fast quote refresh and clear symbol routing.','الكريبتو'],
  ['stocks','AAPL / TSLA / NVDA','Curated global shares for directional trading and portfolio ideas.','الأسهم'],
  ['commodities','USOIL / UKOIL / NATGAS','Energy and commodity contracts with delayed/live state display.','السلع'],
  ['indices','US500 / NAS100 / DAX','Index markets for broad market exposure.','المؤشرات'],
  ['futures','ES_F / NQ_F / YM_F','Futures symbols with transparent availability state.','العقود الآجلة'],
  ['arab','2222 / 1120 / 2010','Selected GCC and Arab equities including Saudi market names.','الأسهم العربية'],
];
$symbols = ['EURUSD','GBPUSD','USDJPY','XAUUSD','BTCUSDT','ETHUSDT','AAPL','TSLA','USOIL','2222'];
?>
<!doctype html>
<html lang="<?php echo pm_h($lang); ?>" dir="<?php echo $rtl ? 'rtl' : 'ltr'; ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title><?php echo pm_h($t['title']); ?> — MEX Group</title>
  <link rel="stylesheet" href="/assets/css/public-site.css?v=<?php echo (int)(@filemtime(dirname(__DIR__).'/assets/css/public-site.css') ?: time()); ?>">
</head>
<body class="mex-landing-page">
<header class="mex-header" id="mex-header"><div class="mex-header-inner">
  <a class="mex-logo" href="/?lang=<?php echo pm_h($lang); ?>"><img src="/assets/img/mex_global_logo.png" alt="MEX Global" onerror="this.style.display='none'"><strong>MEX Group</strong></a>
  <nav class="mex-header-nav"><a class="mex-nav-link" href="/?lang=<?php echo pm_h($lang); ?>"><?php echo pm_h($t['home']); ?></a><a class="mex-nav-link is-active" href="/markets.php?lang=<?php echo pm_h($lang); ?>"><?php echo pm_h($t['markets']); ?></a><a class="mex-nav-link" href="/features.php?lang=<?php echo pm_h($lang); ?>"><?php echo pm_h($t['features']); ?></a><a class="mex-nav-link" href="/about.php?lang=<?php echo pm_h($lang); ?>"><?php echo pm_h($t['about']); ?></a><a class="mex-nav-link" href="/contact.php?lang=<?php echo pm_h($lang); ?>"><?php echo pm_h($t['contact']); ?></a></nav>
  <div class="mex-header-actions"><div class="mex-lang-wrap"><button class="mex-lang-btn" id="mex-lang-trigger"><span class="mex-lang-current"><?php echo strtoupper(pm_h($lang)); ?></span></button><div class="mex-lang-dropdown" id="mex-lang-dropdown"><?php foreach(['en'=>'English','ar'=>'العربية','ru'=>'Русский'] as $c=>$n): ?><a class="mex-lang-opt<?php echo $c===$lang?' is-active':''; ?>" href="/markets.php?lang=<?php echo pm_h($c); ?>"><?php echo pm_h($n); ?></a><?php endforeach; ?></div></div><?php if($isLoggedIn): ?><a class="mex-btn mex-btn-primary mex-btn-sm" href="/app.php#/home"><?php echo pm_h($t['open']); ?></a><?php else: ?><div class="mex-header-btns"><a class="mex-btn mex-btn-soft mex-btn-sm" href="/login.php?lang=<?php echo pm_h($lang); ?>"><?php echo pm_h($t['login']); ?></a><a class="mex-btn mex-btn-primary mex-btn-sm" href="/register.php?lang=<?php echo pm_h($lang); ?>"><?php echo pm_h($t['register']); ?></a></div><?php endif; ?><button class="mex-hamburger" id="mex-hamburger"><span></span><span></span><span></span></button></div>
</div></header>
<main>
  <section class="mex-hero-v2 public-market-hero"><div class="mex-hero-grid"><div class="mex-hero-text"><span class="mex-kicker"><?php echo pm_h($t['kicker']); ?></span><h1><?php echo pm_h($t['hero']); ?></h1><p><?php echo pm_h($t['sub']); ?></p><div class="mex-hero-actions"><a class="mex-btn mex-btn-primary" href="<?php echo $isLoggedIn?'/app.php#/trade':'/register.php?lang='.pm_h($lang); ?>"><?php echo pm_h($t['cta']); ?></a><a class="mex-btn mex-btn-soft" href="/login.php?lang=<?php echo pm_h($lang); ?>"><?php echo pm_h($t['demo']); ?></a></div></div><div class="public-market-orb"><strong>FX</strong><span>Crypto</span><em>Stocks</em></div></div></section>
  <section class="mex-section"><div class="mex-section-head"><span class="mex-kicker"><?php echo pm_h($t['products']); ?></span><h2><?php echo pm_h($t['products']); ?></h2><p><?php echo pm_h($t['products_sub']); ?></p></div><div class="public-market-grid"><?php foreach($cats as $c): $label=$t[$c[0]] ?? ($rtl ? $c[3] : ucfirst($c[0])); ?><article class="public-market-card"><span><?php echo pm_h($label); ?></span><strong><?php echo pm_h($c[1]); ?></strong><p><?php echo pm_h($rtl ? $c[3].' ضمن مساحة تداول منظمة وواضحة الحالة السعرية.' : $c[2]); ?></p><a href="<?php echo $isLoggedIn?'/app.php#/trade':'/register.php?lang='.pm_h($lang); ?>"><?php echo pm_h($t['cta']); ?> →</a></article><?php endforeach; ?></div></section>
  <section class="mex-section alt"><div class="mex-section-head"><span class="mex-kicker"><?php echo pm_h($t['snapshot']); ?></span><h2><?php echo pm_h($t['snapshot']); ?></h2><p><?php echo pm_h($t['snapshot_sub']); ?></p></div><div class="public-snapshot" id="public-market-snapshot"><?php foreach($symbols as $sym): ?><article class="public-quote-card" data-quote-card="<?php echo pm_h($sym); ?>"><span><?php echo pm_h($sym); ?></span><strong data-price-symbol="<?php echo pm_h($sym); ?>">--</strong><small data-status-symbol="<?php echo pm_h($sym); ?>"><?php echo pm_h($t['unavailable']); ?></small></article><?php endforeach; ?></div></section>
  <section class="mex-cta"><h2><?php echo pm_h($t['why']); ?></h2><p><?php echo pm_h($t['sub']); ?></p><div class="mex-trust-strip"><span class="mex-trust-badge"><?php echo pm_h($t['status_badge']); ?></span><span class="mex-trust-badge"><?php echo pm_h($t['kyc_badge']); ?></span><span class="mex-trust-badge"><?php echo pm_h($t['asset_badge']); ?></span><span class="mex-trust-badge"><?php echo pm_h($t['risk_badge']); ?></span></div></section>
</main>
<footer class="mex-footer"><div class="mex-footer-inner"><div class="mex-footer-bottom"><span>&copy; <?php echo date('Y'); ?> MEX Group. <?php echo pm_h($t['footer']); ?></span></div></div></footer>
<script>
(function(){
  var b=document.getElementById('mex-lang-trigger'),d=document.getElementById('mex-lang-dropdown'); if(b&&d){b.addEventListener('click',function(e){e.stopPropagation();d.classList.toggle('is-open');});document.addEventListener('click',function(){d.classList.remove('is-open');});}
  var hb=document.getElementById('mex-hamburger'),nav=document.querySelector('.mex-header-nav'); if(hb&&nav){hb.addEventListener('click',function(){nav.classList.toggle('is-open');hb.classList.toggle('is-active');});}
  var symbols=<?php echo json_encode($symbols, JSON_UNESCAPED_SLASHES); ?>;
  var TXT=<?php echo json_encode(['live'=>$t['live'],'delayed'=>$t['delayed'],'unavailable'=>$t['unavailable']], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); ?>;
  fetch('/api/public_prices.php?symbols='+encodeURIComponent(symbols.join(',')),{headers:{Accept:'application/json'}}).then(function(r){return r.ok?r.json():null}).then(function(data){
    if(!data||!Array.isArray(data.items)) return; data.items.forEach(function(q){var s=String(q.symbol||'').toUpperCase();var p=Number(q.price||0);document.querySelectorAll('[data-price-symbol="'+s+'"]').forEach(function(el){el.textContent=p>0?(p>=1000?'$'+p.toLocaleString(undefined,{maximumFractionDigits:2}):'$'+p.toFixed(p>=1?4:6)):'--';});document.querySelectorAll('[data-status-symbol="'+s+'"]').forEach(function(el){el.textContent=p>0?(q.is_stale?TXT.delayed:TXT.live):TXT.unavailable;el.className=p>0?(q.is_stale?'is-delayed':'is-live'):'is-off';});});
  }).catch(function(){});
})();
</script>
</body></html>
