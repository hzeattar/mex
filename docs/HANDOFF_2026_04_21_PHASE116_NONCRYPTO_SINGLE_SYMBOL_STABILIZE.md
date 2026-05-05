Phase 116 – non-crypto single-symbol stabilization

Changes:
- disabled direct=1 live quote forcing from frontend for non-crypto
- active trade quote poll now uses cached /quotes.php for non-crypto first, then only asks fresh refresh behind a gate
- widened non-crypto poll interval to reduce cancellations/timeouts
- bulk non-crypto quote hydration switched from fresh=1 to cached/warm read paths in key UI flows
- single-symbol non-crypto warm path added in api/quotes.php to return recent DB quotes immediately
- when trade quote arrives before candles, frontend now seeds a local chart fallback immediately

Goal:
- stop repeated canceled single-symbol requests
- show non-crypto price faster from warm DB/cache
- let fresh refresh happen less often and only when needed
- avoid blank chart while provider candles are still loading
