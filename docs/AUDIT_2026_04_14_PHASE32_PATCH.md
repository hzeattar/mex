# VertexPluse — Phase 32 audit + stabilization patch (2026-04-14)

## Scope
Focused pass on the highest-priority items from the uploaded brief:
- Trade page logic
- Live quotes vs chart alignment
- Watchlist / symbol hydration
- Order ticket desktop usability
- Desktop layout stability
- Root/assets mirror consistency
- Basic validation

## Findings
1. **Trade page override layering is too deep**
   - `assets/js/multibank-theme.js` reassigns `tradePage` multiple times.
   - This is not a syntax bug, but it makes route behavior fragile and harder to reason about.

2. **Non-crypto candle source drift**
   - `api/trade/candles.php` was serving Yahoo chart candles before Polygon/Massive aggregates for parts of commodities/futures.
   - Live quotes and chart candles could therefore come from different market families.

3. **Desktop trade watchlist realtime refresh was over-constrained**
   - Desktop watchlist sync in `vpSyncTradeDesktopPanels()` only ran when `window.innerWidth >= 1100`.
   - Many laptop / resized desktop layouts were therefore not receiving quote refreshes even though the watchlist was visible.

4. **Phase 32 desktop breakpoint was too aggressive**
   - `mb-trade-v32` collapsed to single-column at `1320px`.
   - This pushed common laptop widths into a stacked layout prematurely.

5. **Right rail stickiness was too dense**
   - In Phase 32 CSS both the order ticket and signals panel were sticky in the same right column.
   - That increased crowding and made the desktop rail feel heavier than needed.

## Implemented fixes
### 1) Chart/quote alignment
- Reordered non-crypto candle priority in `api/trade/candles.php`:
  - Polygon/Massive aggregates now win first.
  - Yahoo chart candles now act only as fallback.
  - Synthetic candles remain the last-resort safety net.

### 2) Watchlist live refresh behavior
- Replaced the hard `window.innerWidth < 1100` gate with a visibility-aware check.
- The sync loop now runs whenever the trade watchlist is actually visible and the route is still `#/trade`.

### 3) Desktop layout hardening
- Lowered the Phase 32 single-column collapse breakpoint from `1320px` to `1180px`.
- Preserved the multi-column desktop layout for more laptop widths.

### 4) Desktop right rail cleanup
- Kept the order ticket sticky.
- Made the signals panel static in Phase 32 desktop to reduce stacked sticky pressure.

### 5) Mirror sync
- Synced updated theme files back to root mirrors:
  - `multibank-theme.js`
  - `multibank-theme.css`

## Validation
- PHP lint: passed
- JS syntax check: passed
- Root/assets mirror consistency: updated files synced
- Smoke script: skipped because container PHP has no PDO MySQL driver enabled

## Second pass (2026-04-14)
### Additional findings
6. **Themed desktop watchlist could still resolve price using the wrong market hint**
   - `vpSyncTradeDesktopPanels()` applied incoming quotes with `item.market || 'spot'`.
   - For rows that explicitly represented a different live market (for example crypto/perp), this could cause quote interpretation drift inside the desktop watchlist even when the stream itself was correct.

7. **Admin shell navigation was incomplete**
   - Existing admin pages such as `support_contacts.php`, `bot_content.php`, and `flags.php` were not exposed in the shell navigation.
   - Operators could reach them only by direct URL or indirect links.

8. **Admin responsive behavior was inconsistent across forms**
   - Many admin pages use inline `grid-template-columns` values.
   - On tablet/mobile widths these forms stayed too dense because the shell stylesheet only collapsed one specific base grid definition.

### Additional fixes
### 6) Desktop watchlist market-aware quote resolution
- Updated `assets/js/multibank-theme.js` so desktop watchlist rows resolve live prices using each row's own:
  - `data-live-type`
  - `data-live-market`
- This prevents the themed watchlist from defaulting back to a generic `spot` interpretation when the row was built for another market context.
- Also normalized rendered row prices through `money(...)` for better consistency with the rest of the trade UI.

### 7) Admin shell completeness
- Added the following existing admin pages to the shell navigation in `admin/includes/auth.php`:
  - Support Contacts
  - Bot Content
  - Feature Flags

