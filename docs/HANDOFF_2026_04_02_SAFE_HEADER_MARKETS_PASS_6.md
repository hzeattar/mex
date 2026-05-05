# VertexPluse — Safe Header + Markets Pass 6

Base used: `vertexpluse_safe_header_markets_pass_5_2026_04_02.zip`

Applied safely on the same stable hamburger-menu base:

- Support / Notifications mobile header:
  - compacted the two stat boxes further
  - reduced spacing and sizing so buttons and language selector read more cleanly
- Forex icons:
  - replaced the generic pair badge with a larger dual-circle SVG style
  - each side now uses a generated local country/region flag treatment for the currency side when supported
- Commodities icons:
  - increased visual weight and reduced padding so the icon reads larger
- Synced edited files between root and assets mirrors

Files changed:
- `assets/js/multibank-theme.js`
- `multibank-theme.js`
- `assets/js/app.js`
- `app.js`
- `assets/css/multibank-theme.css`
- `multibank-theme.css`
- `assets/css/app.css`

Validation performed:
- `node --check assets/js/multibank-theme.js`
- `node --check multibank-theme.js`
- `node --check assets/js/app.js`
- `node --check app.js`

Note:
- This pass intentionally avoided the hamburger-menu logic path.
