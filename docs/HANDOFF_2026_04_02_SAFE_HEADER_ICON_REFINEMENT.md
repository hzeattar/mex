# VertexPluse — Safe header/icon refinement (based on last menu-stable build)

Base used:
- safepass / vertexpluse_safe_headers_icons_2026_04_02

What changed safely:
- Refined only the mobile utility headers for:
  - Support
  - Notifications
- Kept the fullscreen hamburger/menu code path untouched.
- Reworked utility mobile header layout into:
  - top row: menu + brand/title + jump button
  - second row: Account + cross-link action buttons
  - third row: two compact stat cards
- Improved asset icons:
  - try direct DB/admin icon URL first
  - then try remote crypto SVG/PNG icon sources
  - finally fall back to generated local SVG badge
- Improved asset icon presentation:
  - `object-fit: contain`
  - transparent image background
  - better padding for SVG/PNG logos

Files changed:
- multibank-theme.js
- assets/js/multibank-theme.js
- multibank-theme.css
- assets/css/multibank-theme.css

Validation:
- node --check multibank-theme.js
- node --check assets/js/multibank-theme.js

Notes:
- Support/Notifications shell was changed in isolation.
- Wallet and hamburger overlay logic were not reworked.
- Crypto icons now attempt real external icon assets before local fallback.
