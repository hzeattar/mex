# VertexPluse — Final reviewed package status (2026-04-14)

## Scope covered in this reviewed package
This package consolidates the stabilization work completed across the 2026-04-14 audit passes and maps them back to the original uploaded execution brief.

## What was reviewed and hardened
### 1) Trade page
Completed:
- Route state ownership hardened for symbol / type / market / watch tab / watch search / ticket tab
- Desktop watchlist live refresh no longer depends on an overly aggressive width gate
- Desktop watchlist quote resolution now respects each row's own live market/type metadata
- Order ticket tab persistence added
- Watchlist tab/search persistence added
- Desktop layout collapse breakpoint relaxed from 1320px to 1180px
- Right rail pressure reduced by making signals panel static while keeping order ticket sticky
- Non-crypto chart candle source priority aligned to live quote family (aggregates first, Yahoo fallback)

Still recommended later:
- Deeper architectural cleanup to reduce the number of layered `tradePage` overrides in `multibank-theme.js`
- Browser-level interaction QA for resize, symbol switching, and rapid route transitions on real devices

### 2) Dashboard / Home
Completed:
- Desktop level strip restored and refreshed
- Latest open trades block now sorts by newest activity instead of trusting raw API order
- Home account blocks now refresh on a timed loop for wallet + pnl + real portfolio state
- Existing market mover / popular / signal widgets preserved on top of the hardened data model

Still recommended later:
- End-to-end verification of each dashboard card against production API data on the target host

### 3) Portfolio
Completed:
- Hash/state ownership added for active tab and search query
- Live refresh loop added while user is inside `#/portfolio`
- Positions / orders / history now use stronger recency ordering
- Better timestamp visibility added inside rows for readability

Still recommended later:
- Real browser QA for large histories and mixed demo/real switching

### 4) Wallet
Completed:
- Desktop duplicate mobile funding strip removed
- Pending review metric now counts only pending items
- Funding recency parsing hardened via `vpEpoch(...)`
- Funding history order aligned with latest funding snapshot order
- Wallet summary copy updated to reflect real meaning of metrics

Still recommended later:
- Full host-level validation of upload/proof flows and real admin note roundtrip

### 5) Earn / Signal desk / Contracts / Levels
Completed:
- Earn hero and level strip were mounted correctly
- Signals/contracts tab persistence added with deep-link support
- Existing signal live-card work from prior project passes preserved

Still recommended later:
- Dedicated UX pass for card density and desktop composition once business logic is frozen

### 6) News / Account / Support
Completed:
- News feed ordering moved to a stable timestamp parser at the data-refresh layer
- News filter persistence added (`all / pinned / unread`) with timed auto-refresh
- Support ticket ordering hardened
- Support drafts persist across rerenders
- Account page now shows latest operational activity (funding, support, news) and refreshes it

Still recommended later:
- Browser-level QA for long support threads and rich unread/news edge cases

### 7) Admin
Completed:
- Missing existing pages exposed in admin shell navigation
- Shared shell responsive behavior hardened for tablet/mobile widths
- Several fixed inline two-column layouts replaced with responsive classes
- All PHP files in the package pass lint

Still recommended later:
- A focused admin usability pass on dense forms/tables with real operational data

### 8) Root/assets mirror consistency
Completed:
- Active mirrored files are in sync:
  - `app.js` <-> `assets/js/app.js`
  - `app.css` <-> `assets/css/app.css`
  - `multibank-theme.js` <-> `assets/js/multibank-theme.js`
  - `multibank-theme.css` <-> `assets/css/multibank-theme.css`

## Validation executed on this reviewed package
### Syntax / static validation
- PHP lint executed recursively on all `*.php` files: **passed**
- JS syntax check executed recursively on all `*.js` files: **passed**

### Smoke validation
- `php tests/smoke.php` result: **SKIP** in this container only
- Reason: container PHP lacks `pdo_mysql`, so DB-connected smoke test could not run here

## Remaining items from the original audit/development brief
### Remaining high-priority follow-up
1. **Trade override architecture cleanup**
   - Not a runtime blocker now, but still the biggest structural debt left in the front-end theme layer.
2. **Real browser QA on target host**
   - Needed for responsive verification, live quote behavior, and route transitions under production timing.
3. **Host-backed validation of live pipelines**
   - Needed for full confidence in quotes/candles/wallet/admin flows against real DB + live feeds.

### Remaining medium-priority follow-up
4. **Dedicated density/polish pass for Earn desktop and some Admin tables**
5. **Extended regression sweep for News / Support / Account with large real datasets**
6. **Optional cleanup of older superseded overrides to reduce maintenance cost**

## Practical release assessment
Status of this package:
- **Functionally stronger and materially more stable than the incoming phase32 checkpoint**
- **Suitable as the current reviewed working package for the next implementation stage**
- **Not yet the final “nothing-left-to-do forever” endpoint**, because the remaining work is mostly architectural cleanup and real-host/browser QA rather than obvious broken logic


## Final continuation pass (same date)
### Additional hardening completed after the reviewed package was assembled
- Added shared `uiDateText(...)` on the base app layer and switched fallback News/Support rendering to the same timestamp parsing family already used in the themed layer.
- `newsUnreadCount()` and `markNewsSeen()` now use `uiEpoch(...)` instead of raw `Number(...)` assumptions.
- Base News detail/list timestamps now accept epoch seconds, epoch milliseconds, numeric strings, and parseable date strings.
- Base Support list/detail/message timestamps now use the same parser, reducing drift if the theme layer is bypassed or reloaded.

### Validation rerun on the final reviewed package
- PHP lint recursively on all PHP files: **passed (166 files)**
- JS syntax check recursively on all JS files: **passed (7 files)**
- Root/assets mirror diff check for core mirrored files: **no differences**

### Companion matrix
See `docs/FINAL_EXECUTION_MATRIX_2026_04_14.md` for a direct mapping from the uploaded execution brief to the current package status.
