<?php
declare(strict_types=1);
require_once __DIR__ . '/site_bootstrap.php';

$lang = 'en';
$rtl = false;
try {
  require_once __DIR__ . '/includes/shared/site-helpers.php';
  $lang = site_locale();
  $rtl = site_is_rtl($lang);
} catch (Throwable $e) {
  $l = strtolower((string)($_GET['lang'] ?? $_COOKIE['vp_lang'] ?? 'en'));
  $lang = in_array($l, ['en','ar','ru','tr','fr','de','es','it','pt','nl','pl','zh','ja','ko','vi'], true) ? $l : 'en';
  $rtl = $lang === 'ar';
}

$isLoggedIn = false;
try { $isLoggedIn = session_user_id() > 0; } catch (Throwable $e) { $isLoggedIn = false; }

function _h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

// Simple copy for index without full helper system
$txt = function(string $key) use($lang): string {
  $t = [
    'hero_kicker'=>['en'=>'MEX GROUP TRADING DESK','ar'=>'مكتب تداول MEX GROUP','ru'=>'ТОРГОВЫЙ СТОЛ','tr'=>'MEX GROUP TİCARET','fr'=>'BUREAU','de'=>'MEX GROUP TRADING','es'=>'ESCRITORIO','it'=>'DESK','pt'=>'MESA','nl'=>'HANDELSPLATFORM','pl'=>'STANOWISKO','zh'=>'MEX GROUP 交易台','ja'=>'トレーディングデスク','ko'=>'트레이딩 데스크','vi'=>'BÀN GIAO DỊCH'],
    'hero_title_1'=>['en'=>'Trade','ar'=>'تداول','ru'=>'Торгуйте','tr'=>'Ticaret','fr'=>'Tradez','de'=>'Handeln','es'=>'Opere','it'=>'Fai','pt'=>'Negocie','nl'=>'Handel','pl'=>'Handluj','zh'=>'交易','ja'=>'取引','ko'=>'거래','vi'=>'Giao dịch'],
    'hero_title_2'=>['en'=>'Global Markets','ar'=>'الأسواق العالمية','ru'=>'глобальными','tr'=>'Küresel','fr'=>'Marchés','de'=>'Globale','es'=>'Mercados','it'=>'Mercati','pt'=>'Mercados','nl'=>'Wereldmarkten','pl'=>'Na Rynkach','zh'=>'全球市场','ja'=>'グローバル市場','ko'=>'글로벌','vi'=>'Thị Trường'],
    'hero_title_3'=>['en'=>'From One Account','ar'=>'من حساب واحد','ru'=>'Из одного','tr'=>'tek','fr'=>'depuis un','de'=>'Mit einem','es'=>'desde una','it'=>'da un','pt'=>'de uma','nl'=>'uit één','pl'=>'z jednego','zh'=>'一个账户','ja'=>'一つで全て','ko'=>'하나의','vi'=>'Từ Một'],
    'hero_subtitle'=>['en'=>'Access 70+ instruments across crypto, forex, stocks, and commodities with professional charts, instant execution, and institutional-grade security. Start with a free demo.','ar'=>'وصول لـ 70+ أداة عبر الكريبتو والفوركس مع شارت احترافي وأمان بمستوى مؤسسي. ابدأ بديمو مجاني.','ru'=>'Доступ к 70+ инструментов крипто, форекс, акций с профессиональными графиками. Начните с бесплатного демо.','tr'=>'Kripto, forex, emtialar arasında 70+ enstrümana profesyonel grafiklerle erişin. Ücretsiz demo ile başlayın.','fr'=>'Accédez à 70+ instruments crypto, forex avec graphiques professionnels. Commencez par un essai gratuit.','de'=>'Greifen Sie auf 70+ Instrumente zu mit professionellen Charts. Starten Sie kostenlos.','es'=>'Accede a 70+ instrumentos con gráficos profesionales. Empieza con demo gratis.','it'=>'Accedi a 70+ strumenti con grafici professionali. Inizia con una demo gratuita.','pt'=>'Acesse 70+ instrumentos com gráficos profissionais. Comece com demo grátis.','nl'=>'Toegang tot 70+ instrumenten met professionele grafieken. Start gratis met een demo.','pl'=>'Dostęp do 70+ instrumentów z profesjonalnymi wykresami. Zacznij od darmowego dema.','zh'=>'通过专业图表访问加密、外汇等 70 多种工具。从免费模拟开始。','ja'=>'プロフェッショナルチャートで70以上の銘柄にアクセス。無料デモから開始。','ko'=>'전문 차트로 70개 이상 상품에 접근하세요. 무료 데모로 시작하세요.','vi'=>'Truy cập 70+ công cụ với biểu đồ chuyên nghiệp. Bắt đầu bằng tài khoản demo miễn phí.'],
    'hero_cta_primary'=>['en'=>'Start trading','ar'=>'ابدأ التداول','ru'=>'Начать','tr'=>'Başla','fr'=>'Commencer','de'=>'Jetzt traden','es'=>'Empieza','it'=>'Inizia','pt'=>'Comece','nl'=>'Start','pl'=>'Zacznij','zh'=>'开始交易','ja'=>'開始','ko'=>'거래 시작','vi'=>'Bắt đầu'],
    'hero_cta_secondary'=>['en'=>'View platform','ar'=>'شاهد المنصة','ru'=>'Посмотреть','tr'=>'Gör','fr'=>'Voir','de'=>'Plattform','es'=>'Ver','it'=>'Vedi','pt'=>'Ver','nl'=>'Bekijk','pl'=>'Zobacz','zh'=>'浏览平台','ja'=>'プラットフォーム','ko'=>'플랫폼','vi'=>'Xem nền tảng'],
    'markets_live'=>['en'=>'Live Prices','ar'=>'أسعار مباشرة','ru'=>'Цены','tr'=>'Canlı','fr'=>'Prix','de'=>'Kurse','es'=>'Precios','it'=>'Prezzi','pt'=>'Preços','nl'=>'Koersen','pl'=>'Ceny','zh'=>'实时价格','ja'=>'ライブ相場','ko'=>'실시간 가격','vi'=>'Giá trực tiếp'],
    'markets_sub'=>['en'=>'Real-time and delayed quotes from our multi-provider engine. Auto-refreshing every 15 seconds.','ar'=>'أسعار مباشرة من محرك متعدد المزودين. تحديث كل 15 ثانية.','ru'=>'Котировки от многоуровневой системы. Обновление каждые 15 сек.','tr'=>'Çoklu sağlayıcı motorumuzdan canlı kotasyonlar. Her 15 saniyede.','fr'=>'Devis en direct de notre moteur multi-fournisseurs. Auto toutes les 15s.','de'=>'Echtzeitkurse von unserem Multi-Provider. Alle 15 Sekunden.','es'=>'Cotizaciones de nuestro motor multi-proveedor. Auto cada 15s.','it'=>'Quotazioni in tempo reale dal motore multi-provider. Ogni 15s.','pt'=>'Cotações de nosso motor multi-provedor. A cada 15s.','nl'=>'Koersen van multiprovider. Elke 15 sec.','pl'=>'Kursy z wielodostawczego silnika. Co 15 sek.','zh'=>'来自多提供商引擎的实时报价。每15秒自动刷新。','ja'=>'マルチプロバイダーエンジンからのライブ相場。15秒ごとに自動更新。','ko'=>'다중 공급자 엔진의 실시간 호가. 15초마다 갱신.','vi'=>'Từ động cơ đa nhà cung cấp. Tự động mỗi 15 giây.'],
    'update'=>['en'=>'Updated','ar'=>'آخر تحديث','ru'=>'Обновлено','tr'=>'Güncellendi','fr'=>'Mis à jour','de'=>'Aktualisiert','es'=>'Actualizado','it'=>'Aggiornato','pt'=>'Atualizado','nl'=>'Geüpdatet','pl'=>'Zaktualizowano','zh'=>'更新于','ja'=>'更新','ko'=>'업데이트','vi'=>'Cập nhật'],
    'sec'=>['en'=>'seconds ago','ar'=>'ثانية مضت','ru'=>'сек. назад','tr'=>'sn önce','fr'=>'secondes','de'=>'Sek.','es'=>'segundos','it'=>'secondi','pt'=>'segundos','nl'=>'sec.','pl'=>'sek. temu','zh'=>'秒前','ja'=>'秒前','ko'=>'초 전','vi'=>'giây trước'],
    'trust_title'=>['en'=>'Why MEX Group','ar'=>'لماذا MEX','ru'=>'Почему MEX','tr'=>'Neden','fr'=>'Pourquoi','de'=>'Warum','es'=>'¿Por qué?','it'=>'Perché','pt'=>'Por que','nl'=>'Waarom MEX','pl'=>'Dlaczego','zh'=>'为何选择 MEX','ja'=>'なぜMEX？','ko'=>'왜 MEX?','vi'=>'Tại sao MEX?'],
    'multi'=>['en'=>'Multi-asset','ar'=>'تعدد الأصول','ru'=>'Мультиактив','tr'=>'Çoklu','fr'=>'Multi-actif','de'=>'Multi-Asset','es'=>'Multi-activo','it'=>'Multi-asset','pt'=>'Multiativo','nl'=>'Multi-asset','pl'=>'Wieloaktywowa','zh'=>'多资产','ja'=>'マルチアセット','ko'=>'다중자산','vi'=>'Đa tài sản'],
    'multi_text'=>['en'=>'Crypto, forex, stocks, commodities — all from one account.','ar'=>'كريبتو، فوركس، أسهم، سلع — كلها من حساب واحد.','ru'=>'Крипта, форекс, акции, товары — всё из одного счёта.','tr'=>'Kripto, forex, hisse, emtialar — hepsi tek hesaptan.','fr'=>'Crypto, forex, actions, matières — tout depuis un compte.','de'=>'Krypto, Forex, Aktien, Rohstoffe — alles von einem Konto.','es'=>'Cripto, forex, acciones, materias — todo desde una cuenta.','it'=>'Cripto, forex, azioni, materie — tutto da un conto.','pt'=>'Cripto, forex, ações, commodities — tudo de uma conta.','nl'=>'Crypto, forex, aandelen, grondstoffen — van één account.','pl'=>'Krypto, forex, akcje, surowce — wszystko z jednego konta.','zh'=>'加密货币、外汇、股票、商品——全部来自一个账户。','ja'=>'暗号通貨、為替、株式、商品 — 一つの口座で全て。','ko'=>'암호화폐, 외환, 주식, 원자재 — 모두 하나의 계정에서.','vi'=>'Tiền mã hóa, ngoại hối, cổ phiếu, hàng hóa — tất cả từ một tài khoản.'],
    'pricing'=>['en'=>'Transparent Pricing','ar'=>'تسعير شفاف','ru'=>'Прозрачность','tr'=>'Şeffaf','fr'=>'Prix ','de'=>'Transparente','es'=>'Precios ','it'=>'Prezzi ','pt'=>'Preços ','nl'=>'Transparante','pl'=>'Przezroczyste','zh'=>'透明定价','ja'=>'透明な価格','ko'=>'투명한 가격','vi'=>'Minh bạch'],
    'pricing_text'=>['en'=>'Live quotes from multiple providers with clear source labels and price age indicators.','ar'=>'أسعار من مزودين متعددين مع تسمية المصدر ومؤشر عمر السعر.','ru'=>'Прямые котировки от нескольких провайдеров с ясными метками источника.','tr'=>'Birden fazla sağlayıcıdan canlı kotasyonlar, net kaynak etiketleri.','fr'=>'Devis temps réel de plusieurs fournisseurs avec étiquettes de source.','de'=>'Echtzeitkurse von mehreren Anbietern mit klaren Quellenlabels.','es'=>'Cotizaciones en vivo de varios proveedores con etiquetas de fuente.','it'=>'Quotazioni in tempo reale da più provider con etichette fonte.','pt'=>'Cotações ao vivo de vários provedores com etiquetas de origem.','nl'=>'Livekoersen van meerdere providers met bronlabels.','pl'=>'Kursy na żywo od wielu dostawców z jasnymi etykietami źródeł.','zh'=>'多个提供商的实时报价，带有清晰的来源标签。','ja'=>'複数プロバイダーからのライブ相場、明確なソースラベル付き。','ko'=>'여러 공급자의 실시간 호가, 출처 라벨.','vi'=>'Báo giá trực tiếp từ nhiều nhà cung cấp với nhãn nguồn rõ ràng.'],
    'secure'=>['en'=>'Institutional Security','ar'=>'أمان مؤسسي','ru'=>'Безопасность','tr'=>'Kurumsal','fr'=>'Sécurité','de'=>'Institutionelle','es'=>'Seguridad','it'=>'Sicurezza','pt'=>'Segurança','nl'=>'Institutionele','pl'=>'Bezpieczeństwo','zh'=>'机构级安全','ja'=>'機関レベル','ko'=>'기관 수준','vi'=>'Bảo mật tổ chức'],
    'secure_text'=>['en'=>'KYC verification, protected sessions, and manual funding review.','ar'=>'تحقق KYC، جلسات محمية، مراجعة يدوية.','ru'=>'Верификация KYC, защищённые сессии и ручная проверка средств.','tr'=>'KYC doğrulama, korumalı oturumlar ve manuel fon incelemesi.','fr'=>'Vérification KYC, sessions protégées et examen manuel des fonds.','de'=>'KYC-Verifizierung, geschützte Sitzungen und manuelle Prüfung.','es'=>'Verificación KYC, sesiones protegidas y revisión manual de fondos.','it'=>'Verifica KYC, sessioni protette, controllo manuale dei fondi.','pt'=>'Verificação KYC, sessões protegidas e revisão manual de fundos.','nl'=>'KYC-verificatie, beveiligde sessies en handmatige review.','pl'=>'Weryfikacja KYC, chronione sesje, szyfrowana komunikacja.','zh'=>'KYC验证、受保护会话和人工资金审核。','ja'=>'KYC認証、保護されたセッション、手動資金審査。','ko'=>'KYC 인증, 보호된 세션, 수동 자금 검토.','vi'=>'Xác minh KYC, phiên bảo vệ, giao tiếp mã hóa.'],
    'copy'=>['en'=>'Copy Trading','ar'=>'نسخ الصفقات','ru'=>'Копирование','tr'=>'Kopyalama','fr'=>'Copier','de'=>'Kopierhandel','es'=>'Copiar','it'=>'Copy Trading','pt'=>'Copy','nl'=>'Copy','pl'=>'Copy Trading','zh'=>'跟单交易','ja'=>'コピー','ko'=>'자동 복제','vi'=>'Sao chép'],
    'copy_text'=>['en'=>'Follow verified signal providers with transparent performance metrics.','ar'=>'تابع مزودي إشارات موثقين بمقاييس أداء شفافة.','ru'=>'Следите за подтверждёнными поставщиками сигналов с прозрачными показателями.','tr'=>'Doğrulanmış sinyal sağlayıcılarını şeffaf metriklerle takip edin.','fr'=>'Suivez des fournisseurs de signaux vérifiés avec indicateurs transparents.','de'=>'Folgen Sie verifizierten Signalgebern mit transparenten Leistungskennzahlen.','es'=>'Siga proveedores de señales verificados con métricas transparentes.','it'=>'Segui provider di segnali verificati con metriche trasparenti.','pt'=>'Siga provedores de sinais verificados com métricas transparentes.','nl'=>'Volg geverifieerde signalen met transparante prestaties.','pl'=>'Śledź zweryfikowanych dostawców sygnałów z transparentnymi wskaźnikami.','zh'=>'通过透明的绩效指标跟踪经过验证的信号提供商。','ja'=>'透明なパフォーマンス指標で検証済みのシグナル提供業者をフォロー。','ko'=>'투명한 성능 지표로 검증된 시그널 공급자를 팔로우하세요.','vi'=>'Theo dõi nhà cung cấp tín hiệu đã xác minh với chỉ số hiệu suất minh bạch.'],
    'cta_title'=>['en'=>'Ready to start?','ar'=>'مستعد تبدأ؟','ru'=>'Готовы?','tr'=>'Hazır mısın?','fr'=>'Prêt?','de'=>'Bereit?','es'=>'¿Listo?','it'=>'Pronto?','pt'=>'Pronto?','nl'=>'Klaar?','pl'=>'Gotowy?','zh'=>'准备好了吗？','ja'=>'準備はできましたか？','ko'=>'준비되셨나요?','vi'=>'Sẵn sàng?'],
    'cta_sub'=>['en'=>'Open your MEX Group account in minutes.','ar'=>'افتح حساب MEX Group في دقائق.','ru'=>'Откройте счёт MEX за несколько минут.','tr'=>'Dakikalar içinde hesabınızı açın.','fr'=>'Ouvrez votre compte MEX Group en minutes.','de'=>'Eröffnen Sie Ihr Konto in Minuten.','es'=>'Abre tu cuenta MEX en minutos.','it'=>'Apri il tuo conto MEX in pochi minuti.','pt'=>'Abra sua conta MEXGroup em minutos.','nl'=>'Open uw account in enkele minuten.','pl'=>'Otwórz konto MEX w kilka minut.','zh'=>'在几分钟内开设您的账户。','ja'=>'数分でアカウントを開設。','ko'=>'몇 분 만에 계정을 개설하세요.','vi'=>'Mở tài khoản MEX Group trong vài phút.'],
    'cta_btn'=>['en'=>'Create free account','ar'=>'إنشاء حساب مجاني','ru'=>'Создать','tr'=>'Ücretsiz','fr'=>'Créer','de'=>'Kostenlos','es'=>'Crear','it'=>'Crea account','pt'=>'Criar conta','nl'=>'Gratis','pl'=>'Załóż konto','zh'=>'创建免费账户','ja'=>'無料アカウント','ko'=>'무료 계정','vi'=>'Tạo tài khoản'],
    'footer_desc'=>['en'=>'Professional multi-asset trading platform with transparent pricing.','ar'=>'منصة تداول احترافية متعددة بتسعير شفاف.','ru'=>'Профессиональная мультиактивная платформа с прозрачным ценообразованием.','tr'=>'Profesyonel çoklu varlık ticaret platformu.','fr'=>'Plateforme multi-actif avec prix transparents.','de'=>'Professionelle Multi-Asset-Plattform mit transparenten Preisen.','es'=>'Plataforma multi-activo con precios transparentes.','it'=>'Piattaforma multi-asset con prezzi trasparenti.','pt'=>'Plataforma multiativo com preços transparentes.','nl'=>'Professioneel multi-asset platform met transparante prijzen.','pl'=>'Profesjonalna platforma wieloaktywowa z transparentnymi cenami.','zh'=>'专业的多资产交易平台，提供透明定价。','ja'=>'透明な価格設定のプロフェッショナルな複合資産取引プラットフォーム。','ko'=>'전문 다중 자산 거래 플랫폼, 투명한 가격 책정.','vi'=>'Nền tảng giao dịch đa tài sản chuyên nghiệp với định giá minh bạch.'],
    'footer_disclaimer'=>['en'=>'Trading involves significant risk. Past performance does not guarantee future results.','ar'=>'التداول يحتوي على مخاطر. الأداء السابق لا يضمن النتائج.','ru'=>'Торговля связана с рисками. Прошлые результаты не гарантируют будущего.','tr'=>'Ticaret ciddi risk içerir. Geçmiş performans gelecek sonuçları garanti etmez.','fr'=>'Le trading comporte des risques. La performance passée ne garantit pas les résultats futurs.','de'=>'Der Handel birgt Risiken. Die bisherige Leistung garantiert keine Zukunft.','es'=>'El trading conlleva riesgos. El rendimiento pasado no garantiza resultados futuros.','it'=>'Il trading comporta rischi. Le performance passate non garantiscono risultati futuri.','pt'=>'A negociação envolve riscos. O desempenho passado não garante resultados futuros.','nl'=>'Trading brengt risico s met zich mee. Eerdere prestaties garanderen niet de toekomst.','pl'=>'Handel wiąże się z ryzykiem. Wyniki z przeszłości nie gwarantują przyszłości.','zh'=>'交易涉及重大风险。过去的业绩不能保证未来的结果。','ja'=>'取引には大きな損失リスクがあります。過去の業績は将来の結果を保証しません。','ko'=>'거래에는 상당한 손실 위험이 있습니다. 과거 성과가 미래 결과를 보장하지는 않습니다.','vi'=>'Giao dịch này có rủi ro lớn. Kết quả trong quá khứ không đảm bảo tương lai.'],
  ];
  return $t[$key][$lang] ?? $t[$key]['en'] ?? $key;
};

