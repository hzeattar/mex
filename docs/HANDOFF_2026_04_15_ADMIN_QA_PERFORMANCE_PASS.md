# Admin + QA + Performance pass — 2026-04-15

## What changed

### Admin dense screens
- Added table tools above every `.table-wrap` table in the admin shell.
- Each dense table now gets:
  - row counter
  - instant client-side filter
  - clear button
  - density toggle persisted in `localStorage`
- Added compact-density styling for cards, toolbars, tables, and stat cards to improve high-density admin workflows.

### Performance cleanup
- Added overlap guard to Markets live board refresh in `multibank-theme.js`.
- The Markets page no longer starts a new refresh while the previous refresh is still running.
- Slightly relaxed the Markets live interval from 5s to 6.5s to reduce unnecessary request pressure without making the board feel stale.

## Static validation
- `node --check assets/js/multibank-theme.js`
- `node --check multibank-theme.js`
- `php -l admin/includes/auth.php`

## QA checklist

### Trade
- [ ] open trade from Markets with a single click/tap
- [ ] switch symbols repeatedly on desktop and mobile
- [ ] verify header symbol, chart, and BUY/SELL quote match
- [ ] verify no startup stale-price spike
- [ ] verify Spot / Perp switching stays on the correct market

### Markets
- [ ] confirm the board updates without visible double refresh
- [ ] confirm no overlapping network storms on slow connections
- [ ] verify search/filter/sort continue to work

### Wallet / Portfolio / Account
- [ ] check wallet history search
- [ ] check selected funding request summary bar
- [ ] check portfolio tab + search hash persistence
- [ ] check account operations strip and latest activity cards

### Admin
- [ ] verify admin dense tables show filter + row count
- [ ] verify compact density toggle persists after reload
- [ ] verify sticky header remains usable on long tables
- [ ] test Users / Deposits / Withdrawals / Support Tickets / Audit Logs

## Remaining follow-up
- Host-level browser QA on the live deployment
- Final cleanup for any page-specific admin tables that need server-side filters later
- Optional pass for exporting filtered rows on major admin screens
