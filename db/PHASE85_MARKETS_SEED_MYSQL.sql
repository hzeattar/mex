-- Phase85: seed missing forex, stocks and arab symbols
INSERT INTO markets (symbol,name,type,status,sort_order,tv_symbol,seed_price,meta)
SELECT 'AUDUSD','Australian Dollar / US Dollar','forex','active',10,'FX:AUDUSD',0.0,'{"yahoo_ticker":"AUDUSD=X"}'
WHERE NOT EXISTS (SELECT 1 FROM markets WHERE symbol='AUDUSD' AND type='forex');
INSERT INTO markets (symbol,name,type,status,sort_order,tv_symbol,seed_price,meta)
SELECT 'EURUSD','Euro / US Dollar','forex','active',12,'FX:EURUSD',0.0,'{"yahoo_ticker":"EURUSD=X"}'
WHERE NOT EXISTS (SELECT 1 FROM markets WHERE symbol='EURUSD' AND type='forex');
INSERT INTO markets (symbol,name,type,status,sort_order,tv_symbol,seed_price,meta)
SELECT 'GBPUSD','British Pound / US Dollar','forex','active',14,'FX:GBPUSD',0.0,'{"yahoo_ticker":"GBPUSD=X"}'
WHERE NOT EXISTS (SELECT 1 FROM markets WHERE symbol='GBPUSD' AND type='forex');
INSERT INTO markets (symbol,name,type,status,sort_order,tv_symbol,seed_price,meta)
SELECT 'USDJPY','US Dollar / Japanese Yen','forex','active',16,'FX:USDJPY',0.0,'{"yahoo_ticker":"JPY=X"}'
WHERE NOT EXISTS (SELECT 1 FROM markets WHERE symbol='USDJPY' AND type='forex');
INSERT INTO markets (symbol,name,type,status,sort_order,tv_symbol,seed_price,meta)
SELECT 'USDCHF','US Dollar / Swiss Franc','forex','active',18,'FX:USDCHF',0.0,'{"yahoo_ticker":"CHF=X"}'
WHERE NOT EXISTS (SELECT 1 FROM markets WHERE symbol='USDCHF' AND type='forex');
INSERT INTO markets (symbol,name,type,status,sort_order,tv_symbol,seed_price,meta)
SELECT 'USDCAD','US Dollar / Canadian Dollar','forex','active',20,'FX:USDCAD',0.0,'{"yahoo_ticker":"CAD=X"}'
WHERE NOT EXISTS (SELECT 1 FROM markets WHERE symbol='USDCAD' AND type='forex');
INSERT INTO markets (symbol,name,type,status,sort_order,tv_symbol,seed_price,meta)
SELECT 'NZDUSD','New Zealand Dollar / US Dollar','forex','active',22,'FX:NZDUSD',0.0,'{"yahoo_ticker":"NZDUSD=X"}'
WHERE NOT EXISTS (SELECT 1 FROM markets WHERE symbol='NZDUSD' AND type='forex');