$tickerSymbols = [
  ['BTCUSDT','crypto'],['ETHUSDT','crypto'],['BNBUSDT','crypto'],['SOLUSDT','crypto'],
  ['EURUSD','forex'],['GBPUSD','forex'],['USDJPY','forex'],['XAUUSD','commodities'],
  ['AAPL','stocks'],['TSLA','stocks'],['NVDA','stocks'],
  ['USOIL','commodities'],['NATGAS','commodities'],
];
?>
<!doctype html>
<html lang="<?php echo _h($lang); ?>" dir="<?php echo $rtl ? 'rtl' : 'ltr'; ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#060b18">
  <meta name="description" content="MEX Group — Professional multi-asset trading platform for crypto, forex, stocks, commodities, copy trading.">
  <title>MEX Group | Trading Platform</title>
  <link rel="stylesheet" href="/assets/css/public-site.css?v=<?php echo @filemtime(__DIR__ . '/assets/css/public-site.css') ?: time(); ?>">
</head>
<body class="mex-landing-page <?php echo $rtl ? 'is-rtl' : ''; ?>">

  <!-- Header -->
  <header class="mex-header" id="mex-header">
    <div class="mex-header-inner">
      <a class="mex-logo" href="/?lang=<?php echo _h($lang); ?>" aria-label="MEX Group">
        <img src="/assets/img/mexgroup_logo.svg" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">
        <span class="mex-logo-fallback">MX</span>
        <strong>MEX Group</strong>
      </a>
      <nav class="mex-header-nav" aria-label="Main">
        <a class="mex-nav-link is-active" href="/?lang=<?php echo _h($lang); ?>">Home</a>
        <a class="mex-nav-link" href="/markets.php?lang=<?php echo _h($lang); ?>">Markets</a>
        <a class="mex-nav-link" href="/features.php?lang=<?php echo _h($lang); ?>">Features</a>
        <a class="mex-nav-link" href="/about.php?lang=<?php echo _h($lang); ?>">About</a>
        <a class="mex-nav-link" href="/contact.php?lang=<?php echo _h($lang); ?>">Contact</a>
      </nav>
      <div class="mex-header-actions">
        <!-- Language Switcher -->
        <div class="mex-lang-wrap">
          <button class="mex-lang-btn" id="mex-lang-trigger" aria-haspopup="listbox" aria-expanded="false">
            <span class="mex-lang-current"><?php echo strtoupper(_h($lang)); ?></span>
            <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
          <div class="mex-lang-dropdown" id="mex-lang-dropdown" role="listbox">
            <?php $langs=['en'=>'English','ar'=>'العربية','ru'=>'Русский','tr'=>'Türkçe','fr'=>'Français','de'=>'Deutsch','es'=>'Español','it'=>'Italiano','pt'=>'Português','nl'=>'Nederlands','pl'=>'Polski','zh'=>'中文','ja'=>'日本語','ko'=>'한국어','vi'=>'Tiếng Việt']; foreach($langs as $c=>$name): ?>
              <a class="mex-lang-opt<?php echo $c===$lang?' is-active':''; ?>" href="?lang=<?php echo _h($c); ?>"><?php echo _h($name); ?></a>
            <?php endforeach; ?>
          </div>
        </div>

        <?php if ($isLoggedIn): ?>
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

  <!-- Hero -->
  <section class="mex-hero-v2">
    <div class="mex-hero-grid">
      <div class="mex-hero-text">
        <span class="mex-kicker"><?php echo _h($txt('hero_kicker')); ?></span>
        <h1><span class="accent"><?php echo _h($txt('hero_title_1')); ?></span> <?php echo _h($txt('hero_title_2')); ?><br><?php echo _h($txt('hero_title_3')); ?></h1>
        <p><?php echo _h($txt('hero_subtitle')); ?></p>
        <div class="mex-hero-actions">
          <a class="mex-btn mex-btn-primary" href="<?php echo $isLoggedIn ? '/app.php#/trade' : '/register.php?lang=' . _h($lang) . '&next=' . rawurlencode('/app.php#/trade'); ?>"><?php echo _h($txt('hero_cta_primary')); ?></a>
          <a class="mex-btn mex-btn-soft" href="/features.php?lang=<?php echo _h($lang); ?>"><?php echo _h($txt('hero_cta_secondary')); ?></a>
        </div>
        <div class="mex-hero-stats-v2">
          <div class="mex-hero-stat"><strong>70+</strong><span>Instruments</span></div>
          <div class="mex-hero-stat"><strong>99.9%</strong><span>Uptime</span></div>
          <div class="mex-hero-stat"><strong>180+</strong><span>Countries</span></div>
        </div>
      </div>
      <div class="mex-hero-terminal" aria-label="Market terminal preview">
        <div class="mex-terminal-top"><span></span><span></span><span></span><strong>MEX Group Desk</strong></div>
        <div class="mex-terminal-chart">
          <i style="height:38%"></i><i style="height:52%"></i><i style="height:46%"></i><i style="height:67%"></i><i style="height:58%"></i><i style="height:74%"></i><i style="height:61%"></i><i style="height:82%"></i><i style="height:78%"></i><i style="height:70%"></i><i style="height:84%"></i><i style="height:76%"></i>
        </div>
        <div class="mex-terminal-row"><span>BTCUSDT</span><strong data-price-symbol="BTCUSDT">--</strong><em>LIVE</em></div>
        <div class="mex-terminal-row"><span>EURUSD</span><strong data-price-symbol="EURUSD">--</strong><em>FX</em></div>
        <div class="mex-terminal-row"><span>XAUUSD</span><strong data-price-symbol="XAUUSD">--</strong><em>Metals</em></div>
      </div>
    </div>
  </section>

  <!-- Live Ticker Strip -->
  <div class="mex-ticker-strip" id="ticker-strip">
    <div class="mex-ticker-track">
      <div class="mex-ticker-items" id="ticker-items">
        <?php for($loop=0;$loop<3;$loop++): foreach($tickerSymbols as $ts): ?>
          <span class="mex-ticker-item" data-ticker-symbol="<?php echo _h($ts[0]); ?>">
            <b><?php echo _h($ts[0]); ?></b>
            <em class="mex-ticker-price" data-price-symbol="<?php echo _h($ts[0]); ?>">--</em>
            <i class="mex-ticker-change" data-change-symbol="<?php echo _h($ts[0]); ?>">0.00%</i>
          </span>
        <?php endforeach; endfor; ?>
      </div>
    </div>
  </div>

  <!-- Trust Section -->
  <section class="mex-section">
    <div class="mex-section-head">
      <span class="mex-kicker">MEX Group</span>
      <h2><?php echo _h($txt('trust_title')); ?></h2>
    </div>
    <div class="mex-trust-grid-v2">
      <div class="mex-trust-card-v2">
        <div class="mex-trust-ico-v2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg></div>
        <h3><?php echo _h($txt('multi')); ?></h3>
        <p><?php echo _h($txt('multi_text')); ?></p>
      </div>
      <div class="mex-trust-card-v2">
        <div class="mex-trust-ico-v2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
        <h3><?php echo _h($txt('pricing')); ?></h3>
        <p><?php echo _h($txt('pricing_text')); ?></p>
      </div>
      <div class="mex-trust-card-v2">
        <div class="mex-trust-ico-v2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div>
        <h3><?php echo _h($txt('secure')); ?></h3>
        <p><?php echo _h($txt('secure_text')); ?></p>
      </div>
      <div class="mex-trust-card-v2">
        <div class="mex-trust-ico-v2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div>
        <h3><?php echo _h($txt('copy')); ?></h3>
        <p><?php echo _h($txt('copy_text')); ?></p>
      </div>
    </div>
  </section>

  <!-- Live Markets -->
  <section class="mex-section alt" id="markets">
    <div class="mex-section-head">
      <span class="mex-kicker">Markets</span>
      <h2><?php echo _h($txt('markets_live')); ?></h2>
      <p><?php echo _h($txt('markets_sub')); ?></p>
    </div>
    <div class="mex-market-grid-v2">
      <?php foreach([['BTCUSDT','Bitcoin','crypto'],['ETHUSDT','Ethereum','crypto'],['EURUSD','Euro / Dollar','forex'],['GBPUSD','Pound / Dollar','forex'],['XAUUSD','Gold','commodities'],['AAPL','Apple Inc.','stocks']] as $m): ?>
        <div class="mex-market-card-v2">
          <div class="mc-top">
            <span class="mc-symbol"><?php echo _h($m[0]); ?></span>
            <span class="mc-badge"><?php echo _h(strtoupper($m[2])); ?></span>
          </div>
          <strong class="mc-price" data-price-symbol="<?php echo _h($m[0]); ?>">--</strong>
          <span class="mc-change" data-change-symbol="<?php echo _h($m[0]); ?>">0.00%</span>
          <span class="mc-name"><?php echo _h($m[1]); ?></span>
        </div>
      <?php endforeach; ?>
    </div>
    <p style="text-align:center;margin-top:24px"><small style="color:#5d7ea8;font-size:12px"><?php echo _h($txt('update')); ?>: <span id="price-age-sec">0</span> <?php echo _h($txt('sec')); ?></small></p>
  </section>

  <!-- CTA -->
  <section class="mex-cta-section">
    <span class="mex-kicker">MEX Group</span>
    <h2><?php echo _h($txt('cta_title')); ?></h2>
    <p><?php echo _h($txt('cta_sub')); ?></p>
    <div class="mex-cta-row">
      <a class="mex-btn mex-btn-primary" href="<?php echo $isLoggedIn ? '/app.php#/home' : '/register.php?lang=' . _h($lang); ?>"><?php echo _h($txt('cta_btn')); ?></a>
      <a class="mex-btn mex-btn-soft" href="/contact.php?lang=<?php echo _h($lang); ?>">Contact us</a>
    </div>
  </section>

  <!-- Footer -->
  <footer class="mex-footer">
    <div class="mex-footer-inner">
      <div class="mex-footer-main">
        <div class="mex-footer-brand">
          <a class="mex-footer-logo" href="/?lang=<?php echo _h($lang); ?>">
            <img src="/assets/img/mexgroup_logo.svg" alt="">
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
          <h4>Resources</h4>
          <a href="/app.php#/kyc">Verification</a>
          <a href="/app.php#/support">Support Center</a>
          <a href="#">API Docs</a>
        </div>
        <div class="mex-footer-col">
          <h4>Legal</h4>
          <a href="/legal.php?page=terms&lang=<?php echo _h($lang); ?>">Terms</a>
          <a href="/legal.php?page=privacy&lang=<?php echo _h($lang); ?>">Privacy</a>
          <a href="/legal.php?page=risk&lang=<?php echo _h($lang); ?>">Risk Disclosure</a>
        </div>
      </div>
      <div class="mex-footer-bottom">
        <span>&copy; <?php echo date('Y'); ?> MEX Group. <?php echo _h($txt('footer_disclaimer')); ?></span>
      </div>
    </div>
  </footer>

  <!-- Scripts -->
  <script>
  (function(){
    var lastPriceTime=0,secEl=document.getElementById('price-age-sec');
    setInterval(function(){if(lastPriceTime&&secEl)secEl.textContent=Math.round((Date.now()-lastPriceTime)/1000);},1000);
    function fmt(v){var n=Number(v);if(!isFinite(n)||n<=0)return'--';if(n>=1000)return'$'+n.toLocaleString(undefined,{maximumFractionDigits:2});if(n>=1)return'$'+n.toLocaleString(undefined,{maximumFractionDigits:4});return'$'+n.toLocaleString(undefined,{maximumFractionDigits:6});}
    function fetchPrices(){
      var symbols=Array.from(document.querySelectorAll('[data-price-symbol]')).map(function(el){return el.getAttribute('data-price-symbol');});
      symbols=Array.from(new Set(symbols.filter(Boolean)));
      if(!symbols.length)return;
      fetch('/api/quotes.php?symbols='+encodeURIComponent(symbols.join(','))+'&type=all&purpose=landing',{headers:{Accept:'application/json'}})
      .then(function(r){return r.ok?r.json():null;}).then(function(data){
        if(!data)return; lastPriceTime=Date.now();
        var quotes=data.quotes||data.data||data.items||[];
        if(!Array.isArray(quotes)&&typeof quotes==='object')quotes=Object.values(quotes);
        quotes.forEach(function(q){
          var sym=String(q.symbol||q.market||'').toUpperCase();
          var price=q.price||q.last||q.bid||q.close;
          var change=q.change_pct||q.changePercent||q.change||0;
          var c=Number(change);
          document.querySelectorAll('[data-price-symbol="'+sym+'"]').forEach(function(el){el.textContent=fmt(price);});
          document.querySelectorAll('[data-change-symbol="'+sym+'"]').forEach(function(el){el.textContent=isFinite(c)?((c>=0?'+':'')+c.toFixed(2)+'%'):'--';el.className=c<0?'mc-change down':'mc-change';});
          document.querySelectorAll('[data-ticker-symbol="'+sym+'"]').forEach(function(el){var pe=el.querySelector('.mex-ticker-price');var ce=el.querySelector('.mex-ticker-change');if(pe)pe.textContent=fmt(price);if(ce){ce.textContent=isFinite(c)?((c>=0?'+':'')+c.toFixed(2)+'%'):'';ce.className='mex-ticker-change '+(c<0?'down':'up');}});
        });
      }).catch(function(){});
    }
    fetchPrices();setInterval(fetchPrices,15000);
    // Lang dropdown
    var lb=document.getElementById('mex-lang-trigger'),ld=document.getElementById('mex-lang-dropdown');
    if(lb&&ld){lb.addEventListener('click',function(e){e.stopPropagation();var o=lb.getAttribute('aria-expanded')==='true';lb.setAttribute('aria-expanded',o?'false':'true');ld.classList.toggle('is-open',!o);});document.addEventListener('click',function(){lb.setAttribute('aria-expanded','false');ld.classList.remove('is-open');});ld.addEventListener('click',function(e){e.stopPropagation();});}
    // Mobile menu
    var h=document.getElementById('mex-hamburger'),n=document.querySelector('.mex-header-nav'),hdr=document.getElementById('mex-header');
    if(h&&n){h.addEventListener('click',function(){var o=h.getAttribute('aria-expanded')==='true';h.setAttribute('aria-expanded',o?'false':'true');n.classList.toggle('is-open',!o);h.classList.toggle('is-active',!o);});document.querySelectorAll('.mex-header-nav a').forEach(function(a){a.addEventListener('click',function(){h.setAttribute('aria-expanded','false');n.classList.remove('is-open');h.classList.remove('is-active');});});}
  })();
  </script>
</body>
</html>
