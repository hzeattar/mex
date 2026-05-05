# VertexPluse v15 handoff

## What changed
- Reworked the main client-side UI flow to be clearer and less cluttered.
- Improved the trade page header and order ticket so the execution path is easier to understand.
- Reordered the mobile trade page so the chart appears before the order ticket.
- Fixed the mobile trade header balance source to use `walletSummary.real/demo.available` instead of inconsistent legacy fields.
- Redesigned the funding center with:
  - clearer hero section
  - quick action cards
  - request status pills
  - cleaner history layout
- Rebuilt deposit / withdrawal dialogs into guided step flows with better method summaries and confirmation states.
- Cleaned `api/wallet/summary.php` by removing unreachable leftover conversion code after `json_response()`.

## Files changed
- `assets/js/app.js`
- `assets/css/app.css`
- `api/wallet/summary.php`
- `docs/HANDOFF_V15.md`

## Suggested post-replace checks
1. Open `/app.php#/home`
2. Open `/app.php#/wallet`
3. Create a test deposit request
4. Create a test withdrawal request
5. Open `/app.php#/trade` on desktop and mobile
6. Switch demo/real mode and confirm balances render correctly
7. Confirm admin sees created deposit/withdrawal requests

## Notes
- This build keeps the same architecture and API routes.
- No database migration was added in this pass.
- Bicrypto was not merged; this remains the VertexPluse base, refined in-place.
