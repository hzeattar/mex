Architecture & code audit findings

This pass focused on the desktop shell header after visual review of the latest screenshots. The main issues were header crowding, brand/title overlap pressure, and too many balance cards competing for width.

Critical issues and root causes

- Desktop topbar was carrying three separate balance cards plus brand copy and action rows, which created horizontal pressure on medium-large desktop widths.
- The brand area could visually collide with the page title/subtitle because the logo width stayed too large relative to the remaining copy space.
- The header communicated balances clearly, but not efficiently; the user requested a single available-balance entry with expandable details.

Execution plan

- Replace the three-card balance strip with one expandable desktop balance summary.
- Reduce brand/logo pressure and make the brand text area safer on tighter desktop widths.
- Keep account/language/actions intact while redistributing the desktop header grid.

Implemented fixes

- Added a desktop balance dropdown in the shell header.
- The new trigger shows Available balance only.
- The dropdown reveals:
  - Live available
  - Live equity
  - Demo equity
  - Active account equity
  - Free margin
  - 24h change
- Reduced desktop header overlap risk by shrinking the effective logo footprint inside the header.
- Tightened brand title/subtitle sizing and hid the subtitle on narrower desktop widths.
- Rebalanced the desktop topbar grid so the brand, balance dropdown, and action area sit more naturally.

UI/UX improvements for desktop

- Cleaner first impression in Home / Portfolio / Wallet / Trade header.
- Single, clearer balance entry instead of multiple competing cards.
- Better density control on widths around 1180–1420px.
- Dropdown keeps the rest of the balances accessible without consuming permanent space.

Validation results

- assets/js/multibank-theme.js: syntax OK
- multibank-theme.js: syntax OK
- root/assets CSS mirror synced

Changed files list

- assets/js/multibank-theme.js
- multibank-theme.js
- assets/css/multibank-theme.css
- multibank-theme.css

Final status and remaining notes

This pass specifically addresses the header overlap and replaces the multi-balance strip with one expandable available-balance control in desktop mode.
