-- One-time cleanup for commodity meta so prices use reliable Yahoo futures/ETF symbols
START TRANSACTION;

UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','CL=F'), updated_at=UNIX_TIMESTAMP()
WHERE symbol IN ('USOIL','WTI','OIL') AND type='commodities';

UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','BZ=F'), updated_at=UNIX_TIMESTAMP()
WHERE symbol IN ('UKOIL','BRENT') AND type='commodities';

UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','NG=F'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='NGAS' AND type='commodities';

UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','HG=F'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='COPPER' AND type='commodities';

UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','GC=F'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='XAUUSD' AND type='commodities';

UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','SI=F'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='XAGUSD' AND type='commodities';

UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','PL=F'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='PLAT' AND type='commodities';

UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','PA=F'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='PALL' AND type='commodities';

UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','ZC=F'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='CORN' AND type='commodities';
UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','ZW=F'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='WHEAT' AND type='commodities';
UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','ZS=F'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='SOY' AND type='commodities';
UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','SB=F'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='SUGAR' AND type='commodities';
UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','KC=F'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='COFFEE' AND type='commodities';
UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','CT=F'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='COTTON' AND type='commodities';
UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','CC=F'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='COCOA' AND type='commodities';
UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','ZR=F'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='RICE' AND type='commodities';
UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','ZO=F'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='OAT' AND type='commodities';
UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','RB=F'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='GASOLINE' AND type='commodities';
UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','HO=F'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='HEATOIL' AND type='commodities';
UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','LB=F'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='LUMBER' AND type='commodities';
UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','LE=F'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='CATTLE' AND type='commodities';
UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','HE=F'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='HOGS' AND type='commodities';
UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','OJ=F'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='ORANGE' AND type='commodities';
UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','GLD'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='GLD' AND type='commodities';
UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','SLV'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='SLV' AND type='commodities';
UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','URA'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='URANIUM' AND type='commodities';
UPDATE markets
SET meta = JSON_SET(COALESCE(meta,'{}'), '$.yahoo_ticker','KOL'), updated_at=UNIX_TIMESTAMP()
WHERE symbol='COAL' AND type='commodities';

-- Remove old ETF proxy tickers from futures symbols so no code path can prefer them.
UPDATE markets
SET meta = JSON_REMOVE(COALESCE(meta,'{}'), '$.polygon_ticker'), updated_at=UNIX_TIMESTAMP()
WHERE type='commodities' AND symbol IN ('USOIL','WTI','OIL','UKOIL','BRENT','NGAS','COPPER');

COMMIT;
