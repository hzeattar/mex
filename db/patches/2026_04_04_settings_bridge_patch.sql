-- VertexPluse settings bridge patch
-- Purpose:
-- 1) backfill mixed legacy/new settings columns
-- 2) keep both schemas in sync on future INSERT/UPDATE

START TRANSACTION;

UPDATE settings
SET setting_key = `key`
WHERE (setting_key IS NULL OR setting_key = '')
  AND `key` IS NOT NULL AND `key` <> '';

UPDATE settings
SET `key` = setting_key
WHERE (`key` IS NULL OR `key` = '')
  AND setting_key IS NOT NULL AND setting_key <> '';

UPDATE settings
SET setting_value = value
WHERE setting_value IS NULL
  AND value IS NOT NULL;

UPDATE settings
SET value = setting_value
WHERE value IS NULL
  AND setting_value IS NOT NULL;

COMMIT;

DROP TRIGGER IF EXISTS trg_settings_bi;
DROP TRIGGER IF EXISTS trg_settings_bu;

DELIMITER $$
CREATE TRIGGER trg_settings_bi
BEFORE INSERT ON settings
FOR EACH ROW
BEGIN
  IF (NEW.setting_key IS NULL OR NEW.setting_key = '') AND NEW.`key` IS NOT NULL AND NEW.`key` <> '' THEN
    SET NEW.setting_key = NEW.`key`;
  END IF;
  IF (NEW.`key` IS NULL OR NEW.`key` = '') AND NEW.setting_key IS NOT NULL AND NEW.setting_key <> '' THEN
    SET NEW.`key` = NEW.setting_key;
  END IF;
  IF NEW.setting_value IS NULL AND NEW.value IS NOT NULL THEN
    SET NEW.setting_value = NEW.value;
  END IF;
  IF NEW.value IS NULL AND NEW.setting_value IS NOT NULL THEN
    SET NEW.value = NEW.setting_value;
  END IF;
END$$

CREATE TRIGGER trg_settings_bu
BEFORE UPDATE ON settings
FOR EACH ROW
BEGIN
  IF (NEW.setting_key IS NULL OR NEW.setting_key = '') AND NEW.`key` IS NOT NULL AND NEW.`key` <> '' THEN
    SET NEW.setting_key = NEW.`key`;
  END IF;
  IF (NEW.`key` IS NULL OR NEW.`key` = '') AND NEW.setting_key IS NOT NULL AND NEW.setting_key <> '' THEN
    SET NEW.`key` = NEW.setting_key;
  END IF;
  IF NEW.setting_value IS NULL AND NEW.value IS NOT NULL THEN
    SET NEW.setting_value = NEW.value;
  END IF;
  IF NEW.value IS NULL AND NEW.setting_value IS NOT NULL THEN
    SET NEW.value = NEW.setting_value;
  END IF;
END$$
DELIMITER ;
