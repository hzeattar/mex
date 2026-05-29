import{s as w,g as i,i as z,e as d,a as _,$ as o,b as E,c as f,_ as $t,d as x,n as Z,f as L,m as h,p as st}from"./main-ByJy863J.js";import{m as wt,a as St}from"./marketIcon-BqfrwX_4.js";let Y=null,A=null,k=0,T=null;const kt=6500;function Lt(t,e,s,a,l={}){if(R(),!t||!t.length)return R;const r=++k,n=it(t,l.maxSymbols||18);return n.length&&(typeof EventSource=="function"?_t(n,e,s,a,r,l):F(n,e,s,a,r,l)),R}function it(t,e){const s=Math.max(1,Number(e||18));return[...new Set((t||[]).map(a=>String(a||"").toUpperCase()).filter(Boolean))].slice(0,s)}function _t(t,e,s,a,l,r){P();const n="/api/stream/sse.php?symbols="+encodeURIComponent(t.join(","))+"&type="+encodeURIComponent(e)+"&scope=watchlist";let c=!1,u=setTimeout(()=>{l!==k||c||(P(),F(t,e,s,a,l,r))},Math.max(3e3,Number(r.fallbackAfter||5e3)));T=new EventSource(n,{withCredentials:!0}),T.addEventListener("open",()=>{c=!0,u&&(clearTimeout(u),u=null)}),T.addEventListener("message",p=>{if(l===k)try{const m=JSON.parse(p.data||"[]");Array.isArray(m)&&m.length&&s&&s(m)}catch{}}),T.addEventListener("reconnect",()=>{l===k&&(P(),F(t,e,s,a,l,r))}),T.addEventListener("error",p=>{l===k&&(P(),F(t,e,s,a,l,r))})}function F(t,e,s,a,l,r){ot();const n=Math.max(4e3,Number(r.interval||kt)),c=it(t,r.maxSymbols||18),u=async()=>{if(l===k){A=new AbortController;try{const p="/api/quotes.php?symbols="+encodeURIComponent(c.join(","))+"&type="+encodeURIComponent(e)+"&visible=1&purpose=watchlist&_="+Date.now(),m=await fetch(p,{credentials:"same-origin",cache:"no-store",signal:A.signal});if(l!==k)return;if(m.ok){const b=await m.json();l===k&&b&&b.items&&s&&s(b.items)}}catch(p){p.name}finally{l===k&&(Y=setTimeout(u,n))}}};u()}function ot(){Y&&(clearTimeout(Y),Y=null),A&&(A.abort(),A=null)}function P(){T&&(T.close(),T=null)}function R(){k+=1,P(),ot()}let S=null,B=null,et=null,N=null,Q=null,I=null,q=null,j=null,V=null,y=null,$=0;const Ct=[{key:"favorites",label:"Favorites"},{key:"crypto",label:"Crypto"},{key:"forex",label:"Forex"},{key:"stocks",label:"Stocks"},{key:"commodities",label:"Commodities"},{key:"futures",label:"Futures"},{key:"arab",label:"Arab"}],Tt=["1m","5m","15m","30m","1h","4h","1d"];function ae(t){t.symbol&&w("symbol",t.symbol.toUpperCase()),t.type&&w("type",t.type),t.tf&&w("tf",t.tf);const e=i("symbol"),s=i("type"),a=i("tf");return`<div class="trade-terminal flex flex-col lg:flex-row h-full mobile-pad">
    <aside id="market-drawer" class="hidden lg:flex flex-col w-[250px] border-r border-line bg-surface shrink-0 overflow-hidden">
      <div class="lg:hidden flex items-center justify-between h-12 px-3 border-b border-line bg-panel">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-muted">Markets</div>
          <strong class="text-sm">Select instrument</strong>
        </div>
        <button class="icon-btn icon-btn-sm" id="close-mob-drawer" aria-label="Close markets">${z.close}</button>
      </div>
      <div class="p-2 border-b border-line">
        <div class="relative">
          <input type="search" class="input pl-7" placeholder="Search symbol..." id="sym-search" />
          <span class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted">${z.search}</span>
        </div>
      </div>
      <div class="flex gap-1 p-2 overflow-x-auto border-b border-line" id="type-tabs">
        ${Ct.map(l=>`<button class="btn-xs ${l.key===s?"bg-accent/20 text-accent border-accent/40":"text-muted border-line"} border rounded-md whitespace-nowrap" data-type-tab="${l.key}">${l.label}</button>`).join("")}
      </div>
      <div class="flex-1 overflow-auto p-1" id="symbol-list"><div class="p-4"><div class="loading-spinner mx-auto"></div></div></div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div class="flex items-center justify-between px-2 lg:px-4 h-11 border-b border-line bg-surface shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <button class="lg:hidden w-8 h-8 grid place-items-center rounded border border-line text-muted shrink-0" id="mob-mkt-btn" aria-label="Open markets">${z.menu}</button>
          ${at(e,s,"w-7 h-7 rounded-md shrink-0")}
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <strong class="text-sm truncate" id="sym-name">${d(e)}</strong>
              <span class="w-2 h-2 rounded-full bg-muted shrink-0" id="conn-dot" title="Connecting"></span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold" id="live-price">--</span>
              <span class="text-[10px]" id="live-change">+0.00%</span>
              <span class="status-chip status-chip-locked !text-[8px] !px-1.5 !py-0.5" id="quote-state">Loading</span>
            </div>
          </div>
        </div>
        <div class="flex gap-0.5 overflow-x-auto max-w-[46vw] lg:max-w-none" id="tf-bar">
          ${Tt.map(l=>`<button class="px-1.5 py-1 text-[10px] rounded shrink-0 ${l===a?"bg-accent/20 text-accent":"text-muted hover:text-text"}" data-tf="${l}">${l}</button>`).join("")}
        </div>
      </div>

      <div class="flex-1 relative min-h-[260px] bg-bg" id="chart-box">
        <div class="absolute inset-0 flex items-center justify-center"><div class="text-center"><div class="loading-spinner mx-auto"></div><p class="text-[10px] text-muted mt-2">Loading live chart...</p></div></div>
      </div>

      <div class="lg:hidden grid grid-cols-2 gap-2 p-2 border-t border-line bg-surface shrink-0">
        <button class="btn-sell py-3" data-open-order="SELL">SELL</button>
        <button class="btn-buy py-3" data-open-order="BUY">BUY</button>
      </div>

      <div class="border-t border-line bg-surface max-h-[320px] lg:max-h-[220px] overflow-auto shrink-0 trade-activity-panel" id="positions-section">
        <div class="trade-activity-head">
          <div>
            <span class="text-[10px] font-semibold text-muted uppercase">Trading activity</span>
            <span class="text-[10px] text-muted ml-2" id="activity-summary">Loading...</span>
          </div>
          <div class="activity-tabs" role="tablist">
            <button class="active" data-activity-tab="positions">Positions <b id="pos-count">0</b></button>
            <button data-activity-tab="orders">Orders <b id="orders-count">0</b></button>
            <button data-activity-tab="history">History <b id="history-count">0</b></button>
          </div>
        </div>
        <div id="activity-body"><p class="text-muted text-[11px] text-center py-4">Loading...</p></div>
      </div>
    </div>

    <aside class="hidden lg:flex flex-col w-[300px] border-l border-line bg-surface shrink-0 overflow-auto">
      <div class="p-3 border-b border-line">
        <div class="text-xs font-semibold">Order Ticket</div>
        <div class="text-[10px] text-muted">${d(e)} - ${d(s.toUpperCase())}</div>
      </div>
      <div class="p-3 space-y-3" id="order-body">
        ${ct()}
      </div>
    </aside>

    ${Et(e,s)}
  </div>`}function ct(){const t=i("orderType")||"MARKET",e=Number(i("amount")||100),s=Number(i("leverage")||10),a=i("market")||"spot",l=i("activeQuote")||{},r=Number(l.price||0);return`<div class="space-y-3 order-ticket-panel" data-order-form>
    <div class="grid grid-cols-2 gap-2">
      <label class="block">
        <span class="text-[10px] text-muted">Trading type</span>
        <select class="input mt-1" data-market-type>
          <option value="spot" ${a==="spot"?"selected":""}>Spot</option>
          <option value="perp" ${a==="perp"?"selected":""}>Perpetual / Futures</option>
        </select>
      </label>
      <label class="block">
        <span class="text-[10px] text-muted">Order type</span>
        <select class="input mt-1" data-order-type>
          <option value="MARKET" ${t==="MARKET"?"selected":""}>Market</option>
          <option value="LIMIT" ${t==="LIMIT"?"selected":""}>Limit</option>
        </select>
      </label>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <button class="btn-sell trade-price-button" data-side="SELL"><small>Sell</small><span data-sell-price>${r>0?f(r,i("type")):"--"}</span></button>
      <button class="btn-buy trade-price-button" data-side="BUY"><small>Buy</small><span data-buy-price>${r>0?f(r*1.0001,i("type")):"--"}</span></button>
      </div>
      <div class="text-center"><span class="spread-display" data-spread-val>Spread: --</span></div>
      <div class="mobile-order-summary">
        <span><small>Mode</small><strong>${d(i("mode")==="real"?"Real":"Demo")}</strong></span>
        <span><small>Symbol</small><strong>${d(i("symbol")||"--")}</strong></span>
        <span><small>Asset</small><strong>${d(i("type")||"--")}</strong></span>
      </div>
      <div class="order-summary-box">
        <span><small>Available</small><strong data-avail-bal>--</strong></span>
        <span><small>Est. Units</small><strong data-est-units>--</strong></span>
        <span><small>Notional</small><strong data-est-notional>--</strong></span>
    </div>
    <label class="block">
      <span class="text-[10px] text-muted">Margin / Amount (USDT)</span>
      <input type="number" min="1" step="any" class="input mt-1" value="${E(String(e))}" data-amount />
    </label>
    <div class="quick-amount-grid" aria-label="Quick order amounts">
      ${[25,50,100,250].map(n=>`<button type="button" data-quick-amount="${n}">$${n}</button>`).join("")}
    </div>
    <label class="block">
      <span class="text-[10px] text-muted">Limit price</span>
      <input type="number" min="0" step="any" class="input mt-1" placeholder="${r>0?f(r,i("type")):"Required for limit"}" data-limit-price />
    </label>
    <label class="block">
      <span class="text-[10px] text-muted">Leverage: <strong data-lev-val>${s}x</strong></span>
      <input type="range" min="1" max="100" value="${E(String(s))}" class="w-full mt-1 accent-accent" data-leverage />
    </label>
    <div class="grid grid-cols-2 gap-2">
      <label class="block">
        <span class="text-[10px] text-muted">Take Profit</span>
        <input type="number" step="any" class="input mt-1" placeholder="Optional" data-tp />
      </label>
      <label class="block">
        <span class="text-[10px] text-muted">Stop Loss</span>
        <input type="number" step="any" class="input mt-1" placeholder="Optional" data-sl />
      </label>
    </div>
    <p class="order-ticket-note">Orders execute internally on VertexPluse at the current platform quote. Use TP/SL to document target risk for review.</p>
  </div>`}function Et(t,e){return`<div class="fixed inset-0 z-[230] hidden lg:hidden" id="mobile-order-sheet">
    <div class="absolute inset-0 bg-black/65" data-close-order-sheet></div>
    <div class="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-auto rounded-t-2xl border border-line bg-surface shadow-2xl">
      <div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3">
        <div class="flex items-center gap-2 min-w-0">
          ${at(t,e,"w-8 h-8 rounded-lg shrink-0")}
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider text-muted" id="mobile-order-side-label">Order</div>
            <strong class="text-sm truncate">${d(t)}</strong>
          </div>
        </div>
        <button class="icon-btn icon-btn-sm" data-close-order-sheet aria-label="Close order">${z.close}</button>
      </div>
      <div class="p-4">
        ${ct()}
        <div class="order-action-sticky">
          <button class="btn-primary w-full py-3" id="mobile-submit-order" data-submit-order="BUY">Review & Place Order</button>
        </div>
      </div>
    </div>
  </div>`}function le(t){Nt(t)}function re(){$+=1,j&&(j.disconnect(),j=null),S&&(S.remove(),S=null,B=null,et=null,y=null),N&&(N(),N=null),pt(),Mt(),R(),document.body.classList.remove("trade-modal-open")}async function Nt(t){const e=i("symbol"),s=i("type"),a=i("tf"),l=++$;w("activeQuote",null);const r=vt();Qt(t),U(t),Ut(t,e,s,l),_(ht(s),{timeout:6500}).then(n=>{g(l,e,s)&&n?.items&&(ut(t,n.items),mt(t,n.items,l),dt(t,n.items,l))}).catch(()=>{if(!g(l,e,s))return;const n=o("#symbol-list",t);n&&(n.innerHTML='<p class="text-muted text-[11px] text-center py-4">Markets unavailable</p>')}),W(t,l),q=setInterval(()=>W(t,l,!0),12e3),_(`/trade/candles.php?symbol=${encodeURIComponent(e)}&type=${encodeURIComponent(s)}&tf=${encodeURIComponent(a)}&limit=220`,{timeout:1e4}).then(async n=>{await r,g(l,e,s)&&(n?.items?.length?await Ft(t,n.items,l):o("#chart-box",t).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart data unavailable</p>')}).catch(n=>{g(l,e,s)&&(console.error("Chart:",n),o("#chart-box",t).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart unavailable</p>')})}function g(t,e=i("symbol"),s=i("type")){return!(t!==$||e&&String(e).toUpperCase()!==String(i("symbol")||"").toUpperCase()||s&&H(s)!==H(i("type")))}function H(t){const e=String(t||"").toLowerCase();return e==="commodity"?"commodities":e==="stock"?"stocks":e==="future"?"futures":e}function dt(t,e,s=$){N&&(N(),N=null);const a=i("type"),l=i("symbol"),r=a==="crypto"?24:12,n=[...new Set(e.slice(0,r).map(c=>String(c.symbol||"").toUpperCase()).filter(Boolean).filter(c=>c!==String(l||"").toUpperCase()))];n.length&&(N=Lt(n,a,c=>{if(!g(s,l,a))return;K(t,c);const u=o("#conn-dot",t);u&&(u.classList.remove("bg-muted","bg-sell"),u.classList.add("bg-buy"),u.title="Live")},null,{interval:a==="crypto"?5200:7200,maxSymbols:r}))}function Ut(t,e,s,a=$){pt();const l=s==="crypto"?2200:3e3,r=async()=>{if(g(a,e,s)){I=new AbortController;try{const n=`/quotes.php?symbol=${encodeURIComponent(e)}&type=${encodeURIComponent(s)}&purpose=focus`,c=await _(n,{timeout:4500,signal:I.signal});if(!g(a,e,s))return;c?.items?.[0]&&Pt(t,c.items[0],a)}catch{g(a,e,s)&&Ot(t)}finally{g(a,e,s)&&(Q=setTimeout(r,l))}}};r()}function pt(){Q&&(clearTimeout(Q),Q=null),I&&(I.abort(),I=null)}function Mt(){q&&(clearInterval(q),q=null)}function Ot(t){const e=o("#conn-dot",t);e&&(e.classList.remove("bg-muted","bg-buy"),e.classList.add("bg-sell"),e.title="Disconnected")}function Pt(t,e,s=$){if(!g(s,String(e?.symbol||i("symbol")).toUpperCase(),e?.type||i("type")))return;const a=Number(e.price||e.q_price||0),l=Number(e.change_pct||e.q_change||0),r=i("type");w("activeQuote",{...e,price:a,change_pct:l}),K(t,[{...e,price:a,change_pct:l}]);const n=o("#live-price",t),c=o("#live-change",t);n&&(n.textContent=a>0?f(a,r):"--"),c&&(c.textContent=st(l),c.className=`text-[10px] ${l>=0?"text-buy":"text-sell"}`);const u=o("#quote-state",t);if(u){const p=Zt(e);u.textContent=p,u.className=`status-chip ${Vt(p)} !text-[8px] !px-1.5 !py-0.5`}L("[data-sell-price]",t).forEach(p=>{p.textContent=a>0?f(a,r):"--"}),L("[data-buy-price]",t).forEach(p=>{p.textContent=a>0?f(a*1.0001,r):"--"}),L("[data-spread-val]",t).forEach(p=>{p.textContent=a>0?`Spread: ${f(a*1e-4,r)}`:"Spread: --"}),U(t),Wt(a,s)}function U(t){const e=i("activeQuote")||{},s=Number(e.price||0),a=i("wallet")||{},l=i("mode")==="real"?a.real||{}:a.demo||{};L("[data-order-form]",t).forEach(r=>{const n=Number(o("[data-amount]",r)?.value||i("amount")||0),c=Number(o("[data-leverage]",r)?.value||i("leverage")||1),p=(o("[data-market-type]",r)?.value||i("market")||"spot")==="perp"?c:1,m=s>0?n*p/s:0,b=n*p,C=o("[data-lev-val]",r);C&&(C.textContent=`${c}x`);const v=o("[data-est-units]",r);v&&(v.textContent=m>0?m.toFixed(m>=10?3:6):"--");const M=o("[data-est-notional]",r);M&&(M.textContent=n>0?`${h(b)} USDT`:"--");const O=o("[data-avail-bal]",r);O&&(O.textContent=`${h(l.available||0)} ${l.currency||""}`)})}function ut(t,e){const s=o("#symbol-list",t);if(!s)return;const a=i("symbol"),l=e.slice(0,60);s.innerHTML=l.map(r=>{const n=String(r.symbol||"").toUpperCase(),c=r.type||i("type"),u=Number(r.price||r.q_price||0),p=Number(r.change_pct||r.q_change||0),m=!(u>0);return`<div class="symbol-row ${n===a?"active":""}" data-sym="${E(n)}" data-stype="${E(c)}">
      ${at(n,c,"w-7 h-7 rounded-md shrink-0")}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <div class="font-semibold text-[11px] truncate">${d(n)}</div>
          <span class="status-dot ${m?"bg-sell":Xt(r)}"></span>
        </div>
        <div class="text-[9px] text-muted truncate">${d(r.name||c)}</div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-[11px] font-mono" data-price-cell>${u>0?f(u,c):"--"}</div>
        <div class="text-[9px] ${p>=0?"text-buy":"text-sell"}" data-change-cell>${m?"Unavailable":st(p)}</div>
      </div>
    </div>`}).join("")}async function mt(t,e,s=$){const a=i("type"),l=e.slice(0,a==="crypto"?18:10).filter(b=>!(Number(b.price||b.q_price||0)>0)).map(b=>String(b.symbol||"").toUpperCase()).filter(Boolean);if(!l.length)return;const r=a==="crypto"?12:2,n=a==="crypto"?18:6,c=[...new Set(l)].slice(0,n),u=[];for(let b=0;b<c.length;b+=r){const C=c.slice(b,b+r),v=await _(`/quotes.php?symbols=${encodeURIComponent(C.join(","))}&type=${encodeURIComponent(a)}&cache_only=1&purpose=watchlist`,{timeout:3500}).catch(()=>null);if(!g(s))return;v?.items?.length&&K(t,v.items),C.forEach(M=>{const O=L(".symbol-row",t).find(xt=>xt.dataset.sym===M);O&&o("[data-price-cell]",O)?.textContent!=="--"||u.push(M)})}const p=a==="crypto"?6:2,m=[...new Set(u)].slice(0,a==="crypto"?8:3);for(let b=0;b<m.length;b+=p){const C=m.slice(b,b+p),v=await _(`/quotes.php?symbols=${encodeURIComponent(C.join(","))}&type=${encodeURIComponent(a)}&purpose=focus`,{timeout:4200}).catch(()=>null);if(!g(s))return;v?.items?.length&&K(t,v.items)}}function K(t,e){e?.length&&e.forEach(s=>{const a=String(s.symbol||"").toUpperCase();if(!a)return;const l=L(".symbol-row",t).find(m=>m.dataset.sym===a);if(!l)return;const r=l.dataset.stype||i("type"),n=Number(s.price||s.q_price||0),c=Number(s.change_pct||s.q_change||0),u=o("[data-price-cell]",l),p=o("[data-change-cell]",l);u&&n>0&&(u.textContent=f(n,r)),p&&(p.textContent=st(c),p.className=`text-[9px] ${c>=0?"text-buy":"text-sell"}`)})}async function W(t,e=$,s=!1){if(!g(e))return;const a=o("#activity-body",t);a&&!s&&!t.__tradeActivityLoaded&&(a.innerHTML='<p class="text-muted text-[11px] text-center py-4">Loading trading activity...</p>');const[l,r]=await Promise.allSettled([_("/trade/portfolio.php",{timeout:6500}),_("/trade/orders.php?limit=90",{timeout:6500})]);if(!g(e))return;const n=l.status==="fulfilled"?l.value:null,c=r.status==="fulfilled"?r.value:null;n?.positions&&(t.__tradePositions=n.positions),(c?.items||c?.orders)&&(t.__tradeOrders=c.items||c.orders||[]),t.__tradeActivityLoaded=!0,bt(t)}function bt(t){const e=t.__tradePositions||[],s=t.__tradeOrders||[],a=s.filter(m=>!lt(m)),l=s.filter(lt),r=t.__tradeActivityTab||"positions",n=o("#pos-count",t),c=o("#orders-count",t),u=o("#history-count",t),p=o("#activity-summary",t);return n&&(n.textContent=String(e.length)),c&&(c.textContent=String(a.length)),u&&(u.textContent=String(l.length)),p&&(p.textContent=`${e.length} open / ${a.length} pending / ${l.length} closed`),L("[data-activity-tab]",t).forEach(m=>{m.classList.toggle("active",m.dataset.activityTab===r)}),r==="orders"?At(t,a):r==="history"?It(t,l):Rt(t,e)}function Rt(t,e){const s=o("#activity-body",t);if(s){if(!e.length){s.innerHTML='<p class="text-muted text-[11px] text-center py-3">No open positions</p>';return}s.innerHTML=`
    <div class="trade-position-cards lg:hidden">
      ${e.slice(0,12).map(Bt).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[620px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">Mark</th><th class="text-right py-1">Size</th><th class="text-right py-1">Lev</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1"></th>
      </tr></thead>
      <tbody>${e.slice(0,12).map(jt).join("")}</tbody>
    </table></div>`}}function At(t,e){const s=o("#activity-body",t);if(s){if(!e.length){s.innerHTML='<p class="text-muted text-[11px] text-center py-4">No pending or armed orders</p>';return}s.innerHTML=`
    <div class="trade-position-cards lg:hidden">
      ${e.slice(0,16).map(Dt).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[720px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">Amount</th><th class="text-right py-1">Lev</th><th class="text-right py-1">Status</th><th class="text-right px-3 py-1">Created</th>
      </tr></thead>
      <tbody>${e.slice(0,16).map(Ht).join("")}</tbody>
    </table></div>`}}function It(t,e){const s=o("#activity-body",t);if(s){if(!e.length){s.innerHTML='<p class="text-muted text-[11px] text-center py-4">No closed trades yet</p>';return}s.innerHTML=`
    <div class="trade-position-cards lg:hidden">
      ${e.slice(0,18).map(Yt).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[820px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">Exit</th><th class="text-right py-1">Used</th><th class="text-right py-1">Fee</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1">Closed</th>
      </tr></thead>
      <tbody>${e.slice(0,18).map(zt).join("")}</tbody>
    </table></div>`}}function ft(t){const e=Number(t.pnl||t.unrealized_pnl||0),s=String(t.symbol||"").replace("@R@",""),a=t.asset_type||i("type"),l=Number(t.mark_price||t.current_price||t.price||0),r=t.position_id||t.id||"",n=String(t.side||"buy").toUpperCase()==="SELL"?"SELL":"BUY";return{pnl:e,cleanSymbol:s,posType:a,mark:l,id:r,side:n}}function jt(t){const{pnl:e,cleanSymbol:s,posType:a,mark:l,id:r,side:n}=ft(t);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${d(s)}</td>
    <td><span class="badge-${n==="BUY"?"buy":"sell"}">${d(n)}</span></td>
    <td class="text-muted">${d(t.market_type||"spot")}</td>
    <td class="text-right font-mono">${f(t.entry_price||t.open_price,a)}</td>
    <td class="text-right font-mono">${l>0?f(l,a):"--"}</td>
    <td class="text-right font-mono">${h(t.qty||t.amount||t.size||t.units||0)}</td>
    <td class="text-right font-mono">${d(String(t.leverage||1))}x</td>
    <td class="text-right font-mono ${e>=0?"text-buy":"text-sell"}">${h(e)}</td>
    <td class="text-right px-3">${r?`<button class="btn-xs btn-ghost text-sell" data-close="${E(r)}">Close</button>`:""}</td>
  </tr>`}function Bt(t){const{pnl:e,cleanSymbol:s,posType:a,mark:l,id:r,side:n}=ft(t);return`<article class="trade-position-card">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${d(s)}</strong>
        <small>${d(t.market_type||"spot")} - ${d(t.created_at||t.opened_at||"")}</small>
      </div>
      <span class="badge-${n==="BUY"?"buy":"sell"}">${d(n)}</span>
    </div>
    <div class="trade-position-metrics">
      <span><small>Entry</small><strong>${f(t.entry_price||t.open_price,a)}</strong></span>
      <span><small>Mark</small><strong>${l>0?f(l,a):"--"}</strong></span>
      <span><small>Size</small><strong>${h(t.qty||t.amount||t.size||t.units||0)}</strong></span>
      <span><small>PnL</small><strong class="${e>=0?"text-buy":"text-sell"}">${h(e)}</strong></span>
      <span><small>Margin</small><strong>${h(t.margin_initial||t.margin||0)}</strong></span>
      <span><small>Leverage</small><strong>${d(String(t.leverage||1))}x</strong></span>
    </div>
    ${r?`<button class="btn-xs btn-ghost text-sell w-full" data-close="${E(r)}">Close position</button>`:""}
  </article>`}function lt(t){const e=String(t.status||"").toLowerCase();return e==="closed"||e==="canceled"||e==="cancelled"||e==="rejected"||Number(t.closed_at||0)>0||Number(t.exit_price||0)>0}function D(t){return String(t.symbol||"").replace("@R@","").replace("@D@","")}function J(t){return String(t.side||"BUY").toUpperCase()==="SELL"?"SELL":String(t.side||"BUY").toUpperCase()==="CLOSE"?"CLOSE":"BUY"}function G(t){return t.asset_type||t.type||i("type")}function X(t){const e=Number(t||0);if(!e)return"--";try{return new Date(e*1e3).toLocaleString([],{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})}catch{return String(t)}}function Ht(t){const e=J(t),s=G(t);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${d(D(t))}</td>
    <td><span class="badge-${e==="SELL"?"sell":"buy"}">${d(e)}</span></td>
    <td class="text-muted">${d(t.order_type||t.market_type||"market")}</td>
    <td class="text-right font-mono">${f(t.entry_price||t.fill_price||t.limit_price,s)}</td>
    <td class="text-right font-mono">${h(t.used_usdt||t.usd_amount||t.amount||0)}</td>
    <td class="text-right font-mono">${d(String(t.leverage||1))}x</td>
    <td class="text-right"><span class="status-chip status-chip-derived">${d(t.status||"open")}</span></td>
    <td class="text-right px-3 text-muted">${d(X(t.created_at))}</td>
  </tr>`}function Dt(t){const e=J(t),s=G(t);return`<article class="trade-position-card trade-activity-card">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${d(D(t))}</strong>
        <small>${d(t.order_type||"market")} - ${d(X(t.created_at))}</small>
      </div>
      <span class="badge-${e==="SELL"?"sell":"buy"}">${d(e)}</span>
    </div>
    <div class="trade-position-metrics">
      <span><small>Entry</small><strong>${f(t.entry_price||t.fill_price||t.limit_price,s)}</strong></span>
      <span><small>Amount</small><strong>${h(t.used_usdt||t.usd_amount||t.amount||0)}</strong></span>
      <span><small>Lev</small><strong>${d(String(t.leverage||1))}x</strong></span>
      <span><small>Status</small><strong>${d(t.status||"open")}</strong></span>
      <span><small>Mode</small><strong>${d(t.mode||i("mode")||"demo")}</strong></span>
      <span><small>Symbol</small><strong>${d(D(t))}</strong></span>
    </div>
  </article>`}function zt(t){const e=J(t),s=G(t),a=Number(t.pnl_usd||t.pnl||0);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${d(D(t))}</td>
    <td><span class="badge-${e==="SELL"?"sell":"buy"}">${d(e)}</span></td>
    <td class="text-muted">${d(t.market_type||t.order_type||"spot")}</td>
    <td class="text-right font-mono">${f(t.entry_price||t.fill_price,s)}</td>
    <td class="text-right font-mono">${f(t.exit_price||t.limit_price,s)}</td>
    <td class="text-right font-mono">${h(t.used_usdt||t.usd_amount||0)}</td>
    <td class="text-right font-mono">${h(t.fee_paid||0)}</td>
    <td class="text-right font-mono ${a>=0?"text-buy":"text-sell"}">${h(a)}</td>
    <td class="text-right px-3 text-muted">${d(X(t.closed_at||t.created_at))}</td>
  </tr>`}function Yt(t){const e=J(t),s=G(t),a=Number(t.pnl_usd||t.pnl||0);return`<article class="trade-position-card trade-activity-card is-history">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${d(D(t))}</strong>
        <small>${d(t.close_reason||t.status||"closed")} - ${d(X(t.closed_at||t.created_at))}</small>
      </div>
      <span class="badge-${e==="SELL"?"sell":"buy"}">${d(e)}</span>
    </div>
    <div class="trade-position-metrics">
      <span><small>Entry</small><strong>${f(t.entry_price||t.fill_price,s)}</strong></span>
      <span><small>Exit</small><strong>${f(t.exit_price||t.limit_price,s)}</strong></span>
      <span><small>Used</small><strong>${h(t.used_usdt||t.usd_amount||0)}</strong></span>
      <span><small>PnL</small><strong class="${a>=0?"text-buy":"text-sell"}">${h(a)}</strong></span>
      <span><small>Fee</small><strong>${h(t.fee_paid||0)}</strong></span>
      <span><small>Type</small><strong>${d(t.market_type||t.order_type||"--")}</strong></span>
    </div>
  </article>`}async function Ft(t,e,s=$){if(!g(s))return;const a=o("#chart-box",t);if(!a)return;const{createChart:l}=await vt();if(!g(s))return;a.innerHTML="",S=l(a,{layout:{background:{color:"#060A14"},textColor:"#8ba1cf",fontSize:11},grid:{vertLines:{color:"rgba(129,160,220,0.04)"},horzLines:{color:"rgba(129,160,220,0.04)"}},crosshair:{mode:0,vertLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"},horzLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"}},timeScale:{timeVisible:!0,secondsVisible:!1,borderColor:"rgba(129,160,220,0.08)",rightOffset:4},rightPriceScale:{borderColor:"rgba(129,160,220,0.08)"},width:Math.max(320,a.clientWidth),height:Math.max(260,a.clientHeight)}),B=S.addCandlestickSeries({upColor:"#00c087",downColor:"#f6465d",borderUpColor:"#00c087",borderDownColor:"#f6465d",wickUpColor:"#00c087",wickDownColor:"#f6465d"}),et=S.addHistogramSeries({priceFormat:{type:"volume"},priceScaleId:"vol"}),S.priceScale("vol").applyOptions({scaleMargins:{top:.84,bottom:0}});const r=e.map(n=>({time:Number(n.time||n.t),open:Number(n.open||n.o),high:Number(n.high||n.h),low:Number(n.low||n.l),close:Number(n.close||n.c),volume:Number(n.volume||n.v||0)})).filter(n=>n.time>0&&n.open>0).sort((n,c)=>n.time-c.time);B.setData(r.map(({time:n,open:c,high:u,low:p,close:m})=>({time:n,open:c,high:u,low:p,close:m}))),et.setData(r.map(n=>({time:n.time,value:n.volume,color:n.close>=n.open?"rgba(0,192,135,0.25)":"rgba(246,70,93,0.2)"}))),y=r.length?{...r[r.length-1]}:null,S.timeScale().fitContent(),j=new ResizeObserver(()=>{!S||!a||S.applyOptions({width:Math.max(320,a.clientWidth),height:Math.max(260,a.clientHeight)})}),j.observe(a)}function Qt(t){o("#mob-mkt-btn",t)?.addEventListener("click",()=>qt(t)),o("#close-mob-drawer",t)?.addEventListener("click",()=>nt(t)),x(t,"[data-sym]","click",(e,s)=>{nt(t),localStorage.setItem("vp_symbol",s.dataset.sym),localStorage.setItem("vp_type",s.dataset.stype||i("type")),Z("trade",{symbol:s.dataset.sym,type:s.dataset.stype||i("type"),tf:i("tf")})}),x(t,"[data-tf]","click",(e,s)=>{w("tf",s.dataset.tf),localStorage.setItem("vp_tf",s.dataset.tf),Z("trade",{symbol:i("symbol"),type:i("type"),tf:s.dataset.tf})}),x(t,"[data-type-tab]","click",async(e,s)=>{w("type",s.dataset.typeTab),localStorage.setItem("vp_type",s.dataset.typeTab);const a=await _(ht(s.dataset.typeTab),{timeout:6e3}).catch(()=>null);if(a?.items){const l=a.items.find(r=>r?.symbol);if(l?.symbol&&H(s.dataset.typeTab)!=="favorites"){const r=String(l.symbol).toUpperCase();localStorage.setItem("vp_symbol",r),Z("trade",{symbol:r,type:s.dataset.typeTab,tf:i("tf")});return}ut(t,a.items),mt(t,a.items,$),dt(t,a.items,$)}L("[data-type-tab]",t).forEach(l=>{const r=l===s;l.classList.toggle("bg-accent/20",r),l.classList.toggle("text-accent",r),l.classList.toggle("border-accent/40",r)})}),x(t,"[data-open-order]","click",(e,s)=>Kt(t,s.dataset.openOrder)),x(t,"[data-close-order-sheet]","click",()=>yt(t)),x(t,"[data-submit-order]","click",(e,s)=>rt(s.dataset.submitOrder,t,o("#mobile-order-sheet [data-order-form]",t))),x(t,"[data-side]","click",(e,s)=>{const a=s.closest("#mobile-order-sheet"),l=s.closest("[data-order-form]");if(a){gt(t,s.dataset.side);return}rt(s.dataset.side,t,l)}),x(t,"[data-order-type]","change",(e,s)=>w("orderType",s.value)),x(t,"[data-market-type]","change",(e,s)=>{w("market",s.value),localStorage.setItem("vp_market",s.value),U(t)}),x(t,"[data-leverage]","input",(e,s)=>{w("leverage",Number(s.value)),tt(t,"leverage",s.value),U(t)}),x(t,"[data-amount]","input",(e,s)=>{w("amount",Number(s.value)),tt(t,"amount",s.value),U(t)}),x(t,"[data-close]","click",async(e,s)=>{await _("/trade/close_position.php",{method:"POST",body:{position_id:s.dataset.close},timeout:8e3}).catch(()=>null),await W(t,$)}),x(t,"[data-activity-tab]","click",(e,s)=>{t.__tradeActivityTab=s.dataset.activityTab||"positions",bt(t)}),x(t,"[data-quick-amount]","click",(e,s)=>{const a=Number(s.dataset.quickAmount||0);a>0&&(w("amount",a),tt(t,"amount",a),U(t))}),o("#sym-search",t)?.addEventListener("input",e=>{const s=e.target.value.toLowerCase();L(".symbol-row",t).forEach(a=>{a.style.display=a.dataset.sym.toLowerCase().includes(s)?"":"none"})})}async function rt(t,e,s){const a=i("activeQuote")||{},l=Number(a.price||0);if(!l){alert("No live price available yet. Please wait for the quote to load.");return}const r=s||o("[data-order-form]",e)||e,n=Number(o("[data-amount]",r)?.value||i("amount")||0),c=Number(o("[data-leverage]",r)?.value||i("leverage")||1),u=Number(o("[data-tp]",r)?.value||0),p=Number(o("[data-sl]",r)?.value||0),m=o("[data-market-type]",r)?.value||i("market")||"spot",b=o("[data-order-type]",r)?.value||i("orderType")||"MARKET",C=Number(o("[data-limit-price]",r)?.value||0);if(n<=0){alert("Enter a valid amount first.");return}if(t==="BUY"&&p>0&&p>=l){alert("For BUY orders, Stop Loss should be below the current price.");return}if(t==="SELL"&&p>0&&p<=l){alert("For SELL orders, Stop Loss should be above the current price.");return}try{const v=await _("/trade/place_order.php",{method:"POST",body:{symbol:i("symbol"),asset_type:i("type"),market_type:m,side:t,order_type:b,usd:n,leverage:c,tp:u||void 0,sl:p||void 0,price:b==="LIMIT"&&C||l,mode:i("mode")},timeout:1e4});if(v&&v.ok===!1){alert(v.error||"Order failed");return}yt(e),await W(e,$)}catch(v){console.error("Order failed:",v),alert(v.message||"Order failed")}}function qt(t){const e=o("#market-drawer",t);e&&(e.classList.add("mobile-market-open"),e.classList.remove("hidden"),document.body.classList.add("trade-modal-open"))}function nt(t){const e=o("#market-drawer",t);e&&(e.classList.remove("mobile-market-open"),window.innerWidth<1024&&e.classList.add("hidden"),document.body.classList.remove("trade-modal-open"))}function Kt(t,e){const s=o("#mobile-order-sheet",t);s&&(gt(t,e),s.classList.remove("hidden"),document.body.classList.add("trade-modal-open"),U(t))}function yt(t){const e=o("#mobile-order-sheet",t);e&&e.classList.add("hidden"),document.body.classList.remove("trade-modal-open")}function gt(t,e){const s=o("#mobile-submit-order",t),a=o("#mobile-order-side-label",t);s&&(s.dataset.submitOrder=e,s.textContent=`Review & ${e==="BUY"?"Buy":"Sell"}`,s.className=`${e==="BUY"?"btn-buy":"btn-sell"} w-full py-3`),a&&(a.textContent=`${e} order`)}function tt(t,e,s){L(`[data-${e}]`,t).forEach(a=>{String(a.value)!==String(s)&&(a.value=s)})}function Wt(t,e=$){if(!g(e)||!B||!y||!(t>0))return;const s=Jt();s<=y.time?(y.close=t,y.high=Math.max(y.high,t),y.low=Math.min(y.low,t)):y={time:s,open:y.close,high:Math.max(y.close,t),low:Math.min(y.close,t),close:t,volume:0},B.update({time:y.time,open:y.open,high:y.high,low:y.low,close:y.close})}function Jt(){const t=Gt(i("tf")),e=Math.floor(Date.now()/1e3);return Math.floor(e/t)*t}function Gt(t){return{"1m":60,"5m":300,"15m":900,"30m":1800,"1h":3600,"4h":14400,"1d":86400}[t]||60}function vt(){return V||(V=$t(()=>import("./chart-DbDccfIU.js"),[])),V}function ht(t){const e=H(t||"crypto");return`/markets.php?type=${encodeURIComponent(e==="favorites"?"crypto":e)}&scope=trade&supported=1&lite=1&with_quotes=1`}function Xt(t){const e=String(t?.source||"").toLowerCase();return String(t?.timing_class||"").toLowerCase()==="stale"||t?.is_stale||e.includes("yahoo")?"bg-spread":"bg-buy"}function Zt(t){const e=String(t?.timing_class||"").toLowerCase(),s=String(t?.source||"").toLowerCase();return Number(t?.price||0)<=0?"Unavailable":e==="stale"||t?.is_stale?"Stale":e==="delayed"||s.includes("yahoo")||["stocks","arab"].includes(H(t?.type||i("type")))?"Delayed":e==="candle_fallback"?"Chart quote":"Live"}function Vt(t){const e=String(t||"").toLowerCase();return e==="live"?"status-chip-live":e==="unavailable"?"status-chip-locked":"status-chip-delayed"}function at(t,e,s){return`<span class="${s} grid place-items-center overflow-hidden border border-line bg-surface">
    <img src="${E(wt({symbol:t,type:e},e))}" class="h-full w-full object-cover" alt="${E(t)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';" />
    <b class="hidden h-full w-full place-items-center bg-accent/20 text-[9px] font-black">${d(St(t))}</b>
  </span>`}export{re as cleanup,le as mount,ae as render};
