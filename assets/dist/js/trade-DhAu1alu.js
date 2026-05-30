import{s as k,g as o,i as Q,e as c,a as M,$ as d,b as O,c as f,_ as Tt,d as h,n as at,f as _,m as x,p as ot}from"./main-DC6eObyD.js";import{marketIconPath as Et,marketInitial as Mt}from"./marketIcon-D-Yq8Sis.js";let K=null,B=null,E=0,U=null;const Nt=6500;function Ut(t,e,s,a,n={}){if(A(),!t||!t.length)return A;const l=++E,r=bt(t,n.maxSymbols||18);return r.length&&(typeof EventSource=="function"?Ot(r,e,s,a,l,n):W(r,e,s,a,l,n)),A}function bt(t,e){const s=Math.max(1,Number(e||18));return[...new Set((t||[]).map(a=>String(a||"").toUpperCase()).filter(Boolean))].slice(0,s)}function Ot(t,e,s,a,n,l){j();const r="/api/stream/sse.php?symbols="+encodeURIComponent(t.join(","))+"&type="+encodeURIComponent(e)+"&scope=watchlist";let i=!1,u=setTimeout(()=>{n!==E||i||(j(),W(t,e,s,a,n,l))},Math.max(3e3,Number(l.fallbackAfter||5e3)));U=new EventSource(r,{withCredentials:!0}),U.addEventListener("open",()=>{i=!0,u&&(clearTimeout(u),u=null)}),U.addEventListener("message",p=>{if(n===E)try{const m=JSON.parse(p.data||"[]");Array.isArray(m)&&m.length&&s&&s(m)}catch{}}),U.addEventListener("reconnect",()=>{n===E&&(j(),W(t,e,s,a,n,l))}),U.addEventListener("error",p=>{n===E&&(j(),W(t,e,s,a,n,l))})}function W(t,e,s,a,n,l){ft();const r=Math.max(4e3,Number(l.interval||Nt)),i=bt(t,l.maxSymbols||18),u=async()=>{if(n===E){B=new AbortController;try{const p="/api/quotes.php?symbols="+encodeURIComponent(i.join(","))+"&type="+encodeURIComponent(e)+"&visible=1&purpose=watchlist&_="+Date.now(),m=await fetch(p,{credentials:"same-origin",cache:"no-store",signal:B.signal});if(n!==E)return;if(m.ok){const b=await m.json();n===E&&b&&b.items&&s&&s(b.items)}}catch(p){p.name}finally{n===E&&(K=setTimeout(u,r))}}};u()}function ft(){K&&(clearTimeout(K),K=null),B&&(B.abort(),B=null)}function j(){U&&(U.close(),U=null)}function A(){E+=1,j(),ft()}let T=null,H=null,rt=null,P=null,G=null,I=null,J=null,F=null,nt=null,y=null,$=0;const Pt=[{key:"favorites",label:"Favorites"},{key:"crypto",label:"Crypto"},{key:"forex",label:"Forex"},{key:"stocks",label:"Stocks"},{key:"commodities",label:"Commodities"},{key:"futures",label:"Futures"},{key:"arab",label:"Arab"}],Rt=["1m","5m","15m","30m","1h","4h","1d"];function ce(t){t.symbol&&k("symbol",t.symbol.toUpperCase()),t.type&&k("type",t.type),t.tf&&k("tf",t.tf);const e=o("symbol"),s=o("type"),a=o("tf");return`<div class="trade-terminal flex flex-col lg:flex-row h-full mobile-pad">
    <aside id="market-drawer" class="hidden lg:flex flex-col w-[250px] border-r border-line bg-surface shrink-0 overflow-hidden">
      <div class="lg:hidden flex items-center justify-between h-12 px-3 border-b border-line bg-panel">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-muted">Markets</div>
          <strong class="text-sm">Select instrument</strong>
        </div>
        <button class="icon-btn icon-btn-sm" id="close-mob-drawer" aria-label="Close markets">${Q.close}</button>
      </div>
      <div class="p-2 border-b border-line">
        <div class="relative">
          <input type="search" class="input pl-7" placeholder="Search symbol..." id="sym-search" />
          <span class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted">${Q.search}</span>
        </div>
      </div>
      <div class="flex gap-1 p-2 overflow-x-auto border-b border-line" id="type-tabs">
        ${Pt.map(n=>`<button class="btn-xs ${n.key===s?"bg-accent/20 text-accent border-accent/40":"text-muted border-line"} border rounded-md whitespace-nowrap" data-type-tab="${n.key}">${n.label}</button>`).join("")}
      </div>
      <div class="flex-1 overflow-auto p-1" id="symbol-list"><div class="p-4"><div class="loading-spinner mx-auto"></div></div></div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div class="flex items-center justify-between px-2 lg:px-4 h-11 border-b border-line bg-surface shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <button class="lg:hidden w-8 h-8 grid place-items-center rounded border border-line text-muted shrink-0" id="mob-mkt-btn" aria-label="Open markets">${Q.menu}</button>
          ${it(e,s,"w-7 h-7 rounded-md shrink-0")}
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <strong class="text-sm truncate" id="sym-name">${c(e)}</strong>
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
          ${Rt.map(n=>`<button class="px-1.5 py-1 text-[10px] rounded shrink-0 ${n===a?"bg-accent/20 text-accent":"text-muted hover:text-text"}" data-tf="${n}">${n}</button>`).join("")}
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
        <div class="text-[10px] text-muted">${c(e)} - ${c(s.toUpperCase())}</div>
      </div>
      <div class="p-3 space-y-3" id="order-body">
        ${yt()}
      </div>
    </aside>

    ${jt(e,s)}
  </div>`}function yt(){const t=o("orderType")||"MARKET",e=Number(o("amount")||100),s=Number(o("leverage")||10),a=o("market")||"spot",n=o("activeQuote")||{},l=Number(n.price||0);return`<div class="space-y-3 order-ticket-panel" data-order-form>
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
      <button class="btn-sell trade-price-button" data-side="SELL"><small>Sell</small><span data-sell-price>${l>0?f(l,o("type")):"--"}</span></button>
      <button class="btn-buy trade-price-button" data-side="BUY"><small>Buy</small><span data-buy-price>${l>0?f(l*1.0001,o("type")):"--"}</span></button>
      </div>
      <div class="text-center"><span class="spread-display" data-spread-val>Spread: --</span></div>
      <div class="mobile-order-summary">
        <span><small>Mode</small><strong>${c(o("mode")==="real"?"Real":"Demo")}</strong></span>
        <span><small>Symbol</small><strong>${c(o("symbol")||"--")}</strong></span>
        <span><small>Asset</small><strong>${c(o("type")||"--")}</strong></span>
      </div>
      <div class="order-summary-box">
        <span><small>Available</small><strong data-avail-bal>--</strong></span>
        <span><small>Est. Units</small><strong data-est-units>--</strong></span>
        <span><small>Notional</small><strong data-est-notional>--</strong></span>
    </div>
    <label class="block">
      <span class="text-[10px] text-muted">Margin / Amount (USDT)</span>
      <input type="number" min="1" step="any" class="input mt-1" value="${O(String(e))}" data-amount />
    </label>
    <div class="quick-amount-grid" aria-label="Quick order amounts">
      ${[25,50,100,250].map(r=>`<button type="button" data-quick-amount="${r}">$${r}</button>`).join("")}
    </div>
    <label class="block">
      <span class="text-[10px] text-muted">Limit price</span>
      <input type="number" min="0" step="any" class="input mt-1" placeholder="${l>0?f(l,o("type")):"Required for limit"}" data-limit-price />
    </label>
    <label class="block">
      <span class="text-[10px] text-muted">Leverage: <strong data-lev-val>${s}x</strong></span>
      <input type="range" min="1" max="100" value="${O(String(s))}" class="w-full mt-1 accent-accent" data-leverage />
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
    <p class="order-ticket-note">Orders execute internally on MEX Group at the current platform quote. Use TP/SL to document target risk for review.</p>
  </div>`}function jt(t,e){return`<div class="fixed inset-0 z-[230] hidden lg:hidden" id="mobile-order-sheet">
    <div class="absolute inset-0 bg-black/65" data-close-order-sheet></div>
    <div class="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-auto rounded-t-2xl border border-line bg-surface shadow-2xl">
      <div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3">
        <div class="flex items-center gap-2 min-w-0">
          ${it(t,e,"w-8 h-8 rounded-lg shrink-0")}
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider text-muted" id="mobile-order-side-label">Order</div>
            <strong class="text-sm truncate">${c(t)}</strong>
          </div>
        </div>
        <button class="icon-btn icon-btn-sm" data-close-order-sheet aria-label="Close order">${Q.close}</button>
      </div>
      <div class="p-4">
        ${yt()}
        <div class="order-action-sticky">
          <button class="btn-primary w-full py-3" id="mobile-submit-order" data-submit-order="BUY">Review & Place Order</button>
        </div>
      </div>
    </div>
  </div>`}function pe(t){t.addEventListener("error",e=>{if(e.target.tagName==="IMG"&&e.target.dataset.fallback==="initial"){e.target.style.display="none";const s=e.target.nextElementSibling;s&&(s.style.display="grid")}},!0),At(t)}function ue(){$+=1,F&&(F.disconnect(),F=null),T&&(T.remove(),T=null,H=null,rt=null,y=null),P&&(P(),P=null),vt(),It(),A(),document.body.classList.remove("trade-modal-open")}async function At(t){const e=o("symbol"),s=o("type"),a=o("tf"),n=++$;k("activeQuote",null);const l=Lt();Zt(t),R(t),Bt(t,e,s,n),M(_t(s),{timeout:6500}).then(r=>{v(n,e,s)&&r?.items&&(xt(t,r.items),ht(t,r.items,n),gt(t,r.items,n))}).catch(()=>{if(!v(n,e,s))return;const r=d("#symbol-list",t);r&&(r.innerHTML='<p class="text-muted text-[11px] text-center py-4">Markets unavailable</p>')}),Z(t,n),J=setInterval(()=>Z(t,n,!0),12e3),M(`/trade/candles.php?symbol=${encodeURIComponent(e)}&type=${encodeURIComponent(s)}&tf=${encodeURIComponent(a)}&limit=220`,{timeout:1e4}).then(async r=>{await l,v(n,e,s)&&(r?.items?.length?await Xt(t,r.items,n):d("#chart-box",t).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart data unavailable</p>')}).catch(r=>{v(n,e,s)&&(console.error("Chart:",r),d("#chart-box",t).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart unavailable</p>')})}function v(t,e=o("symbol"),s=o("type")){return!(t!==$||e&&String(e).toUpperCase()!==String(o("symbol")||"").toUpperCase()||s&&D(s)!==D(o("type")))}function D(t){const e=String(t||"").toLowerCase();return e==="commodity"?"commodities":e==="stock"?"stocks":e==="future"?"futures":e}function gt(t,e,s=$){P&&(P(),P=null);const a=o("type"),n=o("symbol"),l=a==="crypto"?24:12,r=[...new Set(e.slice(0,l).map(i=>String(i.symbol||"").toUpperCase()).filter(Boolean).filter(i=>i!==String(n||"").toUpperCase()))];r.length&&(P=Ut(r,a,i=>{if(!v(s,n,a))return;X(t,i);const u=d("#conn-dot",t);u&&(u.classList.remove("bg-muted","bg-sell"),u.classList.add("bg-buy"),u.title="Live")},null,{interval:a==="crypto"?5200:7200,maxSymbols:l}))}function Bt(t,e,s,a=$){vt();const n=s==="crypto"?2200:3e3,l=async()=>{if(v(a,e,s)){I=new AbortController;try{const r=`/quotes.php?symbol=${encodeURIComponent(e)}&type=${encodeURIComponent(s)}&purpose=focus`,i=await M(r,{timeout:4500,signal:I.signal});if(!v(a,e,s))return;i?.items?.[0]&&Ht(t,i.items[0],a)}catch{v(a,e,s)&&Ft(t)}finally{v(a,e,s)&&(G=setTimeout(l,n))}}};l()}function vt(){G&&(clearTimeout(G),G=null),I&&(I.abort(),I=null)}function It(){J&&(clearInterval(J),J=null)}function Ft(t){const e=d("#conn-dot",t);e&&(e.classList.remove("bg-muted","bg-buy"),e.classList.add("bg-sell"),e.title="Disconnected")}function Ht(t,e,s=$){if(!v(s,String(e?.symbol||o("symbol")).toUpperCase(),e?.type||o("type")))return;const a=Number(e.price||e.q_price||0),n=Number(e.change_pct||e.q_change||0),l=o("type");k("activeQuote",{...e,price:a,change_pct:n}),X(t,[{...e,price:a,change_pct:n}]);const r=d("#live-price",t),i=d("#live-change",t);r&&(r.textContent=a>0?f(a,l):"--"),i&&(i.textContent=ot(n),i.className=`text-[10px] ${n>=0?"text-buy":"text-sell"}`);const u=d("#quote-state",t);if(u){const p=re(e);u.textContent=p,u.className=`status-chip ${oe(p)} !text-[8px] !px-1.5 !py-0.5`}_("[data-sell-price]",t).forEach(p=>{p.textContent=a>0?f(a,l):"--"}),_("[data-buy-price]",t).forEach(p=>{p.textContent=a>0?f(a*1.0001,l):"--"}),_("[data-spread-val]",t).forEach(p=>{p.textContent=a>0?`Spread: ${f(a*1e-4,l)}`:"Spread: --"}),R(t),se(a,s)}function R(t){const e=o("activeQuote")||{},s=Number(e.price||0),a=o("wallet")||{},n=o("mode")==="real"?a.real||{}:a.demo||{};_("[data-order-form]",t).forEach(l=>{const r=Number(d("[data-amount]",l)?.value||o("amount")||0),i=Number(d("[data-leverage]",l)?.value||o("leverage")||1),p=(d("[data-market-type]",l)?.value||o("market")||"spot")==="perp"?i:1,m=s>0?r*p/s:0,b=r*p,w=d("[data-lev-val]",l);w&&(w.textContent=`${i}x`);const S=d("[data-est-units]",l);S&&(S.textContent=m>0?m.toFixed(m>=10?3:6):"--");const g=d("[data-est-notional]",l);g&&(g.textContent=r>0?`${x(b)} USDT`:"--");const L=d("[data-avail-bal]",l);L&&(L.textContent=`${x(n.available||0)} ${n.currency||""}`)})}function xt(t,e){const s=d("#symbol-list",t);if(!s)return;const a=o("symbol"),n=e.slice(0,60);s.innerHTML=n.map(l=>{const r=String(l.symbol||"").toUpperCase(),i=l.type||o("type"),u=Number(l.price||l.q_price||0),p=Number(l.change_pct||l.q_change||0),m=!(u>0);return`<div class="symbol-row ${r===a?"active":""}" data-sym="${O(r)}" data-stype="${O(i)}">
      ${it(r,i,"w-7 h-7 rounded-md shrink-0")}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <div class="font-semibold text-[11px] truncate">${c(r)}</div>
          <span class="status-dot ${m?"bg-sell":le(l)}"></span>
        </div>
        <div class="text-[9px] text-muted truncate">${c(l.name||i)}</div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-[11px] font-mono" data-price-cell>${u>0?f(u,i):"--"}</div>
        <div class="text-[9px] ${p>=0?"text-buy":"text-sell"}" data-change-cell>${m?"Unavailable":ot(p)}</div>
      </div>
    </div>`}).join("")}async function ht(t,e,s=$){const a=o("type"),n=e.slice(0,a==="crypto"?18:10).filter(b=>!(Number(b.price||b.q_price||0)>0)).map(b=>String(b.symbol||"").toUpperCase()).filter(Boolean);if(!n.length)return;const l=a==="crypto"?12:2,r=a==="crypto"?18:6,i=[...new Set(n)].slice(0,r),u=[];for(let b=0;b<i.length;b+=l){const w=i.slice(b,b+l),S=await M(`/quotes.php?symbols=${encodeURIComponent(w.join(","))}&type=${encodeURIComponent(a)}&cache_only=1&purpose=watchlist`,{timeout:3500}).catch(()=>null);if(!v(s))return;S?.items?.length&&X(t,S.items),w.forEach(g=>{const L=_(".symbol-row",t).find(q=>q.dataset.sym===g);L&&d("[data-price-cell]",L)?.textContent!=="--"||u.push(g)})}const p=a==="crypto"?6:2,m=[...new Set(u)].slice(0,a==="crypto"?8:3);for(let b=0;b<m.length;b+=p){const w=m.slice(b,b+p),S=await M(`/quotes.php?symbols=${encodeURIComponent(w.join(","))}&type=${encodeURIComponent(a)}&purpose=focus`,{timeout:4200}).catch(()=>null);if(!v(s))return;S?.items?.length&&X(t,S.items)}}function X(t,e){e?.length&&e.forEach(s=>{const a=String(s.symbol||"").toUpperCase();if(!a)return;const n=_(".symbol-row",t).find(m=>m.dataset.sym===a);if(!n)return;const l=n.dataset.stype||o("type"),r=Number(s.price||s.q_price||0),i=Number(s.change_pct||s.q_change||0),u=d("[data-price-cell]",n),p=d("[data-change-cell]",n);u&&r>0&&(u.textContent=f(r,l)),p&&(p.textContent=ot(i),p.className=`text-[9px] ${i>=0?"text-buy":"text-sell"}`)})}async function Z(t,e=$,s=!1){if(!v(e))return;const a=d("#activity-body",t);a&&!s&&!t.__tradeActivityLoaded&&(a.innerHTML='<p class="text-muted text-[11px] text-center py-4">Loading trading activity...</p>');const[n,l]=await Promise.allSettled([M("/trade/portfolio.php",{timeout:6500}),M("/trade/orders.php?limit=90",{timeout:6500})]);if(!v(e))return;const r=n.status==="fulfilled"?n.value:null,i=l.status==="fulfilled"?l.value:null;r?.positions&&(t.__tradePositions=r.positions),(i?.items||i?.orders)&&(t.__tradeOrders=i.items||i.orders||[]),t.__tradeActivityLoaded=!0,$t(t)}function $t(t){const e=t.__tradePositions||[],s=t.__tradeOrders||[],a=s.filter(m=>!ct(m)),n=s.filter(ct),l=t.__tradeActivityTab||"positions",r=d("#pos-count",t),i=d("#orders-count",t),u=d("#history-count",t),p=d("#activity-summary",t);return r&&(r.textContent=String(e.length)),i&&(i.textContent=String(a.length)),u&&(u.textContent=String(n.length)),p&&(p.textContent=`${e.length} open / ${a.length} pending / ${n.length} closed`),_("[data-activity-tab]",t).forEach(m=>{m.classList.toggle("active",m.dataset.activityTab===l)}),l==="orders"?zt(t,a):l==="history"?Yt(t,n):Dt(t,e)}function Dt(t,e){const s=d("#activity-body",t);if(s){if(!e.length){s.innerHTML='<p class="text-muted text-[11px] text-center py-3">No open positions</p>';return}s.innerHTML=`
    <div class="trade-position-cards lg:hidden">
      ${e.slice(0,12).map(Qt).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[620px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">Mark</th><th class="text-right py-1">Size</th><th class="text-right py-1">Lev</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1"></th>
      </tr></thead>
      <tbody>${e.slice(0,12).map(qt).join("")}</tbody>
    </table></div>`}}function zt(t,e){const s=d("#activity-body",t);if(s){if(!e.length){s.innerHTML='<p class="text-muted text-[11px] text-center py-4">No pending or armed orders</p>';return}s.innerHTML=`
    <div class="trade-position-cards lg:hidden">
      ${e.slice(0,16).map(Wt).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[720px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">Amount</th><th class="text-right py-1">Lev</th><th class="text-right py-1">Status</th><th class="text-right px-3 py-1">Created</th>
      </tr></thead>
      <tbody>${e.slice(0,16).map(Kt).join("")}</tbody>
    </table></div>`}}function Yt(t,e){const s=d("#activity-body",t);if(s){if(!e.length){s.innerHTML='<p class="text-muted text-[11px] text-center py-4">No closed trades yet</p>';return}s.innerHTML=`
    <div class="trade-position-cards lg:hidden">
      ${e.slice(0,18).map(Jt).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[820px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">Exit</th><th class="text-right py-1">Used</th><th class="text-right py-1">Fee</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1">Closed</th>
      </tr></thead>
      <tbody>${e.slice(0,18).map(Gt).join("")}</tbody>
    </table></div>`}}function wt(t){const e=Number(t.pnl||t.unrealized_pnl||0),s=String(t.symbol||"").replace("@R@",""),a=t.asset_type||o("type"),n=Number(t.mark_price||t.current_price||t.price||0),l=t.position_id||t.id||"",r=String(t.side||"buy").toUpperCase()==="SELL"?"SELL":"BUY";return{pnl:e,cleanSymbol:s,posType:a,mark:n,id:l,side:r}}function qt(t){const{pnl:e,cleanSymbol:s,posType:a,mark:n,id:l,side:r}=wt(t);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${c(s)}</td>
    <td><span class="badge-${r==="BUY"?"buy":"sell"}">${c(r)}</span></td>
    <td class="text-muted">${c(t.market_type||"spot")}</td>
    <td class="text-right font-mono">${f(t.entry_price||t.open_price,a)}</td>
    <td class="text-right font-mono">${n>0?f(n,a):"--"}</td>
    <td class="text-right font-mono">${x(t.qty||t.amount||t.size||t.units||0)}</td>
    <td class="text-right font-mono">${c(String(t.leverage||1))}x</td>
    <td class="text-right font-mono ${e>=0?"text-buy":"text-sell"}">${x(e)}</td>
    <td class="text-right px-3">${l?`<button class="btn-xs btn-ghost text-sell" data-close="${O(l)}">Close</button>`:""}</td>
  </tr>`}function Qt(t){const{pnl:e,cleanSymbol:s,posType:a,mark:n,id:l,side:r}=wt(t);return`<article class="trade-position-card">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${c(s)}</strong>
        <small>${c(t.market_type||"spot")} - ${c(t.created_at||t.opened_at||"")}</small>
      </div>
      <span class="badge-${r==="BUY"?"buy":"sell"}">${c(r)}</span>
    </div>
    <div class="trade-position-metrics">
      <span><small>Entry</small><strong>${f(t.entry_price||t.open_price,a)}</strong></span>
      <span><small>Mark</small><strong>${n>0?f(n,a):"--"}</strong></span>
      <span><small>Size</small><strong>${x(t.qty||t.amount||t.size||t.units||0)}</strong></span>
      <span><small>PnL</small><strong class="${e>=0?"text-buy":"text-sell"}">${x(e)}</strong></span>
      <span><small>Margin</small><strong>${x(t.margin_initial||t.margin||0)}</strong></span>
      <span><small>Leverage</small><strong>${c(String(t.leverage||1))}x</strong></span>
    </div>
    ${l?`<button class="btn-xs btn-ghost text-sell w-full" data-close="${O(l)}">Close position</button>`:""}
  </article>`}function ct(t){const e=String(t.status||"").toLowerCase();return e==="closed"||e==="canceled"||e==="cancelled"||e==="rejected"||Number(t.closed_at||0)>0||Number(t.exit_price||0)>0}function z(t){return String(t.symbol||"").replace("@R@","").replace("@D@","")}function V(t){return String(t.side||"BUY").toUpperCase()==="SELL"?"SELL":String(t.side||"BUY").toUpperCase()==="CLOSE"?"CLOSE":"BUY"}function tt(t){return t.asset_type||t.type||o("type")}function et(t){const e=Number(t||0);if(!e)return"--";try{return new Date(e*1e3).toLocaleString([],{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})}catch{return String(t)}}function Kt(t){const e=V(t),s=tt(t);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${c(z(t))}</td>
    <td><span class="badge-${e==="SELL"?"sell":"buy"}">${c(e)}</span></td>
    <td class="text-muted">${c(t.order_type||t.market_type||"market")}</td>
    <td class="text-right font-mono">${f(t.entry_price||t.fill_price||t.limit_price,s)}</td>
    <td class="text-right font-mono">${x(t.used_usdt||t.usd_amount||t.amount||0)}</td>
    <td class="text-right font-mono">${c(String(t.leverage||1))}x</td>
    <td class="text-right"><span class="status-chip status-chip-derived">${c(t.status||"open")}</span></td>
    <td class="text-right px-3 text-muted">${c(et(t.created_at))}</td>
  </tr>`}function Wt(t){const e=V(t),s=tt(t);return`<article class="trade-position-card trade-activity-card">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${c(z(t))}</strong>
        <small>${c(t.order_type||"market")} - ${c(et(t.created_at))}</small>
      </div>
      <span class="badge-${e==="SELL"?"sell":"buy"}">${c(e)}</span>
    </div>
    <div class="trade-position-metrics">
      <span><small>Entry</small><strong>${f(t.entry_price||t.fill_price||t.limit_price,s)}</strong></span>
      <span><small>Amount</small><strong>${x(t.used_usdt||t.usd_amount||t.amount||0)}</strong></span>
      <span><small>Lev</small><strong>${c(String(t.leverage||1))}x</strong></span>
      <span><small>Status</small><strong>${c(t.status||"open")}</strong></span>
      <span><small>Mode</small><strong>${c(t.mode||o("mode")||"demo")}</strong></span>
      <span><small>Symbol</small><strong>${c(z(t))}</strong></span>
    </div>
  </article>`}function Gt(t){const e=V(t),s=tt(t),a=Number(t.pnl_usd||t.pnl||0);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${c(z(t))}</td>
    <td><span class="badge-${e==="SELL"?"sell":"buy"}">${c(e)}</span></td>
    <td class="text-muted">${c(t.market_type||t.order_type||"spot")}</td>
    <td class="text-right font-mono">${f(t.entry_price||t.fill_price,s)}</td>
    <td class="text-right font-mono">${f(t.exit_price||t.limit_price,s)}</td>
    <td class="text-right font-mono">${x(t.used_usdt||t.usd_amount||0)}</td>
    <td class="text-right font-mono">${x(t.fee_paid||0)}</td>
    <td class="text-right font-mono ${a>=0?"text-buy":"text-sell"}">${x(a)}</td>
    <td class="text-right px-3 text-muted">${c(et(t.closed_at||t.created_at))}</td>
  </tr>`}function Jt(t){const e=V(t),s=tt(t),a=Number(t.pnl_usd||t.pnl||0);return`<article class="trade-position-card trade-activity-card is-history">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${c(z(t))}</strong>
        <small>${c(t.close_reason||t.status||"closed")} - ${c(et(t.closed_at||t.created_at))}</small>
      </div>
      <span class="badge-${e==="SELL"?"sell":"buy"}">${c(e)}</span>
    </div>
    <div class="trade-position-metrics">
      <span><small>Entry</small><strong>${f(t.entry_price||t.fill_price,s)}</strong></span>
      <span><small>Exit</small><strong>${f(t.exit_price||t.limit_price,s)}</strong></span>
      <span><small>Used</small><strong>${x(t.used_usdt||t.usd_amount||0)}</strong></span>
      <span><small>PnL</small><strong class="${a>=0?"text-buy":"text-sell"}">${x(a)}</strong></span>
      <span><small>Fee</small><strong>${x(t.fee_paid||0)}</strong></span>
      <span><small>Type</small><strong>${c(t.market_type||t.order_type||"--")}</strong></span>
    </div>
  </article>`}async function Xt(t,e,s=$){if(!v(s))return;const a=d("#chart-box",t);if(!a)return;const{createChart:n}=await Lt();if(!v(s))return;a.innerHTML="",T=n(a,{layout:{background:{color:"#060A14"},textColor:"#8ba1cf",fontSize:11},grid:{vertLines:{color:"rgba(129,160,220,0.04)"},horzLines:{color:"rgba(129,160,220,0.04)"}},crosshair:{mode:0,vertLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"},horzLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"}},timeScale:{timeVisible:!0,secondsVisible:!1,borderColor:"rgba(129,160,220,0.08)",rightOffset:4},rightPriceScale:{borderColor:"rgba(129,160,220,0.08)"},width:Math.max(320,a.clientWidth),height:Math.max(260,a.clientHeight)}),H=T.addCandlestickSeries({upColor:"#00c087",downColor:"#f6465d",borderUpColor:"#00c087",borderDownColor:"#f6465d",wickUpColor:"#00c087",wickDownColor:"#f6465d"}),rt=T.addHistogramSeries({priceFormat:{type:"volume"},priceScaleId:"vol"}),T.priceScale("vol").applyOptions({scaleMargins:{top:.84,bottom:0}});const l=e.map(r=>({time:Number(r.time||r.t),open:Number(r.open||r.o),high:Number(r.high||r.h),low:Number(r.low||r.l),close:Number(r.close||r.c),volume:Number(r.volume||r.v||0)})).filter(r=>r.time>0&&r.open>0).sort((r,i)=>r.time-i.time);H.setData(l.map(({time:r,open:i,high:u,low:p,close:m})=>({time:r,open:i,high:u,low:p,close:m}))),rt.setData(l.map(r=>({time:r.time,value:r.volume,color:r.close>=r.open?"rgba(0,192,135,0.25)":"rgba(246,70,93,0.2)"}))),y=l.length?{...l[l.length-1]}:null,T.timeScale().fitContent(),F=new ResizeObserver(()=>{!T||!a||T.applyOptions({width:Math.max(320,a.clientWidth),height:Math.max(260,a.clientHeight)})}),F.observe(a)}function Zt(t){d("#mob-mkt-btn",t)?.addEventListener("click",()=>te(t)),d("#close-mob-drawer",t)?.addEventListener("click",()=>mt(t)),h(t,"[data-sym]","click",(e,s)=>{mt(t),localStorage.setItem("vp_symbol",s.dataset.sym),localStorage.setItem("vp_type",s.dataset.stype||o("type")),at("trade",{symbol:s.dataset.sym,type:s.dataset.stype||o("type"),tf:o("tf")})}),h(t,"[data-tf]","click",(e,s)=>{k("tf",s.dataset.tf),localStorage.setItem("vp_tf",s.dataset.tf),at("trade",{symbol:o("symbol"),type:o("type"),tf:s.dataset.tf})}),h(t,"[data-type-tab]","click",async(e,s)=>{k("type",s.dataset.typeTab),localStorage.setItem("vp_type",s.dataset.typeTab);const a=await M(_t(s.dataset.typeTab),{timeout:6e3}).catch(()=>null);if(a?.items){const n=a.items.find(l=>l?.symbol);if(n?.symbol&&D(s.dataset.typeTab)!=="favorites"){const l=String(n.symbol).toUpperCase();localStorage.setItem("vp_symbol",l),at("trade",{symbol:l,type:s.dataset.typeTab,tf:o("tf")});return}xt(t,a.items),ht(t,a.items,$),gt(t,a.items,$)}_("[data-type-tab]",t).forEach(n=>{const l=n===s;n.classList.toggle("bg-accent/20",l),n.classList.toggle("text-accent",l),n.classList.toggle("border-accent/40",l)})}),h(t,"[data-open-order]","click",(e,s)=>ee(t,s.dataset.openOrder)),h(t,"[data-close-order-sheet]","click",()=>St(t)),h(t,"[data-submit-order]","click",(e,s)=>pt(s.dataset.submitOrder,t,d("#mobile-order-sheet [data-order-form]",t))),h(t,"[data-side]","click",(e,s)=>{const a=s.closest("#mobile-order-sheet"),n=s.closest("[data-order-form]");if(a){kt(t,s.dataset.side);return}pt(s.dataset.side,t,n)}),h(t,"[data-order-type]","change",(e,s)=>k("orderType",s.value)),h(t,"[data-market-type]","change",(e,s)=>{k("market",s.value),localStorage.setItem("vp_market",s.value),R(t)}),h(t,"[data-leverage]","input",(e,s)=>{k("leverage",Number(s.value)),lt(t,"leverage",s.value),R(t)}),h(t,"[data-amount]","input",(e,s)=>{k("amount",Number(s.value)),lt(t,"amount",s.value),R(t)}),h(t,"[data-close]","click",async(e,s)=>{await M("/trade/close_position.php",{method:"POST",body:{position_id:s.dataset.close},timeout:8e3}).catch(()=>null),await Z(t,$)}),h(t,"[data-activity-tab]","click",(e,s)=>{t.__tradeActivityTab=s.dataset.activityTab||"positions",$t(t)}),h(t,"[data-quick-amount]","click",(e,s)=>{const a=Number(s.dataset.quickAmount||0);a>0&&(k("amount",a),lt(t,"amount",a),R(t))}),d("#sym-search",t)?.addEventListener("input",e=>{const s=e.target.value.toLowerCase();_(".symbol-row",t).forEach(a=>{a.style.display=a.dataset.sym.toLowerCase().includes(s)?"":"none"})})}async function pt(t,e,s){const a=s||d("[data-order-form]",e)||e;C(a,"","info");const n=o("activeQuote")||{},l=Number(n.price||0);if(!l){C(a,"No live price available yet. Please wait for the quote to load.","warning");return}const r=Number(d("[data-amount]",a)?.value||o("amount")||0),i=Number(d("[data-leverage]",a)?.value||o("leverage")||1),u=Number(d("[data-tp]",a)?.value||0),p=Number(d("[data-sl]",a)?.value||0),m=d("[data-market-type]",a)?.value||o("market")||"spot",b=d("[data-order-type]",a)?.value||o("orderType")||"MARKET",w=Number(d("[data-limit-price]",a)?.value||0);if(r<=0){C(a,"Enter a valid amount first.","warning");return}if(t==="BUY"&&p>0&&p>=l){C(a,"For BUY orders, Stop Loss should be below the current price.","warning");return}if(t==="SELL"&&p>0&&p<=l){C(a,"For SELL orders, Stop Loss should be above the current price.","warning");return}if(await Vt({side:t,symbol:o("symbol"),type:o("type"),amount:r,leverage:i,tp:u,sl:p,marketType:m,orderType:b,currentPrice:l,limitInput:w,mode:o("mode")}))try{ut(a,!0),C(a,`Sending ${t==="BUY"?"buy":"sell"} order...`,"info");const g=await M("/trade/place_order.php",{method:"POST",body:{symbol:o("symbol"),asset_type:o("type"),market_type:m,side:t,order_type:b,usd:r,leverage:i,tp:u||void 0,sl:p||void 0,price:b==="LIMIT"&&w||l,mode:o("mode")},timeout:1e4});if(g&&g.ok===!1){C(a,g.error||"Order failed","error");return}C(a,`${t==="BUY"?"Buy":"Sell"} order opened successfully.`,"success"),await Z(e,$),setTimeout(()=>{a.closest?.("#mobile-order-sheet")?St(e):C(a,"","info")},900)}catch(g){console.error("Order failed:",g),C(a,g.message||"Order failed","error")}finally{ut(a,!1)}}function Vt({side:t,symbol:e,type:s,amount:a,leverage:n,tp:l,sl:r,marketType:i,orderType:u,currentPrice:p,limitInput:m,mode:b}){return new Promise(w=>{const S=document.getElementById("order-confirm-modal");S&&S.remove();const g=t==="BUY",L=u==="LIMIT"&&m||p,Y=a*n,q=l>0?Math.abs(l-L)*(Y/L):null,dt=r>0?Math.abs(r-L)*(Y/L):null,N=document.createElement("div");N.id="order-confirm-modal",N.className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center",N.innerHTML=`
      <div class="absolute inset-0 bg-black/70" id="confirm-backdrop"></div>
      <div class="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden">
        <div class="px-5 py-4 border-b border-line text-center">
          <h3 class="text-lg font-bold ${g?"text-green-400":"text-red-400"}">${g?"Buy":"Sell"} Order</h3>
          <p class="text-xs text-muted mt-1">Review and confirm your order</p>
        </div>
        <div class="px-5 py-4 space-y-3">
          <div class="flex justify-between text-sm"><span class="text-muted">Symbol</span><strong>${c(e)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">Type</span><strong>${c(u)} / ${c(i)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">Side</span><strong class="${g?"text-green-400":"text-red-400"}">${t}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">Amount</span><strong>$${a.toFixed(2)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">Leverage</span><strong>${n}x</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">Notional</span><strong>$${Y.toFixed(2)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">Price</span><strong class="font-mono">${parseFloat(L).toFixed(s==="crypto"?2:4)}</strong></div>
          ${l>0?`<div class="flex justify-between text-sm"><span class="text-muted">Take Profit</span><strong class="font-mono text-green-400">${parseFloat(l).toFixed(s==="crypto"?2:4)}</strong></div>`:""}
          ${r>0?`<div class="flex justify-between text-sm"><span class="text-muted">Stop Loss</span><strong class="font-mono text-red-400">${parseFloat(r).toFixed(s==="crypto"?2:4)}</strong></div>`:""}
          ${q!==null?`<div class="flex justify-between text-sm"><span class="text-muted">Est. Profit</span><strong class="text-green-400">$${q.toFixed(2)}</strong></div>`:""}
          ${dt!==null?`<div class="flex justify-between text-sm"><span class="text-muted">Est. Loss</span><strong class="text-red-400">$${dt.toFixed(2)}</strong></div>`:""}
          <div class="flex justify-between text-sm"><span class="text-muted">Mode</span><strong>${b==="real"?"Real":"Demo"}</strong></div>
        </div>
        <div class="grid grid-cols-2 gap-3 px-5 py-4 border-t border-line">
          <button class="btn-ghost py-2.5" id="confirm-cancel">Cancel</button>
          <button class="${g?"btn-buy":"btn-sell"} py-2.5 text-white font-bold" id="confirm-execute">Confirm ${t}</button>
        </div>
      </div>`,document.body.appendChild(N),document.body.style.overflow="hidden";const st=Ct=>{N.remove(),document.body.style.overflow="",w(Ct)};N.querySelector("#confirm-backdrop").addEventListener("click",()=>st(!1)),N.querySelector("#confirm-cancel").addEventListener("click",()=>st(!1)),N.querySelector("#confirm-execute").addEventListener("click",()=>st(!0)),N.querySelector("#confirm-execute").focus()})}function C(t,e,s="info"){const a=d("[data-order-status]",t);a&&(a.textContent=e||"",a.hidden=!e,a.className=`order-form-status is-${s}`)}function ut(t,e){const s=[t,t.closest?.("#mobile-order-sheet")].filter(Boolean);new Set(s.flatMap(n=>_("[data-side], [data-submit-order]",n))).forEach(n=>{n.disabled=!!e,n.classList.toggle("opacity-60",!!e)}),t.classList.toggle("is-submitting",!!e)}function te(t){const e=d("#market-drawer",t);e&&(e.classList.add("mobile-market-open"),e.classList.remove("hidden"),document.body.classList.add("trade-modal-open"))}function mt(t){const e=d("#market-drawer",t);e&&(e.classList.remove("mobile-market-open"),window.innerWidth<1024&&e.classList.add("hidden"),document.body.classList.remove("trade-modal-open"))}function ee(t,e){const s=d("#mobile-order-sheet",t);s&&(kt(t,e),s.classList.remove("hidden"),document.body.classList.add("trade-modal-open"),R(t))}function St(t){const e=d("#mobile-order-sheet",t);e&&e.classList.add("hidden"),document.body.classList.remove("trade-modal-open")}function kt(t,e){const s=d("#mobile-submit-order",t),a=d("#mobile-order-side-label",t);s&&(s.dataset.submitOrder=e,s.textContent=`Review & ${e==="BUY"?"Buy":"Sell"}`,s.className=`${e==="BUY"?"btn-buy":"btn-sell"} w-full py-3`),a&&(a.textContent=`${e} order`)}function lt(t,e,s){_(`[data-${e}]`,t).forEach(a=>{String(a.value)!==String(s)&&(a.value=s)})}function se(t,e=$){if(!v(e)||!H||!y||!(t>0))return;const s=ae();s<=y.time?(y.close=t,y.high=Math.max(y.high,t),y.low=Math.min(y.low,t)):y={time:s,open:y.close,high:Math.max(y.close,t),low:Math.min(y.close,t),close:t,volume:0},H.update({time:y.time,open:y.open,high:y.high,low:y.low,close:y.close})}function ae(){const t=ne(o("tf")),e=Math.floor(Date.now()/1e3);return Math.floor(e/t)*t}function ne(t){return{"1m":60,"5m":300,"15m":900,"30m":1800,"1h":3600,"4h":14400,"1d":86400}[t]||60}function Lt(){return nt||(nt=Tt(()=>import("./chart-DbDccfIU.js"),[])),nt}function _t(t){const e=D(t||"crypto");return`/markets.php?type=${encodeURIComponent(e==="favorites"?"crypto":e)}&scope=trade&supported=1&lite=1&with_quotes=1`}function le(t){const e=String(t?.source||"").toLowerCase();return String(t?.timing_class||"").toLowerCase()==="stale"||t?.is_stale||e.includes("yahoo")?"bg-spread":"bg-buy"}function re(t){const e=String(t?.timing_class||"").toLowerCase(),s=String(t?.source||"").toLowerCase();return Number(t?.price||0)<=0?"Unavailable":e==="stale"||t?.is_stale?"Stale":e==="delayed"||s.includes("yahoo")||["stocks","arab"].includes(D(t?.type||o("type")))?"Delayed":e==="candle_fallback"?"Chart quote":"Live"}function oe(t){const e=String(t||"").toLowerCase();return e==="live"?"status-chip-live":e==="unavailable"?"status-chip-locked":"status-chip-delayed"}function it(t,e,s){return`<span class="${s} grid place-items-center overflow-hidden border border-line bg-surface">
    <img src="${O(Et({symbol:t,type:e},e))}" class="h-full w-full object-cover" alt="${O(t)}" loading="lazy" data-fallback="initial" />
    <b class="hidden h-full w-full place-items-center bg-accent/20 text-[9px] font-black">${c(Mt(t))}</b>
  </span>`}export{ue as cleanup,pe as mount,ce as render};
