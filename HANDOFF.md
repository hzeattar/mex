# MEX Group Trading Platform — Complete Handoff / حالة المشروع

## 0) نظرة عامة

منصة تداول (Forex + Crypto + عقود + مستويات استثمار + نسخ صفقات) باسم/هوية **MEX Group**.

- Backend: **PHP 8.2-FPM** (vanilla PHP، endpoints تحت `api/`).
- Frontend: **Vite SPA** بـ JavaScript عادي (مفيش React/Vue) → build إلى `assets/dist/`.
- DB: **MySQL** على Railway.
- Web server: **nginx + php-fpm** في كونتينر Docker واحد.
- Hosting: **Railway**، الدومين: `https://mex-production-a683.up.railway.app`

## 1) الريبو والمكان

- Local repo path: `C:\Users\AM\Documents\Codex\2026-05-06\files-mentioned-by-the-user-vertexpluse\mex`
- Git remote: `https://github.com/hzeattar/mex.git`
- Branch: `main` — آخر commit: `9f9d2d9` (زيادة limit الأسواق + إصلاحات أسعار)
- Railway deploy: auto-deploy on push

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
`app.php` (نقطة دخول SPA), `legacy-app.php` (fallback), `login.php`, `register.php`, `logout.php`, `index.php`, `site_bootstrap.php`, `railway-router.php`, `Dockerfile`, `railway.json`, `.env.example`, `composer.json`.

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

### Admin panel: مجلد `admin/`.
### DB seeds/migrations: مجلد `db/`.
### Deploy ops: `ops/start-nginx-fpm.sh`, `ops/nginx.conf.template`, `ops/railway-cron-*.json`.

## 4) إعداد الـ Deploy (Railway / Docker)

- `railway.json`: builder = `DOCKERFILE`، restartPolicy = `ON_FAILURE` (max 10).
- `Dockerfile`: base `php:8.2-fpm` (Debian)، بيثبّت nginx + إكستنشنز (curl, gd, mbstring, mysqli, pdo_mysql, zip)، composer install، ثم `ENV PORT=8080`, `EXPOSE 8080`, `CMD ["sh","/app/ops/start-nginx-fpm.sh"]`.
- `ops/start-nginx-fpm.sh`: يرندر الكونفيج بـ `envsubst '$PORT'` → `nginx -t` → `php-fpm -D` → `exec nginx -g 'daemon off;'`.
- `ops/nginx.conf.template`: السطر المهم الآن:
  `listen [::]:${PORT} ipv6only=off default_server;` (IPv6 dual-stack — لأن Railway توصل للكونتينر عبر شبكة IPv6).

### المشكلة الحالية (مفتوحة): 502 "Application failed to respond"
- تم إصلاح سببين بالفعل: (1) إضافة `EXPOSE 8080`، (2) تحويل nginx لـ IPv6 dual-stack.
- لو لسه 502 بعد deploy من commit `d4a0b71`: السبب المتبقّي على الأرجح **target port للدومين في Railway Settings → Networking** لازم يساوي **8080**، أو الـ deploy الأخير مش ناجح/مش من آخر commit. يتأكد من Deployments tab + Networking + Deploy Logs.

## 5) متغيرات البيئة (env) — مضبوطة على Railway

