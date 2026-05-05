# VertexPluse — Safe header + popular icons pass

Base used:
- `vertexpluse_safe_header_icon_refinement_2026_04_02.zip`

Goal:
- Continue on the last build where hamburger menu was stable.
- Do not touch fullscreen hamburger menu logic.
- Improve only:
  - Support mobile header
  - Notifications mobile header
  - Popular section icons on dashboard

What changed:
- Reworked utility mobile header layout in `multibank-theme.js/css` only:
  - clearer stacked header
  - menu button kept
  - compact jump button kept
  - Account / Support|Notifications buttons moved to dedicated toolbar row
  - added 3 compact stats row: primary / secondary / available
- Replaced popular letter badges with real market avatar component:
  - dashboard mobile popular tiles
  - popular rows helper
- Added safer popular tile styling for avatar / kind pill / change chip
- Kept menu overlay code untouched

Files changed:
- `assets/js/multibank-theme.js`
- `multibank-theme.js`
- `assets/css/multibank-theme.css`
- `multibank-theme.css`

Checks run:
- `node --check assets/js/multibank-theme.js`
- `node --check multibank-theme.js`
- `diff -q assets/js/multibank-theme.js multibank-theme.js`
- `diff -q assets/css/multibank-theme.css multibank-theme.css`
