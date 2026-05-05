-- Safe normalization for the managers module
-- Run once from phpMyAdmin if you want to clean old legacy statuses.

-- 1) Normalize legacy statuses used by older builds
UPDATE managers SET status = 'active' WHERE status = 'approved';
UPDATE managers SET status = 'pending' WHERE status = 'pending_review';

-- 2) Inspect current statuses
-- SELECT status, COUNT(*) AS cnt FROM managers GROUP BY status ORDER BY status;

-- 3) Optional: if the lead module is no longer used anywhere, uncomment the DROP statements below.
-- DROP TABLE IF EXISTS lead_messages;
-- DROP TABLE IF EXISTS lead_events;
-- DROP TABLE IF EXISTS leads;
-- DROP TABLE IF EXISTS leadbot_states;
-- DROP TABLE IF EXISTS lead_campaigns;
-- DROP TABLE IF EXISTS lead_bots;
