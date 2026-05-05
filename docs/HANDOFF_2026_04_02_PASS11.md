# VertexPluse — Pass 11

Base: `vertexpluse_safe_wallet_header_pass10_2026_04_02.zip`

Changes in this pass:
- Refined Support / Notifications utility header on mobile
- Unified logo source through the same `brandMark` render path
- Language labels updated to include flag + language name
- Support compose form improved:
  - message textarea now uses app input styling
  - mobile form stacks vertically
  - reply textarea styled consistently
- Wallet page simplified by removing duplicated hero action buttons so the lower switcher remains the main funding switcher

Safety notes:
- Hamburger/menu path was not touched
- No backend schema changes in this pass

Checks run:
- `node --check assets/js/app.js`
- `node --check app.js`
- `node --check assets/js/multibank-theme.js`
- `node --check multibank-theme.js`
