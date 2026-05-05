# Phase121 Quotes 500 Hotfix

Root cause fixed:
- `api/quotes.php` used `count($list)` before `$list` was initialized.
- On PHP 8 this can throw a fatal error for `fresh=1` non-crypto requests, producing 500 responses.
- This explains why stocks, arab, forex, futures and even some commodities refreshes were failing while cached UI fragments still appeared.

Fix:
- Initialize and parse `$list` before any `count($list)` logic.
- Keep the existing large-batch non-crypto fresh downgrade logic, but run it only after symbols are parsed.
