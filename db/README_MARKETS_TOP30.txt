Top 30 Stocks + Top 30 Commodities (Curated)

1) Open phpMyAdmin -> select DB -> SQL tab
2) Run: public_html/db/curate_top30_stocks_commodities.sql
   - It will activate and order only the curated 30 + 30
   - It will disable the rest (safe; no delete)

After running, verify:
  SELECT type, COUNT(*) FROM markets WHERE status='active' AND type IN ('stocks','commodities') GROUP BY type;
Should return:
  stocks = 30
  commodities = 30

Notes:
- Crypto and Forex lists are untouched.
- The application APIs are updated to order by (type, sort_order, id) so UI matches admin ordering.
