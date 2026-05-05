VertexPluse full package — menu + trade restore

What changed in this full ZIP:
- restored the existing mobile trade structure instead of replacing it with the stripped final override
- kept the symbols area / symbol name bar logic from the current theme trade build
- removed the extra trade header row above the symbols section by dropping the brand row from the compact trade header
- switched the mobile hamburger menu to a fullscreen menu layer with:
  - fixed close button at the top
  - fixed logout button at the bottom
  - scrollable middle content
  - no forced redirect to Home when closing
- preserved Trade/Funds/Portfolio/Home mobile bottom nav and removed Account from mobile bottom nav
- synced root and assets copies for multibank-theme.js and multibank-theme.css

Validation run locally:
- node --check assets/js/multibank-theme.js
- node --check multibank-theme.js
- php -l app.php
- php -l login.php
- php -l logout.php

Files changed:
- assets/js/multibank-theme.js
- multibank-theme.js
- assets/css/multibank-theme.css
- multibank-theme.css
