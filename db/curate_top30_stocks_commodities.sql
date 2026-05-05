-- Curate Top 30 Stocks + Top 30 Commodities (disable the rest)
START TRANSACTION;

DROP TEMPORARY TABLE IF EXISTS keep_markets;
CREATE TEMPORARY TABLE keep_markets (
  type varchar(16) NOT NULL,
  symbol varchar(32) NOT NULL,
  sort_order int NOT NULL,
  name varchar(128) NULL,
  yahoo_ticker varchar(32) NULL,
  polygon_ticker varchar(32) NULL,
  stooq_ticker varchar(32) NULL,
  tv_symbol varchar(64) NULL,
  PRIMARY KEY (type, symbol)
) ENGINE=MEMORY;

INSERT INTO keep_markets (type,symbol,sort_order,name,yahoo_ticker,polygon_ticker,stooq_ticker,tv_symbol) VALUES
  ('stocks','AAPL',1,'Apple Inc.','AAPL','AAPL','aapl.us','NASDAQ:AAPL'),
  ('stocks','MSFT',2,'Microsoft Corp.','MSFT','MSFT','msft.us','NASDAQ:MSFT'),
  ('stocks','NVDA',3,'NVIDIA Corp.','NVDA','NVDA','nvda.us','NASDAQ:NVDA'),
  ('stocks','AMZN',4,'Amazon.com Inc.','AMZN','AMZN','amzn.us','NASDAQ:AMZN'),
  ('stocks','GOOGL',5,'Alphabet (Class A)','GOOGL','GOOGL','googl.us','NASDAQ:GOOGL'),
  ('stocks','META',6,'Meta Platforms','META','META','meta.us','NASDAQ:META'),
  ('stocks','TSLA',7,'Tesla Inc.','TSLA','TSLA','tsla.us','NASDAQ:TSLA'),
  ('stocks','BRK.B',8,'Berkshire Hathaway','BRK.B','BRK.B','brk-b.us','NYSE:BRK.B'),
  ('stocks','JPM',9,'JPMorgan Chase','JPM','JPM','jpm.us','NYSE:JPM'),
  ('stocks','V',10,'Visa Inc.','V','V','v.us','NYSE:V'),
  ('stocks','MA',11,'Mastercard Inc.','MA','MA','ma.us','NYSE:MA'),
  ('stocks','UNH',12,'UnitedHealth Group','UNH','UNH','unh.us','NYSE:UNH'),
  ('stocks','XOM',13,'Exxon Mobil','XOM','XOM','xom.us','NYSE:XOM'),
  ('stocks','LLY',14,'Eli Lilly','LLY','LLY','lly.us','NYSE:LLY'),
  ('stocks','AVGO',15,'Broadcom Inc.','AVGO','AVGO','avgo.us','NASDAQ:AVGO'),
  ('stocks','COST',16,'Costco Wholesale','COST','COST','cost.us','NASDAQ:COST'),
  ('stocks','NFLX',17,'Netflix Inc.','NFLX','NFLX','nflx.us','NASDAQ:NFLX'),
  ('stocks','ADBE',18,'Adobe Inc.','ADBE','ADBE','adbe.us','NASDAQ:ADBE'),
  ('stocks','CRM',19,'Salesforce','CRM','CRM','crm.us','NYSE:CRM'),
  ('stocks','ORCL',20,'Oracle Corp.','ORCL','ORCL','orcl.us','NYSE:ORCL'),
  ('stocks','CSCO',21,'Cisco Systems','CSCO','CSCO','csco.us','NASDAQ:CSCO'),
  ('stocks','PEP',22,'PepsiCo','PEP','PEP','pep.us','NASDAQ:PEP'),
  ('stocks','KO',23,'Coca-Cola','KO','KO','ko.us','NYSE:KO'),
  ('stocks','WMT',24,'Walmart','WMT','WMT','wmt.us','NYSE:WMT'),
  ('stocks','MCD',25,'McDonald\'s','MCD','MCD','mcd.us','NYSE:MCD'),
  ('stocks','NKE',26,'Nike','NKE','NKE','nke.us','NYSE:NKE'),
  ('stocks','DIS',27,'Walt Disney','DIS','DIS','dis.us','NYSE:DIS'),
  ('stocks','BA',28,'Boeing','BA','BA','ba.us','NYSE:BA'),
  ('stocks','AMD',29,'Advanced Micro Devices','AMD','AMD','amd.us','NASDAQ:AMD'),
  ('stocks','INTC',30,'Intel Corp.','INTC','INTC','intc.us','NASDAQ:INTC'),
  ('commodities','XAUUSD',1,'Gold Spot','GC=F',NULL,NULL,NULL),
  ('commodities','XAGUSD',2,'Silver Spot','SI=F',NULL,NULL,NULL),
  ('commodities','USOIL',3,'WTI Crude Oil','CL=F','USO',NULL,NULL),
  ('commodities','WTI',4,'WTI Crude Oil','CL=F','USO',NULL,NULL),
  ('commodities','OIL',5,'Crude Oil','CL=F','USO',NULL,NULL),
  ('commodities','UKOIL',6,'Brent Crude Oil','BZ=F','BNO',NULL,NULL),
  ('commodities','BRENT',7,'Brent Crude Oil','BZ=F','BNO',NULL,NULL),
  ('commodities','NGAS',8,'Natural Gas','NG=F','UNG',NULL,NULL),
  ('commodities','COPPER',9,'Copper','HG=F','CPER',NULL,NULL),
  ('commodities','PLAT',10,'Platinum','PL=F',NULL,NULL,NULL),
  ('commodities','PALL',11,'Palladium','PA=F',NULL,NULL,NULL),
  ('commodities','CORN',12,'Corn','ZC=F',NULL,NULL,NULL),
  ('commodities','WHEAT',13,'Wheat','ZW=F',NULL,NULL,NULL),
  ('commodities','SOY',14,'Soybeans','ZS=F',NULL,NULL,NULL),
  ('commodities','SUGAR',15,'Sugar','SB=F',NULL,NULL,NULL),
  ('commodities','COFFEE',16,'Coffee','KC=F',NULL,NULL,NULL),
  ('commodities','COTTON',17,'Cotton','CT=F',NULL,NULL,NULL),
  ('commodities','COCOA',18,'Cocoa','CC=F',NULL,NULL,NULL),
  ('commodities','RICE',19,'Rough Rice','ZR=F',NULL,NULL,NULL),
  ('commodities','OAT',20,'Oats','ZO=F',NULL,NULL,NULL),
  ('commodities','GASOLINE',21,'Gasoline (RBOB)','RB=F',NULL,NULL,NULL),
  ('commodities','HEATOIL',22,'Heating Oil','HO=F',NULL,NULL,NULL),
  ('commodities','LUMBER',23,'Lumber','LB=F',NULL,NULL,NULL),
  ('commodities','CATTLE',24,'Live Cattle','LE=F',NULL,NULL,NULL),
  ('commodities','HOGS',25,'Lean Hogs','HE=F',NULL,NULL,NULL),
  ('commodities','ORANGE',26,'Orange Juice','OJ=F',NULL,NULL,NULL),
  ('commodities','GLD',27,'Gold ETF','GLD',NULL,NULL,NULL),
  ('commodities','SLV',28,'Silver ETF','SLV',NULL,NULL,NULL),
  ('commodities','URANIUM',29,'Uranium ETF','URA',NULL,NULL,NULL),
  ('commodities','COAL',30,'Coal ETF','KOL',NULL,NULL,NULL);


