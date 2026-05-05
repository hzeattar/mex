-- Optional one-time cleanup for old manager statuses.
-- Safe to run multiple times.

UPDATE managers
SET status = 'active', updated_at = UNIX_TIMESTAMP()
WHERE status = 'approved';

-- Quick check
SELECT status, COUNT(*) AS cnt
FROM managers
GROUP BY status
ORDER BY status;
