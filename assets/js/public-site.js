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

  const LICENSE_PDF_URL = 'https://mex.ae/files/pdf/regulations/SCA_LIC-0005622_Certificate.pdf';

  function licenseCard(compact){
    return `
      <div class="${compact ? 'mex-license-card compact' : 'mex-license-card'}">
        <div class="mex-license-flag" aria-hidden="true"><span></span></div>
        <div>
          <span class="mex-license-kicker">Regulated entity</span>
          <strong>MEX GLOBAL FINANCIAL SERVICES LLC</strong>
          <p>MEX Global Financial Services LLC of the UAE is regulated by the Capital Market Authority of the UAE, as a Category 1 Trading Broker for Over-the-Counter Derivatives Contracts and Foreign Exchange Spot Markets, under ECMA license number 20200000031.</p>
        </div>
        <button type="button" class="mex-license-btn" data-license-open>View certificate</button>
      </div>`;
  }

  function injectLicenseBlocks(){
    if(!document.querySelector('.mex-public-license-section')){
      const footer = document.querySelector('.mex-footer');
      if(footer){
        footer.insertAdjacentHTML('beforebegin', `
          <section class="mex-public-license-section">
            ${licenseCard(false)}
          </section>`);
      }
    }
    const nav = document.querySelector('.mex-header-nav');
    if(nav && !nav.querySelector('.mex-mobile-license-slot')){
      nav.insertAdjacentHTML('beforeend', `<div class="mex-mobile-license-slot">${licenseCard(true)}</div>`);
    }
    ensureLicenseModal();
  }

  function ensureLicenseModal(){
    if(document.getElementById('mex-license-modal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="mex-license-modal" id="mex-license-modal" aria-hidden="true">
        <div class="mex-license-backdrop" data-license-close></div>
        <div class="mex-license-panel" role="dialog" aria-modal="true" aria-label="MEX Global license certificate">
          <div class="mex-license-panel-head">
            <div><span>SCA certificate</span><strong>MEX Global Financial Services LLC</strong></div>
            <button type="button" class="mex-license-close" data-license-close aria-label="Close">x</button>
          </div>
          <iframe title="SCA license certificate"></iframe>
        </div>
      </div>`);
  }

  function openLicenseModal(){
    ensureLicenseModal();
    const modal = document.getElementById('mex-license-modal');
    const frame = modal && modal.querySelector('iframe');
    if(frame && !frame.getAttribute('src')) frame.setAttribute('src', LICENSE_PDF_URL);
    if(modal){
      modal.setAttribute('aria-hidden','false');
      modal.classList.add('is-open');
      document.body.classList.add('mex-license-modal-open');
    }
  }

  function closeLicenseModal(){
    const modal = document.getElementById('mex-license-modal');
    if(modal){
      modal.setAttribute('aria-hidden','true');
      modal.classList.remove('is-open');
      document.body.classList.remove('mex-license-modal-open');
    }
  }

  function bindLicense(){
    document.addEventListener('click', (e)=>{
      const open = e.target.closest('[data-license-open]');
      const close = e.target.closest('[data-license-close]');
      if(open){
        e.preventDefault();
        openLicenseModal();
      }else if(close){
        e.preventDefault();
        closeLicenseModal();
      }
    });
    document.addEventListener('keydown', (e)=>{
      if(e.key === 'Escape') closeLicenseModal();
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    injectLicenseBlocks();
    bindLicense();
    bindProductTabs();
    bindCookie();
    const needsMarketHydration = !!document.querySelector('#landingTickerRow, #heroLiveStrip, #productPhoneSymbol, [data-market-type]');
    if(needsMarketHydration){
      loadMarkets();
      setInterval(()=>{ if(!document.hidden) loadMarkets(); }, 20000);
      document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) loadMarkets(true); }, {passive:true});
    }
  });
})();
