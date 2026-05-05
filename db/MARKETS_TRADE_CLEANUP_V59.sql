-- اختياري: استخدمه فقط بعد رفع v59 لو كان عندك بقايا أسعار/تيكات قديمة
-- من محاولات سابقة وتريد بدءًا نظيفًا لأسواق الفوركس/الأسهم/السلع.

DELETE FROM market_ticks
WHERE symbol IN (
  SELECT symbol FROM markets WHERE type IN ('forex','stocks','commodities')
);

DELETE FROM market_quotes
WHERE symbol IN (
  SELECT symbol FROM markets WHERE type IN ('forex','stocks','commodities')
);
