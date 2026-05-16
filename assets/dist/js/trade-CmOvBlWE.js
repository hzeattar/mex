import{s as x,g as n,i as B,e as u,a as L,$ as c,b as T,c as b,_ as xt,d as v,n as J,f as k,m as g,p as V}from"./main-CAksTdKi.js";import{m as $t,a as wt}from"./marketIcon-BqfrwX_4.js";let H=null,O=null,w=0,C=null;const St=6500;function kt(t,e,s,a,l={}){if(M(),!t||!t.length)return M;const r=++w,i=nt(t,l.maxSymbols||18);return i.length&&(typeof EventSource=="function"?Lt(i,e,s,a,r,l):D(i,e,s,a,r,l)),M}function nt(t,e){const s=Math.max(1,Number(e||18));return[...new Set((t||[]).map(a=>String(a||"").toUpperCase()).filter(Boolean))].slice(0,s)}function Lt(t,e,s,a,l,r){U();const i="/api/stream/sse.php?symbols="+encodeURIComponent(t.join(","))+"&type="+encodeURIComponent(e)+"&scope=watchlist";let o=!1,d=setTimeout(()=>{l!==w||o||(U(),D(t,e,s,a,l,r))},Math.max(3e3,Number(r.fallbackAfter||5e3)));C=new EventSource(i,{withCredentials:!0}),C.addEventListener("open",()=>{o=!0,d&&(clearTimeout(d),d=null)}),C.addEventListener("message",p=>{if(l===w)try{const m=JSON.parse(p.data||"[]");Array.isArray(m)&&m.length&&s&&s(m)}catch{}}),C.addEventListener("reconnect",()=>{l===w&&(U(),D(t,e,s,a,l,r))}),C.addEventListener("error",p=>{l===w&&(U(),D(t,e,s,a,l,r))})}function D(t,e,s,a,l,r){ot();const i=Math.max(4e3,Number(r.interval||St)),o=nt(t,r.maxSymbols||18),d=async()=>{if(l===w){O=new AbortController;try{const p="/api/quotes.php?symbols="+encodeURIComponent(o.join(","))+"&type="+encodeURIComponent(e)+"&visible=1&purpose=watchlist&_="+Date.now(),m=await fetch(p,{credentials:"same-origin",cache:"no-store",signal:O.signal});if(l!==w)return;if(m.ok){const _=await m.json();l===w&&_&&_.items&&s&&s(_.items)}}catch(p){p.name}finally{l===w&&(H=setTimeout(d,i))}}};d()}function ot(){H&&(clearTimeout(H),H=null),O&&(O.abort(),O=null)}function U(){C&&(C.close(),C=null)}function M(){w+=1,U(),ot()}let $=null,A=null,Z=null,E=null,z=null,P=null,Y=null,R=null,G=null,f=null,h=0;const _t=[{key:"favorites",label:"Favorites"},{key:"crypto",label:"Crypto"},{key:"forex",label:"Forex"},{key:"stocks",label:"Stocks"},{key:"commodities",label:"Commodities"},{key:"futures",label:"Futures"},{key:"arab",label:"Arab"}],Ct=["1m","5m","15m","30m","1h","4h","1d"];function ee(t){t.symbol&&x("symbol",t.symbol.toUpperCase()),t.type&&x("type",t.type),t.tf&&x("tf",t.tf);const e=n("symbol"),s=n("type"),a=n("tf");return`<div class="trade-terminal flex flex-col lg:flex-row h-full mobile-pad">
    <aside id="market-drawer" class="hidden lg:flex flex-col w-[250px] border-r border-line bg-surface shrink-0 overflow-hidden">
      <div class="lg:hidden flex items-center justify-between h-12 px-3 border-b border-line bg-panel">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-muted">Markets</div>
          <strong class="text-sm">Select instrument</strong>
        </div>
        <button class="icon-btn icon-btn-sm" id="close-mob-drawer" aria-label="Close markets">${B.close}</button>
      </div>
      <div class="p-2 border-b border-line">
        <div class="relative">
          <input type="search" class="input pl-7" placeholder="Search symbol..." id="sym-search" />
          <span class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted">${B.search}</span>
        </div>
      </div>
      <div class="flex gap-1 p-2 overflow-x-auto border-b border-line" id="type-tabs">
        ${_t.map(l=>`<button class="btn-xs ${l.key===s?"bg-accent/20 text-accent border-accent/40":"text-muted border-line"} border rounded-md whitespace-nowrap" data-type-tab="${l.key}">${l.label}</button>`).join("")}
      </div>
      <div class="flex-1 overflow-auto p-1" id="symbol-list"><div class="p-4"><div class="loading-spinner mx-auto"></div></div></div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div class="flex items-center justify-between px-2 lg:px-4 h-11 border-b border-line bg-surface shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <button class="lg:hidden w-8 h-8 grid place-items-center rounded border border-line text-muted shrink-0" id="mob-mkt-btn" aria-label="Open markets">${B.menu}</button>
          ${et(e,s,"w-7 h-7 rounded-md shrink-0")}
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <strong class="text-sm truncate" id="sym-name">${u(e)}</strong>
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
          ${Ct.map(l=>`<button class="px-1.5 py-1 text-[10px] rounded shrink-0 ${l===a?"bg-accent/20 text-accent":"text-muted hover:text-text"}" data-tf="${l}">${l}</button>`).join("")}
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
        <div class="text-[10px] text-muted">${u(e)} - ${u(s.toUpperCase())}</div>
      </div>
      <div class="p-3 space-y-3" id="order-body">
        ${ct()}
      </div>
    </aside>

    ${Tt(e,s)}
  </div>`}function ct(){const t=n("orderType")||"MARKET",e=Number(n("amount")||100),s=Number(n("leverage")||10),a=n("market")||"spot",l=n("activeQuote")||{},r=Number(l.price||0);return`<div class="space-y-3 order-ticket-panel" data-order-form>
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
      <button class="btn-sell trade-price-button" data-side="SELL"><small>Sell</small><span data-sell-price>${r>0?b(r,n("type")):"--"}</span></button>
      <button class="btn-buy trade-price-button" data-side="BUY"><small>Buy</small><span data-buy-price>${r>0?b(r*1.0001,n("type")):"--"}</span></button>
    </div>
    <div class="text-center"><span class="spread-display" data-spread-val>Spread: --</span></div>
    <div class="order-summary-box">
      <span><small>Available</small><strong data-avail-bal>--</strong></span>
      <span><small>Est. Units</small><strong data-est-units>--</strong></span>
      <span><small>Notional</small><strong data-est-notional>--</strong></span>
    </div>
    <label class="block">
      <span class="text-[10px] text-muted">Margin / Amount (USDT)</span>
      <input type="number" min="1" step="any" class="input mt-1" value="${T(String(e))}" data-amount />
    </label>
    <div class="quick-amount-grid" aria-label="Quick order amounts">
      ${[25,50,100,250].map(i=>`<button type="button" data-quick-amount="${i}">$${i}</button>`).join("")}
    </div>
    <label class="block">
      <span class="text-[10px] text-muted">Limit price</span>
      <input type="number" min="0" step="any" class="input mt-1" placeholder="${r>0?b(r,n("type")):"Required for limit"}" data-limit-price />
    </label>
    <label class="block">
      <span class="text-[10px] text-muted">Leverage: <strong data-lev-val>${s}x</strong></span>
      <input type="range" min="1" max="100" value="${T(String(s))}" class="w-full mt-1 accent-accent" data-leverage />
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
  </div>`}function Tt(t,e){return`<div class="fixed inset-0 z-[230] hidden lg:hidden" id="mobile-order-sheet">
    <div class="absolute inset-0 bg-black/65" data-close-order-sheet></div>
    <div class="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-auto rounded-t-2xl border border-line bg-surface shadow-2xl">
      <div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3">
        <div class="flex items-center gap-2 min-w-0">
          ${et(t,e,"w-8 h-8 rounded-lg shrink-0")}
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider text-muted" id="mobile-order-side-label">Order</div>
            <strong class="text-sm truncate">${u(t)}</strong>
          </div>
        </div>
        <button class="icon-btn icon-btn-sm" data-close-order-sheet aria-label="Close order">${B.close}</button>
      </div>
      <div class="p-4">
        ${ct()}
        <div class="order-action-sticky">
          <button class="btn-primary w-full py-3" id="mobile-submit-order" data-submit-order="BUY">Review & Place Order</button>
        </div>
      </div>
    </div>
  </div>`}function se(t){Et(t)}function ae(){h+=1,R&&(R.disconnect(),R=null),$&&($.remove(),$=null,A=null,Z=null,f=null),E&&(E(),E=null),pt(),Ut(),M(),document.body.classList.remove("trade-modal-open")}async function Et(t){const e=n("symbol"),s=n("type"),a=n("tf"),l=++h;x("activeQuote",null);const r=ht();Ft(t),N(t),Nt(t,e,s,l),L(gt(s),{timeout:6500}).then(i=>{y(l,e,s)&&i?.items&&(ut(t,i.items),mt(t,i.items,l),dt(t,i.items,l))}).catch(()=>{if(!y(l,e,s))return;const i=c("#symbol-list",t);i&&(i.innerHTML='<p class="text-muted text-[11px] text-center py-4">Markets unavailable</p>')}),F(t,l),Y=setInterval(()=>F(t,l,!0),12e3),L(`/trade/candles.php?symbol=${encodeURIComponent(e)}&type=${encodeURIComponent(s)}&tf=${encodeURIComponent(a)}&limit=220`,{timeout:1e4}).then(async i=>{await r,y(l,e,s)&&(i?.items?.length?await Yt(t,i.items,l):c("#chart-box",t).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart data unavailable</p>')}).catch(i=>{y(l,e,s)&&(console.error("Chart:",i),c("#chart-box",t).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart unavailable</p>')})}function y(t,e=n("symbol"),s=n("type")){return!(t!==h||e&&String(e).toUpperCase()!==String(n("symbol")||"").toUpperCase()||s&&I(s)!==I(n("type")))}function I(t){const e=String(t||"").toLowerCase();return e==="commodity"?"commodities":e==="stock"?"stocks":e==="future"?"futures":e}function dt(t,e,s=h){E&&(E(),E=null);const a=n("type"),l=n("symbol"),r=a==="crypto"?24:12,i=[...new Set(e.slice(0,r).map(o=>String(o.symbol||"").toUpperCase()).filter(Boolean).filter(o=>o!==String(l||"").toUpperCase()))];i.length&&(E=kt(i,a,o=>{if(!y(s,l,a))return;tt(t,o);const d=c("#conn-dot",t);d&&(d.classList.remove("bg-muted","bg-sell"),d.classList.add("bg-buy"),d.title="Live")},null,{interval:a==="crypto"?5200:7200,maxSymbols:r}))}function Nt(t,e,s,a=h){pt();const l=s==="crypto"?2200:3e3,r=async()=>{if(y(a,e,s)){P=new AbortController;try{const i=`/quotes.php?symbol=${encodeURIComponent(e)}&type=${encodeURIComponent(s)}&purpose=focus`,o=await L(i,{timeout:4500,signal:P.signal});if(!y(a,e,s))return;o?.items?.[0]&&Ot(t,o.items[0],a)}catch{y(a,e,s)&&Mt(t)}finally{y(a,e,s)&&(z=setTimeout(r,l))}}};r()}function pt(){z&&(clearTimeout(z),z=null),P&&(P.abort(),P=null)}function Ut(){Y&&(clearInterval(Y),Y=null)}function Mt(t){const e=c("#conn-dot",t);e&&(e.classList.remove("bg-muted","bg-buy"),e.classList.add("bg-sell"),e.title="Disconnected")}function Ot(t,e,s=h){if(!y(s,String(e?.symbol||n("symbol")).toUpperCase(),e?.type||n("type")))return;const a=Number(e.price||e.q_price||0),l=Number(e.change_pct||e.q_change||0),r=n("type");x("activeQuote",{...e,price:a,change_pct:l}),tt(t,[{...e,price:a,change_pct:l}]);const i=c("#live-price",t),o=c("#live-change",t);i&&(i.textContent=a>0?b(a,r):"--"),o&&(o.textContent=V(l),o.className=`text-[10px] ${l>=0?"text-buy":"text-sell"}`);const d=c("#quote-state",t);if(d){const p=Xt(e);d.textContent=p,d.className=`status-chip ${Zt(p)} !text-[8px] !px-1.5 !py-0.5`}k("[data-sell-price]",t).forEach(p=>{p.textContent=a>0?b(a,r):"--"}),k("[data-buy-price]",t).forEach(p=>{p.textContent=a>0?b(a*1.0001,r):"--"}),k("[data-spread-val]",t).forEach(p=>{p.textContent=a>0?`Spread: ${b(a*1e-4,r)}`:"Spread: --"}),N(t),Kt(a,s)}function N(t){const e=n("activeQuote")||{},s=Number(e.price||0),a=n("wallet")||{},l=n("mode")==="real"?a.real||{}:a.demo||{};k("[data-order-form]",t).forEach(r=>{const i=Number(c("[data-amount]",r)?.value||n("amount")||0),o=Number(c("[data-leverage]",r)?.value||n("leverage")||1),p=(c("[data-market-type]",r)?.value||n("market")||"spot")==="perp"?o:1,m=s>0?i*p/s:0,_=i*p,j=c("[data-lev-val]",r);j&&(j.textContent=`${o}x`);const S=c("[data-est-units]",r);S&&(S.textContent=m>0?m.toFixed(m>=10?3:6):"--");const st=c("[data-est-notional]",r);st&&(st.textContent=i>0?`${g(_)} USDT`:"--");const at=c("[data-avail-bal]",r);at&&(at.textContent=`${g(l.available||0)} ${l.currency||""}`)})}function ut(t,e){const s=c("#symbol-list",t);if(!s)return;const a=n("symbol"),l=e.slice(0,60);s.innerHTML=l.map(r=>{const i=String(r.symbol||"").toUpperCase(),o=r.type||n("type"),d=Number(r.price||r.q_price||0),p=Number(r.change_pct||r.q_change||0),m=!(d>0);return`<div class="symbol-row ${i===a?"active":""}" data-sym="${T(i)}" data-stype="${T(o)}">
      ${et(i,o,"w-7 h-7 rounded-md shrink-0")}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <div class="font-semibold text-[11px] truncate">${u(i)}</div>
          <span class="status-dot ${m?"bg-sell":Gt(r)}"></span>
        </div>
        <div class="text-[9px] text-muted truncate">${u(r.name||o)}</div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-[11px] font-mono" data-price-cell>${d>0?b(d,o):"--"}</div>
        <div class="text-[9px] ${p>=0?"text-buy":"text-sell"}" data-change-cell>${m?"Unavailable":V(p)}</div>
      </div>
    </div>`}).join("")}async function mt(t,e,s=h){const a=n("type"),l=e.slice(0,a==="crypto"?18:10).filter(d=>!(Number(d.price||d.q_price||0)>0)).map(d=>String(d.symbol||"").toUpperCase()).filter(Boolean);if(!l.length)return;const r=a==="crypto"?12:2,i=a==="crypto"?18:6,o=[...new Set(l)].slice(0,i);for(let d=0;d<o.length;d+=r){const p=o.slice(d,d+r),m=await L(`/quotes.php?symbols=${encodeURIComponent(p.join(","))}&type=${encodeURIComponent(a)}&cache_only=1&purpose=watchlist`,{timeout:3500}).catch(()=>null);if(!y(s))return;m?.items?.length&&tt(t,m.items)}}function tt(t,e){e?.length&&e.forEach(s=>{const a=String(s.symbol||"").toUpperCase();if(!a)return;const l=k(".symbol-row",t).find(m=>m.dataset.sym===a);if(!l)return;const r=l.dataset.stype||n("type"),i=Number(s.price||s.q_price||0),o=Number(s.change_pct||s.q_change||0),d=c("[data-price-cell]",l),p=c("[data-change-cell]",l);d&&i>0&&(d.textContent=b(i,r)),p&&(p.textContent=V(o),p.className=`text-[9px] ${o>=0?"text-buy":"text-sell"}`)})}async function F(t,e=h,s=!1){if(!y(e))return;const a=c("#activity-body",t);a&&!s&&!t.__tradeActivityLoaded&&(a.innerHTML='<p class="text-muted text-[11px] text-center py-4">Loading trading activity...</p>');const[l,r]=await Promise.allSettled([L("/trade/portfolio.php",{timeout:6500}),L("/trade/orders.php?limit=90",{timeout:6500})]);if(!y(e))return;const i=l.status==="fulfilled"?l.value:null,o=r.status==="fulfilled"?r.value:null;i?.positions&&(t.__tradePositions=i.positions),(o?.items||o?.orders)&&(t.__tradeOrders=o.items||o.orders||[]),t.__tradeActivityLoaded=!0,bt(t)}function bt(t){const e=t.__tradePositions||[],s=t.__tradeOrders||[],a=s.filter(m=>!lt(m)),l=s.filter(lt),r=t.__tradeActivityTab||"positions",i=c("#pos-count",t),o=c("#orders-count",t),d=c("#history-count",t),p=c("#activity-summary",t);return i&&(i.textContent=String(e.length)),o&&(o.textContent=String(a.length)),d&&(d.textContent=String(l.length)),p&&(p.textContent=`${e.length} open / ${a.length} pending / ${l.length} closed`),k("[data-activity-tab]",t).forEach(m=>{m.classList.toggle("active",m.dataset.activityTab===r)}),r==="orders"?Rt(t,a):r==="history"?At(t,l):Pt(t,e)}function Pt(t,e){const s=c("#activity-body",t);if(s){if(!e.length){s.innerHTML='<p class="text-muted text-[11px] text-center py-3">No open positions</p>';return}s.innerHTML=`
    <div class="trade-position-cards lg:hidden">
      ${e.slice(0,12).map(jt).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[620px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">Mark</th><th class="text-right py-1">Size</th><th class="text-right py-1">Lev</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1"></th>
      </tr></thead>
      <tbody>${e.slice(0,12).map(It).join("")}</tbody>
    </table></div>`}}function Rt(t,e){const s=c("#activity-body",t);if(s){if(!e.length){s.innerHTML='<p class="text-muted text-[11px] text-center py-4">No pending or armed orders</p>';return}s.innerHTML=`
    <div class="trade-position-cards lg:hidden">
      ${e.slice(0,16).map(Ht).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[720px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">Amount</th><th class="text-right py-1">Lev</th><th class="text-right py-1">Status</th><th class="text-right px-3 py-1">Created</th>
      </tr></thead>
      <tbody>${e.slice(0,16).map(Bt).join("")}</tbody>
    </table></div>`}}function At(t,e){const s=c("#activity-body",t);if(s){if(!e.length){s.innerHTML='<p class="text-muted text-[11px] text-center py-4">No closed trades yet</p>';return}s.innerHTML=`
    <div class="trade-position-cards lg:hidden">
      ${e.slice(0,18).map(zt).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[820px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">Exit</th><th class="text-right py-1">Used</th><th class="text-right py-1">Fee</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1">Closed</th>
      </tr></thead>
      <tbody>${e.slice(0,18).map(Dt).join("")}</tbody>
    </table></div>`}}function ft(t){const e=Number(t.pnl||t.unrealized_pnl||0),s=String(t.symbol||"").replace("@R@",""),a=t.asset_type||n("type"),l=Number(t.mark_price||t.current_price||t.price||0),r=t.position_id||t.id||"",i=String(t.side||"buy").toUpperCase()==="SELL"?"SELL":"BUY";return{pnl:e,cleanSymbol:s,posType:a,mark:l,id:r,side:i}}function It(t){const{pnl:e,cleanSymbol:s,posType:a,mark:l,id:r,side:i}=ft(t);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${u(s)}</td>
    <td><span class="badge-${i==="BUY"?"buy":"sell"}">${u(i)}</span></td>
    <td class="text-muted">${u(t.market_type||"spot")}</td>
    <td class="text-right font-mono">${b(t.entry_price||t.open_price,a)}</td>
    <td class="text-right font-mono">${l>0?b(l,a):"--"}</td>
    <td class="text-right font-mono">${g(t.qty||t.amount||t.size||t.units||0)}</td>
    <td class="text-right font-mono">${u(String(t.leverage||1))}x</td>
    <td class="text-right font-mono ${e>=0?"text-buy":"text-sell"}">${g(e)}</td>
    <td class="text-right px-3">${r?`<button class="btn-xs btn-ghost text-sell" data-close="${T(r)}">Close</button>`:""}</td>
  </tr>`}function jt(t){const{pnl:e,cleanSymbol:s,posType:a,mark:l,id:r,side:i}=ft(t);return`<article class="trade-position-card">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${u(s)}</strong>
        <small>${u(t.market_type||"spot")} - ${u(t.created_at||t.opened_at||"")}</small>
      </div>
      <span class="badge-${i==="BUY"?"buy":"sell"}">${u(i)}</span>
    </div>
    <div class="trade-position-metrics">
      <span><small>Entry</small><strong>${b(t.entry_price||t.open_price,a)}</strong></span>
      <span><small>Mark</small><strong>${l>0?b(l,a):"--"}</strong></span>
      <span><small>Size</small><strong>${g(t.qty||t.amount||t.size||t.units||0)}</strong></span>
      <span><small>PnL</small><strong class="${e>=0?"text-buy":"text-sell"}">${g(e)}</strong></span>
    </div>
    ${r?`<button class="btn-xs btn-ghost text-sell w-full" data-close="${T(r)}">Close position</button>`:""}
  </article>`}function lt(t){const e=String(t.status||"").toLowerCase();return e==="closed"||e==="canceled"||e==="cancelled"||e==="rejected"||Number(t.closed_at||0)>0||Number(t.exit_price||0)>0}function Q(t){return String(t.symbol||"").replace("@R@","").replace("@D@","")}function q(t){return String(t.side||"BUY").toUpperCase()==="SELL"?"SELL":String(t.side||"BUY").toUpperCase()==="CLOSE"?"CLOSE":"BUY"}function K(t){return t.asset_type||t.type||n("type")}function W(t){const e=Number(t||0);if(!e)return"--";try{return new Date(e*1e3).toLocaleString([],{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})}catch{return String(t)}}function Bt(t){const e=q(t),s=K(t);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${u(Q(t))}</td>
    <td><span class="badge-${e==="SELL"?"sell":"buy"}">${u(e)}</span></td>
    <td class="text-muted">${u(t.order_type||t.market_type||"market")}</td>
    <td class="text-right font-mono">${b(t.entry_price||t.fill_price||t.limit_price,s)}</td>
    <td class="text-right font-mono">${g(t.used_usdt||t.usd_amount||t.amount||0)}</td>
    <td class="text-right font-mono">${u(String(t.leverage||1))}x</td>
    <td class="text-right"><span class="status-chip status-chip-derived">${u(t.status||"open")}</span></td>
    <td class="text-right px-3 text-muted">${u(W(t.created_at))}</td>
  </tr>`}function Ht(t){const e=q(t),s=K(t);return`<article class="trade-position-card trade-activity-card">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${u(Q(t))}</strong>
        <small>${u(t.order_type||"market")} - ${u(W(t.created_at))}</small>
      </div>
      <span class="badge-${e==="SELL"?"sell":"buy"}">${u(e)}</span>
    </div>
    <div class="trade-position-metrics">
      <span><small>Entry</small><strong>${b(t.entry_price||t.fill_price||t.limit_price,s)}</strong></span>
      <span><small>Amount</small><strong>${g(t.used_usdt||t.usd_amount||t.amount||0)}</strong></span>
      <span><small>Lev</small><strong>${u(String(t.leverage||1))}x</strong></span>
      <span><small>Status</small><strong>${u(t.status||"open")}</strong></span>
    </div>
  </article>`}function Dt(t){const e=q(t),s=K(t),a=Number(t.pnl_usd||t.pnl||0);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${u(Q(t))}</td>
    <td><span class="badge-${e==="SELL"?"sell":"buy"}">${u(e)}</span></td>
    <td class="text-muted">${u(t.market_type||t.order_type||"spot")}</td>
    <td class="text-right font-mono">${b(t.entry_price||t.fill_price,s)}</td>
    <td class="text-right font-mono">${b(t.exit_price||t.limit_price,s)}</td>
    <td class="text-right font-mono">${g(t.used_usdt||t.usd_amount||0)}</td>
    <td class="text-right font-mono">${g(t.fee_paid||0)}</td>
    <td class="text-right font-mono ${a>=0?"text-buy":"text-sell"}">${g(a)}</td>
    <td class="text-right px-3 text-muted">${u(W(t.closed_at||t.created_at))}</td>
  </tr>`}function zt(t){const e=q(t),s=K(t),a=Number(t.pnl_usd||t.pnl||0);return`<article class="trade-position-card trade-activity-card is-history">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${u(Q(t))}</strong>
        <small>${u(t.close_reason||t.status||"closed")} - ${u(W(t.closed_at||t.created_at))}</small>
      </div>
      <span class="badge-${e==="SELL"?"sell":"buy"}">${u(e)}</span>
    </div>
    <div class="trade-position-metrics">
      <span><small>Entry</small><strong>${b(t.entry_price||t.fill_price,s)}</strong></span>
      <span><small>Exit</small><strong>${b(t.exit_price||t.limit_price,s)}</strong></span>
      <span><small>Used</small><strong>${g(t.used_usdt||t.usd_amount||0)}</strong></span>
      <span><small>PnL</small><strong class="${a>=0?"text-buy":"text-sell"}">${g(a)}</strong></span>
    </div>
  </article>`}async function Yt(t,e,s=h){if(!y(s))return;const a=c("#chart-box",t);if(!a)return;const{createChart:l}=await ht();if(!y(s))return;a.innerHTML="",$=l(a,{layout:{background:{color:"#060A14"},textColor:"#8ba1cf",fontSize:11},grid:{vertLines:{color:"rgba(129,160,220,0.04)"},horzLines:{color:"rgba(129,160,220,0.04)"}},crosshair:{mode:0,vertLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"},horzLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"}},timeScale:{timeVisible:!0,secondsVisible:!1,borderColor:"rgba(129,160,220,0.08)",rightOffset:4},rightPriceScale:{borderColor:"rgba(129,160,220,0.08)"},width:Math.max(320,a.clientWidth),height:Math.max(260,a.clientHeight)}),A=$.addCandlestickSeries({upColor:"#00c087",downColor:"#f6465d",borderUpColor:"#00c087",borderDownColor:"#f6465d",wickUpColor:"#00c087",wickDownColor:"#f6465d"}),Z=$.addHistogramSeries({priceFormat:{type:"volume"},priceScaleId:"vol"}),$.priceScale("vol").applyOptions({scaleMargins:{top:.84,bottom:0}});const r=e.map(i=>({time:Number(i.time||i.t),open:Number(i.open||i.o),high:Number(i.high||i.h),low:Number(i.low||i.l),close:Number(i.close||i.c),volume:Number(i.volume||i.v||0)})).filter(i=>i.time>0&&i.open>0).sort((i,o)=>i.time-o.time);A.setData(r.map(({time:i,open:o,high:d,low:p,close:m})=>({time:i,open:o,high:d,low:p,close:m}))),Z.setData(r.map(i=>({time:i.time,value:i.volume,color:i.close>=i.open?"rgba(0,192,135,0.25)":"rgba(246,70,93,0.2)"}))),f=r.length?{...r[r.length-1]}:null,$.timeScale().fitContent(),R=new ResizeObserver(()=>{!$||!a||$.applyOptions({width:Math.max(320,a.clientWidth),height:Math.max(260,a.clientHeight)})}),R.observe(a)}function Ft(t){c("#mob-mkt-btn",t)?.addEventListener("click",()=>Qt(t)),c("#close-mob-drawer",t)?.addEventListener("click",()=>it(t)),v(t,"[data-sym]","click",(e,s)=>{it(t),localStorage.setItem("vp_symbol",s.dataset.sym),localStorage.setItem("vp_type",s.dataset.stype||n("type")),J("trade",{symbol:s.dataset.sym,type:s.dataset.stype||n("type"),tf:n("tf")})}),v(t,"[data-tf]","click",(e,s)=>{x("tf",s.dataset.tf),localStorage.setItem("vp_tf",s.dataset.tf),J("trade",{symbol:n("symbol"),type:n("type"),tf:s.dataset.tf})}),v(t,"[data-type-tab]","click",async(e,s)=>{x("type",s.dataset.typeTab),localStorage.setItem("vp_type",s.dataset.typeTab);const a=await L(gt(s.dataset.typeTab),{timeout:6e3}).catch(()=>null);if(a?.items){const l=a.items.find(r=>r?.symbol);if(l?.symbol&&I(s.dataset.typeTab)!=="favorites"){const r=String(l.symbol).toUpperCase();localStorage.setItem("vp_symbol",r),J("trade",{symbol:r,type:s.dataset.typeTab,tf:n("tf")});return}ut(t,a.items),mt(t,a.items,h),dt(t,a.items,h)}k("[data-type-tab]",t).forEach(l=>{const r=l===s;l.classList.toggle("bg-accent/20",r),l.classList.toggle("text-accent",r),l.classList.toggle("border-accent/40",r)})}),v(t,"[data-open-order]","click",(e,s)=>qt(t,s.dataset.openOrder)),v(t,"[data-close-order-sheet]","click",()=>yt(t)),v(t,"[data-submit-order]","click",(e,s)=>rt(s.dataset.submitOrder,t,c("#mobile-order-sheet [data-order-form]",t))),v(t,"[data-side]","click",(e,s)=>{const a=s.closest("#mobile-order-sheet"),l=s.closest("[data-order-form]");if(a){vt(t,s.dataset.side);return}rt(s.dataset.side,t,l)}),v(t,"[data-order-type]","change",(e,s)=>x("orderType",s.value)),v(t,"[data-market-type]","change",(e,s)=>{x("market",s.value),localStorage.setItem("vp_market",s.value),N(t)}),v(t,"[data-leverage]","input",(e,s)=>{x("leverage",Number(s.value)),X(t,"leverage",s.value),N(t)}),v(t,"[data-amount]","input",(e,s)=>{x("amount",Number(s.value)),X(t,"amount",s.value),N(t)}),v(t,"[data-close]","click",async(e,s)=>{await L("/trade/close_position.php",{method:"POST",body:{position_id:s.dataset.close},timeout:8e3}).catch(()=>null),await F(t,h)}),v(t,"[data-activity-tab]","click",(e,s)=>{t.__tradeActivityTab=s.dataset.activityTab||"positions",bt(t)}),v(t,"[data-quick-amount]","click",(e,s)=>{const a=Number(s.dataset.quickAmount||0);a>0&&(x("amount",a),X(t,"amount",a),N(t))}),c("#sym-search",t)?.addEventListener("input",e=>{const s=e.target.value.toLowerCase();k(".symbol-row",t).forEach(a=>{a.style.display=a.dataset.sym.toLowerCase().includes(s)?"":"none"})})}async function rt(t,e,s){const a=n("activeQuote")||{},l=Number(a.price||0);if(!l){alert("No live price available yet. Please wait for the quote to load.");return}const r=s||c("[data-order-form]",e)||e,i=Number(c("[data-amount]",r)?.value||n("amount")||0),o=Number(c("[data-leverage]",r)?.value||n("leverage")||1),d=Number(c("[data-tp]",r)?.value||0),p=Number(c("[data-sl]",r)?.value||0),m=c("[data-market-type]",r)?.value||n("market")||"spot",_=c("[data-order-type]",r)?.value||n("orderType")||"MARKET",j=Number(c("[data-limit-price]",r)?.value||0);if(i<=0){alert("Enter a valid amount first.");return}if(t==="BUY"&&p>0&&p>=l){alert("For BUY orders, Stop Loss should be below the current price.");return}if(t==="SELL"&&p>0&&p<=l){alert("For SELL orders, Stop Loss should be above the current price.");return}try{const S=await L("/trade/place_order.php",{method:"POST",body:{symbol:n("symbol"),asset_type:n("type"),market_type:m,side:t,order_type:_,usd:i,leverage:o,tp:d||void 0,sl:p||void 0,price:_==="LIMIT"&&j||l,mode:n("mode")},timeout:1e4});if(S&&S.ok===!1){alert(S.error||"Order failed");return}yt(e),await F(e,h)}catch(S){console.error("Order failed:",S),alert(S.message||"Order failed")}}function Qt(t){const e=c("#market-drawer",t);e&&(e.classList.add("mobile-market-open"),e.classList.remove("hidden"),document.body.classList.add("trade-modal-open"))}function it(t){const e=c("#market-drawer",t);e&&(e.classList.remove("mobile-market-open"),window.innerWidth<1024&&e.classList.add("hidden"),document.body.classList.remove("trade-modal-open"))}function qt(t,e){const s=c("#mobile-order-sheet",t);s&&(vt(t,e),s.classList.remove("hidden"),document.body.classList.add("trade-modal-open"),N(t))}function yt(t){const e=c("#mobile-order-sheet",t);e&&e.classList.add("hidden"),document.body.classList.remove("trade-modal-open")}function vt(t,e){const s=c("#mobile-submit-order",t),a=c("#mobile-order-side-label",t);s&&(s.dataset.submitOrder=e,s.textContent=`Review & ${e==="BUY"?"Buy":"Sell"}`,s.className=`${e==="BUY"?"btn-buy":"btn-sell"} w-full py-3`),a&&(a.textContent=`${e} order`)}function X(t,e,s){k(`[data-${e}]`,t).forEach(a=>{String(a.value)!==String(s)&&(a.value=s)})}function Kt(t,e=h){if(!y(e)||!A||!f||!(t>0))return;const s=Wt();s<=f.time?(f.close=t,f.high=Math.max(f.high,t),f.low=Math.min(f.low,t)):f={time:s,open:f.close,high:Math.max(f.close,t),low:Math.min(f.close,t),close:t,volume:0},A.update({time:f.time,open:f.open,high:f.high,low:f.low,close:f.close})}function Wt(){const t=Jt(n("tf")),e=Math.floor(Date.now()/1e3);return Math.floor(e/t)*t}function Jt(t){return{"1m":60,"5m":300,"15m":900,"30m":1800,"1h":3600,"4h":14400,"1d":86400}[t]||60}function ht(){return G||(G=xt(()=>import("./chart-DbDccfIU.js"),[])),G}function gt(t){const e=I(t||"crypto");return`/markets.php?type=${encodeURIComponent(e==="favorites"?"crypto":e)}&scope=trade&supported=1&lite=1&with_quotes=1`}function Gt(t){const e=String(t?.source||"").toLowerCase();return String(t?.timing_class||"").toLowerCase()==="stale"||t?.is_stale||e.includes("yahoo")?"bg-spread":"bg-buy"}function Xt(t){const e=String(t?.timing_class||"").toLowerCase(),s=String(t?.source||"").toLowerCase();return Number(t?.price||0)<=0?"Unavailable":e==="stale"||t?.is_stale?"Stale":e==="delayed"||s.includes("yahoo")||["stocks","arab"].includes(I(t?.type||n("type")))?"Delayed":e==="candle_fallback"?"Chart quote":"Live"}function Zt(t){const e=String(t||"").toLowerCase();return e==="live"?"status-chip-live":e==="unavailable"?"status-chip-locked":"status-chip-delayed"}function et(t,e,s){return`<span class="${s} grid place-items-center overflow-hidden border border-line bg-surface">
    <img src="${T($t({symbol:t,type:e},e))}" class="h-full w-full object-cover" alt="${T(t)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';" />
    <b class="hidden h-full w-full place-items-center bg-accent/20 text-[9px] font-black">${u(wt(t))}</b>
  </span>`}export{ae as cleanup,se as mount,ee as render};
