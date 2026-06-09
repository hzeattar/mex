-- Seed data for payment methods (Deposit & Withdraw)
-- Categories: crypto, bank, card (Stripe), manual

-- Clear existing data
DELETE FROM payment_methods WHERE is_system = 1 OR created_by = 0;

-- Insert Categories
INSERT INTO payment_method_categories (key_slug, label, hint, icon, sort_order, is_active, created_at) VALUES
('crypto', 'Cryptocurrency', 'USDT, BTC, ETH via blockchain', 'crypto', 1, 1, NOW()),
('bank', 'Bank Transfer', 'Wire, SWIFT, IBAN transfers', 'bank', 2, 1, NOW()),
('card', 'Card Payment', 'Visa/Mastercard via Stripe', 'card', 3, 1, NOW()),
('manual', 'Manual Desk', 'OTC desk review required', 'manual', 4, 1, NOW());

-- Insert Payment Methods: CRYPTO (Deposit)
INSERT INTO payment_methods (
  code, name, title, kind, category_key, currency, 
  min_amount, max_amount, provider, 
  payment_address, payment_qr_url, 
  fields, proof_required, expires_hours, 
  is_active, sort_order, created_by, created_at
) VALUES
-- USDT TRC20
('USDT_TRC20', 'USDT TRC20', 'Tether (TRC20)', 'deposit', 'crypto', 'USDT', 
  50, 50000, 'tron', 
  'TXYZ1234567890ABCDEF1234567890ABCDEF12', 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=TXYZ1234567890ABCDEF1234567890ABCDEF12',
  '{"network":{"label":"Network","value":"TRC20 (Tron)"},"confirmations":{"label":"Confirmations","value":"19 blocks"}}', 
  1, 24, 1, 1, 0, NOW()),

-- USDT ERC20
('USDT_ERC20', 'USDT ERC20', 'Tether (ERC20)', 'deposit', 'crypto', 'USDT', 
  100, 100000, 'ethereum', 
  '0x1234567890ABCDEF1234567890ABCDEF12345678', 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=0x1234567890ABCDEF1234567890ABCDEF12345678',
  '{"network":{"label":"Network","value":"ERC20 (Ethereum)"},"confirmations":{"label":"Confirmations","value":"12 blocks"},"gas":{"label":"Gas Fee","value":"Variable"}}', 
  1, 24, 1, 2, 0, NOW()),

-- BTC
('BTC', 'Bitcoin', 'Bitcoin (BTC)', 'deposit', 'crypto', 'BTC', 
  0.001, 10, 'bitcoin', 
  'bc1q1234567890abcdef1234567890abcdef123456', 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=bc1q1234567890abcdef1234567890abcdef123456',
  '{"network":{"label":"Network","value":"Bitcoin"},"confirmations":{"label":"Confirmations","value":"3 blocks"}}', 
  1, 48, 1, 3, 0, NOW()),

-- ETH
('ETH', 'Ethereum', 'Ethereum (ETH)', 'deposit', 'crypto', 'ETH', 
  0.05, 100, 'ethereum', 
  '0xABCDEF1234567890ABCDEF1234567890ABCDEF12', 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
  '{"network":{"label":"Network","value":"ERC20"},"confirmations":{"label":"Confirmations","value":"12 blocks"}}', 
  1, 24, 1, 4, 0, NOW());

-- Insert Payment Methods: BANK (Deposit)
INSERT INTO payment_methods (
  code, name, title, kind, category_key, currency, 
  min_amount, max_amount, provider, 
  fields, proof_required, expires_hours, 
  instructions, is_active, sort_order, created_by, created_at
) VALUES
-- UAE Bank Transfer
('BANK_UAE', 'UAE Bank Transfer', 'Local UAE Transfer', 'deposit', 'bank', 'AED', 
  500, 500000, 'bank_uae', 
  '{"bank_name":{"label":"Bank Name","value":"Emirates NBD"},"account_name":{"label":"Account Name","value":"MEX Global Financial Services LLC"},"account_number":{"label":"Account Number","value":"1234567890123"},"iban":{"label":"IBAN","value":"AE123456789012345678901"},"swift":{"label":"SWIFT","value":"EBILAEAD"}}',
  1, 72, 
  'Please include your MEX account ID in the transfer reference. Upload bank receipt after transfer.',
  1, 1, 0, NOW()),

-- International Wire
('BANK_INTL', 'International Wire', 'SWIFT/IBAN Transfer', 'deposit', 'bank', 'USD', 
  1000, 1000000, 'bank_intl', 
  '{"bank_name":{"label":"Bank Name","value":"JP Morgan Chase"},"account_name":{"label":"Account Name","value":"MEX Global Financial Services LLC"},"account_number":{"label":"Account Number","value":"9876543210"},"iban":{"label":"IBAN","value":"US12345678901234567890"},"swift":{"label":"SWIFT","value":"CHASUS33"},"routing":{"label":"Routing Number","value":"021000021"}}',
  1, 120, 
  'International wires may take 1-5 business days. Include all reference numbers.',
  1, 2, 0, NOW());

