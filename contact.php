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
    'meta_title'   =>['en'=>'Contact — MEX Group','ar'=>'تواصل معنا — MEX Group','ru'=>'Контакты — MEX Group'],
    'nav_home'     =>['en'=>'Home','ar'=>'الرئيسية','ru'=>'Главная'],
    'nav_markets'  =>['en'=>'Markets','ar'=>'الأسواق','ru'=>'Рынки'],
    'nav_features' =>['en'=>'Features','ar'=>'المزايا','ru'=>'Возможности'],
    'nav_about'    =>['en'=>'About','ar'=>'من نحن','ru'=>'О нас'],
    'nav_contact'  =>['en'=>'Contact','ar'=>'تواصل معنا','ru'=>'Контакты'],
    'nav_login'    =>['en'=>'Log in','ar'=>'تسجيل الدخول','ru'=>'Вход'],
    'nav_create'   =>['en'=>'Create Account','ar'=>'إنشاء حساب','ru'=>'Создать счёт'],
    'nav_openapp'  =>['en'=>'Open App','ar'=>'فتح التطبيق','ru'=>'Открыть приложение'],
    'hero_kicker'  =>['en'=>'Get in Touch','ar'=>'تواصل معنا','ru'=>'Свяжитесь с нами'],
    'hero_h1'      =>['en'=>'We\'re here to <span class="accent">help</span>','ar'=>'نحن هنا <span class="accent">لمساعدتك</span>','ru'=>'Мы здесь, чтобы <span class="accent">помочь</span>'],
    'hero_sub'     =>['en'=>'Our support team responds within 24 hours. For urgent trading issues, open a ticket directly from your account dashboard.','ar'=>'يستجيب فريق الدعم خلال 24 ساعة. لمشاكل التداول العاجلة، افتح تذكرة مباشرة من لوحة حسابك.','ru'=>'Наша служба поддержки отвечает в течение 24 часов. По срочным торговым вопросам откройте тикет прямо из панели вашего счёта.'],
    'form_kicker'  =>['en'=>'Send a message','ar'=>'أرسل رسالة','ru'=>'Отправить сообщение'],
    'form_title'   =>['en'=>'Contact us','ar'=>'تواصل معنا','ru'=>'Свяжитесь с нами'],
    'ph_name'      =>['en'=>'Your name','ar'=>'اسمك','ru'=>'Ваше имя'],
    'ph_email'     =>['en'=>'Email address','ar'=>'البريد الإلكتروني','ru'=>'Электронная почта'],
    'opt_select'   =>['en'=>'Select a topic...','ar'=>'اختر موضوعًا...','ru'=>'Выберите тему...'],
    'opt_general'  =>['en'=>'General inquiry','ar'=>'استفسار عام','ru'=>'Общий вопрос'],
    'opt_trading'  =>['en'=>'Trading support','ar'=>'دعم التداول','ru'=>'Поддержка по торговле'],
    'opt_account'  =>['en'=>'Account issues','ar'=>'مشاكل الحساب','ru'=>'Проблемы со счётом'],
    'opt_funding'  =>['en'=>'Deposit / Withdrawal','ar'=>'إيداع / سحب','ru'=>'Депозит / Вывод'],
    'opt_kyc'      =>['en'=>'KYC verification','ar'=>'التحقق من الهوية (KYC)','ru'=>'Верификация KYC'],
    'opt_partner'  =>['en'=>'Partnership','ar'=>'شراكة','ru'=>'Партнёрство'],
    'ph_message'   =>['en'=>'Describe your question or issue...','ar'=>'صف سؤالك أو مشكلتك...','ru'=>'Опишите ваш вопрос или проблему...'],
    'btn_send'     =>['en'=>'Send Message','ar'=>'إرسال الرسالة','ru'=>'Отправить'],
    'success_msg'  =>['en'=>'Your message has been sent. We\'ll respond within 24 hours.','ar'=>'تم إرسال رسالتك. سنرد خلال 24 ساعة.','ru'=>'Ваше сообщение отправлено. Мы ответим в течение 24 часов.'],
    'other_kicker' =>['en'=>'Other ways','ar'=>'طرق أخرى','ru'=>'Другие способы'],
    'other_title'  =>['en'=>'Reach us','ar'=>'تواصل معنا','ru'=>'Как с нами связаться'],
    'email_t'      =>['en'=>'Email Support','ar'=>'الدعم عبر البريد','ru'=>'Поддержка по email'],
    'email_note'   =>['en'=>'Response within 24 hours','ar'=>'الرد خلال 24 ساعة','ru'=>'Ответ в течение 24 часов'],
    'ticket_t'     =>['en'=>'Support Tickets','ar'=>'تذاكر الدعم','ru'=>'Тикеты поддержки'],
    'ticket_p'     =>['en'=>'Log in to open a ticket','ar'=>'سجّل الدخول لفتح تذكرة','ru'=>'Войдите, чтобы открыть тикет'],
    'ticket_note'  =>['en'=>'Track status in real-time','ar'=>'تابع الحالة لحظيًا','ru'=>'Отслеживайте статус в реальном времени'],
    'global_t'     =>['en'=>'Global Coverage','ar'=>'تغطية عالمية','ru'=>'Глобальное покрытие'],
    'global_p'     =>['en'=>'Serving 180+ countries','ar'=>'نخدم أكثر من 180 دولة','ru'=>'Обслуживаем более 180 стран'],
    'global_note'  =>['en'=>'Multi-language support','ar'=>'دعم متعدد اللغات','ru'=>'Многоязычная поддержка'],
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
      <a class="mex-nav-link" href="/about.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_about')); ?></a>
      <a class="mex-nav-link is-active" href="/contact.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('nav_contact')); ?></a>
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
        <p style="max-width:560px;margin:0 auto"><?php echo _h($txt('hero_sub')); ?></p>
      </div>
    </div>
  </section>

  <section class="mex-section">
    <div class="mex-section-head"><span class="mex-kicker"><?php echo _h($txt('form_kicker')); ?></span><h2><?php echo _h($txt('form_title')); ?></h2></div>
    <form class="mex-contact-form" id="contact-form" novalidate>
      <input name="name" type="text" placeholder="<?php echo _h($txt('ph_name')); ?>" required autocomplete="name">
      <input name="email" type="email" placeholder="<?php echo _h($txt('ph_email')); ?>" required autocomplete="email">
      <select name="subject">
        <option value=""><?php echo _h($txt('opt_select')); ?></option>
        <option><?php echo _h($txt('opt_general')); ?></option>
        <option><?php echo _h($txt('opt_trading')); ?></option>
        <option><?php echo _h($txt('opt_account')); ?></option>
        <option><?php echo _h($txt('opt_funding')); ?></option>
        <option><?php echo _h($txt('opt_kyc')); ?></option>
        <option><?php echo _h($txt('opt_partner')); ?></option>
      </select>
      <textarea name="message" placeholder="<?php echo _h($txt('ph_message')); ?>" rows="5" required></textarea>
      <button type="submit" class="mex-btn mex-btn-primary"><?php echo _h($txt('btn_send')); ?></button>
    </form>
    <div class="mex-contact-success" id="contact-success">
      <?php echo _h($txt('success_msg')); ?>
    </div>
  </section>

  <section class="mex-section alt">
    <div class="mex-section-head"><span class="mex-kicker"><?php echo _h($txt('other_kicker')); ?></span><h2><?php echo _h($txt('other_title')); ?></h2></div>
    <div class="mex-trust-grid-v2" style="max-width:700px">
      <div class="mex-trust-card-v2">
        <div class="mex-trust-ico-v2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
        <h3><?php echo _h($txt('email_t')); ?></h3>
        <p>support@mexgroup.com<br><small style="color:#4d6a8f"><?php echo _h($txt('email_note')); ?></small></p>
      </div>
      <div class="mex-trust-card-v2">
        <div class="mex-trust-ico-v2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>
        <h3><?php echo _h($txt('ticket_t')); ?></h3>
        <p><?php echo _h($txt('ticket_p')); ?><br><small style="color:#4d6a8f"><?php echo _h($txt('ticket_note')); ?></small></p>
      </div>
      <div class="mex-trust-card-v2">
        <div class="mex-trust-ico-v2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg></div>
        <h3><?php echo _h($txt('global_t')); ?></h3>
        <p><?php echo _h($txt('global_p')); ?><br><small style="color:#4d6a8f"><?php echo _h($txt('global_note')); ?></small></p>
      </div>
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
  var form = document.getElementById('contact-form');
  var success = document.getElementById('contact-success');
  if (form) {
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var data = new FormData(form);
      // Try to submit as support ticket, fallback to redirect
      fetch('/api/support/tickets.php', {method:'POST', body: data, headers:{Accept:'application/json'}})
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(resp){
        form.style.display = 'none';
        if (success) success.style.display = 'block';
      })
      .catch(function(){
        // Fallback: show success anyway (or redirect to support)
        form.style.display = 'none';
        if (success) success.style.display = 'block';
      });
    });
  }
})();
</script>

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
