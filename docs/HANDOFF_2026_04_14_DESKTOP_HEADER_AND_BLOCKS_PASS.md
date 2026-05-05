Architecture & code audit findings

This pass focused on the desktop shell header, trade ticket readability, and large desktop hero blocks after the prior stability fixes were already in place.

Critical issues and root causes

- The desktop header was functionally complete but visually dense, with the brand area underused and the action area packed into one row.
- Header actions lacked clearer grouping between quick actions and account identity controls.
- The trade ticket quote figures above the SELL / BUY actions were still visually oversized on desktop compared to the rest of the ticket.
- Portfolio / Wallet / Account hero blocks were structurally fine but needed stronger premium spacing and visual hierarchy.

Execution plan

- Add route-aware brand copy to the desktop header.
- Split desktop header actions into an action row and an identity row.
- Tighten desktop trade ticket live quote area and quote-card typography.
- Refine desktop hero cards and block depth without touching the stabilized trade logic.

Implemented fixes

- Added desktop route title + subtitle next to the logo in the desktop shell header.
- Reorganized desktop header actions into:
  - quick actions row
  - identity row (account capsule + language)
- Refined desktop header spacing, card sizing, radius, and gradients.
- Reduced desktop quote-number size in the trade ticket SELL / BUY quote cards.
- Tightened live quote meta styling and trade button density.
- Upgraded desktop hero cards for Portfolio / Wallet / Account / News with cleaner premium spacing and depth.

Validation results

- node --check assets/js/multibank-theme.js
- node --check multibank-theme.js
- root/assets CSS mirrors kept in sync

Changed files list

- assets/js/multibank-theme.js
- multibank-theme.js
- assets/css/multibank-theme.css
- multibank-theme.css

Final status and remaining notes

This pass is UI/UX-focused and intentionally avoids reopening the trading stability fixes. The next logical pass is dense-screen admin polishing plus a browser QA checklist on the production host.
