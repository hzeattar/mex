-- Optional cleanup after deploying v30
-- 1) Clear stale commodity quotes so they are rebuilt from the corrected source path
DELETE FROM market_quotes WHERE symbol IN (
  'XAUUSD','XAGUSD','USOIL','WTI','OIL','UKOIL','BRENT','NGAS','GAS','GASOLINE','HEATOIL',
  'COPPER','ALUMINUM','PLAT','PALL','CORN','WHEAT','SOY','SUGAR','COFFEE','COTTON','COCOA',
  'RICE','OAT','ORANGE','LUMBER','CATTLE','HOGS','GLD','SLV','URANIUM','COAL','FERT','WATER'
);

-- 2) Remove old proxy polygon_ticker mappings from commodities meta when present
UPDATE markets
SET meta = JSON_REMOVE(meta, '$.polygon_ticker')
WHERE type='commodities'
  AND JSON_VALID(meta)
  AND JSON_UNQUOTE(JSON_EXTRACT(meta, '$.polygon_ticker')) IN (
    'USO','BNO','UNG','CPER','UGA','UHN','CORN','WEAT','SOYB','CANE','JO','BAL','NIB',
    'PPLT','PALL','JJU','JJN'
  );
