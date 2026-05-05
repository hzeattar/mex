# VertexPluse — Safe Continuation Pass 7

Base used:
- `vertexpluse_safe_header_markets_pass_6_2026_04_02.zip`
- Continued on the same code line to avoid touching the working hamburger menu behavior.

## What was changed safely

### 1) Support / Notifications utility headers
- Removed the `Account` button from the utility header.
- Kept only:
  - jump button (`Support` or `Notifications`)
  - language selector
  - two compact counters
- Reduced the size of the two stat cards so the header stops crowding on mobile.
- Removed `Live Available` completely from these utility headers.

### 2) Global app header
- Removed route/page name from the general shell header.
- Removed the extra context strip under the brand.
- Moved the brand into a centered top row.
- Preserved the action buttons and language selector below.

### 3) Admin-controlled branding
- `admin/site_settings.php` now includes:
  - `site.app_logo_url`
- `app.php` now injects shell branding variables into the client:
  - `window.__BRAND_NAME`
  - `window.__BRAND_TAGLINE`
  - `window.__BRAND_LOGO_URL`
- If `site.app_logo_url` is present, the app shell shows the logo image.
- If no logo URL is provided, the shell falls back to the generated VertexPluse SVG wordmark.

### 4) Language switcher improvements
- Added flag labels in selectors:
  - `🇺🇸 EN`
  - `🇦🇪 AR`
  - `🇷🇺 RU`
  - `🇮🇳 HI`
- Applied to:
  - main shell header
  - support / notifications utility header
  - account drawer language selectors
  - mobile shell selectors

### 5) Hindi scaffold
- Added `assets/i18n/hi.json` using the English dictionary as a safe baseline.
- `app.js` now accepts `hi` as a client language.
- `loadI18n()` falls back to `en.json` if the chosen locale file is missing or unavailable.
- `api/content.php`, `api/signals.php`, and `api/i18n_overrides.php` were updated to accept `hi` safely.

### 6) Brand image safety
- `mountLogo()` now uses the admin-configured logo URL when available.
- If the remote logo fails, it falls back to the local generated SVG instead of leaving a broken header.

## Files changed
- `app.php`
- `admin/site_settings.php`
- `api/content.php`
- `api/signals.php`
- `api/i18n_overrides.php`
- `assets/js/app.js`
- `app.js`
- `assets/js/multibank-theme.js`
- `multibank-theme.js`
- `assets/css/app.css`
- `assets/css/multibank-theme.css`
- `multibank-theme.css`
- `assets/i18n/hi.json`

## Validation performed
- `node --check assets/js/app.js`
- `node --check app.js`
- `node --check assets/js/multibank-theme.js`
- `node --check multibank-theme.js`
- `php -l app.php`
- `php -l admin/site_settings.php`
- `php -l api/content.php`
- `php -l api/signals.php`
- `php -l api/i18n_overrides.php`

## Important honesty note
This pass **does not claim** that every hard-coded string across the entire app, admin, and bots has already been fully translated into Arabic, Russian, and Hindi.

What is done here:
- shell language support was extended safely
- Hindi was scaffolded safely with English fallback
- branding + utility headers were stabilized

What still needs a dedicated translation audit pass if you want full production i18n coverage:
- admin pages with hard-coded English text
- support/admin backoffice strings
- all remaining `tr(en, ar, ru)` and literal English-only strings across the codebase
- bot-side copies if you want Hindi there too

## Recommended next QA after upload
1. Hard refresh.
2. Check Support header on mobile.
3. Check Notifications header on mobile.
4. Check main shell header on Home / Trade / Wallet.
5. In admin, open **Site Settings** and test `site.app_logo_url`.
6. Switch languages in shell and drawer.
7. Confirm hamburger menu still behaves exactly like the last good base.
