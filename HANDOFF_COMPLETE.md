# MEX Group Trading Platform — Complete Handoff / شرح شامل للمستلم

## 0) نظرة عامة

منصة تداول (Forex + Crypto + عقود + مستويات استثمار + نسخ صفقات) باسم/هوية **MEX Group**.

- **Backend**: PHP 8.2-FPM (vanilla PHP، endpoints تحت `api/`)
- **Frontend**: Vite SPA بـ JavaScript عادي (مفيش React/Vue) → build إلى `assets/dist/`
- **DB**: MySQL على Railway
- **Web server**: nginx + php-fpm في كونتينر Docker واحد
- **Hosting**: Railway، الدومين: `https://mex-production-a683.up.railway.app`

## 1) الريبو والمكان

- **Local repo path**: `C:\Users\AM\Documents\Codex\2026-05-06\files-mentioned-by-the-user-vertexpluse\mex`
- **Git remote**: `https://github.com/hzeattar/mex.git`
- **Branch**: `main`
- **Railway deploy**: auto-deploy on push (مفروض)

## 2) المعمارية وتدفق الطلب

```
Browser → /login.php أو /app.php
  → site_bootstrap.php (تهيئة)
  → app.php يقرأ Vite manifest من assets/dist/.vite/manifest.json
     (لو الـ manifest ناقص → fallback إلى legacy-app.php)
  → SPA (frontend/src): main.js → router.js → Shell.js → views/*
  → SPA بتنادي api/* عبر services/api.js
  → الأسعار live عبر services/sse.js + api/quotes*.php
  → api/lib/common.php يتصل بـ MySQL (Railway)
```

## 3) بنية المجلدات المهمة

### Root files:
`app.php` (نقطة دخول SPA), `legacy-app.php` (fallback), `login.php`, `register.php`, `logout.php`, `index.php`, `site_bootstrap.php`, `railway-router.php`, `Dockerfile`, `railway.json`, `.env.example`, `composer.json`

### Frontend (Vite SPA) — `frontend/src/`:
- `main.js`, `router.js`, `state/store.js`
- `components/layout/Shell.js` (الهيدر + bottom-nav + هامبرجر الأسواق)
- `components/common/Icons.js`
- `services/api.js` (نداءات الـ API), `services/sse.js` (الأسعار live/الستريم)
- `utils/marketIcon.js` (لوجو كل عملة), `utils/{format,i18n,dom}.js`
- `styles/main.css` (نظام التصميم كله)
- `views/`: `home.js`, `trade.js` (الأهم), `wallet.js`, `funding.js`, `portfolio.js`, `invest.js`, `kyc.js`, `account.js`, `support.js`, `news.js`
- build output: `assets/dist/` + manifest في `assets/dist/.vite/manifest.json`

### Backend — `api/`:
- `lib/common.php` ← **اتصال DB + منطق Railway public proxy** (مهم جدًا)
- `lib/quote_authority.php`, `lib/quote_*.php`, `lib/price_core.php`, `lib/marketdata.php`, `lib/tick_*.php` ← محرك الأسعار/التكات
- `lib/feature_bootstrap.php` ← يزرع المستويات/الإشارات/العقود الافتراضية
- `lib/{schema,init_db,settings,feature,ledger,levels,risk,fx,logger}.php`
- `quotes.php`, `quotes_v2.php`, `quote_hub.php`, `markets.php`, `prices.php`, `signals.php` ← الأسعار/الأسواق
- `auth/` (`login,register,me,logout,telegram_login`), `trade/` (place_order, portfolio, orders, candles), `wallet/`, `deposits/`, `invest/` (plans, contracts, subscribe, my), `kyc/`, `admin/`, `bot/`, `cron/`, `debug/`
- `bootstrap.php` ← تهيئة عامة للـ API

### Admin panel: مجلد `admin/`
### DB seeds/migrations: مجلد `db/`
### Deploy ops: `ops/start-nginx-fpm.sh`, `ops/nginx.conf.template`, `ops/php-fpm-pool.conf`