### 8) Admin responsive hardening
- Updated the shared admin shell CSS in `admin/includes/auth.php`:
  - grids collapse to 2 columns below 1200px
  - grids collapse to 1 column below 760px
  - this uses `!important` so it can safely override legacy inline grid declarations
- Added responsive handling for `admin-two-col` / `admin-three-col`
- Improved action wrapping so button rows behave better on smaller widths

### 9) Admin page cleanup
- Replaced fixed two-column inline grids with semantic responsive classes in:
  - `admin/dashboard.php`
  - `admin/support_tickets.php`
  - `admin/news_settings.php`

### Validation (second pass)
- JS syntax: passed after market-aware watchlist patch
- PHP lint: passed after admin shell and page updates

## Third pass (2026-04-14)
### Additional findings
10. **Earn page hero and level strip were built but never mounted**
   - In `assets/js/multibank-theme.js` the `investPage()` override created both `hero` and `levelStrip` blocks.
   - Neither block was appended to `page`, so the user lost the most important top-of-page context: the live wallet summary, level state, next unlock, and progress bar.

11. **Earn tab state reset on rerender**
   - The `signals / contracts` tab state was only visual at first render.
   - Any rerender could push the page back to the default state because the selected tab was not persisted to a stable state key or hash parameter.

### Additional fixes
### 10) Earn page layout restoration
- Mounted the missing top-of-page blocks in `investPage()`:
  - `hero`
  - `levelStrip`
- The page now renders in the intended order:
  - hero
  - level strip
  - summary metrics
  - tabs
  - signals/contracts content

### 11) Earn tab persistence and deep-link support
- Added a stable `state.__vpInvestTab` owner for the selected Earn tab.
- Added hash sync support for `#/invest?tab=contracts`.
- On rerender, the selected tab is restored instead of silently falling back to `signals`.
- This also enables cleaner internal deep-linking to contracts in later passes.

### Validation (third pass)
- JS syntax: passed after Earn page patch
- Root/assets mirror consistency: synced `multibank-theme.js`

## Fourth pass (2026-04-14)
### Additional findings
12. **Wallet desktop still rendered a mobile-only funding strip**
   - `walletPage()` mounted `mobileFundingStrip` in both mobile and desktop returns.
   - On desktop this duplicated the funding summary above the hero and made the page denser than intended.

13. **Funding “In review” count was misleading**
   - The compact wallet snapshot counted all deposit and withdrawal rows.
   - The label says “In review”, so it should reflect only requests that are still pending operations review.

14. **Funding recency ordering relied on numeric-only timestamps**
   - `fundingMerged` and history sorting used `Number(created_at || 0)`.
   - When upstream responses contain string timestamps or ISO-like dates, the latest request card and history order can drift or collapse to unstable ordering.

15. **Desktop dashboard had less level visibility than mobile**
   - Mobile home already exposed the current level / next level strip.
   - Desktop home did not refresh dashboard level data and did not mount the access-level strip, leaving an important dashboard summary missing on larger screens.

### Additional fixes
### 12) Wallet desktop duplication cleanup
- Removed the mobile-only funding snapshot strip from the desktop wallet return.
- Desktop wallet now starts with the intended funding hero and the 3-column funding shell.

### 13) Correct pending-review counting
- Added `pendingFundingTotal` in `walletPage()`.
- The compact funding snapshot now shows only requests still waiting for review, not every historical request.
- Updated the supporting copy to match the real meaning of the metric.

### 14) Robust timestamp parsing and aligned funding ordering
- Added `vpEpoch(...)` helper in `assets/js/multibank-theme.js`.
- Upgraded `vpFmtDate(...)` to support:
  - epoch seconds
  - epoch milliseconds
  - numeric strings
  - parsable date strings
- Switched wallet recency ordering to use `updated_at || created_at` through `vpEpoch(...)`.
- Switched funding history ordering to the same parser so side panel “latest funding” and history view stay aligned.

### 15) Desktop dashboard level strip
- Desktop `homePage()` now refreshes dashboard level data when missing.
- Mounted a compact horizontal level strip on desktop home using the same current/next level model already present in mobile.
- This restores parity between mobile and desktop for one of the most important dashboard summaries.

### Validation (fourth pass)
- JS syntax: passed after wallet/dashboard pass
- Root/assets mirror consistency: synced `multibank-theme.js`
- PHP lint spot-check: passed on touched admin shell files from previous pass
