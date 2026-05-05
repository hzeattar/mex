# Phase121 — quotes.php fresh=1 500 regression fix

## Root cause
A regression in `api/quotes.php` evaluated `count($list)` before `$list` was initialized.
On PHP 8 this can raise a fatal `TypeError`, which surfaced as `500 Internal Server Error` for requests like:
- `/api/quotes.php?fresh=1&symbol=XAUUSD&type=commodities`
- `/api/quotes.php?fresh=1&symbol=MSFT&type=stocks`
- `/api/quotes.php?fresh=1&symbol=EURUSD&type=forex`
- `/api/quotes.php?fresh=1&symbol=2222&type=arab`

## Fix
- Parse and normalize `$list` first
- Only then apply the non-crypto `fresh=1` downgrade rule for large batches

## Expected effect
- Removes the server-side 500s on non-crypto quote refreshes
- Restores commodities/stocks/forex/arab/futures refresh path stability