## 4) المشاكل الحالية (CRITICAL)

### مشكلة 1: Deploys مش بتظهر على الموقع (أهم مشكلة)
**الوضع**: كل الـ commits بتتدفع على GitHub بنجاح، بس الموقع لسه بيخدم نسخة قديمة جداً (من أيام).
**السبب المحتمل**: Railway مش بيعمل rebuild للـ container. ممكن يكون:
1. Auto-deploy متوقف
2. Docker cache بيستخدم نسخة قديمة
3. الـ deploy بيفشل في الـ build step ومش بيظهر

**الحل المطلوب**:
- افتح Railway Dashboard → Deployments
- شوف آخر deploy — هل Status = "Success" ولا "Failed"؟
- لو Failed: اضغط Redeploy
- لو Success بس الموقع قديم: اعمل Redeploy يدوي أو غيّر أي حاجة صغيرة في Dockerfile عشان تكسر الـ cache

### مشكلة 2: أسعار المعادن غلط
**الوضع**: XAUUSD بيظهر 4593 (سعر futures من GC=F)، لكن السعر الحقيقي للـ spot gold ~4540
**السبب**: `yahoo_ticker_for_market()` بيحول XAUUSD لـ GC=F (futures contract)
**الملفات المعنية**:
- `api/lib/marketdata.php` (الـ mapping)
- `api/public_prices.php` (seed prices)
- `api/trade/candles.php` (chart data)

**الحل المطلوب**:
- إما تلغي الـ Yahoo mapping للمعادن وتستخدم seed prices بس
- أو تلاقي API مجاني للـ spot metals (صعب - معظمها محتاجة API key)

### مشكلة 3: صفحة الهوم (index.php) فيها مشاكل
**الوضع**:
- "Access 70+ instruments" (مفروض 217+)
- "View all 70+ markets" (مفروض 217)
- 6 بطاقات بس (مفروض 8)
- الأسعار مخفية (صناديق رمادية - skeleton loading)
- Terminal chart فاضي (مفيش أعمدة)

**الملفات المعنية**:
- `index.php` (الـ HTML + JS)
- `assets/css/public-site.css` (الـ styling)

**الحل المطلوب**:
- تعديل النصوص لـ 217+
- توسيع `$marketCards` لـ 8 بطاقات
- إصلاح الـ `is-loading` class (مش بيتشال بعد fetch)
- إصلاح ارتفاع الـ terminal chart (height: 330px بدل min-height)

### مشكلة 4: صفحة الأسواق (markets.php) الأسعار مش ظاهرة
**الوضع**: الـ 217 سوق موجودين في التبويبات، بس الأسعار فاضية (الكروت من فوق سودا/فاضية)
**السبب**: الـ `is-loading` class بيخلي `color: transparent` على الأسعار
**الملفات المعنية**:
- `markets.php`
- `assets/css/public-site.css`

### مشكلة 5: الشارتات (charts) فيها gaps ومش متصلة
**الوضع**: الشمعات موجودة بس فيه فجوات (gaps) بينها
**السبب**: بيانات Yahoo مش متاحة لكل الـ timeframes، والـ fallback بيولّد بيانات synthetic
**الملفات المعنية**:
- `api/trade/candles.php`
- `api/lib/marketdata.php` (yahoo_chart_candles)

### مشكلة 6: عدد العملات قليل في sidebar التداول
**الوضع**: بيظهر 8 crypto بس في الـ sidebar
**السبب**: الـ API limit كان 18، والـ frontend كان بياخد 24 بس
**الملفات المعنية**:
- `api/markets.php` (limit = 18)
- `frontend/src/views/trade.js` (max = 24)

## 5) متغيرات البيئة (env) — مضبوطة على Railway