INSERT INTO markets (symbol,name,type,status,sort_order,tv_symbol,seed_price,meta)
SELECT 'AAPL','Apple Inc.','stocks','active',10,'NASDAQ:AAPL',0.0,'{}'
WHERE NOT EXISTS (SELECT 1 FROM markets WHERE symbol='AAPL' AND type='stocks');
INSERT INTO markets (symbol,name,type,status,sort_order,tv_symbol,seed_price,meta)
SELECT 'MSFT','Microsoft Corp.','stocks','active',12,'NASDAQ:MSFT',0.0,'{}'
WHERE NOT EXISTS (SELECT 1 FROM markets WHERE symbol='MSFT' AND type='stocks');
INSERT INTO markets (symbol,name,type,status,sort_order,tv_symbol,seed_price,meta)
SELECT 'NVDA','NVIDIA Corp.','stocks','active',14,'NASDAQ:NVDA',0.0,'{}'
WHERE NOT EXISTS (SELECT 1 FROM markets WHERE symbol='NVDA' AND type='stocks');
INSERT INTO markets (symbol,name,type,status,sort_order,tv_symbol,seed_price,meta)
SELECT 'AMZN','Amazon.com Inc.','stocks','active',16,'NASDAQ:AMZN',0.0,'{}'
WHERE NOT EXISTS (SELECT 1 FROM markets WHERE symbol='AMZN' AND type='stocks');
INSERT INTO markets (symbol,name,type,status,sort_order,tv_symbol,seed_price,meta)
SELECT 'GOOGL','Alphabet (Class A)','stocks','active',18,'NASDAQ:GOOGL',0.0,'{}'
WHERE NOT EXISTS (SELECT 1 FROM markets WHERE symbol='GOOGL' AND type='stocks');
INSERT INTO markets (symbol,name,type,status,sort_order,tv_symbol,seed_price,meta)
SELECT 'META','Meta Platforms','stocks','active',20,'NASDAQ:META',0.0,'{}'
WHERE NOT EXISTS (SELECT 1 FROM markets WHERE symbol='META' AND type='stocks');
INSERT INTO markets (symbol,name,type,status,sort_order,tv_symbol,seed_price,meta)
SELECT 'TSLA','Tesla Inc.','stocks','active',22,'NASDAQ:TSLA',0.0,'{}'
WHERE NOT EXISTS (SELECT 1 FROM markets WHERE symbol='TSLA' AND type='stocks');

INSERT INTO markets (symbol,name,type,status,sort_order,tv_symbol,seed_price,meta)
SELECT '2222','Saudi Aramco','arab','active',10,'TADAWUL:2222',0.0,'{"exchange":"TADAWUL","eodhd_symbol":"2222.SR","yahoo_ticker":"2222.SR"}'
WHERE NOT EXISTS (SELECT 1 FROM markets WHERE symbol='2222' AND type='arab');
INSERT INTO markets (symbol,name,type,status,sort_order,tv_symbol,seed_price,meta)
SELECT '1120','Al Rajhi Bank','arab','active',12,'TADAWUL:1120',0.0,'{"exchange":"TADAWUL","eodhd_symbol":"1120.SR","yahoo_ticker":"1120.SR"}'
WHERE NOT EXISTS (SELECT 1 FROM markets WHERE symbol='1120' AND type='arab');
INSERT INTO markets (symbol,name,type,status,sort_order,tv_symbol,seed_price,meta)
SELECT '1180','SNB','arab','active',14,'TADAWUL:1180',0.0,'{"exchange":"TADAWUL","eodhd_symbol":"1180.SR","yahoo_ticker":"1180.SR"}'
WHERE NOT EXISTS (SELECT 1 FROM markets WHERE symbol='1180' AND type='arab');
INSERT INTO markets (symbol,name,type,status,sort_order,tv_symbol,seed_price,meta)
SELECT '7010','stc','arab','active',16,'TADAWUL:7010',0.0,'{"exchange":"TADAWUL","eodhd_symbol":"7010.SR","yahoo_ticker":"7010.SR"}'
WHERE NOT EXISTS (SELECT 1 FROM markets WHERE symbol='7010' AND type='arab');
INSERT INTO markets (symbol,name,type,status,sort_order,tv_symbol,seed_price,meta)
SELECT '2010','SABIC','arab','active',18,'TADAWUL:2010',0.0,'{"exchange":"TADAWUL","eodhd_symbol":"2010.SR","yahoo_ticker":"2010.SR"}'
WHERE NOT EXISTS (SELECT 1 FROM markets WHERE symbol='2010' AND type='arab');
INSERT INTO markets (symbol,name,type,status,sort_order,tv_symbol,seed_price,meta)
SELECT '1211','Maaden','arab','active',20,'TADAWUL:1211',0.0,'{"exchange":"TADAWUL","eodhd_symbol":"1211.SR","yahoo_ticker":"1211.SR"}'
WHERE NOT EXISTS (SELECT 1 FROM markets WHERE symbol='1211' AND type='arab');
