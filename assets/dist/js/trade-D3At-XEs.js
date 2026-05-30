import{s as w,g as i,i as Y,e as d,a as C,$ as o,b as U,c as f,_ as St,d as x,n as V,f as S,m as v,p as at}from"./main-B1VhLVa2.js";import{m as kt,a as Lt}from"./marketIcon-BqfrwX_4.js";let F=null,B=null,_=0,E=null;const _t=6500;function Ct(t,e,s,a,l={}){if(A(),!t||!t.length)return A;const r=++_,n=ct(t,l.maxSymbols||18);return n.length&&(typeof EventSource=="function"?Tt(n,e,s,a,r,l):Q(n,e,s,a,r,l)),A}function ct(t,e){const s=Math.max(1,Number(e||18));return[...new Set((t||[]).map(a=>String(a||"").toUpperCase()).filter(Boolean))].slice(0,s)}function Tt(t,e,s,a,l,r){R();const n="/api/stream/sse.php?symbols="+encodeURIComponent(t.join(","))+"&type="+encodeURIComponent(e)+"&scope=watchlist";let c=!1,u=setTimeout(()=>{l!==_||c||(R(),Q(t,e,s,a,l,r))},Math.max(3e3,Number(r.fallbackAfter||5e3)));E=new EventSource(n,{withCredentials:!0}),E.addEventListener("open",()=>{c=!0,u&&(clearTimeout(u),u=null)}),E.addEventListener("message",p=>{if(l===_)try{const m=JSON.parse(p.data||"[]");Array.isArray(m)&&m.length&&s&&s(m)}catch{}}),E.addEventListener("reconnect",()=>{l===_&&(R(),Q(t,e,s,a,l,r))}),E.addEventListener("error",p=>{l===_&&(R(),Q(t,e,s,a,l,r))})}function Q(t,e,s,a,l,r){dt();const n=Math.max(4e3,Number(r.interval||_t)),c=ct(t,r.maxSymbols||18),u=async()=>{if(l===_){B=new AbortController;try{const p="/api/quotes.php?symbols="+encodeURIComponent(c.join(","))+"&type="+encodeURIComponent(e)+"&visible=1&purpose=watchlist&_="+Date.now(),m=await fetch(p,{credentials:"same-origin",cache:"no-store",signal:B.signal});if(l!==_)return;if(m.ok){const b=await m.json();l===_&&b&&b.items&&s&&s(b.items)}}catch(p){p.name}finally{l===_&&(F=setTimeout(u,n))}}};u()}function dt(){F&&(clearTimeout(F),F=null),B&&(B.abort(),B=null)}function R(){E&&(E.close(),E=null)}function A(){_+=1,R(),dt()}let L=null,H=null,st=null,N=null,q=null,I=null,K=null,j=null,tt=null,y=null,$=0;const Et=[{key:"favorites",label:"Favorites"},{key:"crypto",label:"Crypto"},{key:"forex",label:"Forex"},{key:"stocks",label:"Stocks"},{key:"commodities",label:"Commodities"},{key:"futures",label:"Futures"},{key:"arab",label:"Arab"}],Ut=["1m","5m","15m","30m","1h","4h","1d"];function re(t){t.symbol&&w("symbol",t.symbol.toUpperCase()),t.type&&w("type",t.type),t.tf&&w("tf",t.tf);const e=i("symbol"),s=i("type"),a=i("tf");return`<div class="trade-terminal flex flex-col lg:flex-row h-full mobile-pad">
    <aside id="market-drawer" class="hidden lg:flex flex-col w-[250px] border-r border-line bg-surface shrink-0 overflow-hidden">
      <div class="lg:hidden flex items-center justify-between h-12 px-3 border-b border-line bg-panel">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-muted">Markets</div>
          <strong class="text-sm">Select instrument</strong>
        </div>
        <button class="icon-btn icon-btn-sm" id="close-mob-drawer" aria-label="Close markets">${Y.close}</button>
      </div>
      <div class="p-2 border-b border-line">
        <div class="relative">
          <input type="search" class="input pl-7" placeholder="Search symbol..." id="sym-search" />
          <span class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted">${Y.search}</span>
        </div>
      </div>
      <div class="flex gap-1 p-2 overflow-x-auto border-b border-line" id="type-tabs">
        ${Et.map(l=>`<button class="btn-xs ${l.key===s?"bg-accent/20 text-accent border-accent/40":"text-muted border-line"} border rounded-md whitespace-nowrap" data-type-tab="${l.key}">${l.label}</button>`).join("")}
      </div>
      <div class="flex-1 overflow-auto p-1" id="symbol-list"><div class="p-4"><div class="loading-spinner mx-auto"></div></div></div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div class="flex items-center justify-between px-2 lg:px-4 h-11 border-b border-line bg-surface shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <button class="lg:hidden w-8 h-8 grid place-items-center rounded border border-line text-muted shrink-0" id="mob-mkt-btn" aria-label="Open markets">${Y.menu}</button>
          ${lt(e,s,"w-7 h-7 rounded-md shrink-0")}
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
          ${Ut.map(l=>`<button class="px-1.5 py-1 text-[10px] rounded shrink-0 ${l===a?"bg-accent/20 text-accent":"text-muted hover:text-text"}" data-tf="${l}">${l}</button>`).join("")}
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
        ${pt()}
      </div>
    </aside>

    ${Nt(e,s)}
  </div>`}function pt(){const t=i("orderType")||"MARKET",e=Number(i("amount")||100),s=Number(i("leverage")||10),a=i("market")||"spot",l=i("activeQuote")||{},r=Number(l.price||0);return`<div class="space-y-3 order-ticket-panel" data-order-form>
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
      <input type="number" min="1" step="any" class="input mt-1" value="${U(String(e))}" data-amount />
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
      <input type="range" min="1" max="100" value="${U(String(s))}" class="w-full mt-1 accent-accent" data-leverage />
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
    <p class="order-form-status is-info" data-order-status hidden></p>
    <p class="order-ticket-note">Orders execute internally on VertexPluse at the current platform quote. Use TP/SL to document target risk for review.</p>
  </div>`}function Nt(t,e){return`<div class="fixed inset-0 z-[230] hidden lg:hidden" id="mobile-order-sheet">
    <div class="absolute inset-0 bg-black/65" data-close-order-sheet></div>
    <div class="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-auto rounded-t-2xl border border-line bg-surface shadow-2xl">
      <div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3">
        <div class="flex items-center gap-2 min-w-0">
          ${lt(t,e,"w-8 h-8 rounded-lg shrink-0")}
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider text-muted" id="mobile-order-side-label">Order</div>
            <strong class="text-sm truncate">${d(t)}</strong>
          </div>
        </div>
        <button class="icon-btn icon-btn-sm" data-close-order-sheet aria-label="Close order">${Y.close}</button>
      </div>
      <div class="p-4">
        ${pt()}
        <div class="order-action-sticky">
          <button class="btn-primary w-full py-3" id="mobile-submit-order" data-submit-order="BUY">Review & Place Order</button>
        </div>
      </div>
    </div>
  </div>`}function ne(t){Mt(t)}function ie(){$+=1,j&&(j.disconnect(),j=null),L&&(L.remove(),L=null,H=null,st=null,y=null),N&&(N(),N=null),mt(),Pt(),A(),document.body.classList.remove("trade-modal-open")}async function Mt(t){const e=i("symbol"),s=i("type"),a=i("tf"),l=++$;w("activeQuote",null);const r=xt();Kt(t),M(t),Ot(t,e,s,l),C($t(s),{timeout:6500}).then(n=>{g(l,e,s)&&n?.items&&(bt(t,n.items),ft(t,n.items,l),ut(t,n.items,l))}).catch(()=>{if(!g(l,e,s))return;const n=o("#symbol-list",t);n&&(n.innerHTML='<p class="text-muted text-[11px] text-center py-4">Markets unavailable</p>')}),J(t,l),K=setInterval(()=>J(t,l,!0),12e3),C(`/trade/candles.php?symbol=${encodeURIComponent(e)}&type=${encodeURIComponent(s)}&tf=${encodeURIComponent(a)}&limit=220`,{timeout:1e4}).then(async n=>{await r,g(l,e,s)&&(n?.items?.length?await qt(t,n.items,l):o("#chart-box",t).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart data unavailable</p>')}).catch(n=>{g(l,e,s)&&(console.error("Chart:",n),o("#chart-box",t).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart unavailable</p>')})}function g(t,e=i("symbol"),s=i("type")){return!(t!==$||e&&String(e).toUpperCase()!==String(i("symbol")||"").toUpperCase()||s&&D(s)!==D(i("type")))}function D(t){const e=String(t||"").toLowerCase();return e==="commodity"?"commodities":e==="stock"?"stocks":e==="future"?"futures":e}function ut(t,e,s=$){N&&(N(),N=null);const a=i("type"),l=i("symbol"),r=a==="crypto"?24:12,n=[...new Set(e.slice(0,r).map(c=>String(c.symbol||"").toUpperCase()).filter(Boolean).filter(c=>c!==String(l||"").toUpperCase()))];n.length&&(N=Ct(n,a,c=>{if(!g(s,l,a))return;W(t,c);const u=o("#conn-dot",t);u&&(u.classList.remove("bg-muted","bg-sell"),u.classList.add("bg-buy"),u.title="Live")},null,{interval:a==="crypto"?5200:7200,maxSymbols:r}))}function Ot(t,e,s,a=$){mt();const l=s==="crypto"?2200:3e3,r=async()=>{if(g(a,e,s)){I=new AbortController;try{const n=`/quotes.php?symbol=${encodeURIComponent(e)}&type=${encodeURIComponent(s)}&purpose=focus`,c=await C(n,{timeout:4500,signal:I.signal});if(!g(a,e,s))return;c?.items?.[0]&&At(t,c.items[0],a)}catch{g(a,e,s)&&Rt(t)}finally{g(a,e,s)&&(q=setTimeout(r,l))}}};r()}function mt(){q&&(clearTimeout(q),q=null),I&&(I.abort(),I=null)}function Pt(){K&&(clearInterval(K),K=null)}function Rt(t){const e=o("#conn-dot",t);e&&(e.classList.remove("bg-muted","bg-buy"),e.classList.add("bg-sell"),e.title="Disconnected")}function At(t,e,s=$){if(!g(s,String(e?.symbol||i("symbol")).toUpperCase(),e?.type||i("type")))return;const a=Number(e.price||e.q_price||0),l=Number(e.change_pct||e.q_change||0),r=i("type");w("activeQuote",{...e,price:a,change_pct:l}),W(t,[{...e,price:a,change_pct:l}]);const n=o("#live-price",t),c=o("#live-change",t);n&&(n.textContent=a>0?f(a,r):"--"),c&&(c.textContent=at(l),c.className=`text-[10px] ${l>=0?"text-buy":"text-sell"}`);const u=o("#quote-state",t);if(u){const p=te(e);u.textContent=p,u.className=`status-chip ${ee(p)} !text-[8px] !px-1.5 !py-0.5`}S("[data-sell-price]",t).forEach(p=>{p.textContent=a>0?f(a,r):"--"}),S("[data-buy-price]",t).forEach(p=>{p.textContent=a>0?f(a*1.0001,r):"--"}),S("[data-spread-val]",t).forEach(p=>{p.textContent=a>0?`Spread: ${f(a*1e-4,r)}`:"Spread: --"}),M(t),Gt(a,s)}function M(t){const e=i("activeQuote")||{},s=Number(e.price||0),a=i("wallet")||{},l=i("mode")==="real"?a.real||{}:a.demo||{};S("[data-order-form]",t).forEach(r=>{const n=Number(o("[data-amount]",r)?.value||i("amount")||0),c=Number(o("[data-leverage]",r)?.value||i("leverage")||1),p=(o("[data-market-type]",r)?.value||i("market")||"spot")==="perp"?c:1,m=s>0?n*p/s:0,b=n*p,T=o("[data-lev-val]",r);T&&(T.textContent=`${c}x`);const h=o("[data-est-units]",r);h&&(h.textContent=m>0?m.toFixed(m>=10?3:6):"--");const O=o("[data-est-notional]",r);O&&(O.textContent=n>0?`${v(b)} USDT`:"--");const P=o("[data-avail-bal]",r);P&&(P.textContent=`${v(l.available||0)} ${l.currency||""}`)})}function bt(t,e){const s=o("#symbol-list",t);if(!s)return;const a=i("symbol"),l=e.slice(0,60);s.innerHTML=l.map(r=>{const n=String(r.symbol||"").toUpperCase(),c=r.type||i("type"),u=Number(r.price||r.q_price||0),p=Number(r.change_pct||r.q_change||0),m=!(u>0);return`<div class="symbol-row ${n===a?"active":""}" data-sym="${U(n)}" data-stype="${U(c)}">
      ${lt(n,c,"w-7 h-7 rounded-md shrink-0")}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <div class="font-semibold text-[11px] truncate">${d(n)}</div>
          <span class="status-dot ${m?"bg-sell":Vt(r)}"></span>
        </div>
        <div class="text-[9px] text-muted truncate">${d(r.name||c)}</div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-[11px] font-mono" data-price-cell>${u>0?f(u,c):"--"}</div>
        <div class="text-[9px] ${p>=0?"text-buy":"text-sell"}" data-change-cell>${m?"Unavailable":at(p)}</div>
      </div>
    </div>`}).join("")}async function ft(t,e,s=$){const a=i("type"),l=e.slice(0,a==="crypto"?18:10).filter(b=>!(Number(b.price||b.q_price||0)>0)).map(b=>String(b.symbol||"").toUpperCase()).filter(Boolean);if(!l.length)return;const r=a==="crypto"?12:2,n=a==="crypto"?18:6,c=[...new Set(l)].slice(0,n),u=[];for(let b=0;b<c.length;b+=r){const T=c.slice(b,b+r),h=await C(`/quotes.php?symbols=${encodeURIComponent(T.join(","))}&type=${encodeURIComponent(a)}&cache_only=1&purpose=watchlist`,{timeout:3500}).catch(()=>null);if(!g(s))return;h?.items?.length&&W(t,h.items),T.forEach(O=>{const P=S(".symbol-row",t).find(wt=>wt.dataset.sym===O);P&&o("[data-price-cell]",P)?.textContent!=="--"||u.push(O)})}const p=a==="crypto"?6:2,m=[...new Set(u)].slice(0,a==="crypto"?8:3);for(let b=0;b<m.length;b+=p){const T=m.slice(b,b+p),h=await C(`/quotes.php?symbols=${encodeURIComponent(T.join(","))}&type=${encodeURIComponent(a)}&purpose=focus`,{timeout:4200}).catch(()=>null);if(!g(s))return;h?.items?.length&&W(t,h.items)}}function W(t,e){e?.length&&e.forEach(s=>{const a=String(s.symbol||"").toUpperCase();if(!a)return;const l=S(".symbol-row",t).find(m=>m.dataset.sym===a);if(!l)return;const r=l.dataset.stype||i("type"),n=Number(s.price||s.q_price||0),c=Number(s.change_pct||s.q_change||0),u=o("[data-price-cell]",l),p=o("[data-change-cell]",l);u&&n>0&&(u.textContent=f(n,r)),p&&(p.textContent=at(c),p.className=`text-[9px] ${c>=0?"text-buy":"text-sell"}`)})}async function J(t,e=$,s=!1){if(!g(e))return;const a=o("#activity-body",t);a&&!s&&!t.__tradeActivityLoaded&&(a.innerHTML='<p class="text-muted text-[11px] text-center py-4">Loading trading activity...</p>');const[l,r]=await Promise.allSettled([C("/trade/portfolio.php",{timeout:6500}),C("/trade/orders.php?limit=90",{timeout:6500})]);if(!g(e))return;const n=l.status==="fulfilled"?l.value:null,c=r.status==="fulfilled"?r.value:null;n?.positions&&(t.__tradePositions=n.positions),(c?.items||c?.orders)&&(t.__tradeOrders=c.items||c.orders||[]),t.__tradeActivityLoaded=!0,yt(t)}function yt(t){const e=t.__tradePositions||[],s=t.__tradeOrders||[],a=s.filter(m=>!rt(m)),l=s.filter(rt),r=t.__tradeActivityTab||"positions",n=o("#pos-count",t),c=o("#orders-count",t),u=o("#history-count",t),p=o("#activity-summary",t);return n&&(n.textContent=String(e.length)),c&&(c.textContent=String(a.length)),u&&(u.textContent=String(l.length)),p&&(p.textContent=`${e.length} open / ${a.length} pending / ${l.length} closed`),S("[data-activity-tab]",t).forEach(m=>{m.classList.toggle("active",m.dataset.activityTab===r)}),r==="orders"?It(t,a):r==="history"?jt(t,l):Bt(t,e)}function Bt(t,e){const s=o("#activity-body",t);if(s){if(!e.length){s.innerHTML='<p class="text-muted text-[11px] text-center py-3">No open positions</p>';return}s.innerHTML=`
    <div class="trade-position-cards lg:hidden">
      ${e.slice(0,12).map(Dt).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[620px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">Mark</th><th class="text-right py-1">Size</th><th class="text-right py-1">Lev</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1"></th>
      </tr></thead>
      <tbody>${e.slice(0,12).map(Ht).join("")}</tbody>
    </table></div>`}}function It(t,e){const s=o("#activity-body",t);if(s){if(!e.length){s.innerHTML='<p class="text-muted text-[11px] text-center py-4">No pending or armed orders</p>';return}s.innerHTML=`
    <div class="trade-position-cards lg:hidden">
      ${e.slice(0,16).map(Yt).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[720px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">Amount</th><th class="text-right py-1">Lev</th><th class="text-right py-1">Status</th><th class="text-right px-3 py-1">Created</th>
      </tr></thead>
      <tbody>${e.slice(0,16).map(zt).join("")}</tbody>
    </table></div>`}}function jt(t,e){const s=o("#activity-body",t);if(s){if(!e.length){s.innerHTML='<p class="text-muted text-[11px] text-center py-4">No closed trades yet</p>';return}s.innerHTML=`
    <div class="trade-position-cards lg:hidden">
      ${e.slice(0,18).map(Qt).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[820px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">Exit</th><th class="text-right py-1">Used</th><th class="text-right py-1">Fee</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1">Closed</th>
      </tr></thead>
      <tbody>${e.slice(0,18).map(Ft).join("")}</tbody>
    </table></div>`}}function gt(t){const e=Number(t.pnl||t.unrealized_pnl||0),s=String(t.symbol||"").replace("@R@",""),a=t.asset_type||i("type"),l=Number(t.mark_price||t.current_price||t.price||0),r=t.position_id||t.id||"",n=String(t.side||"buy").toUpperCase()==="SELL"?"SELL":"BUY";return{pnl:e,cleanSymbol:s,posType:a,mark:l,id:r,side:n}}function Ht(t){const{pnl:e,cleanSymbol:s,posType:a,mark:l,id:r,side:n}=gt(t);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${d(s)}</td>
    <td><span class="badge-${n==="BUY"?"buy":"sell"}">${d(n)}</span></td>
    <td class="text-muted">${d(t.market_type||"spot")}</td>
    <td class="text-right font-mono">${f(t.entry_price||t.open_price,a)}</td>
    <td class="text-right font-mono">${l>0?f(l,a):"--"}</td>
    <td class="text-right font-mono">${v(t.qty||t.amount||t.size||t.units||0)}</td>
    <td class="text-right font-mono">${d(String(t.leverage||1))}x</td>
    <td class="text-right font-mono ${e>=0?"text-buy":"text-sell"}">${v(e)}</td>
    <td class="text-right px-3">${r?`<button class="btn-xs btn-ghost text-sell" data-close="${U(r)}">Close</button>`:""}</td>
  </tr>`}function Dt(t){const{pnl:e,cleanSymbol:s,posType:a,mark:l,id:r,side:n}=gt(t);return`<article class="trade-position-card">
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
      <span><small>Size</small><strong>${v(t.qty||t.amount||t.size||t.units||0)}</strong></span>
      <span><small>PnL</small><strong class="${e>=0?"text-buy":"text-sell"}">${v(e)}</strong></span>
      <span><small>Margin</small><strong>${v(t.margin_initial||t.margin||0)}</strong></span>
      <span><small>Leverage</small><strong>${d(String(t.leverage||1))}x</strong></span>
    </div>
    ${r?`<button class="btn-xs btn-ghost text-sell w-full" data-close="${U(r)}">Close position</button>`:""}
  </article>`}function rt(t){const e=String(t.status||"").toLowerCase();return e==="closed"||e==="canceled"||e==="cancelled"||e==="rejected"||Number(t.closed_at||0)>0||Number(t.exit_price||0)>0}function z(t){return String(t.symbol||"").replace("@R@","").replace("@D@","")}function G(t){return String(t.side||"BUY").toUpperCase()==="SELL"?"SELL":String(t.side||"BUY").toUpperCase()==="CLOSE"?"CLOSE":"BUY"}function X(t){return t.asset_type||t.type||i("type")}function Z(t){const e=Number(t||0);if(!e)return"--";try{return new Date(e*1e3).toLocaleString([],{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})}catch{return String(t)}}function zt(t){const e=G(t),s=X(t);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${d(z(t))}</td>
    <td><span class="badge-${e==="SELL"?"sell":"buy"}">${d(e)}</span></td>
    <td class="text-muted">${d(t.order_type||t.market_type||"market")}</td>
    <td class="text-right font-mono">${f(t.entry_price||t.fill_price||t.limit_price,s)}</td>
    <td class="text-right font-mono">${v(t.used_usdt||t.usd_amount||t.amount||0)}</td>
    <td class="text-right font-mono">${d(String(t.leverage||1))}x</td>
    <td class="text-right"><span class="status-chip status-chip-derived">${d(t.status||"open")}</span></td>
    <td class="text-right px-3 text-muted">${d(Z(t.created_at))}</td>
  </tr>`}function Yt(t){const e=G(t),s=X(t);return`<article class="trade-position-card trade-activity-card">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${d(z(t))}</strong>
        <small>${d(t.order_type||"market")} - ${d(Z(t.created_at))}</small>
      </div>
      <span class="badge-${e==="SELL"?"sell":"buy"}">${d(e)}</span>
    </div>
    <div class="trade-position-metrics">
      <span><small>Entry</small><strong>${f(t.entry_price||t.fill_price||t.limit_price,s)}</strong></span>
      <span><small>Amount</small><strong>${v(t.used_usdt||t.usd_amount||t.amount||0)}</strong></span>
      <span><small>Lev</small><strong>${d(String(t.leverage||1))}x</strong></span>
      <span><small>Status</small><strong>${d(t.status||"open")}</strong></span>
      <span><small>Mode</small><strong>${d(t.mode||i("mode")||"demo")}</strong></span>
      <span><small>Symbol</small><strong>${d(z(t))}</strong></span>
    </div>
  </article>`}function Ft(t){const e=G(t),s=X(t),a=Number(t.pnl_usd||t.pnl||0);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${d(z(t))}</td>
    <td><span class="badge-${e==="SELL"?"sell":"buy"}">${d(e)}</span></td>
    <td class="text-muted">${d(t.market_type||t.order_type||"spot")}</td>
    <td class="text-right font-mono">${f(t.entry_price||t.fill_price,s)}</td>
    <td class="text-right font-mono">${f(t.exit_price||t.limit_price,s)}</td>
    <td class="text-right font-mono">${v(t.used_usdt||t.usd_amount||0)}</td>
    <td class="text-right font-mono">${v(t.fee_paid||0)}</td>
    <td class="text-right font-mono ${a>=0?"text-buy":"text-sell"}">${v(a)}</td>
    <td class="text-right px-3 text-muted">${d(Z(t.closed_at||t.created_at))}</td>
  </tr>`}function Qt(t){const e=G(t),s=X(t),a=Number(t.pnl_usd||t.pnl||0);return`<article class="trade-position-card trade-activity-card is-history">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${d(z(t))}</strong>
        <small>${d(t.close_reason||t.status||"closed")} - ${d(Z(t.closed_at||t.created_at))}</small>
      </div>
      <span class="badge-${e==="SELL"?"sell":"buy"}">${d(e)}</span>
    </div>
    <div class="trade-position-metrics">
      <span><small>Entry</small><strong>${f(t.entry_price||t.fill_price,s)}</strong></span>
      <span><small>Exit</small><strong>${f(t.exit_price||t.limit_price,s)}</strong></span>
      <span><small>Used</small><strong>${v(t.used_usdt||t.usd_amount||0)}</strong></span>
      <span><small>PnL</small><strong class="${a>=0?"text-buy":"text-sell"}">${v(a)}</strong></span>
      <span><small>Fee</small><strong>${v(t.fee_paid||0)}</strong></span>
      <span><small>Type</small><strong>${d(t.market_type||t.order_type||"--")}</strong></span>
    </div>
  </article>`}async function qt(t,e,s=$){if(!g(s))return;const a=o("#chart-box",t);if(!a)return;const{createChart:l}=await xt();if(!g(s))return;a.innerHTML="",L=l(a,{layout:{background:{color:"#060A14"},textColor:"#8ba1cf",fontSize:11},grid:{vertLines:{color:"rgba(129,160,220,0.04)"},horzLines:{color:"rgba(129,160,220,0.04)"}},crosshair:{mode:0,vertLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"},horzLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"}},timeScale:{timeVisible:!0,secondsVisible:!1,borderColor:"rgba(129,160,220,0.08)",rightOffset:4},rightPriceScale:{borderColor:"rgba(129,160,220,0.08)"},width:Math.max(320,a.clientWidth),height:Math.max(260,a.clientHeight)}),H=L.addCandlestickSeries({upColor:"#00c087",downColor:"#f6465d",borderUpColor:"#00c087",borderDownColor:"#f6465d",wickUpColor:"#00c087",wickDownColor:"#f6465d"}),st=L.addHistogramSeries({priceFormat:{type:"volume"},priceScaleId:"vol"}),L.priceScale("vol").applyOptions({scaleMargins:{top:.84,bottom:0}});const r=e.map(n=>({time:Number(n.time||n.t),open:Number(n.open||n.o),high:Number(n.high||n.h),low:Number(n.low||n.l),close:Number(n.close||n.c),volume:Number(n.volume||n.v||0)})).filter(n=>n.time>0&&n.open>0).sort((n,c)=>n.time-c.time);H.setData(r.map(({time:n,open:c,high:u,low:p,close:m})=>({time:n,open:c,high:u,low:p,close:m}))),st.setData(r.map(n=>({time:n.time,value:n.volume,color:n.close>=n.open?"rgba(0,192,135,0.25)":"rgba(246,70,93,0.2)"}))),y=r.length?{...r[r.length-1]}:null,L.timeScale().fitContent(),j=new ResizeObserver(()=>{!L||!a||L.applyOptions({width:Math.max(320,a.clientWidth),height:Math.max(260,a.clientHeight)})}),j.observe(a)}function Kt(t){o("#mob-mkt-btn",t)?.addEventListener("click",()=>Wt(t)),o("#close-mob-drawer",t)?.addEventListener("click",()=>ot(t)),x(t,"[data-sym]","click",(e,s)=>{ot(t),localStorage.setItem("vp_symbol",s.dataset.sym),localStorage.setItem("vp_type",s.dataset.stype||i("type")),V("trade",{symbol:s.dataset.sym,type:s.dataset.stype||i("type"),tf:i("tf")})}),x(t,"[data-tf]","click",(e,s)=>{w("tf",s.dataset.tf),localStorage.setItem("vp_tf",s.dataset.tf),V("trade",{symbol:i("symbol"),type:i("type"),tf:s.dataset.tf})}),x(t,"[data-type-tab]","click",async(e,s)=>{w("type",s.dataset.typeTab),localStorage.setItem("vp_type",s.dataset.typeTab);const a=await C($t(s.dataset.typeTab),{timeout:6e3}).catch(()=>null);if(a?.items){const l=a.items.find(r=>r?.symbol);if(l?.symbol&&D(s.dataset.typeTab)!=="favorites"){const r=String(l.symbol).toUpperCase();localStorage.setItem("vp_symbol",r),V("trade",{symbol:r,type:s.dataset.typeTab,tf:i("tf")});return}bt(t,a.items),ft(t,a.items,$),ut(t,a.items,$)}S("[data-type-tab]",t).forEach(l=>{const r=l===s;l.classList.toggle("bg-accent/20",r),l.classList.toggle("text-accent",r),l.classList.toggle("border-accent/40",r)})}),x(t,"[data-open-order]","click",(e,s)=>Jt(t,s.dataset.openOrder)),x(t,"[data-close-order-sheet]","click",()=>ht(t)),x(t,"[data-submit-order]","click",(e,s)=>nt(s.dataset.submitOrder,t,o("#mobile-order-sheet [data-order-form]",t))),x(t,"[data-side]","click",(e,s)=>{const a=s.closest("#mobile-order-sheet"),l=s.closest("[data-order-form]");if(a){vt(t,s.dataset.side);return}nt(s.dataset.side,t,l)}),x(t,"[data-order-type]","change",(e,s)=>w("orderType",s.value)),x(t,"[data-market-type]","change",(e,s)=>{w("market",s.value),localStorage.setItem("vp_market",s.value),M(t)}),x(t,"[data-leverage]","input",(e,s)=>{w("leverage",Number(s.value)),et(t,"leverage",s.value),M(t)}),x(t,"[data-amount]","input",(e,s)=>{w("amount",Number(s.value)),et(t,"amount",s.value),M(t)}),x(t,"[data-close]","click",async(e,s)=>{await C("/trade/close_position.php",{method:"POST",body:{position_id:s.dataset.close},timeout:8e3}).catch(()=>null),await J(t,$)}),x(t,"[data-activity-tab]","click",(e,s)=>{t.__tradeActivityTab=s.dataset.activityTab||"positions",yt(t)}),x(t,"[data-quick-amount]","click",(e,s)=>{const a=Number(s.dataset.quickAmount||0);a>0&&(w("amount",a),et(t,"amount",a),M(t))}),o("#sym-search",t)?.addEventListener("input",e=>{const s=e.target.value.toLowerCase();S(".symbol-row",t).forEach(a=>{a.style.display=a.dataset.sym.toLowerCase().includes(s)?"":"none"})})}async function nt(t,e,s){const a=s||o("[data-order-form]",e)||e;k(a,"","info");const l=i("activeQuote")||{},r=Number(l.price||0);if(!r){k(a,"No live price available yet. Please wait for the quote to load.","warning");return}const n=Number(o("[data-amount]",a)?.value||i("amount")||0),c=Number(o("[data-leverage]",a)?.value||i("leverage")||1),u=Number(o("[data-tp]",a)?.value||0),p=Number(o("[data-sl]",a)?.value||0),m=o("[data-market-type]",a)?.value||i("market")||"spot",b=o("[data-order-type]",a)?.value||i("orderType")||"MARKET",T=Number(o("[data-limit-price]",a)?.value||0);if(n<=0){k(a,"Enter a valid amount first.","warning");return}if(t==="BUY"&&p>0&&p>=r){k(a,"For BUY orders, Stop Loss should be below the current price.","warning");return}if(t==="SELL"&&p>0&&p<=r){k(a,"For SELL orders, Stop Loss should be above the current price.","warning");return}try{it(a,!0),k(a,`Sending ${t==="BUY"?"buy":"sell"} order...`,"info");const h=await C("/trade/place_order.php",{method:"POST",body:{symbol:i("symbol"),asset_type:i("type"),market_type:m,side:t,order_type:b,usd:n,leverage:c,tp:u||void 0,sl:p||void 0,price:b==="LIMIT"&&T||r,mode:i("mode")},timeout:1e4});if(h&&h.ok===!1){k(a,h.error||"Order failed","error");return}k(a,`${t==="BUY"?"Buy":"Sell"} order opened successfully.`,"success"),await J(e,$),setTimeout(()=>{a.closest?.("#mobile-order-sheet")?ht(e):k(a,"","info")},900)}catch(h){console.error("Order failed:",h),k(a,h.message||"Order failed","error")}finally{it(a,!1)}}function k(t,e,s="info"){const a=o("[data-order-status]",t);a&&(a.textContent=e||"",a.hidden=!e,a.className=`order-form-status is-${s}`)}function it(t,e){const s=[t,t.closest?.("#mobile-order-sheet")].filter(Boolean);new Set(s.flatMap(l=>S("[data-side], [data-submit-order]",l))).forEach(l=>{l.disabled=!!e,l.classList.toggle("opacity-60",!!e)}),t.classList.toggle("is-submitting",!!e)}function Wt(t){const e=o("#market-drawer",t);e&&(e.classList.add("mobile-market-open"),e.classList.remove("hidden"),document.body.classList.add("trade-modal-open"))}function ot(t){const e=o("#market-drawer",t);e&&(e.classList.remove("mobile-market-open"),window.innerWidth<1024&&e.classList.add("hidden"),document.body.classList.remove("trade-modal-open"))}function Jt(t,e){const s=o("#mobile-order-sheet",t);s&&(vt(t,e),s.classList.remove("hidden"),document.body.classList.add("trade-modal-open"),M(t))}function ht(t){const e=o("#mobile-order-sheet",t);e&&e.classList.add("hidden"),document.body.classList.remove("trade-modal-open")}function vt(t,e){const s=o("#mobile-submit-order",t),a=o("#mobile-order-side-label",t);s&&(s.dataset.submitOrder=e,s.textContent=`Review & ${e==="BUY"?"Buy":"Sell"}`,s.className=`${e==="BUY"?"btn-buy":"btn-sell"} w-full py-3`),a&&(a.textContent=`${e} order`)}function et(t,e,s){S(`[data-${e}]`,t).forEach(a=>{String(a.value)!==String(s)&&(a.value=s)})}function Gt(t,e=$){if(!g(e)||!H||!y||!(t>0))return;const s=Xt();s<=y.time?(y.close=t,y.high=Math.max(y.high,t),y.low=Math.min(y.low,t)):y={time:s,open:y.close,high:Math.max(y.close,t),low:Math.min(y.close,t),close:t,volume:0},H.update({time:y.time,open:y.open,high:y.high,low:y.low,close:y.close})}function Xt(){const t=Zt(i("tf")),e=Math.floor(Date.now()/1e3);return Math.floor(e/t)*t}function Zt(t){return{"1m":60,"5m":300,"15m":900,"30m":1800,"1h":3600,"4h":14400,"1d":86400}[t]||60}function xt(){return tt||(tt=St(()=>import("./chart-DbDccfIU.js"),[])),tt}function $t(t){const e=D(t||"crypto");return`/markets.php?type=${encodeURIComponent(e==="favorites"?"crypto":e)}&scope=trade&supported=1&lite=1&with_quotes=1`}function Vt(t){const e=String(t?.source||"").toLowerCase();return String(t?.timing_class||"").toLowerCase()==="stale"||t?.is_stale||e.includes("yahoo")?"bg-spread":"bg-buy"}function te(t){const e=String(t?.timing_class||"").toLowerCase(),s=String(t?.source||"").toLowerCase();return Number(t?.price||0)<=0?"Unavailable":e==="stale"||t?.is_stale?"Stale":e==="delayed"||s.includes("yahoo")||["stocks","arab"].includes(D(t?.type||i("type")))?"Delayed":e==="candle_fallback"?"Chart quote":"Live"}function ee(t){const e=String(t||"").toLowerCase();return e==="live"?"status-chip-live":e==="unavailable"?"status-chip-locked":"status-chip-delayed"}function lt(t,e,s){return`<span class="${s} grid place-items-center overflow-hidden border border-line bg-surface">
    <img src="${U(kt({symbol:t,type:e},e))}" class="h-full w-full object-cover" alt="${U(t)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';" />
    <b class="hidden h-full w-full place-items-center bg-accent/20 text-[9px] font-black">${d(Lt(t))}</b>
  </span>`}export{ie as cleanup,ne as mount,re as render};
