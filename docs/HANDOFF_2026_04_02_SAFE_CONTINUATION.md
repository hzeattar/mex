# VertexPluse — Safe continuation from last good hamburger-menu build

Base used:
- `vertexpluse_full_ux_markets_trade_pass_2026_04_02 (1).zip`

Goal of this pass:
- continue from the last version where the hamburger menu was stable
- avoid touching the fragile fullscreen-menu selectors and layout rules
- apply requested trade / markets / wallet / support / notifications improvements in isolated code paths

What was changed safely:
- `api/markets.php`
  - expose `market_rank`
  - expose `icon_url`
  - keep existing quote-provider chain unchanged
- `app.js`
  - `refreshMarkets()` now requests quotes for all concrete market types, including crypto
  - `walletDepositFlow()` now routes directly to `#/wallet?tab=deposit` for a simpler funding flow
- `multibank-theme.js`
  - added market avatar helpers
  - improved market sorting by size / market-cap / rank fallback
  - pushed major crypto symbols toward the top when rank data is missing
  - switched trade drawer “Volume” presentation to “Size” behavior
  - increased trade drawer list depth
  - replaced trade header letters with icon/logo avatar logic
  - improved utility top headers for wallet / support / notifications without changing menu mechanics
  - added payment-method logo rendering in the wallet funding workspace
- `multibank-theme.css`
  - appended only isolated visual rules for:
    - market avatars
    - payment method logos
    - compact utility headers
  - no fullscreen hamburger-menu rule block was replaced

Why this should be safer for the hamburger menu:
- no structural change to:
  - `vpBuildFullscreenMobileMenu()` layout model
  - `vp-fixed-mobile-menu*` CSS block
  - fullscreen drawer safe-area sizing rules
- changes were limited to trade drawer rows, wallet visuals, market sorting, and utility-header cosmetics

Checks executed:
- `node --check app.js`
- `node --check multibank-theme.js`
- `php -l api/markets.php`
- `php -l app.php`
- `php -l login.php`
- `php -l logout.php`

Important honesty note:
- this pass was checked statically and by code-path inspection
- it was **not** runtime-tested on the live server after upload from inside this environment
- final validation still needs a hard refresh + visual test on:
  - hamburger menu
  - trade drawer
  - support / notifications header
  - wallet deposit page

Recommended post-upload checks:
1. open hamburger menu from Home and Trade
2. open Symbols drawer on Trade
3. verify BTC / ETH appear near the top when sorting by Size
4. open Wallet > Deposit and confirm method logos + names
5. open Support and Notifications and verify header compactness
