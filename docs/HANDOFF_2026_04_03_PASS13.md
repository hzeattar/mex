# VertexPluse — Safe Pass 13

Base: `vertexpluse_safe_pass12_2026_04_02.zip`

## What changed

### Support / Notifications header
- Removed the logo block from the utility header completely.
- Rebuilt the utility header into two compact rows:
  - row 1: Support / Notifications switch + language menu
  - row 2: compact stats cards
- Replaced native language `<select>` with a custom popover menu so flags render next to each language label.

### Language switcher
- Added compact language menu UI with flags:
  - English
  - Arabic
  - Russian
  - Hindi
- Applied in the main top bar and utility top bar.

### Wallet mobile UX
- Removed the extra mobile funding strip to reduce duplication.
- Removed the extra wallet mobile topline wrapper so the page is closer to the reference.
- Kept only the main Deposit / Withdraw / History switcher.
- Hid the big stepper on mobile and tightened spacing to make the flow simpler.
- Kept the category-first deposit / withdraw flow.

### Market icons
- Strengthened local SVG stock icons so they remain visible without external icon sources.
- Increased stock icon prominence through local SVG + CSS.

## Files changed
- `app.js`
- `assets/js/app.js`
- `multibank-theme.js`
- `assets/js/multibank-theme.js`
- `assets/css/app.css`
- `multibank-theme.css`
- `assets/css/multibank-theme.css`

## Validation
- `node --check app.js`
- `node --check assets/js/app.js`
- `node --check multibank-theme.js`
- `node --check assets/js/multibank-theme.js`

## Notes
- This pass focuses on the visible UI/UX issues requested in the latest round.
- Full translation auditing across the entire platform is still not guaranteed 100% in this pass.
