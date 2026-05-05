-- Enable KYC for deposits and keep withdrawals open unless you choose otherwise
INSERT INTO feature_flags(flag_key, enabled, updated_at) VALUES ('kyc_required_deposit', 1, UNIX_TIMESTAMP())
  ON DUPLICATE KEY UPDATE enabled=VALUES(enabled), updated_at=VALUES(updated_at);
INSERT INTO feature_flags(flag_key, enabled, updated_at) VALUES ('kyc_required_withdraw', 0, UNIX_TIMESTAMP())
  ON DUPLICATE KEY UPDATE enabled=VALUES(enabled), updated_at=VALUES(updated_at);
