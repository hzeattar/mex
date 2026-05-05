# Root cause and safe fix

## Exact cause of the regression
The last visual/style pass broke the hamburger menu because it replaced the **final fullscreen mobile menu CSS block** at the end of `multibank-theme.css` instead of adding style rules alongside it.

That removed the rules that were forcing the menu to:
- fill the real mobile viewport
- keep the close button inside the screen
- keep the logout button inside the screen
- hide page/bottom nav interaction while the drawer is open

A second regression also slipped into `multibank-theme.js` in that broken pass:
- `mobileMenuClose({goHome:true})` was reintroduced on menu close/backdrop actions, which is not desired.

## What this clean build does
This ZIP is rebuilt from the last **working** build (`vertexpluse_full_menu_trade_restored_2026_04_02.zip`) and only applies the safe change below:
- add `Account` as the 5th item in the mobile bottom nav

## What was intentionally NOT carried over
These risky changes were NOT copied from the broken build:
- the style pass that overwrote the fullscreen menu CSS block
- the JS changes that reintroduced forced `goHome:true`
- the extra nav-link/data-nav refactor that was unnecessary for the menu fix

## Files changed in this clean build
- `multibank-theme.js`
- `assets/js/multibank-theme.js`

No fullscreen menu CSS logic was touched.
