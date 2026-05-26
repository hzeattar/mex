import{s as w,g as n,i as D,e as p,a as _,$ as o,b as E,c as f,_ as $t,d as g,n as Z,f as L,m as $,p as st}from"./main-BjluwQko.js";import{m as wt,a as St}from"./marketIcon-BqfrwX_4.js";let z=null,A=null,k=0,T=null;const kt=6500;function Lt(t,e,s,a,r={}){if(R(),!t||!t.length)return R;const l=++k,i=nt(t,r.maxSymbols||18);return i.length&&(typeof EventSource=="function"?_t(i,e,s,a,l,r):Y(i,e,s,a,l,r)),R}function nt(t,e){const s=Math.max(1,Number(e||18));return[...new Set((t||[]).map(a=>String(a||"").toUpperCase()).filter(Boolean))].slice(0,s)}function _t(t,e,s,a,r,l){P();const i="/api/stream/sse.php?symbols="+encodeURIComponent(t.join(","))+"&type="+encodeURIComponent(e)+"&scope=watchlist";let c=!1,u=setTimeout(()=>{r!==k||c||(P(),Y(t,e,s,a,r,l))},Math.max(3e3,Number(l.fallbackAfter||5e3)));T=new EventSource(i,{withCredentials:!0}),T.addEventListener("open",()=>{c=!0,u&&(clearTimeout(u),u=null)}),T.addEventListener("message",d=>{if(r===k)try{const m=JSON.parse(d.data||"[]");Array.isArray(m)&&m.length&&s&&s(m)}catch{}}),T.addEventListener("reconnect",()=>{r===k&&(P(),Y(t,e,s,a,r,l))}),T.addEventListener("error",d=>{r===k&&(P(),Y(t,e,s,a,r,l))})}function Y(t,e,s,a,r,l){ot();const i=Math.max(4e3,Number(l.interval||kt)),c=nt(t,l.maxSymbols||18),u=async()=>{if(r===k){A=new AbortController;try{const d="/api/quotes.php?symbols="+encodeURIComponent(c.join(","))+"&type="+encodeURIComponent(e)+"&visible=1&purpose=watchlist&_="+Date.now(),m=await fetch(d,{credentials:"same-origin",cache:"no-store",signal:A.signal});if(r!==k)return;if(m.ok){const b=await m.json();r===k&&b&&b.items&&s&&s(b.items)}}catch(d){d.name}finally{r===k&&(z=setTimeout(u,i))}}};u()}function ot(){z&&(clearTimeout(z),z=null),A&&(A.abort(),A=null)}function P(){T&&(T.close(),T=null)}function R(){k+=1,P(),ot()}let S=null,B=null,et=null,N=null,F=null,I=null,Q=null,j=null,V=null,y=null,x=0;const Ct=[{key:"favorites",label:"Favorites"},{key:"crypto",label:"Crypto"},{key:"forex",label:"Forex"},{key:"stocks",label:"Stocks"},{key:"commodities",label:"Commodities"},{key:"futures",label:"Futures"},{key:"arab",label:"Arab"}],Tt=["1m","5m","15m","30m","1h","4h","1d"];function ae(t){t.symbol&&w("symbol",t.symbol.toUpperCase()),t.type&&w("type",t.type),t.tf&&w("tf",t.tf);const e=n("symbol"),s=n("type"),a=n("tf");return`<div class="trade-terminal flex flex-col lg:flex-row h-full mobile-pad">
    <aside id="market-drawer" class="hidden lg:flex flex-col w-[250px] border-r border-line bg-surface shrink-0 overflow-hidden">
      <div class="lg:hidden flex items-center justify-between h-12 px-3 border-b border-line bg-panel">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-muted">Markets</div>
          <strong class="text-sm">Select instrument</strong>
        </div>
        <button class="icon-btn icon-btn-sm" id="close-mob-drawer" aria-label="Close markets">${D.close}</button>
      </div>
      <div class="p-2 border-b border-line">
        <div class="relative">
          <input type="search" class="input pl-7" placeholder="Search symbol..." id="sym-search" />
          <span class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted">${D.search}</span>
        </div>
      </div>
      <div class="flex gap-1 p-2 overflow-x-auto border-b border-line" id="type-tabs">
        ${Ct.map(r=>`<button class="btn-xs ${r.key===s?"bg-accent/20 text-accent border-accent/40":"text-muted border-line"} border rounded-md whitespace-nowrap" data-type-tab="${r.key}">${r.label}</button>`).join("")}
      </div>
      <div class="flex-1 overflow-auto p-1" id="symbol-list"><div class="p-4"><div class="loading-spinner mx-auto"></div></div></div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div class="flex items-center justify-between px-2 lg:px-4 h-11 border-b border-line bg-surface shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <button class="lg:hidden w-8 h-8 grid place-items-center rounded border border-line text-muted shrink-0" id="mob-mkt-btn" aria-label="Open markets">${D.menu}</button>
          ${at(e,s,"w-7 h-7 rounded-md shrink-0")}
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <strong class="text-sm truncate" id="sym-name">${p(e)}</strong>
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
          ${Tt.map(r=>`<button class="px-1.5 py-1 text-[10px] rounded shrink-0 ${r===a?"bg-accent/20 text-accent":"text-muted hover:text-text"}" data-tf="${r}">${r}</button>`).join("")}
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
        <div class="text-[10px] text-muted">${p(e)} - ${p(s.toUpperCase())}</div>
      </div>
      <div class="p-3 space-y-3" id="order-body">
        ${ct()}
      </div>
    </aside>

    ${Et(e,s)}
  </div>`}function ct(){const t=n("orderType")||"MARKET",e=Number(n("amount")||100),s=Number(n("leverage")||10),a=n("market")||"spot",r=n("activeQuote")||{},l=Number(r.price||0);return`<div class="space-y-3 order-ticket-panel" data-order-form>
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
      <button class="btn-sell trade-price-button" data-side="SELL"><small>Sell</small><span data-sell-price>${l>0?f(l,n("type")):"--"}</span></button>
      <button class="btn-buy trade-price-button" data-side="BUY"><small>Buy</small><span data-buy-price>${l>0?f(l*1.0001,n("type")):"--"}</span></button>
    </div>
    <div class="text-center"><span class="spread-display" data-spread-val>Spread: --</span></div>
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
      ${[25,50,100,250].map(i=>`<button type="button" data-quick-amount="${i}">$${i}</button>`).join("")}
    </div>
    <label class="block">
      <span class="text-[10px] text-muted">Limit price</span>
      <input type="number" min="0" step="any" class="input mt-1" placeholder="${l>0?f(l,n("type")):"Required for limit"}" data-limit-price />
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
            <strong class="text-sm truncate">${p(t)}</strong>
          </div>
        </div>
        <button class="icon-btn icon-btn-sm" data-close-order-sheet aria-label="Close order">${D.close}</button>
      </div>
      <div class="p-4">
        ${ct()}
        <div class="order-action-sticky">
          <button class="btn-primary w-full py-3" id="mobile-submit-order" data-submit-order="BUY">Review & Place Order</button>
        </div>
      </div>
    </div>
  </div>`}function re(t){Nt(t)}function le(){x+=1,j&&(j.disconnect(),j=null),S&&(S.remove(),S=null,B=null,et=null,y=null),N&&(N(),N=null),pt(),Mt(),R(),document.body.classList.remove("trade-modal-open")}async function Nt(t){const e=n("symbol"),s=n("type"),a=n("tf"),r=++x;w("activeQuote",null);const l=vt();Qt(t),U(t),Ut(t,e,s,r),_(gt(s),{timeout:6500}).then(i=>{h(r,e,s)&&i?.items&&(ut(t,i.items),mt(t,i.items,r),dt(t,i.items,r))}).catch(()=>{if(!h(r,e,s))return;const i=o("#symbol-list",t);i&&(i.innerHTML='<p class="text-muted text-[11px] text-center py-4">Markets unavailable</p>')}),K(t,r),Q=setInterval(()=>K(t,r,!0),12e3),_(`/trade/candles.php?symbol=${encodeURIComponent(e)}&type=${encodeURIComponent(s)}&tf=${encodeURIComponent(a)}&limit=220`,{timeout:1e4}).then(async i=>{await l,h(r,e,s)&&(i?.items?.length?await Ft(t,i.items,r):o("#chart-box",t).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart data unavailable</p>')}).catch(i=>{h(r,e,s)&&(console.error("Chart:",i),o("#chart-box",t).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart unavailable</p>')})}function h(t,e=n("symbol"),s=n("type")){return!(t!==x||e&&String(e).toUpperCase()!==String(n("symbol")||"").toUpperCase()||s&&H(s)!==H(n("type")))}function H(t){const e=String(t||"").toLowerCase();return e==="commodity"?"commodities":e==="stock"?"stocks":e==="future"?"futures":e}function dt(t,e,s=x){N&&(N(),N=null);const a=n("type"),r=n("symbol"),l=a==="crypto"?24:12,i=[...new Set(e.slice(0,l).map(c=>String(c.symbol||"").toUpperCase()).filter(Boolean).filter(c=>c!==String(r||"").toUpperCase()))];i.length&&(N=Lt(i,a,c=>{if(!h(s,r,a))return;q(t,c);const u=o("#conn-dot",t);u&&(u.classList.remove("bg-muted","bg-sell"),u.classList.add("bg-buy"),u.title="Live")},null,{interval:a==="crypto"?5200:7200,maxSymbols:l}))}function Ut(t,e,s,a=x){pt();const r=s==="crypto"?2200:3e3,l=async()=>{if(h(a,e,s)){I=new AbortController;try{const i=`/quotes.php?symbol=${encodeURIComponent(e)}&type=${encodeURIComponent(s)}&purpose=focus`,c=await _(i,{timeout:4500,signal:I.signal});if(!h(a,e,s))return;c?.items?.[0]&&Pt(t,c.items[0],a)}catch{h(a,e,s)&&Ot(t)}finally{h(a,e,s)&&(F=setTimeout(l,r))}}};l()}function pt(){F&&(clearTimeout(F),F=null),I&&(I.abort(),I=null)}function Mt(){Q&&(clearInterval(Q),Q=null)}function Ot(t){const e=o("#conn-dot",t);e&&(e.classList.remove("bg-muted","bg-buy"),e.classList.add("bg-sell"),e.title="Disconnected")}function Pt(t,e,s=x){if(!h(s,String(e?.symbol||n("symbol")).toUpperCase(),e?.type||n("type")))return;const a=Number(e.price||e.q_price||0),r=Number(e.change_pct||e.q_change||0),l=n("type");w("activeQuote",{...e,price:a,change_pct:r}),q(t,[{...e,price:a,change_pct:r}]);const i=o("#live-price",t),c=o("#live-change",t);i&&(i.textContent=a>0?f(a,l):"--"),c&&(c.textContent=st(r),c.className=`text-[10px] ${r>=0?"text-buy":"text-sell"}`);const u=o("#quote-state",t);if(u){const d=Zt(e);u.textContent=d,u.className=`status-chip ${Vt(d)} !text-[8px] !px-1.5 !py-0.5`}L("[data-sell-price]",t).forEach(d=>{d.textContent=a>0?f(a,l):"--"}),L("[data-buy-price]",t).forEach(d=>{d.textContent=a>0?f(a*1.0001,l):"--"}),L("[data-spread-val]",t).forEach(d=>{d.textContent=a>0?`Spread: ${f(a*1e-4,l)}`:"Spread: --"}),U(t),Wt(a,s)}function U(t){const e=n("activeQuote")||{},s=Number(e.price||0),a=n("wallet")||{},r=n("mode")==="real"?a.real||{}:a.demo||{};L("[data-order-form]",t).forEach(l=>{const i=Number(o("[data-amount]",l)?.value||n("amount")||0),c=Number(o("[data-leverage]",l)?.value||n("leverage")||1),d=(o("[data-market-type]",l)?.value||n("market")||"spot")==="perp"?c:1,m=s>0?i*d/s:0,b=i*d,C=o("[data-lev-val]",l);C&&(C.textContent=`${c}x`);const v=o("[data-est-units]",l);v&&(v.textContent=m>0?m.toFixed(m>=10?3:6):"--");const M=o("[data-est-notional]",l);M&&(M.textContent=i>0?`${$(b)} USDT`:"--");const O=o("[data-avail-bal]",l);O&&(O.textContent=`${$(r.available||0)} ${r.currency||""}`)})}function ut(t,e){const s=o("#symbol-list",t);if(!s)return;const a=n("symbol"),r=e.slice(0,60);s.innerHTML=r.map(l=>{const i=String(l.symbol||"").toUpperCase(),c=l.type||n("type"),u=Number(l.price||l.q_price||0),d=Number(l.change_pct||l.q_change||0),m=!(u>0);return`<div class="symbol-row ${i===a?"active":""}" data-sym="${E(i)}" data-stype="${E(c)}">
      ${at(i,c,"w-7 h-7 rounded-md shrink-0")}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <div class="font-semibold text-[11px] truncate">${p(i)}</div>
          <span class="status-dot ${m?"bg-sell":Xt(l)}"></span>
        </div>
        <div class="text-[9px] text-muted truncate">${p(l.name||c)}</div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-[11px] font-mono" data-price-cell>${u>0?f(u,c):"--"}</div>
        <div class="text-[9px] ${d>=0?"text-buy":"text-sell"}" data-change-cell>${m?"Unavailable":st(d)}</div>
      </div>
    </div>`}).join("")}async function mt(t,e,s=x){const a=n("type"),r=e.slice(0,a==="crypto"?18:10).filter(b=>!(Number(b.price||b.q_price||0)>0)).map(b=>String(b.symbol||"").toUpperCase()).filter(Boolean);if(!r.length)return;const l=a==="crypto"?12:2,i=a==="crypto"?18:6,c=[...new Set(r)].slice(0,i),u=[];for(let b=0;b<c.length;b+=l){const C=c.slice(b,b+l),v=await _(`/quotes.php?symbols=${encodeURIComponent(C.join(","))}&type=${encodeURIComponent(a)}&cache_only=1&purpose=watchlist`,{timeout:3500}).catch(()=>null);if(!h(s))return;v?.items?.length&&q(t,v.items),C.forEach(M=>{const O=L(".symbol-row",t).find(xt=>xt.dataset.sym===M);O&&o("[data-price-cell]",O)?.textContent!=="--"||u.push(M)})}const d=a==="crypto"?6:2,m=[...new Set(u)].slice(0,a==="crypto"?8:3);for(let b=0;b<m.length;b+=d){const C=m.slice(b,b+d),v=await _(`/quotes.php?symbols=${encodeURIComponent(C.join(","))}&type=${encodeURIComponent(a)}&purpose=focus`,{timeout:4200}).catch(()=>null);if(!h(s))return;v?.items?.length&&q(t,v.items)}}function q(t,e){e?.length&&e.forEach(s=>{const a=String(s.symbol||"").toUpperCase();if(!a)return;const r=L(".symbol-row",t).find(m=>m.dataset.sym===a);if(!r)return;const l=r.dataset.stype||n("type"),i=Number(s.price||s.q_price||0),c=Number(s.change_pct||s.q_change||0),u=o("[data-price-cell]",r),d=o("[data-change-cell]",r);u&&i>0&&(u.textContent=f(i,l)),d&&(d.textContent=st(c),d.className=`text-[9px] ${c>=0?"text-buy":"text-sell"}`)})}async function K(t,e=x,s=!1){if(!h(e))return;const a=o("#activity-body",t);a&&!s&&!t.__tradeActivityLoaded&&(a.innerHTML='<p class="text-muted text-[11px] text-center py-4">Loading trading activity...</p>');const[r,l]=await Promise.allSettled([_("/trade/portfolio.php",{timeout:6500}),_("/trade/orders.php?limit=90",{timeout:6500})]);if(!h(e))return;const i=r.status==="fulfilled"?r.value:null,c=l.status==="fulfilled"?l.value:null;i?.positions&&(t.__tradePositions=i.positions),(c?.items||c?.orders)&&(t.__tradeOrders=c.items||c.orders||[]),t.__tradeActivityLoaded=!0,bt(t)}function bt(t){const e=t.__tradePositions||[],s=t.__tradeOrders||[],a=s.filter(m=>!rt(m)),r=s.filter(rt),l=t.__tradeActivityTab||"positions",i=o("#pos-count",t),c=o("#orders-count",t),u=o("#history-count",t),d=o("#activity-summary",t);return i&&(i.textContent=String(e.length)),c&&(c.textContent=String(a.length)),u&&(u.textContent=String(r.length)),d&&(d.textContent=`${e.length} open / ${a.length} pending / ${r.length} closed`),L("[data-activity-tab]",t).forEach(m=>{m.classList.toggle("active",m.dataset.activityTab===l)}),l==="orders"?At(t,a):l==="history"?It(t,r):Rt(t,e)}function Rt(t,e){const s=o("#activity-body",t);if(s){if(!e.length){s.innerHTML='<p class="text-muted text-[11px] text-center py-3">No open positions</p>';return}s.innerHTML=`
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
    </table></div>`}}function ft(t){const e=Number(t.pnl||t.unrealized_pnl||0),s=String(t.symbol||"").replace("@R@",""),a=t.asset_type||n("type"),r=Number(t.mark_price||t.current_price||t.price||0),l=t.position_id||t.id||"",i=String(t.side||"buy").toUpperCase()==="SELL"?"SELL":"BUY";return{pnl:e,cleanSymbol:s,posType:a,mark:r,id:l,side:i}}function jt(t){const{pnl:e,cleanSymbol:s,posType:a,mark:r,id:l,side:i}=ft(t);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${p(s)}</td>
    <td><span class="badge-${i==="BUY"?"buy":"sell"}">${p(i)}</span></td>
    <td class="text-muted">${p(t.market_type||"spot")}</td>
    <td class="text-right font-mono">${f(t.entry_price||t.open_price,a)}</td>
    <td class="text-right font-mono">${r>0?f(r,a):"--"}</td>
    <td class="text-right font-mono">${$(t.qty||t.amount||t.size||t.units||0)}</td>
    <td class="text-right font-mono">${p(String(t.leverage||1))}x</td>
    <td class="text-right font-mono ${e>=0?"text-buy":"text-sell"}">${$(e)}</td>
    <td class="text-right px-3">${l?`<button class="btn-xs btn-ghost text-sell" data-close="${E(l)}">Close</button>`:""}</td>
  </tr>`}function Bt(t){const{pnl:e,cleanSymbol:s,posType:a,mark:r,id:l,side:i}=ft(t);return`<article class="trade-position-card">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${p(s)}</strong>
        <small>${p(t.market_type||"spot")} - ${p(t.created_at||t.opened_at||"")}</small>
      </div>
      <span class="badge-${i==="BUY"?"buy":"sell"}">${p(i)}</span>
    </div>
    <div class="trade-position-metrics">
      <span><small>Entry</small><strong>${f(t.entry_price||t.open_price,a)}</strong></span>
      <span><small>Mark</small><strong>${r>0?f(r,a):"--"}</strong></span>
      <span><small>Size</small><strong>${$(t.qty||t.amount||t.size||t.units||0)}</strong></span>
      <span><small>PnL</small><strong class="${e>=0?"text-buy":"text-sell"}">${$(e)}</strong></span>
    </div>
    ${l?`<button class="btn-xs btn-ghost text-sell w-full" data-close="${E(l)}">Close position</button>`:""}
  </article>`}function rt(t){const e=String(t.status||"").toLowerCase();return e==="closed"||e==="canceled"||e==="cancelled"||e==="rejected"||Number(t.closed_at||0)>0||Number(t.exit_price||0)>0}function W(t){return String(t.symbol||"").replace("@R@","").replace("@D@","")}function J(t){return String(t.side||"BUY").toUpperCase()==="SELL"?"SELL":String(t.side||"BUY").toUpperCase()==="CLOSE"?"CLOSE":"BUY"}function G(t){return t.asset_type||t.type||n("type")}function X(t){const e=Number(t||0);if(!e)return"--";try{return new Date(e*1e3).toLocaleString([],{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})}catch{return String(t)}}function Ht(t){const e=J(t),s=G(t);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${p(W(t))}</td>
    <td><span class="badge-${e==="SELL"?"sell":"buy"}">${p(e)}</span></td>
    <td class="text-muted">${p(t.order_type||t.market_type||"market")}</td>
    <td class="text-right font-mono">${f(t.entry_price||t.fill_price||t.limit_price,s)}</td>
    <td class="text-right font-mono">${$(t.used_usdt||t.usd_amount||t.amount||0)}</td>
    <td class="text-right font-mono">${p(String(t.leverage||1))}x</td>
    <td class="text-right"><span class="status-chip status-chip-derived">${p(t.status||"open")}</span></td>
    <td class="text-right px-3 text-muted">${p(X(t.created_at))}</td>
  </tr>`}function Dt(t){const e=J(t),s=G(t);return`<article class="trade-position-card trade-activity-card">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${p(W(t))}</strong>
        <small>${p(t.order_type||"market")} - ${p(X(t.created_at))}</small>
      </div>
      <span class="badge-${e==="SELL"?"sell":"buy"}">${p(e)}</span>
    </div>
    <div class="trade-position-metrics">
      <span><small>Entry</small><strong>${f(t.entry_price||t.fill_price||t.limit_price,s)}</strong></span>
      <span><small>Amount</small><strong>${$(t.used_usdt||t.usd_amount||t.amount||0)}</strong></span>
      <span><small>Lev</small><strong>${p(String(t.leverage||1))}x</strong></span>
      <span><small>Status</small><strong>${p(t.status||"open")}</strong></span>
    </div>
  </article>`}function zt(t){const e=J(t),s=G(t),a=Number(t.pnl_usd||t.pnl||0);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${p(W(t))}</td>
    <td><span class="badge-${e==="SELL"?"sell":"buy"}">${p(e)}</span></td>
    <td class="text-muted">${p(t.market_type||t.order_type||"spot")}</td>
    <td class="text-right font-mono">${f(t.entry_price||t.fill_price,s)}</td>
    <td class="text-right font-mono">${f(t.exit_price||t.limit_price,s)}</td>
    <td class="text-right font-mono">${$(t.used_usdt||t.usd_amount||0)}</td>
    <td class="text-right font-mono">${$(t.fee_paid||0)}</td>
    <td class="text-right font-mono ${a>=0?"text-buy":"text-sell"}">${$(a)}</td>
    <td class="text-right px-3 text-muted">${p(X(t.closed_at||t.created_at))}</td>
  </tr>`}function Yt(t){const e=J(t),s=G(t),a=Number(t.pnl_usd||t.pnl||0);return`<article class="trade-position-card trade-activity-card is-history">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${p(W(t))}</strong>
        <small>${p(t.close_reason||t.status||"closed")} - ${p(X(t.closed_at||t.created_at))}</small>
      </div>
      <span class="badge-${e==="SELL"?"sell":"buy"}">${p(e)}</span>
    </div>
    <div class="trade-position-metrics">
      <span><small>Entry</small><strong>${f(t.entry_price||t.fill_price,s)}</strong></span>
      <span><small>Exit</small><strong>${f(t.exit_price||t.limit_price,s)}</strong></span>
      <span><small>Used</small><strong>${$(t.used_usdt||t.usd_amount||0)}</strong></span>
      <span><small>PnL</small><strong class="${a>=0?"text-buy":"text-sell"}">${$(a)}</strong></span>
    </div>
  </article>`}async function Ft(t,e,s=x){if(!h(s))return;const a=o("#chart-box",t);if(!a)return;const{createChart:r}=await vt();if(!h(s))return;a.innerHTML="",S=r(a,{layout:{background:{color:"#060A14"},textColor:"#8ba1cf",fontSize:11},grid:{vertLines:{color:"rgba(129,160,220,0.04)"},horzLines:{color:"rgba(129,160,220,0.04)"}},crosshair:{mode:0,vertLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"},horzLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"}},timeScale:{timeVisible:!0,secondsVisible:!1,borderColor:"rgba(129,160,220,0.08)",rightOffset:4},rightPriceScale:{borderColor:"rgba(129,160,220,0.08)"},width:Math.max(320,a.clientWidth),height:Math.max(260,a.clientHeight)}),B=S.addCandlestickSeries({upColor:"#00c087",downColor:"#f6465d",borderUpColor:"#00c087",borderDownColor:"#f6465d",wickUpColor:"#00c087",wickDownColor:"#f6465d"}),et=S.addHistogramSeries({priceFormat:{type:"volume"},priceScaleId:"vol"}),S.priceScale("vol").applyOptions({scaleMargins:{top:.84,bottom:0}});const l=e.map(i=>({time:Number(i.time||i.t),open:Number(i.open||i.o),high:Number(i.high||i.h),low:Number(i.low||i.l),close:Number(i.close||i.c),volume:Number(i.volume||i.v||0)})).filter(i=>i.time>0&&i.open>0).sort((i,c)=>i.time-c.time);B.setData(l.map(({time:i,open:c,high:u,low:d,close:m})=>({time:i,open:c,high:u,low:d,close:m}))),et.setData(l.map(i=>({time:i.time,value:i.volume,color:i.close>=i.open?"rgba(0,192,135,0.25)":"rgba(246,70,93,0.2)"}))),y=l.length?{...l[l.length-1]}:null,S.timeScale().fitContent(),j=new ResizeObserver(()=>{!S||!a||S.applyOptions({width:Math.max(320,a.clientWidth),height:Math.max(260,a.clientHeight)})}),j.observe(a)}function Qt(t){o("#mob-mkt-btn",t)?.addEventListener("click",()=>qt(t)),o("#close-mob-drawer",t)?.addEventListener("click",()=>it(t)),g(t,"[data-sym]","click",(e,s)=>{it(t),localStorage.setItem("vp_symbol",s.dataset.sym),localStorage.setItem("vp_type",s.dataset.stype||n("type")),Z("trade",{symbol:s.dataset.sym,type:s.dataset.stype||n("type"),tf:n("tf")})}),g(t,"[data-tf]","click",(e,s)=>{w("tf",s.dataset.tf),localStorage.setItem("vp_tf",s.dataset.tf),Z("trade",{symbol:n("symbol"),type:n("type"),tf:s.dataset.tf})}),g(t,"[data-type-tab]","click",async(e,s)=>{w("type",s.dataset.typeTab),localStorage.setItem("vp_type",s.dataset.typeTab);const a=await _(gt(s.dataset.typeTab),{timeout:6e3}).catch(()=>null);if(a?.items){const r=a.items.find(l=>l?.symbol);if(r?.symbol&&H(s.dataset.typeTab)!=="favorites"){const l=String(r.symbol).toUpperCase();localStorage.setItem("vp_symbol",l),Z("trade",{symbol:l,type:s.dataset.typeTab,tf:n("tf")});return}ut(t,a.items),mt(t,a.items,x),dt(t,a.items,x)}L("[data-type-tab]",t).forEach(r=>{const l=r===s;r.classList.toggle("bg-accent/20",l),r.classList.toggle("text-accent",l),r.classList.toggle("border-accent/40",l)})}),g(t,"[data-open-order]","click",(e,s)=>Kt(t,s.dataset.openOrder)),g(t,"[data-close-order-sheet]","click",()=>yt(t)),g(t,"[data-submit-order]","click",(e,s)=>lt(s.dataset.submitOrder,t,o("#mobile-order-sheet [data-order-form]",t))),g(t,"[data-side]","click",(e,s)=>{const a=s.closest("#mobile-order-sheet"),r=s.closest("[data-order-form]");if(a){ht(t,s.dataset.side);return}lt(s.dataset.side,t,r)}),g(t,"[data-order-type]","change",(e,s)=>w("orderType",s.value)),g(t,"[data-market-type]","change",(e,s)=>{w("market",s.value),localStorage.setItem("vp_market",s.value),U(t)}),g(t,"[data-leverage]","input",(e,s)=>{w("leverage",Number(s.value)),tt(t,"leverage",s.value),U(t)}),g(t,"[data-amount]","input",(e,s)=>{w("amount",Number(s.value)),tt(t,"amount",s.value),U(t)}),g(t,"[data-close]","click",async(e,s)=>{await _("/trade/close_position.php",{method:"POST",body:{position_id:s.dataset.close},timeout:8e3}).catch(()=>null),await K(t,x)}),g(t,"[data-activity-tab]","click",(e,s)=>{t.__tradeActivityTab=s.dataset.activityTab||"positions",bt(t)}),g(t,"[data-quick-amount]","click",(e,s)=>{const a=Number(s.dataset.quickAmount||0);a>0&&(w("amount",a),tt(t,"amount",a),U(t))}),o("#sym-search",t)?.addEventListener("input",e=>{const s=e.target.value.toLowerCase();L(".symbol-row",t).forEach(a=>{a.style.display=a.dataset.sym.toLowerCase().includes(s)?"":"none"})})}async function lt(t,e,s){const a=n("activeQuote")||{},r=Number(a.price||0);if(!r){alert("No live price available yet. Please wait for the quote to load.");return}const l=s||o("[data-order-form]",e)||e,i=Number(o("[data-amount]",l)?.value||n("amount")||0),c=Number(o("[data-leverage]",l)?.value||n("leverage")||1),u=Number(o("[data-tp]",l)?.value||0),d=Number(o("[data-sl]",l)?.value||0),m=o("[data-market-type]",l)?.value||n("market")||"spot",b=o("[data-order-type]",l)?.value||n("orderType")||"MARKET",C=Number(o("[data-limit-price]",l)?.value||0);if(i<=0){alert("Enter a valid amount first.");return}if(t==="BUY"&&d>0&&d>=r){alert("For BUY orders, Stop Loss should be below the current price.");return}if(t==="SELL"&&d>0&&d<=r){alert("For SELL orders, Stop Loss should be above the current price.");return}try{const v=await _("/trade/place_order.php",{method:"POST",body:{symbol:n("symbol"),asset_type:n("type"),market_type:m,side:t,order_type:b,usd:i,leverage:c,tp:u||void 0,sl:d||void 0,price:b==="LIMIT"&&C||r,mode:n("mode")},timeout:1e4});if(v&&v.ok===!1){alert(v.error||"Order failed");return}yt(e),await K(e,x)}catch(v){console.error("Order failed:",v),alert(v.message||"Order failed")}}function qt(t){const e=o("#market-drawer",t);e&&(e.classList.add("mobile-market-open"),e.classList.remove("hidden"),document.body.classList.add("trade-modal-open"))}function it(t){const e=o("#market-drawer",t);e&&(e.classList.remove("mobile-market-open"),window.innerWidth<1024&&e.classList.add("hidden"),document.body.classList.remove("trade-modal-open"))}function Kt(t,e){const s=o("#mobile-order-sheet",t);s&&(ht(t,e),s.classList.remove("hidden"),document.body.classList.add("trade-modal-open"),U(t))}function yt(t){const e=o("#mobile-order-sheet",t);e&&e.classList.add("hidden"),document.body.classList.remove("trade-modal-open")}function ht(t,e){const s=o("#mobile-submit-order",t),a=o("#mobile-order-side-label",t);s&&(s.dataset.submitOrder=e,s.textContent=`Review & ${e==="BUY"?"Buy":"Sell"}`,s.className=`${e==="BUY"?"btn-buy":"btn-sell"} w-full py-3`),a&&(a.textContent=`${e} order`)}function tt(t,e,s){L(`[data-${e}]`,t).forEach(a=>{String(a.value)!==String(s)&&(a.value=s)})}function Wt(t,e=x){if(!h(e)||!B||!y||!(t>0))return;const s=Jt();s<=y.time?(y.close=t,y.high=Math.max(y.high,t),y.low=Math.min(y.low,t)):y={time:s,open:y.close,high:Math.max(y.close,t),low:Math.min(y.close,t),close:t,volume:0},B.update({time:y.time,open:y.open,high:y.high,low:y.low,close:y.close})}function Jt(){const t=Gt(n("tf")),e=Math.floor(Date.now()/1e3);return Math.floor(e/t)*t}function Gt(t){return{"1m":60,"5m":300,"15m":900,"30m":1800,"1h":3600,"4h":14400,"1d":86400}[t]||60}function vt(){return V||(V=$t(()=>import("./chart-DbDccfIU.js"),[])),V}function gt(t){const e=H(t||"crypto");return`/markets.php?type=${encodeURIComponent(e==="favorites"?"crypto":e)}&scope=trade&supported=1&lite=1&with_quotes=1`}function Xt(t){const e=String(t?.source||"").toLowerCase();return String(t?.timing_class||"").toLowerCase()==="stale"||t?.is_stale||e.includes("yahoo")?"bg-spread":"bg-buy"}function Zt(t){const e=String(t?.timing_class||"").toLowerCase(),s=String(t?.source||"").toLowerCase();return Number(t?.price||0)<=0?"Unavailable":e==="stale"||t?.is_stale?"Stale":e==="delayed"||s.includes("yahoo")||["stocks","arab"].includes(H(t?.type||n("type")))?"Delayed":e==="candle_fallback"?"Chart quote":"Live"}function Vt(t){const e=String(t||"").toLowerCase();return e==="live"?"status-chip-live":e==="unavailable"?"status-chip-locked":"status-chip-delayed"}function at(t,e,s){return`<span class="${s} grid place-items-center overflow-hidden border border-line bg-surface">
    <img src="${E(wt({symbol:t,type:e},e))}" class="h-full w-full object-cover" alt="${E(t)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';" />
    <b class="hidden h-full w-full place-items-center bg-accent/20 text-[9px] font-black">${p(St(t))}</b>
  </span>`}export{le as cleanup,re as mount,ae as render};