```
APP_ENV=production
APP_DEBUG=0
APP_URL=https://mex-production-a683.up.railway.app
SITE_URL=https://mex-production-a683.up.railway.app
AUTO_MIGRATE=1
SITE_SETTINGS_DB=1
LOG_ENABLED=1
LOG_LEVEL=WARN
DB_DRIVER=mysql
DB_USE_PUBLIC_PROXY=1
DB_ALLOW_SQLITE_FALLBACK=0
AUTH_BOOTSTRAP_SCHEMA=1
AUTH_BOOTSTRAP_ON_MISSING=1
ALLOW_GUEST=1
DEFAULT_CURRENCY=USD
REAL_CURRENCY=USDT
SUPPORTED_CURRENCIES=USD,EUR,USDT
DEMO_CURRENCY=USDT_DEMO
DEMO_START_BALANCE=10000
PRICE_PROVIDER=yahoo
CRYPTO_PROVIDER=binance
YAHOO_ENABLED=1
FRANKFURTER_ENABLED=1
STRIPE_ENABLED=0
ADMIN_EMAIL=admin@mexgroup.com
```

## 6) آلية الأسعار

### المصادر:
- **Crypto**: Binance (`data-api.binance.vision` - غير محجوب على Railway)
- **Forex**: Frankfurter API (مجاني، من ECB)
- **Stocks**: Yahoo Finance
- **Commodities**: Yahoo Finance (futures) أو seed prices

### Endpoints:
- `api/quotes.php` — للـ SPA (live prices)
- `api/public_prices.php` — للصفحات العامة (index.php, markets.php)
- `api/trade/candles.php` — للشارتات

## 7) المزايا المطلوبة (الـ Vision)

1. **Blur gating**: تغبيش الأقسام الخاصة بالحساب الحقيقي عند الدخول بحساب Demo
2. **KYC gating**: مزايا معيّنة مقفولة للحساب الحقيقي وتتطلب توثيق هوية
3. **لوجو كل عملة** في قائمة الأسواق وداخل صفحة التداول
4. **صفحة تداول موبايل** احترافية + order ticket كامل
5. **bottom-nav ثابت من 4 أزرار** (Home / Trade / Earn / Assets)
6. **هامبرجر مخصّص لتبديل السوق/العملة**
7. **Home**: بلوك أرصدة مرتب، سكرول أفقي لصفقات النسخ
8. **فصل صحيح بين Deposit و Withdraw**
9. **زر تبديل Demo/Real** يشتغل + زر تبديل اللغات
10. **شيل زر دخول الأدمن من واجهة العميل**
11. **أدمن كامل**: تحكم في الأسواق/الإشارات/العقود/المستويات
12. **ملء DB** بمستويات + صفقات نسخ + عقود

## 8) أوامر البناء/التشغيل/الرفع

```bash
# بناء الواجهة
cd frontend && npm install && npm run build
# يطلع الإخراج في ../assets/dist + .vite/manifest.json

# تشغيل محلي للاختبار
php -S localhost:8000

# الرفع (من جذر الريبو)
git add -A
git -c core.autocrlf=false commit -m "..."
git push origin HEAD:main
```

## 9) أول مهمة للمستلم (Priority)

1. **أكّد إن الـ deploy شغال**: Railway Dashboard → Deployments → Redeploy
2. **افتح الموقع** وتأكد إن التغييرات ظاهرة
3. **إصلاح أسعار المعادن**: XAUUSD يظهر سعر صحيح (~4540 مش 4593)
4. **إصلاح skeleton loading** في index.php و markets.php
5. **إصلاح terminal chart** (الأعمدة الفاضية)
6. **زيادة عدد العملات** في sidebar التداول
7. **إصلاح الشارتات** (الـ gaps)

## 10) ملاحظات مهمة

- **متكسرش محرك الأسعار/الشارت** — التحسينات تدريجية
- البناء الحالي PHP + Vite SPA — بلاش إعادة هيكلة
- متترفعش أسرار في الجيت (`.env` مستثنى)
- على Windows استخدم `git -c core.autocrlf=false`
- نقطة الدخول الفعلية `app.php`