-- Insert missing curated markets (safe)
INSERT INTO markets (symbol,name,type,status,sort_order,meta,tv_symbol,seed_price,created_at,updated_at)
SELECT k.symbol, k.name, k.type, 'active', k.sort_order,
       JSON_OBJECT(
         'source','curated',
         'yahoo_ticker', k.yahoo_ticker,
         'polygon_ticker', k.polygon_ticker,
         'stooq_ticker', k.stooq_ticker
       ),
       k.tv_symbol, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM keep_markets k
LEFT JOIN markets m ON m.symbol=k.symbol AND m.type=k.type
WHERE m.id IS NULL;

-- Update existing markets to curated settings (keep existing tv_symbol if present)
UPDATE markets m
JOIN keep_markets k ON k.symbol=m.symbol AND k.type=m.type
SET m.status='active',
    m.sort_order=k.sort_order,
    m.name=COALESCE(k.name, m.name),
    m.meta = JSON_SET(
      COALESCE(m.meta,'{}'),
      '$.source','curated',
      '$.yahoo_ticker', k.yahoo_ticker,
      '$.polygon_ticker', k.polygon_ticker,
      '$.stooq_ticker', k.stooq_ticker
    ),
    m.tv_symbol = CASE
      WHEN m.tv_symbol IS NULL OR m.tv_symbol='' THEN k.tv_symbol
      ELSE m.tv_symbol
    END,
    m.updated_at=UNIX_TIMESTAMP();

-- Disable all other stocks/commodities
UPDATE markets SET status='disabled', updated_at=UNIX_TIMESTAMP()
WHERE type='stocks' AND symbol NOT IN (SELECT symbol FROM keep_markets WHERE type='stocks');

UPDATE markets SET status='disabled', updated_at=UNIX_TIMESTAMP()
WHERE type='commodities' AND symbol NOT IN (SELECT symbol FROM keep_markets WHERE type='commodities');

-- Ensure quotes rows exist for active markets
INSERT IGNORE INTO market_quotes(symbol,type,price,change_pct,updated_at)
SELECT m.symbol, m.type, m.seed_price, 0, 0
FROM markets m
WHERE m.status='active';

COMMIT;

-- Sanity check
SELECT type, COUNT(*) active_cnt
FROM markets
WHERE status='active' AND type IN ('stocks','commodities')
GROUP BY type;

SELECT symbol,type,sort_order,
       JSON_UNQUOTE(JSON_EXTRACT(meta,'$.yahoo_ticker')) AS yahoo_ticker,
       JSON_UNQUOTE(JSON_EXTRACT(meta,'$.polygon_ticker')) AS polygon_ticker
FROM markets
WHERE status='active' AND type IN ('stocks','commodities')
ORDER BY type, sort_order, id
LIMIT 80;
