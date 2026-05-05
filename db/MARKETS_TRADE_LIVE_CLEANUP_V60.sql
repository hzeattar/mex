-- اختياري: تنظيف آمن لتاريخ الأسعار اللحظي والاقتباسات غير الكريبتو قبل إعادة البناء
DELETE FROM market_ticks WHERE symbol IN (SELECT symbol FROM markets WHERE type IN ('forex','stocks','commodities'));
DELETE FROM market_quotes WHERE symbol IN (SELECT symbol FROM markets WHERE type IN ('forex','stocks','commodities'));
