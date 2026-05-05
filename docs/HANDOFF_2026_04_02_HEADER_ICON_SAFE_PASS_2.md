# VertexPluse safe continuation — support/notifications header + market icons

Base used: the last user-confirmed ZIP where the hamburger menu was stable.

Changes made:
- Added a compact dedicated top header for `#/support` and `#/notifications` in `app.js`
- Kept the hamburger menu logic untouched
- Reworked market/asset icons in `multibank-theme.js` to use safe generated SVG badges when remote icons are missing or blocked
- Added image onerror fallback so broken remote icons collapse to a local badge instead of showing broken-image placeholders
- Synced root JS/CSS files with `assets/js/*` and `assets/css/*`

Files changed:
- `app.js`
- `assets/js/app.js`
- `multibank-theme.js`
- `assets/js/multibank-theme.js`
- `multibank-theme.css`
- `assets/css/multibank-theme.css`
- `assets/css/app.css`

Validation:
- `node --check multibank-theme.js`
- `node --check assets/js/multibank-theme.js`
- `node --check app.js`
- `node --check assets/js/app.js`

Recommended checks after upload:
1. Hard refresh
2. Support header
3. Notifications header
4. Symbols drawer icons
5. Trade header icon beside the selected symbol
6. Hamburger menu from Home and Trade
