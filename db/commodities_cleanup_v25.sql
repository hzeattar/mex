-- Run this once in phpMyAdmin or mysql CLI after uploading v25.
-- 1) Force reliable source mappings for supported commodity symbols
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','CL=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol IN ('USOIL','WTI','OIL') AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','BZ=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol IN ('UKOIL','BRENT') AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','NG=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol='NGAS' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','HG=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol='COPPER' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','GC=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol='XAUUSD' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','SI=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol='XAGUSD' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','PL=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol='PLAT' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','PA=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol='PALL' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','ZC=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol='CORN' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','ZW=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol='WHEAT' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','ZS=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol='SOY' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','SB=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol='SUGAR' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','KC=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol='COFFEE' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','CT=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol='COTTON' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','CC=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol='COCOA' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','ZR=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol='RICE' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','ZO=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol='OAT' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','ALI=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol='ALUMINUM' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','RB=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol='GASOLINE' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','HO=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol='HEATOIL' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','LB=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol='LUMBER' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','LE=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol='CATTLE' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','HE=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol='HOGS' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('yahoo_ticker','OJ=F'), updated_at=UNIX_TIMESTAMP() WHERE symbol='ORANGE' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('stooq_ticker','gld.us'), updated_at=UNIX_TIMESTAMP() WHERE symbol='GLD' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('stooq_ticker','slv.us'), updated_at=UNIX_TIMESTAMP() WHERE symbol='SLV' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('polygon_ticker','URA','stooq_ticker','ura.us'), updated_at=UNIX_TIMESTAMP() WHERE symbol='URANIUM' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('polygon_ticker','KOL','stooq_ticker','kol.us'), updated_at=UNIX_TIMESTAMP() WHERE symbol='COAL' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('polygon_ticker','MOO','stooq_ticker','moo.us'), updated_at=UNIX_TIMESTAMP() WHERE symbol='FERT' AND type='commodities';
UPDATE markets SET meta = JSON_OBJECT('polygon_ticker','PHO','stooq_ticker','pho.us'), updated_at=UNIX_TIMESTAMP() WHERE symbol='WATER' AND type='commodities';

-- 2) Disable unsupported commodity symbols that do not have a reliable live source in the current stack
UPDATE markets
SET status='inactive', updated_at=UNIX_TIMESTAMP()
WHERE type='commodities'
  AND symbol IN ('NICKEL','ZINC','LEAD','TIN','IRON','ETHANOL','POTASH','RUBBER','PALMOIL','OLIVEOIL','MILK','CHEESE','BUTTER','SILK','WOOL','PAPER');

-- 3) Clear all commodity quotes so fresh values are fetched immediately
DELETE q FROM market_quotes q
JOIN markets m ON m.symbol = q.symbol
WHERE m.type='commodities';
