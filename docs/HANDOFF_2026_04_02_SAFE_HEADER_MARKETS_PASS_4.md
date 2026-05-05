# Safe header + markets icon pass 4

Base used: `vertexpluse_safe_header_popular_pass_3_2026_04_02.zip`

Changes:
- Removed live balance/available stat from mobile Support and Notifications headers to reduce crowding.
- Kept only two utility stats in those mobile headers:
  - Support: Open tickets / Unread replies
  - Notifications: Total items / Unread
- Improved non-crypto market icons using generated SVG assets:
  - Forex now shows stacked pair badges (example: USD / JPY)
  - Commodities now show dedicated commodity badge style (Au / Ag / Oil)
  - Stocks now show ticker-based equity badge with chart motif
- Synced root and `assets/js` copies of `multibank-theme.js`.

Files changed:
- `assets/js/multibank-theme.js`
- `multibank-theme.js`

Validation:
- `node --check assets/js/multibank-theme.js`
- `node --check multibank-theme.js`
