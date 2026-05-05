# Phase123 — Non-Crypto Trade Chart + Quotes Stabilize

## What changed
- Raised QuoteCache max interval clamp from 5s to 30s so non-crypto can actually slow down.
- Non-crypto QuoteCache tick now uses cached/stale read path instead of aggressive live quote path.
- Non-crypto fallback quote branch now also uses cached/stale path instead of direct repeated API calls.
- When a non-crypto live quote arrives and the chart is still empty, the trade page now seeds a local chart immediately instead of staying blank.
- `api/quotes.php` final error path now degrades to a soft fallback payload instead of returning hard 500 for GET quote requests.

## Files changed
- assets/js/app.js
- api/quotes.php
