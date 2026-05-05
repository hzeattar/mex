-- VertexPluse runtime bridge hotfix (MySQL)
-- Safe compatibility patch for mixed schemas observed on production.

SET @db := DATABASE();

SET @sql := IF(EXISTS(
  SELECT 1 FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='admin_audit_logs' AND COLUMN_NAME='action'
), 'SELECT 1', 'ALTER TABLE admin_audit_logs ADD COLUMN action VARCHAR(120) NULL AFTER admin_email');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(EXISTS(
  SELECT 1 FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='admin_audit_logs' AND COLUMN_NAME='entity'
), 'SELECT 1', 'ALTER TABLE admin_audit_logs ADD COLUMN entity VARCHAR(80) NULL AFTER action');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(EXISTS(
  SELECT 1 FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='admin_audit_logs' AND COLUMN_NAME='ip'
), 'SELECT 1', "ALTER TABLE admin_audit_logs ADD COLUMN ip VARCHAR(64) NOT NULL DEFAULT '' AFTER payload_json");
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(EXISTS(
  SELECT 1 FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='admin_audit_logs' AND INDEX_NAME='idx_admin_audit_action'
), 'SELECT 1', 'CREATE INDEX idx_admin_audit_action ON admin_audit_logs(action)');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(EXISTS(
  SELECT 1 FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='admin_audit_logs' AND INDEX_NAME='idx_admin_audit_entity'
), 'SELECT 1', 'CREATE INDEX idx_admin_audit_entity ON admin_audit_logs(entity, entity_id)');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE admin_audit_logs
SET action = COALESCE(NULLIF(action,''), action_key)
WHERE (action IS NULL OR action = '') AND action_key IS NOT NULL AND action_key <> '';

UPDATE admin_audit_logs
SET entity = COALESCE(NULLIF(entity,''), entity_type)
WHERE (entity IS NULL OR entity = '') AND entity_type IS NOT NULL AND entity_type <> '';

UPDATE admin_audit_logs
SET admin_email = COALESCE(NULLIF(admin_email,''), admin_actor)
WHERE (admin_email IS NULL OR admin_email = '') AND admin_actor IS NOT NULL AND admin_actor <> '';

UPDATE admin_audit_logs
SET payload_json = COALESCE(NULLIF(payload_json,''), meta_json)
WHERE (payload_json IS NULL OR payload_json = '') AND meta_json IS NOT NULL AND meta_json <> '';

UPDATE admin_audit_logs
SET ip = COALESCE(NULLIF(ip,''), ip_address)
WHERE (ip IS NULL OR ip = '') AND ip_address IS NOT NULL AND ip_address <> '';

UPDATE settings
SET setting_key = `key`
WHERE (setting_key IS NULL OR setting_key = '') AND `key` IS NOT NULL AND `key` <> '';

UPDATE settings
SET `key` = setting_key
WHERE (`key` IS NULL OR `key` = '') AND setting_key IS NOT NULL AND setting_key <> '';

UPDATE settings
SET setting_value = value
WHERE (setting_value IS NULL OR setting_value = '') AND value IS NOT NULL;

UPDATE settings
SET value = setting_value
WHERE (value IS NULL OR value = '') AND setting_value IS NOT NULL;