-- Insert Payment Methods: CARD (Stripe Deposit)
INSERT INTO payment_methods (
  code, name, title, kind, category_key, currency, 
  min_amount, max_amount, provider, 
  is_stripe, stripe_price_id, checkout_label,
  proof_required, expires_hours, 
  is_active, sort_order, created_by, created_at
) VALUES
('CARD_STRIPE', 'Credit/Debit Card', 'Visa/Mastercard', 'deposit', 'card', 'USD', 
  50, 10000, 'stripe', 
  1, 'price_1234567890', 'Continue to secure checkout',
  0, 1, 
  1, 1, 0, NOW());

-- Insert Payment Methods: CRYPTO (Withdraw)
INSERT INTO payment_methods (
  code, name, title, kind, category_key, currency, 
  min_amount, max_amount, provider, 
  fields, proof_required, expires_hours, 
  is_active, sort_order, created_by, created_at
) VALUES
('WD_USDT_TRC20', 'USDT TRC20', 'Tether (TRC20)', 'withdraw', 'crypto', 'USDT', 
  100, 50000, 'tron', 
  '[{"name":"wallet_address","label":"TRC20 Wallet Address","type":"text","placeholder":"T...","required":true},{"name":"network","label":"Network","type":"text","value":"TRC20","readonly":true}]',
  0, 24, 1, 1, 0, NOW()),

('WD_USDT_ERC20', 'USDT ERC20', 'Tether (ERC20)', 'withdraw', 'crypto', 'USDT', 
  200, 100000, 'ethereum', 
  '[{"name":"wallet_address","label":"ERC20 Wallet Address","type":"text","placeholder":"0x...","required":true},{"name":"network","label":"Network","type":"text","value":"ERC20","readonly":true}]',
  0, 24, 1, 2, 0, NOW()),

('WD_BTC', 'Bitcoin', 'Bitcoin (BTC)', 'withdraw', 'crypto', 'BTC', 
  0.002, 10, 'bitcoin', 
  '[{"name":"wallet_address","label":"BTC Address","type":"text","placeholder":"bc1...","required":true}]',
  0, 48, 1, 3, 0, NOW());

-- Insert Payment Methods: BANK (Withdraw)
INSERT INTO payment_methods (
  code, name, title, kind, category_key, currency, 
  min_amount, max_amount, provider, 
  fields, proof_required, expires_hours, 
  is_active, sort_order, created_by, created_at
) VALUES
('WD_BANK_UAE', 'UAE Bank Transfer', 'Local UAE Transfer', 'withdraw', 'bank', 'AED', 
  1000, 500000, 'bank_uae', 
  '[{"name":"bank_name","label":"Bank Name","type":"text","placeholder":"e.g. Emirates NBD","required":true},{"name":"account_name","label":"Account Holder Name","type":"text","placeholder":"Full name","required":true},{"name":"account_number","label":"Account Number","type":"text","placeholder":"1234567890","required":true},{"name":"iban","label":"IBAN","type":"text","placeholder":"AE...","required":true}]',
  0, 72, 1, 1, 0, NOW()),

('WD_BANK_INTL', 'International Wire', 'SWIFT Transfer', 'withdraw', 'bank', 'USD', 
  5000, 1000000, 'bank_intl', 
  '[{"name":"bank_name","label":"Bank Name","type":"text","required":true},{"name":"account_name","label":"Account Holder Name","type":"text","required":true},{"name":"account_number","label":"Account Number","type":"text","required":true},{"name":"iban","label":"IBAN","type":"text","required":true},{"name":"swift","label":"SWIFT Code","type":"text","required":true},{"name":"routing","label":"Routing Number (US)","type":"text","required":false}]',
  0, 120, 1, 2, 0, NOW());

-- Insert sample deposit history
INSERT INTO deposits (user_id, method, currency, amount, status, proof_url, notes, created_at, updated_at) VALUES
(1, 'USDT_TRC20', 'USDT', 5000, 'completed', 'https://example.com/proof1.jpg', 'Transaction hash: abc123', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)),
(1, 'BANK_UAE', 'AED', 10000, 'pending', NULL, 'Reference: INV-2024-001', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)),
(1, 'CARD_STRIPE', 'USD', 2500, 'completed', NULL, 'Stripe payment', DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY)),
(1, 'BTC', 'BTC', 0.5, 'completed', NULL, 'Block: 890123', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY));

-- Insert sample withdrawal history
INSERT INTO withdrawals (user_id, method, currency, amount, destination, status, notes, created_at, updated_at) VALUES
(1, 'WD_USDT_TRC20', 'USDT', 2000, 'TXYZ9876543210FEDCBA9876543210FEDCBA98', 'completed', 'To personal wallet', DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY)),
(1, 'WD_BANK_UAE', 'AED', 5000, 'IBAN: AE9876543210987654321098', 'pending', 'Monthly payout', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY));
