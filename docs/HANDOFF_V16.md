# VertexPluse v16 — Clarity Pass 2

## What changed

### 1) Unified top header
- Extended the top bar to wallet and account pages so the shell feels consistent.
- Added contextual route chips that reflect the current page state:
  - Trade: selected symbol, market type, account mode
  - Markets: active market type + number of instruments
  - Wallet: live available + on-hold values
  - Account/Home/Invest: more relevant balance/context chips
- Made header action buttons contextual instead of always showing the same pair.

### 2) Markets page redesigned into a clearer board
- Added a real hero section for Markets.
- Added summary cards:
  - shown instruments
  - gainers
  - losers
  - total active signals
- Added sort controls:
  - Top movers
  - Largest drops
  - A–Z
  - Highest price
- Preserved fast staggered quote hydration logic.
- Improved each market card with:
  - market type tag
  - signal count tag
  - selected-state visual highlight
  - clearer CTA copy

### 3) Funding dialogs improved
- Reworked funding steps to include title + explanation per step.
- Added checklist blocks to deposit and withdrawal dialogs.
- Added live request summary cards that update with:
  - selected method
  - amount
  - filled details count
  - processing note
- Attached field listeners so the summary stays live while the user types.

## Files mainly touched
- `assets/js/app.js`
- `assets/css/app.css`

## Notes
- No DB schema change in this pass.
- This pass is focused on UX clarity, navigation consistency, and cleaner funding flows.
