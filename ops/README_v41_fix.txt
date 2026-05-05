v41 notes
- Fixes commodity Yahoo ticker normalization so stale DB meta like GC=F cannot override XAUUSD=X.
- Speeds chart first paint by reusing a fresh DB quote before expensive upstream calls.
- Lowers chart fast prime size for quicker initial render.
- Includes db_cleanup_v41.sql and cache_cleanup_v41.sh for one-time production cleanup.
