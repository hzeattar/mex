Architecture & code audit findings
- Mobile Home was still doing a full page re-render on a timer.
- The main cause was `vpHomeAccountTick(root)` calling `render()` after each account refresh cycle.
- On mobile this combined with a fast home live loop created the feeling that the page was "refreshing itself" every few seconds.

Critical issues and root causes
- Full render loop on Home:
  - `refreshRealPortfolio(true)`
  - `refreshRealPnlStats()`
  - `refreshWalletSummary(true)`
  - then unconditional `render()`
- Mobile live loop cadence was still aggressive for a dashboard page.
- Topbar and Home balance values were depending on rerender instead of DOM patching.

Execution plan
- Stop forcing full render on Home when a direct DOM patch is enough.
- Keep live prices updating, but slow the cadence slightly on mobile.
- Patch both root and assets mirrors.

Implemented fixes
- Added DOM patching helper: `vpApplyHomeAccountDom(root)`.
- Updated Home account loop to patch values in place and only fall back to `render()` if patching fails.
- Slowed mobile Home live interval from 1.5s behavior to a calmer cadence.
- Slowed Home account refresh cadence on mobile and desktop.
- Added explicit data hooks for topbar balance summary and mobile topbar strip.

Changed files list
- assets/js/multibank-theme.js
- multibank-theme.js
- docs/HANDOFF_2026_04_15_HOME_RERENDER_GUARD_PASS.md

Validation results
- node --check assets/js/multibank-theme.js ✅
- node --check multibank-theme.js ✅

Final status and remaining notes
- Home should no longer feel like it is fully re-rendering every few seconds.
- Quotes still refresh, but with a calmer mobile cadence.
- If any remaining visual flicker appears, the next pass should target specific Home widgets rather than page-level render.
