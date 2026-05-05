# VertexPluse — Execution matrix against the uploaded audit/development brief (2026-04-14)

This matrix maps the current reviewed package to the original uploaded execution brief and shows what is done, partially done, and still recommended next.

## Priority 1 — Trade page / live quotes / chart / desktop stability
### Trade page logic
- **Done**
  - Route state ownership for `symbol / type / market / watch / q / ticket`
  - Watchlist live refresh hardened
  - Watchlist rows now resolve by each row's own live type/market metadata
  - Ticket tab persistence added
  - Watchlist tab/search persistence added
- **Still recommended**
  - Deeper cleanup of layered `tradePage` overrides in `multibank-theme.js`
  - Real browser QA for resize / rapid symbol switching / repeated route transitions

### Live quotes
- **Done**
  - Trade watchlist live updates hardened
  - Dashboard / portfolio / account live refresh loops improved
  - Wallet / latest activity / news / support recency parsing hardened
- **Still recommended**
  - Host-backed QA against the real feed cadence on the production environment

### Chart alignment
- **Done**
  - Non-crypto candle priority changed so aggregates win first and Yahoo is fallback only
- **Still recommended**
  - Host/browser validation against real live feeds for edge symbols

### Watchlist / tabs / symbol hydration
- **Done**
  - Watchlist state ownership added
  - Deep-link routing added for trade context
  - Market-aware quote resolution added per row
- **Still recommended**
  - Extended symbol hydration QA on sparse-cache / first-load scenarios

### Order ticket
- **Done**
  - Ticket tab persistence
  - Desktop right rail pressure reduced
- **Still recommended**
  - UX polish pass on ticket density after architectural trade cleanup

### Desktop layout stability
- **Done**
  - Trade collapse breakpoint relaxed from 1320px to 1180px
  - Sticky crowding reduced in right rail
- **Still recommended**
  - Final browser verification on common laptop widths and iPad landscape

## Priority 2 — Home dashboard / portfolio / wallet / earn
### Home dashboard live blocks
- **Done**
  - Latest trades sort hardened
  - Desktop level strip restored and refreshed
  - Home account data loop added
- **Still recommended**
  - Production data QA for each dashboard card

### Portfolio
- **Done**
  - Hash/state ownership for tab and search
  - Live refresh loop while inside portfolio
  - Recency ordering hardened
- **Still recommended**
  - QA with larger histories and mixed demo/real workloads

### Wallet
- **Done**
  - Desktop duplicate strip removed
  - Pending review metric corrected
  - Funding ordering hardened with shared timestamp parser
- **Still recommended**
  - Host-level QA for uploads / proof / admin-note roundtrip

### Earn / signals / contracts / levels
- **Done**
  - Missing hero and level strip mounted
  - Signals/contracts tab persistence added
- **Still recommended**
  - Dedicated desktop density/composition pass once product rules are frozen

## Priority 3 — News / account / support / admin polishing
### News
- **Done**
  - Refresh-layer ordering stabilized
  - View persistence added (`all / pinned / unread`)
  - Auto-refresh while page is open
  - Fallback app layer now also uses shared timestamp parsing for unread state and date rendering
- **Still recommended**
  - Browser QA on larger real datasets and unread/pinned edge cases

### Account
- **Done**
  - Latest funding / support / announcement activity restored
  - Refresh workspace added
- **Still recommended**
  - Optional polish pass after final trade architecture cleanup

### Support
- **Done**
  - Ordering hardened
  - Draft persistence across rerenders
  - Fallback app layer now uses shared timestamp parsing for list/detail timestamps
- **Still recommended**
  - QA on long threads and repeated open/reply cycles

### Admin
- **Done**
  - Missing existing pages exposed in shell nav
  - Responsive shell hardened
  - Several fixed inline layouts replaced with responsive classes
  - PHP lint passes package-wide
- **Still recommended**
  - Dense table/form usability pass with real operational data

## Priority 4 — Final consistency / responsive hardening / cleanup
### Root/assets mirror consistency
- **Done**
  - `app.js`, `app.css`, `multibank-theme.js`, `multibank-theme.css` mirrors are aligned

### Syntax / static validation
- **Done**
  - PHP lint on all PHP files
  - JS syntax check on all JS files
- **Note**
  - `tests/smoke.php` cannot fully run in this container because `pdo_mysql` is not installed here

### Performance / cleanup
- **Partially done**
  - Hot paths and visible UI routes hardened
  - Several stale timestamp/order assumptions removed
- **Still recommended**
  - Deeper architectural cleanup of superseded overrides
  - Host/browser performance profiling under real traffic/feed timing

## Release-readiness summary
### Safe to use now as current reviewed working package
Yes.

### Completely finished forever
No.

### Biggest remaining item
A deeper architectural cleanup of layered trade/theme overrides, followed by real browser + host-backed QA.