> القيم التشغيلية (غير الحساسة):

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
STRIPE_CURRENCY=usd
ADMIN_EMAIL=admin@mexgroup.com
```

> الداتابيز: `MYSQL_PUBLIC_URL` = البروكسي العام `zephyr.proxy.rlwy.net:42824` (DB: `railway`, user: `root`). باقي `MYSQL*` مربوطة كـ Reference Variables من خدمة MySQL على Railway.

> الأسرار (موجودة على Railway، **يُفضّل تدويرها قبل الإطلاق الفعلي**): `APP_KEY`, `JWT_SECRET`, `CRON_KEY`, `INSTALL_KEY`, `DEBUG_KEY`, `MASTER_KEY`, `BOT_API_TOKEN`, `BOT_INTENT_SECRET`, `PAYMENT_WEBHOOK_SECRET`, `SIGNAL_WEBHOOK_SECRET`, `CRYPTO_PAY_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_PASSWORD`, `MYSQL_ROOT_PASSWORD`.

> Stripe لسه `STRIPE_ENABLED=0` لحد ما المالك يحط مفاتيحه الحقيقية.

## 6) آلية الأسعار/الشارت (لا تكسرها)

- مزوّدين: Yahoo للفوركس/الأسهم، Binance للكريبتو، Frankfurter لأسعار FX.
- Endpoints: `api/quotes.php` / `quotes_v2.php` / `quote_hub.php` + `api/markets.php` + `api/trade/candles.php`.
- الـ SPA بتستهلكها عبر `services/sse.js` و`services/api.js`، والعرض في `views/trade.js`.
- مشاكل سابقة لازم تتراعى: خلط سعر رمز قديم بآخر عند تبديل السوق (لازم إلغاء صحيح للـ timers/SSE في clearRuntime)، بطء الأسعار/الشارت، وتكبير هيستوري الشارت.

## 7) المزايا المطلوبة (الـ Vision)

الهدف: **نسخة مطابقة لـ MEX Group** — الصفحات الأمامية تشبه `mexgroup.com`، وداخل المنصة بوابة تداول احترافية، بهوية MEX كاملة (اسم + شعار + ألوان navy داكنة). المطلوب استرجاع/إكمال كل المزايا القديمة ببناء صحيح:

1. **Blur gating**: تغبيش الأقسام الخاصة بالحساب الحقيقي عند الدخول بحساب Demo.
2. **KYC gating**: مزايا معيّنة مقفولة للحساب الحقيقي وتتطلب توثيق هوية (مربوطة بـ `api/auth/me.php` + `api/kyc/*`).
3. **لوجو كل عملة** في قائمة الأسواق وداخل صفحة التداول (`utils/marketIcon.js`، fallback عبر event listener مش inline onerror).
4. **صفحة تداول موبايل** احترافية + **order ticket كامل**: المبلغ، الرافعة، نوع التداول (فوري/عقود آجلة)، Take-Profit/Stop-Loss اختياري، وملخص تأكيد قبل التنفيذ (ميتنفّذش قبل تأكيد المدخلات).
5. **bottom-nav ثابت من 4 أزرار** (Home / Trade / Earn / Assets) مع safe-area.
6. **هامبرجر مخصّص لتبديل السوق/العملة** (مش قائمة تنقل عامة) + زر رجوع داخل قائمة الأسواق.
7. **Home**: بلوك أرصدة مرتب (أرصدة Demo لو على الديمو / Real لو على الريل)، **سكرول أفقي لصفقات النسخ** مع **blur لو ديمو**، وحذف بلوك quick-actions.
8. **فصل صحيح بين Deposit و Withdraw** (كان فيه باج: السحب بيودّي للإيداع).
9. **زر تبديل Demo/Real** يشتغل + زر تبديل اللغات + زر الإشعارات.
10. **شيل زر دخول الأدمن من واجهة العميل** (استبداله برابط Support/Settings).
11. **أدمن كامل**: تحكم في الأسواق/الإشارات/العقود/المستويات/الإيداع/السحب/KYC.
12. **ملء DB** بمستويات + صفقات نسخ + عقود (seed آمن + تنفيذ مباشر على DB الحالية).

## 8) ملاحظات Reviewer مفتوحة (تخص الـ seed)

- `db/seed_levels_copy_contracts_*.sql`: جدول `trading_signals` مفيهوش UNIQUE key على (market_symbol/market_type/timeframe) فالـ `ON DUPLICATE KEY UPDATE` بيكرر الصفوف بدل ما يحدّث — لازم مفتاح فريد قبل التشغيل المتكرر.
- توحيد رموز/حدود المستويات بين `feature_bootstrap.php` وملف الـ SQL لتجنّب التكرار/التضارب.

## 9) أوامر البناء/التشغيل/الرفع

```bash
# بناء الواجهة
cd frontend && npm install && npm run build
# يطلع الإخراج في ../assets/dist + .vite/manifest.json

# تشغيل محلي للاختبار
php -S localhost:8000   # ثم افتح /login.php و /app.php

# الرفع (من جذر الريبو)
git add -A
git -c core.autocrlf=false commit -m "..."
git push origin HEAD:main   # Railway بتعمل auto-deploy
```

## 10) قيود وتحذيرات

- **متكسرش محرك الأسعار/الشارت** — التحسينات تدريجية فوق الموجود.
- البناء الحالي PHP + Vite SPA — بلاش إعادة هيكلة جذرية.
- متترفعش أسرار في الجيت (`.env` مستثنى في `.gitignore`).
- على Windows استخدم `git -c core.autocrlf=false` وحافظ على LF لملفات `.sh`.
- نقطة الدخول الفعلية `app.php` (مش app-v2.php ولا legacy-app.php).

## 11) أول مهمة للمستلِم

1. أكّد إن الـ 502 اتحل: راجع Railway Deployments (commit `d4a0b71` / Success) + Networking (port 8080) + Deploy Logs.
2. افتح `/app.php` و`/api/quotes.php` وتأكد إن الأسعار live والـ DB متصل.
3. بعد ما يشتغل live: ابدأ مراحل تحسين الواجهة (1–6) حسب قسم "المزايا المطلوبة".
