<?php
declare(strict_types=1);

function site_langs(): array
{
    return ['en', 'ar', 'ru', 'tr', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'pl', 'zh', 'ja', 'ko', 'vi'];
}

function site_lang_name(string $c): string
{
    $m = [
        'en' => 'English',
        'ar' => 'العربية',
        'ru' => 'Русский',
        'tr' => 'Türkçe',
        'fr' => 'Français',
        'de' => 'Deutsch',
        'es' => 'Español',
        'it' => 'Italiano',
        'pt' => 'Português',
        'nl' => 'Nederlands',
        'pl' => 'Polski',
        'zh' => '中文',
        'ja' => '日本語',
        'ko' => '한국어',
        'vi' => 'Tiếng Việt',
    ];
    return $m[$c] ?? strtoupper($c);
}

function site_is_rtl(string $c): bool
{
    return false;
}

function site_locale(): string
{
    $requested = strtolower(substr((string)($_GET['lang'] ?? ''), 0, 2));
    $cookie = strtolower(substr((string)($_COOKIE['vp_lang'] ?? ''), 0, 2));
    $explicit = (string)($_COOKIE['vp_lang_explicit'] ?? '') === '1';

    if ($requested !== '' && in_array($requested, site_langs(), true)) {
        setcookie('vp_lang', $requested, [
            'expires' => time() + 31536000,
            'path' => '/',
            'httponly' => false,
            'samesite' => 'Lax',
            'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        ]);
        setcookie('vp_lang_explicit', '1', [
            'expires' => time() + 31536000,
            'path' => '/',
            'httponly' => false,
            'samesite' => 'Lax',
            'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        ]);
        return $requested;
    }

    if ($explicit && $cookie !== '' && in_array($cookie, site_langs(), true)) {
        return $cookie;
    }

    return 'en';
}

function __e(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}

function site_t(string $key, string $lang = ''): string
{
    $l = $lang ?: site_locale();
    $texts = site_all_texts();
    return $texts[$key][$l] ?? $texts[$key]['en'] ?? $key;
}

function site_pair(string $en, string $ar): array
{
    $row = ['en' => $en, 'ar' => $ar];
    foreach (site_langs() as $lang) {
        if (!isset($row[$lang])) {
            $row[$lang] = $en;
        }
    }
    return $row;
}

function site_all_texts(): array
{
    static $texts = null;
    if ($texts !== null) {
        return $texts;
    }

    $pairs = [
        'brand' => ['MEX Group', 'MEX Group'],
        'login' => ['Log in', 'تسجيل الدخول'],
        'register' => ['Create Account', 'إنشاء حساب'],
        'dashboard' => ['Dashboard', 'لوحة التحكم'],
        'logout' => ['Log out', 'تسجيل الخروج'],
        'home' => ['Home', 'الرئيسية'],
        'about' => ['About', 'من نحن'],
        'markets' => ['Markets', 'الأسواق'],
        'features' => ['Features', 'المزايا'],
        'contact' => ['Contact', 'تواصل معنا'],
        'legal' => ['Legal', 'قانوني'],
        'support' => ['Support', 'الدعم'],
        'open_app' => ['Open App', 'فتح المنصة'],
        'lang' => ['Language', 'اللغة'],
        'hero_kicker' => ['MEX Group Trading Desk', 'مكتب تداول MEX Group'],
        'hero_title_1' => ['Trade', 'تداول'],
        'hero_title_2' => ['Global Markets', 'الأسواق العالمية'],
        'hero_title_3' => ['From One Account', 'من حساب واحد'],
        'hero_subtitle' => [
            'Access crypto, forex, stocks, commodities, futures, copy trading, and level-based contracts from one secure MEX Group workspace.',
            'ادخل إلى العملات الرقمية والفوركس والأسهم والسلع والعقود الآجلة ونسخ الصفقات والعقود المرتبطة بالمستويات من مساحة عمل آمنة واحدة من MEX Group.',
        ],
        'hero_cta_primary' => ['Start trading', 'ابدأ التداول'],
        'hero_cta_secondary' => ['View platform', 'شاهد المنصة'],
        'stat_instruments_label' => ['Instruments', 'أداة'],
        'stat_uptime_label' => ['Uptime', 'التوفر'],
        'stat_countries_label' => ['Countries', 'دولة'],
        'trust_title' => ['Why traders choose MEX Group', 'لماذا يختار المتداولون MEX Group'],
        'trust_multi' => ['Multi-asset workspace', 'مساحة متعددة الأصول'],
        'trust_multi_text' => [
            'Crypto, forex, stocks, commodities, futures, copy signals, and internal contracts from one account.',
            'عملات رقمية وفوركس وأسهم وسلع وعقود آجلة وإشارات نسخ وعقود داخلية من حساب واحد.',
        ],
        'trust_pricing' => ['Transparent pricing', 'تسعير واضح'],
        'trust_pricing_text' => [
            'Clear source labels, price status, and cache-first lists for a faster trading experience.',
            'مصادر أسعار واضحة وحالات سعر دقيقة وقوائم سريعة مبنية على الكاش.',
        ],
        'trust_security' => ['Secure operations', 'تشغيل آمن'],
        'trust_security_text' => [
            'KYC, audit logs, manual funding review, and Stripe Checkout support.',
            'توثيق هوية وسجلات تدقيق ومراجعة تمويل يدوية ودعم Stripe Checkout.',
        ],
        'trust_copy' => ['Copy desk', 'مكتب النسخ'],
        'trust_copy_text' => [
            'Follow approved real-account copy signals with clear risk and level gates.',
            'تابع إشارات نسخ معتمدة للحسابات الحقيقية مع قيود واضحة للمخاطر والمستويات.',
        ],
        'markets_live_title' => ['Live market snapshot', 'لمحة الأسواق الحية'],
        'markets_live_sub' => ['Curated supported markets with fast refreshed quotes.', 'أسواق مختارة ومدعومة بأسعار يتم تحديثها بسرعة.'],
        'markets_live' => ['Live Markets', 'أسواق حية'],
        'markets_sub' => ['Quotes refresh automatically from supported providers.', 'يتم تحديث الأسعار تلقائيًا من المزودين المدعومين.'],
        'last_updated' => ['Updated', 'آخر تحديث'],
        'update' => ['Update', 'تحديث'],
        'sec' => ['sec', 'ث'],
        'cta_title' => ['Ready to start trading?', 'جاهز لبدء التداول؟'],
        'cta_subtitle' => [
            'Open your MEX Group account in minutes and start with demo or real internal execution.',
            'افتح حساب MEX Group خلال دقائق وابدأ بالتجريبي أو التنفيذ الحقيقي الداخلي.',
        ],
        'cta_button' => ['Create free account', 'إنشاء حساب مجاني'],
        'cta_login' => ['Already have an account?', 'لديك حساب بالفعل؟'],
        'cta_login_link' => ['Log in', 'تسجيل الدخول'],
        'footer_desc' => [
            'Professional multi-asset trading platform with copy trading, contracts, funding, and admin-controlled operations.',
            'منصة تداول احترافية متعددة الأصول تشمل نسخ الصفقات والعقود والتمويل والتشغيل الإداري.',
        ],
        'footer_products' => ['Products', 'المنتجات'],
        'footer_resources' => ['Resources', 'الموارد'],
        'footer_legal' => ['Legal', 'قانوني'],
        'footer_trade' => ['Trading Desk', 'مكتب التداول'],
        'footer_copy' => ['Copy Trading', 'نسخ الصفقات'],
        'footer_invest' => ['Level Contracts', 'عقود المستويات'],
        'footer_funding' => ['Funding', 'التمويل'],
        'footer_kyc' => ['Verification', 'التوثيق'],
        'footer_support' => ['Support Center', 'مركز الدعم'],
        'footer_api' => ['API Status', 'حالة API'],
        'footer_terms' => ['Terms of Service', 'شروط الخدمة'],
        'footer_privacy' => ['Privacy Policy', 'سياسة الخصوصية'],
        'footer_risk' => ['Risk Disclosure', 'إفصاح المخاطر'],
        'footer_disclaimer' => [
            'Trading involves significant risk of loss. Real execution is internal to the platform unless a separate broker integration is enabled.',
            'التداول ينطوي على مخاطر خسارة كبيرة. التنفيذ الحقيقي داخلي داخل المنصة ما لم يتم تفعيل تكامل منفصل مع وسيط خارجي.',
        ],
        'loading' => ['Loading', 'جار التحميل'],
        'live' => ['LIVE', 'مباشر'],
        'all' => ['All', 'الكل'],
        'crypto' => ['Crypto', 'عملات رقمية'],
        'forex' => ['Forex', 'فوركس'],
        'stocks' => ['Stocks', 'أسهم'],
        'commodities' => ['Commodities', 'سلع'],
        'symbol' => ['Symbol', 'الرمز'],
        'price' => ['Price', 'السعر'],
        'change' => ['Change', 'التغير'],
        'search_markets' => ['Search markets...', 'ابحث في الأسواق...'],
        'ticker_error' => ['Connection error. Retrying...', 'خطأ في الاتصال. تتم إعادة المحاولة...'],
        'nav_features' => ['Features', 'المزايا'],
        'nav_platform' => ['Platform', 'المنصة'],
        'nav_earn' => ['Earn', 'العقود'],
        'nav_funding' => ['Funding', 'التمويل'],
        'nav_copy' => ['Copy', 'نسخ'],
    ];

    $texts = [];
    foreach ($pairs as $key => $pair) {
        $texts[$key] = site_pair($pair[0], $pair[1]);
    }

    return $texts;
}
