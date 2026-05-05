(function(){
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
  const money = (v)=>{
    const n = Number(v||0);
    if(!Number.isFinite(n)) return '—';
    if(Math.abs(n) >= 1000) return '$' + n.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});
    if(Math.abs(n) >= 1) return '$' + n.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:4});
    return '$' + n.toLocaleString(undefined,{minimumFractionDigits:4, maximumFractionDigits:6});
  };
  const pct = (v)=>{
    const n = Number(v||0);
    if(!Number.isFinite(n)) return '—';
    return `${n>=0?'+':''}${n.toFixed(2)}%`;
  };
  const productCopy = {
    forex: {
      title: 'Invest in <span>Forex</span>',
      sub: 'Trade over 55 major, cross, and exotic Forex pairs, and benefit from tight spreads in the industry.',
      a: 'Up to 500:1', aSub: 'Highest levels of leverage',
      b: '0.0* Pips', bSub: 'Tightest spreads in the industry'
    },
    stocks: {
      title: 'Trade global <span>Shares</span>',
      sub: 'Access liquid stock CFDs and follow real pricing across the most demanded listed names inside one clean dashboard.',
      a: 'Top US & EU', aSub: 'Most-followed equities',
      b: 'Fast execution', bSub: 'Web-first dealing flow'
    },
    commodities: {
      title: 'Track <span>Commodities</span>',
      sub: 'Follow metals and commodity instruments with live pricing widgets, funding, and portfolio tracking inside the same workflow.',
      a: 'Gold & Silver', aSub: 'Most demanded metals',
      b: 'Live widgets', bSub: 'Shared price infrastructure'
    }
  };

  let allItems = [];
  let currentType = 'forex';
  let loadMarketsPromise = null;
  let lastMarketsLoadAt = 0;

  function pickBySymbol(symbol){
    const up = String(symbol||'').toUpperCase();
    return allItems.find(x=>String(x.symbol||'').toUpperCase()===up) || null;
  }

  function setTickerCard(card, item){
    if(!card || !item) return;
    const ch = Number(item.change_pct||0);
    card.classList.remove('up','down','loading');
    card.classList.add(ch >= 0 ? 'up' : 'down');
    const strong = $('strong', card);
    const small = $('small', card);
    if(strong) strong.textContent = money(item.price);
    if(small) small.textContent = pct(ch);
  }

  function hydrateLandingTickers(){
    $$('#landingTickerRow .ticker-card').forEach(card=>{
      const symbol = card.getAttribute('data-symbol') || '';
      const item = pickBySymbol(symbol) || allItems.find(x=>String(x.type||'')===currentType) || null;
      if(item) setTickerCard(card, item);
    });
    $$('#heroLiveStrip [data-live-symbol]').forEach(card=>{
      const symbol = card.getAttribute('data-live-symbol') || '';
      const item = pickBySymbol(symbol);
      if(!item) return;
      const ch = Number(item.change_pct||0);
      card.classList.remove('up','down');
      card.classList.add(ch >= 0 ? 'up' : 'down');
      const strong = $('strong', card);
      const small = $('small', card);
      if(strong) strong.textContent = money(item.price);
      if(small) small.textContent = pct(ch);
    });
  }

  function hydrateProductWidget(){
    const list = allItems.filter(x=>String(x.type||'')===currentType);
    const leader = list.sort((a,b)=>Math.abs(Number(b.change_pct||0))-Math.abs(Number(a.change_pct||0)))[0] || allItems[0];
    if(!leader) return;
    const symbolEl = $('#productPhoneSymbol');
    const priceEl = $('#productPhonePrice');
    const changeEl = $('#productPhoneChange');
    if(symbolEl) symbolEl.textContent = String(leader.symbol||'—').replace('USDT',' / USDT').replace('USD',' / USD');
    if(priceEl) priceEl.textContent = money(leader.price);
    if(changeEl){
      const ch = Number(leader.change_pct||0);
      changeEl.textContent = pct(ch);
      changeEl.classList.remove('up','down');
      changeEl.classList.add(ch >= 0 ? 'up' : 'down');
    }
  }

  function hydrateProductCopy(){
    const copy = productCopy[currentType] || productCopy.forex;
    const title = document.querySelector('.product-copy-card .section-title.left');
    const sub = document.querySelector('.product-copy-card .section-sub.left');
    const boxes = $$('.product-copy-card .feature-box');
    if(title) title.innerHTML = copy.title;
    if(sub) sub.textContent = copy.sub;
    if(boxes[0]) { $('strong', boxes[0]).textContent = copy.a; $('small', boxes[0]).textContent = copy.aSub; }
    if(boxes[1]) { $('strong', boxes[1]).textContent = copy.b; $('small', boxes[1]).textContent = copy.bSub; }
  }

  function bindProductTabs(){
    $$('[data-market-type]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        $$('[data-market-type]').forEach(x=>x.classList.remove('active'));
        btn.classList.add('active');
        currentType = btn.getAttribute('data-market-type') || 'forex';
        hydrateProductCopy();
        hydrateProductWidget();
        const preferred = {
          forex:['NZDUSD','GBPUSD','USDCAD','AUDUSD','USDCHF','EURUSD'],
          stocks:['AAPL','TSLA','MSFT','NVDA','AMZN','META'],
          commodities:['XAUUSD','XAGUSD','USOIL','UKOIL','XPTUSD','XPDUSD']
        }[currentType] || [];
        const cards = $$('#landingTickerRow .ticker-card');
        cards.forEach((card, i)=> card.setAttribute('data-symbol', preferred[i] || card.getAttribute('data-symbol') || ''));
        hydrateLandingTickers();
      });
    });
  }

  async function loadMarkets(force=false){
    if(loadMarketsPromise) return loadMarketsPromise;
    const now = Date.now();
    if(!force && allItems.length && (now - lastMarketsLoadAt) < 12000) return allItems;
    loadMarketsPromise = (async()=>{
      try{
        const res = await fetch('/api/market_snapshot.php?route=home&preferred=forex&types=forex,stocks,commodities', {credentials:'same-origin'});
        const data = await res.json();
        if(!data || !data.ok || !Array.isArray(data.items)) return allItems;
        allItems = data.items.slice();
        lastMarketsLoadAt = Date.now();
        hydrateLandingTickers();
        hydrateProductCopy();
        hydrateProductWidget();
        return allItems;
      }catch(e){
        return allItems;
      }finally{
        loadMarketsPromise = null;
      }
    })();
    return loadMarketsPromise;
  }

  function bindCookie(){
    const btn = document.querySelector('.cookie-btn');
    const bar = document.querySelector('.cookie-strip');
    if(!btn || !bar) return;
    if(localStorage.getItem('vp_cookie_ok') === '1') bar.style.display = 'none';
    btn.addEventListener('click', ()=>{
      localStorage.setItem('vp_cookie_ok','1');
      bar.style.display = 'none';
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    bindProductTabs();
    bindCookie();
    loadMarkets();
    setInterval(()=>{ if(!document.hidden) loadMarkets(); }, 20000);
    document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) loadMarkets(true); }, {passive:true});
  });
})();
