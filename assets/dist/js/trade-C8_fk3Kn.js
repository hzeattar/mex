import{c as T,s as S,i as o,j as U,f as u,$ as p,g as L,l as y,_ as Qt,e as w,n as lt,a as E,m as N,p as mt,t as v,q as Nt}from"./main-CQ9GDTgp.js";import{marketIconPath as Kt,marketInitial as Vt}from"./marketIcon-D-Yq8Sis.js";let tt=null,R=null,P=0,A=null;const Wt=6500;function Gt(t,s,e,a,i={}){if(Q(),!t||!t.length)return Q;const r=++P,n=Mt(t,i.maxSymbols||18);return n.length&&(typeof EventSource=="function"?Xt(n,s,e,a,r,i):et(n,s,e,a,r,i)),Q}function Mt(t,s){const e=Math.max(1,Number(s||18));return[...new Set((t||[]).map(a=>String(a||"").toUpperCase()).filter(Boolean))].slice(0,e)}function Xt(t,s,e,a,i,r){Y();const n="/api/stream/sse.php?symbols="+encodeURIComponent(t.join(","))+"&type="+encodeURIComponent(s)+"&scope=watchlist";let l=!1,c=setTimeout(()=>{i!==P||l||(Y(),et(t,s,e,a,i,r))},Math.max(3e3,Number(r.fallbackAfter||5e3)));A=new EventSource(n,{withCredentials:!0}),A.addEventListener("open",()=>{l=!0,c&&(clearTimeout(c),c=null)}),A.addEventListener("message",d=>{if(i===P)try{const m=JSON.parse(d.data||"[]");Array.isArray(m)&&m.length&&e&&e(m)}catch{}}),A.addEventListener("reconnect",()=>{i===P&&(Y(),et(t,s,e,a,i,r))}),A.addEventListener("error",d=>{i===P&&(Y(),et(t,s,e,a,i,r))})}function et(t,s,e,a,i,r){Ot();const n=Math.max(4e3,Number(r.interval||Wt)),l=Mt(t,r.maxSymbols||18),c=async()=>{if(i!==P)return;R=new AbortController;const d=Math.max(3e3,Number(r.timeout||15e3)),m=setTimeout(()=>R?.abort(),d);try{const f="/api/quotes.php?symbols="+encodeURIComponent(l.join(","))+"&type="+encodeURIComponent(s)+"&visible=1&purpose=watchlist&_="+Date.now(),h=await T(f,{timeout:d,retry:0,cacheTtl:500,cache:"no-store",signal:R.signal});i===P&&h&&h.items&&e&&e(h.items)}catch(f){f.name}finally{clearTimeout(m),i===P&&(tt=setTimeout(c,n))}};c()}function Ot(){tt&&(clearTimeout(tt),tt=null),R&&(R.abort(),R=null)}function Y(){A&&(A.close(),A=null)}function Q(){P+=1,Y(),Ot()}let C=null,W=null,pt=null,wt=null,$t=null,j=null,st=null,K=null,at=null,V=null,ot=null,$=null,b=0;const _t=new Map,dt=new Set,Jt=[{key:"favorites",label:"Favorites"},{key:"crypto",label:"Crypto"},{key:"forex",label:"Forex"},{key:"stocks",label:"Stocks"},{key:"commodities",label:"Commodities"},{key:"futures",label:"Futures"},{key:"arab",label:"Arab"}],Zt=["1m","5m","15m","30m","1h","4h","1d"];function je(t){t.symbol&&S("symbol",t.symbol.toUpperCase()),t.type&&S("type",t.type),t.tf&&S("tf",t.tf);const s=o("symbol"),e=o("type"),a=o("tf");return`<div class="trade-terminal flex flex-col lg:flex-row h-full mobile-pad">
    <aside id="market-drawer" class="hidden lg:flex flex-col w-[250px] border-r border-line bg-surface shrink-0 overflow-hidden">
      <div class="lg:hidden flex items-center justify-between h-12 px-3 border-b border-line bg-panel">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-muted">Markets</div>
          <strong class="text-sm">Select instrument</strong>
        </div>
        <button class="icon-btn icon-btn-sm" id="close-mob-drawer" aria-label="Close markets">${U.close}</button>
      </div>
      <div class="p-2 border-b border-line">
        <div class="relative">
          <input type="search" class="input pl-7" placeholder="Search symbol..." id="sym-search" />
          <span class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted">${U.search}</span>
        </div>
      </div>
      <div class="flex gap-1 p-2 overflow-x-auto border-b border-line" id="type-tabs">
        ${Jt.map(i=>`<button class="btn-xs ${i.key===e?"bg-accent/20 text-accent border-accent/40":"text-muted border-line"} border rounded-md whitespace-nowrap" data-type-tab="${i.key}">${i.label}</button>`).join("")}
      </div>
      <div class="flex-1 overflow-auto p-1" id="symbol-list"><div class="p-4"><div class="loading-spinner mx-auto"></div></div></div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div class="flex items-center justify-between px-2 lg:px-4 h-11 border-b border-line bg-surface shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <button class="lg:hidden w-8 h-8 grid place-items-center rounded border border-line text-muted shrink-0" id="mob-mkt-btn" aria-label="Open markets">${U.menu}</button>
          ${xt(s,e,"w-7 h-7 rounded-md shrink-0")}
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <strong class="text-sm truncate" id="sym-name">${u(s)}</strong>
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
          ${Zt.map(i=>`<button class="px-1.5 py-1 text-[10px] rounded shrink-0 ${i===a?"bg-accent/20 text-accent":"text-muted hover:text-text"}" data-tf="${i}">${i}</button>`).join("")}
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
          <div class="trade-activity-title">
            <span class="text-[10px] font-semibold text-muted uppercase">Trading activity</span>
            <span class="text-[10px] text-muted ml-2" id="activity-summary">Loading...</span>
          </div>
          <div class="trade-activity-actions">
            <div class="activity-tabs" role="tablist">
              <button class="active" data-activity-tab="active">Active trades <b id="active-count">0</b></button>
              <button data-activity-tab="closed">Closed trades <b id="closed-count">0</b></button>
            </div>
            <button class="activity-expand-btn" data-toggle-activity-expand title="Expand trading activity" aria-label="Expand trading activity">${U.fullscreen||U.expand||"⛶"}</button>
          </div>
        </div>
        <div id="activity-body"><p class="text-muted text-[11px] text-center py-4">Loading...</p></div>
      </div>
    </div>

    <aside class="hidden lg:flex flex-col w-[300px] border-l border-line bg-surface shrink-0 overflow-auto">
      <div class="p-3 border-b border-line">
        <div class="text-xs font-semibold">Order Ticket</div>
        <div class="text-[10px] text-muted">${u(s)} - ${u(e.toUpperCase())}</div>
      </div>
      <div class="p-3 space-y-3" id="order-body">
        ${Ut()}
      </div>
    </aside>

    ${te(s,e)}
  </div>`}function Ut(){const t=o("orderType")||"MARKET",s=Number(o("amount")||100),e=Number(o("leverage")||10),a=o("market")||"spot",i=o("activeQuote")||{},r=Number(i.price||0);return`<div class="space-y-3 order-ticket-panel" data-order-form>
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
      <button class="btn-sell trade-price-button" data-side="SELL"><small>Sell</small><span data-sell-price>${r>0?y(r,o("type")):"--"}</span></button>
      <button class="btn-buy trade-price-button" data-side="BUY"><small>Buy</small><span data-buy-price>${r>0?y(r*1.0001,o("type")):"--"}</span></button>
      </div>
      <div class="text-center"><span class="spread-display" data-spread-val>Spread: --</span></div>
      <div class="mobile-order-summary">
        <span><small>Mode</small><strong>${u(o("mode")==="real"?"Real":"Demo")}</strong></span>
        <span><small>Symbol</small><strong>${u(o("symbol")||"--")}</strong></span>
        <span><small>Asset</small><strong>${u(o("type")||"--")}</strong></span>
      </div>
      <div class="order-summary-box">
        <span><small>Available</small><strong data-avail-bal>--</strong></span>
        <span><small>Est. Units</small><strong data-est-units>--</strong></span>
        <span><small>Notional</small><strong data-est-notional>--</strong></span>
    </div>
    <label class="block">
      <span class="text-[10px] text-muted">Margin / Amount (USDT)</span>
      <input type="number" min="1" step="any" class="input mt-1" value="${L(String(s))}" data-amount />
    </label>
    <div class="quick-amount-grid" aria-label="Quick order amounts">
      ${[25,50,100,250].map(n=>`<button type="button" data-quick-amount="${n}">$${n}</button>`).join("")}
    </div>
    <label class="block">
      <span class="text-[10px] text-muted">Limit price</span>
      <input type="number" min="0" step="any" class="input mt-1" placeholder="${r>0?y(r,o("type")):"Required for limit"}" data-limit-price />
    </label>
    <label class="block">
      <span class="text-[10px] text-muted">Leverage: <strong data-lev-val id="leverage-label">${e}x</strong></span>
      <input type="range" min="1" max="100" value="${L(String(e))}" class="w-full mt-1 accent-accent" data-leverage />
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
  </div>`}function te(t,s){return`<div class="fixed inset-0 z-[230] hidden lg:hidden" id="mobile-order-sheet">
    <div class="absolute inset-0 bg-black/65" data-close-order-sheet></div>
    <div class="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-auto rounded-t-2xl border border-line bg-surface shadow-2xl">
      <div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3">
        <div class="flex items-center gap-2 min-w-0">
          ${xt(t,s,"w-8 h-8 rounded-lg shrink-0")}
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider text-muted" id="mobile-order-side-label">Order</div>
            <strong class="text-sm truncate">${u(t)}</strong>
          </div>
        </div>
        <button class="icon-btn icon-btn-sm" data-close-order-sheet aria-label="Close order">${U.close}</button>
      </div>
      <div class="p-4">
        ${Ut()}
        <div class="order-action-sticky">
          <button class="btn-primary w-full py-3" id="mobile-submit-order" data-submit-order="BUY">Review & Place Order</button>
        </div>
      </div>
    </div>
  </div>`}function Be(t){t.addEventListener("error",s=>{if(s.target.tagName==="IMG"&&s.target.dataset.fallback==="initial"){s.target.style.display="none";const e=s.target.nextElementSibling;e&&(e.style.display="grid")}},!0),ee(t)}function Ie(){b+=1,V&&(V.disconnect(),V=null),C&&(C.remove(),C=null,W=null,pt=null,$=null),j&&(j(),j=null),At(),ae(),Q(),document.body.classList.remove("trade-modal-open")}async function ee(t){const s=o("symbol"),e=o("type"),a=o("tf"),i=++b;S("activeQuote",null);const r=it();ge(t),B(t),se(t,s,e,i),vt(e,i).then(n=>{x(i,s,e)&&n?.items&&(t.__marketItems=n.items,ft(t,n.items),Ht(t,n.items,i),bt(t,n.items,i).finally(()=>{x(i,s,e)&&setTimeout(()=>Pt(t,n.items,i),1200)}))}).catch(()=>{if(!x(i,s,e))return;const n=p("#symbol-list",t);n&&(n.innerHTML='<p class="text-muted text-[11px] text-center py-4">Markets unavailable</p>')}),I(t,i),at=setInterval(()=>I(t,i,!0),2e4),Dt(t,s,e,a,i,r)}function x(t,s=o("symbol"),e=o("type")){return!(t!==b||s&&String(s).toUpperCase()!==String(o("symbol")||"").toUpperCase()||e&&q(e)!==q(o("type")))}function q(t){const s=String(t||"").toLowerCase();return s==="commodity"?"commodities":s==="stock"?"stocks":s==="future"?"futures":s}function Pt(t,s,e=b){j&&(j(),j=null);const a=o("type"),i=o("symbol"),r=a==="crypto"?36:18,n=[...new Set(s.slice(0,r).map(l=>String(l.symbol||"").toUpperCase()).filter(Boolean).filter(l=>l!==String(i||"").toUpperCase()))];n.length&&(j=Gt(n,a,l=>{if(!x(e,i,a))return;rt(t,l);const c=p("#conn-dot",t);c&&(c.classList.remove("bg-muted","bg-sell"),c.classList.add("bg-buy"),c.title="Live")},null,{interval:a==="crypto"?12e3:18e3,fallbackAfter:3500,maxSymbols:r}))}function se(t,s,e,a=b){At();const i=e==="crypto"?4500:7e3,r=async()=>{if(x(a,s,e)){K=new AbortController;try{const n=`/quotes.php?symbol=${encodeURIComponent(s)}&type=${encodeURIComponent(e)}&purpose=focus&_=${Date.now()}`,l=await T(n,{timeout:e==="crypto"?2400:2600,signal:K.signal,cacheTtl:500,cache:"no-store"});if(!x(a,s,e))return;l?.items?.[0]&&jt(t,l.items[0],a)}catch{x(a,s,e)&&re(t)}finally{x(a,s,e)&&(st=setTimeout(r,i))}}};r()}function At(){st&&(clearTimeout(st),st=null),K&&(K.abort(),K=null)}function ae(){at&&(clearInterval(at),at=null)}function re(t){const s=p("#conn-dot",t);s&&(s.classList.remove("bg-muted","bg-buy"),s.classList.add("bg-sell"),s.title="Disconnected")}function jt(t,s,e=b){if(!x(e,String(s?.symbol||o("symbol")).toUpperCase(),s?.type||o("type")))return;const a=Number(s.price||s.q_price||0),i=Number(s.change_pct||s.q_change||0),r=o("type");S("activeQuote",{...s,price:a,change_pct:i}),rt(t,[{...s,price:a,change_pct:i}]);const n=p("#live-price",t),l=p("#live-change",t);n&&(n.textContent=a>0?y(a,r):"--"),l&&(l.textContent=mt(i),l.className=`text-[10px] ${i>=0?"text-buy":"text-sell"}`);const c=p("#quote-state",t);if(c){const d=Oe(s);c.textContent=d,c.className=`status-chip ${Ue(d)} !text-[8px] !px-1.5 !py-0.5`}E("[data-sell-price]",t).forEach(d=>{d.textContent=a>0?y(a,r):"--"}),E("[data-buy-price]",t).forEach(d=>{d.textContent=a>0?y(a*1.0001,r):"--"}),E("[data-spread-val]",t).forEach(d=>{d.textContent=a>0?`Spread: ${y(a*1e-4,r)}`:"Spread: --"}),B(t),Le(a,e)}function B(t){const s=o("activeQuote")||{},e=Number(s.price||0),a=o("wallet")||{},i=o("mode")==="real"?a.real||{}:a.demo||{};E("[data-order-form]",t).forEach(r=>{const n=Number(p("[data-amount]",r)?.value||o("amount")||0),l=Number(p("[data-leverage]",r)?.value||o("leverage")||1),d=(p("[data-market-type]",r)?.value||o("market")||"spot")==="perp"?l:1,m=e>0?n*d/e:0,f=n*d,h=p("[data-lev-val]",r);h&&(h.textContent=`${l}x`);const k=p("[data-est-units]",r);k&&(k.textContent=m>0?m.toFixed(m>=10?3:6):"--");const g=p("[data-est-notional]",r);g&&(g.textContent=n>0?`${N(f)} USDT`:"--");const _=p("[data-avail-bal]",r);_&&(_.textContent=`${N(i.available||0)} ${i.currency||""}`)})}function ft(t,s){const e=p("#symbol-list",t);if(!e)return;const a=o("symbol"),i=s.slice(0,120);e.innerHTML=i.map(r=>{const n=String(r.symbol||"").toUpperCase(),l=r.type||o("type"),c=Number(r.price||r.q_price||0),d=Number(r.change_pct||r.q_change||0),m=!(c>0);return`<div class="symbol-row ${n===a?"active":""}" data-sym="${L(n)}" data-stype="${L(l)}">
      ${xt(n,l,"w-7 h-7 rounded-md shrink-0")}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <div class="font-semibold text-[11px] truncate">${u(n)}</div>
          <span class="status-dot ${m?"bg-sell":Me(r)}"></span>
        </div>
        <div class="text-[9px] text-muted truncate">${u(r.name||l)}</div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-[11px] font-mono" data-price-cell>${c>0?y(c,l):"--"}</div>
        <div class="text-[9px] ${d>=0?"text-buy":"text-sell"}" data-change-cell>${m?"Unavailable":mt(d)}</div>
      </div>
    </div>`}).join("")}async function bt(t,s,e=b){const a=o("type"),i=s.slice(0,a==="crypto"?18:10).filter(f=>!(Number(f.price||f.q_price||0)>0)).map(f=>String(f.symbol||"").toUpperCase()).filter(Boolean);if(!i.length)return;const r=a==="crypto"?12:2,n=a==="crypto"?18:6,l=[...new Set(i)].slice(0,n),c=[];for(let f=0;f<l.length;f+=r){const h=l.slice(f,f+r),k=await T(`/quotes.php?symbols=${encodeURIComponent(h.join(","))}&type=${encodeURIComponent(a)}&visible=1&purpose=watchlist&_=${Date.now()}`,{timeout:a==="crypto"?2600:3400,cacheTtl:500,cache:"no-store"}).catch(()=>null);if(!x(e))return;k?.items?.length&&rt(t,k.items),h.forEach(g=>{const _=E(".symbol-row",t).find(Z=>Z.dataset.sym===g);_&&p("[data-price-cell]",_)?.textContent!=="--"||c.push(g)})}const d=a==="crypto"?6:2,m=[...new Set(c)].slice(0,a==="crypto"?8:3);for(let f=0;f<m.length;f+=d){const h=m.slice(f,f+d),k=await T(`/quotes.php?symbols=${encodeURIComponent(h.join(","))}&type=${encodeURIComponent(a)}&visible=1&purpose=watchlist&_=${Date.now()}`,{timeout:a==="crypto"?2600:3400,cacheTtl:500,cache:"no-store"}).catch(()=>null);if(!x(e))return;k?.items?.length&&rt(t,k.items)}}function rt(t,s){s?.length&&s.forEach(e=>{const a=String(e.symbol||"").toUpperCase();if(!a)return;const i=E(".symbol-row",t).find(m=>m.dataset.sym===a);if(!i)return;const r=i.dataset.stype||o("type"),n=Number(e.price||e.q_price||0),l=Number(e.change_pct||e.q_change||0),c=p("[data-price-cell]",i),d=p("[data-change-cell]",i);c&&n>0&&(c.textContent=y(n,r)),d&&(d.textContent=mt(l),d.className=`text-[9px] ${l>=0?"text-buy":"text-sell"}`)})}async function I(t,s=b,e=!1){if(!x(s)||t.__tradeActivityLoading)return;t.__tradeActivityLoading=!0;const a=p("#activity-body",t);a&&!e&&!t.__tradeActivityLoaded&&(a.innerHTML='<p class="text-muted text-[11px] text-center py-4">Loading trading activity...</p>');try{const i=o("mode"),[r,n]=await Promise.allSettled([T(`/trade/portfolio.php?fast=1&mode=${i}`,{timeout:12e3,retry:1,cacheTtl:4e3}),T(`/trade/orders.php?limit=90&mode=${i}`,{timeout:12e3,retry:1,cacheTtl:4e3})]);if(!x(s))return;const l=r.status==="fulfilled"?r.value:null,c=n.status==="fulfilled"?n.value:null;if(l?.positions&&(t.__tradePositions=l.positions,S("portfolio",l)),(c?.items||c?.orders)&&(t.__tradeOrders=c.items||c.orders||[]),!l&&!c&&!t.__tradeActivityLoaded){a&&(a.innerHTML='<p class="text-muted text-[11px] text-center py-4">Trading activity is reconnecting...</p>');return}t.__tradeActivityLoaded=!0,Bt(t)}finally{t.__tradeActivityLoading=!1}}function Bt(t){const s=(t.__tradePositions||[]).filter(d=>!St(d)),e=(t.__tradeOrders||[]).filter(d=>!St(d)),a=e.filter(gt),i=e.filter(ut);let r=t.__tradeActivityTab||"active";(r==="positions"||r==="orders")&&(r="active"),r==="history"&&(r="closed"),t.__tradeActivityTab=r;const n=p("#active-count",t),l=p("#closed-count",t),c=p("#activity-summary",t);return n&&(n.textContent=String(s.length+a.length)),l&&(l.textContent=String(i.length)),c&&(c.textContent=`${s.length} open / ${a.length} pending / ${i.length} closed`),E("[data-activity-tab]",t).forEach(d=>{d.classList.toggle("active",d.dataset.activityTab===r)}),r==="closed"?oe(t,i):ie(t,s,a)}function ie(t,s,e){const a=p("#activity-body",t);if(a){if(!s.length&&!e.length){a.innerHTML='<p class="text-muted text-[11px] text-center py-4">No active trades yet</p>';return}a.innerHTML=`
    ${s.length?ne(s):'<p class="text-muted text-[11px] text-center py-3">No open positions</p>'}
    ${e.length?`<div class="trade-pending-block">
      <div class="trade-subhead"><span>Pending orders</span><b>${e.length}</b></div>
      ${le(e)}
    </div>`:""}`}}function ne(t){return`
    <div class="trade-position-cards lg:hidden">
      ${t.slice(0,12).map(ce).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[620px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">Mark</th><th class="text-right py-1">Size</th><th class="text-right py-1">Lev</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1"></th>
      </tr></thead>
      <tbody>${t.slice(0,12).map(de).join("")}</tbody>
    </table></div>`}function le(t){return`
    <div class="trade-position-cards lg:hidden">
      ${t.slice(0,16).map(ue).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[820px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">TP / SL</th><th class="text-right py-1">Amount</th><th class="text-right py-1">Lev</th><th class="text-right py-1">Status</th><th class="text-right px-3 py-1">Actions</th>
      </tr></thead>
      <tbody>${t.slice(0,16).map(pe).join("")}</tbody>
    </table></div>`}function oe(t,s){const e=p("#activity-body",t);if(e){if(!s.length){e.innerHTML='<p class="text-muted text-[11px] text-center py-4">No closed trades yet</p>';return}e.innerHTML=`
    <div class="trade-position-cards lg:hidden">
      ${s.slice(0,18).map(fe).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[820px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Exit</th><th class="text-right py-1">Used</th><th class="text-right py-1">Fee</th><th class="text-right py-1">PnL</th><th class="text-right py-1">Opened</th><th class="text-right px-3 py-1">Closed</th>
      </tr></thead>
      <tbody>${s.slice(0,18).map(me).join("")}</tbody>
    </table></div>`}}function It(t){const s=Number(t.pnl||t.unrealized_pnl||0),e=String(t.symbol||"").replace("@R@",""),a=t.asset_type||o("type"),i=Number(t.mark_price||t.current_price||t.price||0),r=t.position_id||t.id||"",n=String(t.side||"buy").toUpperCase()==="SELL"?"SELL":"BUY";return{pnl:s,cleanSymbol:e,posType:a,mark:i,id:r,side:n}}function de(t){const{pnl:s,cleanSymbol:e,posType:a,mark:i,id:r,side:n}=It(t);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${u(e)}</td>
    <td>${H(n)}</td>
    <td class="text-muted">${u(t.market_type||"spot")}</td>
    <td class="text-right font-mono">${y(t.entry_price||t.open_price,a)}</td>
    <td class="text-right font-mono">${i>0?y(i,a):"--"}</td>
    <td class="text-right font-mono">${Nt(t.qty||t.amount||t.size||t.units||0)}</td>
    <td class="text-right font-mono">${u(String(t.leverage||1))}x</td>
    <td class="text-right font-mono ${s>=0?"text-buy":"text-sell"}">${N(s)}</td>
    <td class="text-right px-3">${r?`<button class="btn-xs btn-ghost text-sell" data-close="${L(r)}">Close</button>`:""}</td>
  </tr>`}function ce(t){const{pnl:s,cleanSymbol:e,posType:a,mark:i,id:r,side:n}=It(t);return`<article class="trade-position-card">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${u(e)}</strong>
        <small>${u(t.market_type||"spot")} - ${u(t.created_at||t.opened_at||"")}</small>
      </div>
      ${H(n)}
    </div>
    <div class="trade-position-metrics">
      <span><small>Entry</small><strong>${y(t.entry_price||t.open_price,a)}</strong></span>
      <span><small>Mark</small><strong>${i>0?y(i,a):"--"}</strong></span>
      <span><small>Size</small><strong>${Nt(t.qty||t.amount||t.size||t.units||0)}</strong></span>
      <span><small>PnL</small><strong class="${s>=0?"text-buy":"text-sell"}">${N(s)}</strong></span>
      <span><small>Margin</small><strong>${N(t.margin_initial||t.margin||0)}</strong></span>
      <span><small>Leverage</small><strong>${u(String(t.leverage||1))}x</strong></span>
    </div>
    ${r?`<button class="btn-xs btn-ghost text-sell w-full" data-close="${L(r)}">Close position</button>`:""}
  </article>`}function ut(t){const s=String(t.status||"").toLowerCase();return s==="closed"||s==="canceled"||s==="cancelled"||s==="rejected"||Number(t.closed_at||0)>0||Number(t.exit_price||0)>0}function gt(t={}){if(t.is_pending===!0||t.is_pending===1||t.is_pending==="1")return!ut(t);if(ut(t))return!1;const s=String(t.raw_status||t.order_status||t.status||"").toLowerCase(),e=["open","pending","armed","submitted","new"].includes(s),a=Number(t.fill_price||t.entry_price||0)>0,i=Number(t.position_id||0)>0&&!(t.can_cancel||t.can_edit);return e&&!a&&!i}function St(t={}){if(["copy_subscription_id","copy_signal_id","copy_trade_id","copy_id","trading_bot_subscription_id","bot_subscription_id","avalon_subscription_id"].some(a=>t[a]!==void 0&&t[a]!==null&&String(t[a])!==""&&String(t[a])!=="0"))return!0;const e=[t.source,t.origin,t.order_source,t.position_source,t.product_kind,t.strategy_kind,t.category,t.group].map(a=>String(a||"").toLowerCase()).join(" ");return/\b(copy|copied|copy-trading|trading_bot|bot|avalon)\b/.test(e)}function F(t){return String(t.symbol||"").replace("@R@","").replace("@D@","")}function G(t){return String(t.side||"BUY").toUpperCase()==="SELL"?"SELL":String(t.side||"BUY").toUpperCase()==="CLOSE"?"CLOSE":"BUY"}function X(t){return t.asset_type||t.type||o("type")}function yt(t){return String(t.order_id||t.id||"")}function D(t){const s=Number(t||0);if(!s)return"--";try{return new Date(s*1e3).toLocaleString([],{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})}catch{return String(t)}}function pe(t){const s=G(t),e=X(t),a=yt(t);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${u(F(t))}</td>
    <td>${H(s)}</td>
    <td class="text-muted">${u(t.order_type||t.market_type||"market")}</td>
    <td class="text-right font-mono">${y(t.entry_price||t.fill_price||t.limit_price,e)}</td>
    <td class="text-right font-mono"><span class="text-buy">${t.tp_price?y(t.tp_price,e):"--"}</span> / <span class="text-sell">${t.sl_price?y(t.sl_price,e):"--"}</span></td>
    <td class="text-right font-mono">${N(t.used_usdt||t.usd_amount||t.amount||0)}</td>
    <td class="text-right font-mono">${u(String(t.leverage||1))}x</td>
    <td class="text-right"><span class="status-chip status-chip-derived">${u(t.status||"open")}</span></td>
    <td class="text-right px-3">${Rt(a,t)}</td>
  </tr>`}function ue(t){const s=G(t),e=X(t),a=yt(t);return`<article class="trade-position-card trade-activity-card">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${u(F(t))}</strong>
        <small>${u(t.order_type||"market")} - ${u(D(t.created_at))}</small>
      </div>
      ${H(s)}
    </div>
    <div class="trade-position-metrics">
      <span><small>Entry</small><strong>${y(t.entry_price||t.fill_price||t.limit_price,e)}</strong></span>
      <span><small>Take profit</small><strong class="text-buy">${t.tp_price?y(t.tp_price,e):"--"}</strong></span>
      <span><small>Stop loss</small><strong class="text-sell">${t.sl_price?y(t.sl_price,e):"--"}</strong></span>
      <span><small>Amount</small><strong>${N(t.used_usdt||t.usd_amount||t.amount||0)}</strong></span>
      <span><small>Lev</small><strong>${u(String(t.leverage||1))}x</strong></span>
      <span><small>Status</small><strong>${u(t.status||"open")}</strong></span>
      <span><small>Mode</small><strong>${u(t.mode||o("mode")||"demo")}</strong></span>
      <span><small>Symbol</small><strong>${u(F(t))}</strong></span>
    </div>
    ${Rt(a,t,!0)}
  </article>`}function Rt(t,s,e=!1){return!t||!gt(s)?'<span class="text-muted text-[10px]">--</span>':`<div class="${e?"trade-pending-actions is-card":"trade-pending-actions"}">
    <button class="btn-xs btn-ghost" data-edit-order="${L(t)}">Edit</button>
    <button class="btn-xs btn-danger" data-cancel-order="${L(t)}">Cancel</button>
  </div>`}function me(t){const s=G(t),e=X(t),a=Number(t.pnl_usd||t.pnl||0);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${u(F(t))}</td>
    <td>${H(s)}</td>
    <td class="text-muted">${u(t.market_type||t.order_type||"spot")}</td>
    <td class="text-right font-mono">${y(t.exit_price||t.limit_price,e)}</td>
    <td class="text-right font-mono">${N(t.used_usdt||t.usd_amount||0)}</td>
    <td class="text-right font-mono">${N(t.fee_paid||0)}</td>
    <td class="text-right font-mono ${a>=0?"text-buy":"text-sell"}">${N(a)}</td>
    <td class="text-right text-muted">${u(D(t.created_at))}</td>
    <td class="text-right px-3 text-muted">${u(D(t.closed_at||t.created_at))}</td>
  </tr>`}function fe(t){const s=G(t),e=X(t),a=Number(t.pnl_usd||t.pnl||0);return`<article class="trade-position-card trade-activity-card is-history">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${u(F(t))}</strong>
        <small>${u(t.close_reason||t.status||"closed")} - ${u(D(t.closed_at||t.created_at))}</small>
      </div>
      ${H(s)}
    </div>
    <div class="trade-position-metrics">
      <span><small>Exit</small><strong>${y(t.exit_price||t.limit_price,e)}</strong></span>
      <span><small>Opened</small><strong>${u(D(t.created_at))}</strong></span>
      <span><small>Closed</small><strong>${u(D(t.closed_at||t.created_at))}</strong></span>
      <span><small>PnL</small><strong class="${a>=0?"text-buy":"text-sell"}">${N(a)}</strong></span>
      <span><small>Used</small><strong>${N(t.used_usdt||t.usd_amount||0)}</strong></span>
      <span><small>Fee</small><strong>${N(t.fee_paid||0)}</strong></span>
    </div>
  </article>`}function H(t){const s=String(t||"BUY").toUpperCase()==="SELL"?"SELL":"BUY";return`<span class="trade-side-chip is-${s.toLowerCase()}">${u(s)}</span>`}async function be(t,s,e=b){if(!x(e))return;const a=p("#chart-box",t);if(!a)return;const{createChart:i}=await it();if(!x(e))return;a.innerHTML="",C=i(a,{layout:{background:{color:"#060A14"},textColor:"#8ba1cf",fontSize:11},grid:{vertLines:{color:"rgba(129,160,220,0.04)"},horzLines:{color:"rgba(129,160,220,0.04)"}},crosshair:{mode:0,vertLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"},horzLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"}},timeScale:{timeVisible:!0,secondsVisible:!1,borderColor:"rgba(129,160,220,0.08)",rightOffset:4},rightPriceScale:{borderColor:"rgba(129,160,220,0.08)"},watermark:{visible:!0,text:"MEX Group",color:"rgba(93,124,255,0.08)",fontSize:48,horzAlign:"center",vertAlign:"center"},width:Math.max(320,a.clientWidth),height:Math.max(260,a.clientHeight)}),W=C.addCandlestickSeries({upColor:"#00c087",downColor:"#f6465d",borderUpColor:"#00c087",borderDownColor:"#f6465d",wickUpColor:"#00c087",wickDownColor:"#f6465d"}),pt=C.addHistogramSeries({priceFormat:{type:"volume"},priceScaleId:"vol"}),C.priceScale("vol").applyOptions({scaleMargins:{top:.84,bottom:0}}),wt=C.addLineSeries({color:"rgba(255,193,7,0.55)",lineWidth:1,priceLineVisible:!1,lastValueVisible:!1,crosshairMarkerVisible:!1}),$t=C.addLineSeries({color:"rgba(93,124,255,0.55)",lineWidth:1,priceLineVisible:!1,lastValueVisible:!1,crosshairMarkerVisible:!1});const r=s.map(l=>({time:Number(l.time||l.t),open:Number(l.open||l.o),high:Number(l.high||l.h),low:Number(l.low||l.l),close:Number(l.close||l.c),volume:Number(l.volume||l.v||0)})).filter(l=>l.time>0&&l.open>0).sort((l,c)=>l.time-c.time);W.setData(r.map(({time:l,open:c,high:d,low:m,close:f})=>({time:l,open:c,high:d,low:m,close:f}))),pt.setData(r.map(l=>({time:l.time,value:l.volume,color:l.close>=l.open?"rgba(0,192,135,0.25)":"rgba(246,70,93,0.2)"})));const n=r.map(l=>({time:l.time,close:l.close}));wt.setData(Et(n,7)),$t.setData(Et(n,25)),$=r.length?{...r[r.length-1]}:null,C.timeScale().fitContent(),V=new ResizeObserver(()=>{!C||!a||C.applyOptions({width:Math.max(320,a.clientWidth),height:Math.max(260,a.clientHeight)})}),V.observe(a)}function ge(t){p("#mob-mkt-btn",t)?.addEventListener("click",()=>ke(t)),p("#close-mob-drawer",t)?.addEventListener("click",()=>Tt(t)),w(t,"[data-sym]","click",(s,e)=>{Tt(t),localStorage.setItem("vp_symbol",e.dataset.sym),localStorage.setItem("vp_type",e.dataset.stype||o("type")),lt("trade",{symbol:e.dataset.sym,type:e.dataset.stype||o("type"),tf:o("tf")})}),w(t,"[data-tf]","click",(s,e)=>{S("tf",e.dataset.tf),localStorage.setItem("vp_tf",e.dataset.tf),lt("trade",{symbol:o("symbol"),type:o("type"),tf:e.dataset.tf})}),w(t,"[data-type-tab]","click",async(s,e)=>{S("type",e.dataset.typeTab),localStorage.setItem("vp_type",e.dataset.typeTab);const a=await vt(e.dataset.typeTab,b,!0).catch(()=>null);if(a?.items){const i=a.items.find(r=>r?.symbol);if(i?.symbol&&q(e.dataset.typeTab)!=="favorites"){const r=String(i.symbol).toUpperCase();localStorage.setItem("vp_symbol",r),lt("trade",{symbol:r,type:e.dataset.typeTab,tf:o("tf")});return}ft(t,a.items),bt(t,a.items,b),Pt(t,a.items,b)}E("[data-type-tab]",t).forEach(i=>{const r=i===e;i.classList.toggle("bg-accent/20",r),i.classList.toggle("text-accent",r),i.classList.toggle("border-accent/40",r)})}),w(t,"[data-open-order]","click",(s,e)=>Ce(t,e.dataset.openOrder)),w(t,"[data-close-order-sheet]","click",()=>Ft(t)),w(t,"[data-submit-order]","click",(s,e)=>Ct(e.dataset.submitOrder,t,p("#mobile-order-sheet [data-order-form]",t))),w(t,"[data-side]","click",(s,e)=>{const a=e.closest("#mobile-order-sheet"),i=e.closest("[data-order-form]");if(a){zt(t,e.dataset.side);return}Ct(e.dataset.side,t,i)}),w(t,"[data-order-type]","change",(s,e)=>S("orderType",e.value)),w(t,"[data-market-type]","change",(s,e)=>{S("market",e.value),localStorage.setItem("vp_market",e.value),B(t)}),w(t,"[data-leverage]","input",(s,e)=>{S("leverage",Number(e.value)),ct(t,"leverage",e.value),B(t);const a=Number(e.value),i=Number(e.max)||100,r=a/i,n=r<.3?"#00c087":r<.6?"#fcd535":"#f6465d";e.style.accentColor=n;const l=t.querySelector("#leverage-label");l&&(l.textContent=a+"x",l.style.color=n)}),w(t,"[data-amount]","input",(s,e)=>{S("amount",Number(e.value)),ct(t,"amount",e.value),B(t)}),w(t,"[data-close]","click",async(s,e)=>{await ve(t,e)}),w(t,"[data-cancel-order]","click",async(s,e)=>{await he(t,e)}),w(t,"[data-edit-order]","click",(s,e)=>{$e(t,e.dataset.editOrder)}),w(t,"[data-toggle-activity-expand]","click",()=>ye(t)),w(t,"[data-retry-chart]","click",()=>{Dt(t,o("symbol"),o("type"),o("tf"),b,it())}),w(t,"[data-activity-tab]","click",(s,e)=>{t.__tradeActivityTab=e.dataset.activityTab||"positions",Bt(t)}),w(t,"[data-quick-amount]","click",(s,e)=>{const a=Number(e.dataset.quickAmount||0);a>0&&(S("amount",a),ct(t,"amount",a),B(t))}),p("#sym-search",t)?.addEventListener("input",s=>{const e=s.target.value.toLowerCase();E(".symbol-row",t).forEach(a=>{a.style.display=a.dataset.sym.toLowerCase().includes(e)?"":"none"})})}async function Dt(t,s,e,a,i=b,r=it()){const n=p("#chart-box",t);n&&(n.innerHTML='<div class="absolute inset-0 flex items-center justify-center"><div class="text-center"><div class="loading-spinner mx-auto"></div><p class="text-[10px] text-muted mt-2">Loading chart...</p></div></div>');try{const l=await T(`/trade/candles.php?symbol=${encodeURIComponent(s)}&type=${encodeURIComponent(e)}&tf=${encodeURIComponent(a)}&limit=220&fast=1`,{timeout:3500,cacheTtl:3e3});if(await r,!x(i,s,e))return;l?.items?.length?await be(t,l.items,i):kt(t,"Chart data is still loading from the market provider.")}catch(l){if(!x(i,s,e))return;console.error("Chart:",l),kt(t,"Chart stream is delayed. Live price and order ticket remain active.")}}function kt(t,s){const e=p("#chart-box",t);e&&(e.innerHTML=`<div class="chart-fallback-state">
    <div class="chart-fallback-card">
      <strong>Chart loading</strong>
      <span>${u(s||"Chart provider is delayed.")}</span>
      <button class="btn-ghost btn-sm" data-retry-chart>Retry chart</button>
    </div>
  </div>`)}function ye(t){const s=p("#positions-section",t);if(!s)return;const e=!s.classList.contains("is-expanded");s.classList.toggle("is-expanded",e),document.body.classList.toggle("trade-activity-expanded-open",e);const a=p("[data-toggle-activity-expand]",t);a&&(a.setAttribute("aria-label",e?"Close trading activity":"Expand trading activity"),a.setAttribute("title",e?"Close trading activity":"Expand trading activity"),a.innerHTML=e?U.close:U.fullscreen||U.expand||"⛶"),C&&!e&&setTimeout(()=>C.timeScale?.().fitContent?.(),80)}async function ve(t,s){const e=String(s?.dataset?.close||"");if(!e||dt.has(e)||!await _e())return;dt.add(e);const i=E(`[data-close="${qt(e)}"]`,t);i.forEach(r=>{r.disabled=!0,r.classList.add("opacity-60"),r.dataset.prevText=r.textContent,r.textContent="Closing..."});try{const r=await T("/trade/close_position.php",{method:"POST",body:{id:e,position_id:e,mode:o("mode")},timeout:14e3});if(r&&r.ok===!1)throw new Error(r.error||"Close failed");await Promise.allSettled([I(t,b),T("/wallet/summary.php",{timeout:0,retry:1,cacheTtl:0}).then(n=>{(n?.real||n?.demo)&&S("wallet",{real:n.real||{},demo:n.demo||{}})}).catch(()=>null)]),z("Position closed successfully","success")}catch(r){z(r.message||"Could not close this position now.","error"),i.forEach(n=>{n.disabled=!1,n.classList.remove("opacity-60"),n.textContent=n.dataset.prevText||"Close"})}finally{dt.delete(e)}}function xe(t,s){const e=String(s||"");return(t.__tradeOrders||[]).find(a=>yt(a)===e)||null}async function he(t,s){const e=String(s?.dataset?.cancelOrder||"");if(!e||!await we())return;const i=E(`[data-cancel-order="${qt(e)}"]`,t);i.forEach(r=>{r.disabled=!0,r.classList.add("opacity-60"),r.dataset.prevText=r.textContent,r.textContent="Canceling..."});try{const r=await T("/trade/cancel.php",{method:"POST",body:{order_id:e,id:e,mode:o("mode")},timeout:1e4});if(r&&r.ok===!1)throw new Error(r.error||"Cancel failed");await I(t,b),z("Pending order canceled","success")}catch(r){z(r.message||"Could not cancel this order.","error"),i.forEach(n=>{n.disabled=!1,n.classList.remove("opacity-60"),n.textContent=n.dataset.prevText||"Cancel"})}}function we(t){return new Promise(s=>{const e=document.getElementById("cancel-order-modal");e&&e.remove();const a=document.createElement("div");a.id="cancel-order-modal",a.className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center",a.innerHTML=`<div class="absolute inset-0 bg-black/70" data-cancel-order-backdrop></div>
      <div class="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
        <div class="px-5 py-4 border-b border-line">
          <h3 class="text-base font-black">Cancel pending order</h3>
          <p class="mt-1 text-xs text-muted">This only cancels orders that have not executed yet. Open positions must be closed from the position card.</p>
        </div>
        <div class="grid grid-cols-2 gap-3 px-5 py-4">
          <button class="btn-ghost" data-cancel-order-no>Keep order</button>
          <button class="btn-danger" data-cancel-order-yes>Cancel order</button>
        </div>
      </div>`,document.body.appendChild(a);const i=r=>{a.remove(),s(r)};a.querySelector("[data-cancel-order-backdrop]").addEventListener("click",()=>i(!1)),a.querySelector("[data-cancel-order-no]").addEventListener("click",()=>i(!1)),a.querySelector("[data-cancel-order-yes]").addEventListener("click",()=>i(!0))})}function $e(t,s){const e=xe(t,s);if(!e||!gt(e)){z("This order is no longer pending.","error"),I(t,b,!0);return}const a=X(e),i=document.getElementById("edit-order-modal");i&&i.remove();const r=document.createElement("div");r.id="edit-order-modal",r.className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center",r.innerHTML=`<div class="absolute inset-0 bg-black/70" data-edit-order-backdrop></div>
    <div class="relative w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
      <div class="px-5 py-4 border-b border-line">
        <h3 class="text-base font-black">Edit pending order</h3>
        <p class="mt-1 text-xs text-muted">${u(F(e))} ${u(G(e))} - changes apply before execution only.</p>
      </div>
      <form class="grid gap-3 px-5 py-4" data-edit-order-form>
        <label class="grid gap-1">
          <span class="text-[10px] uppercase font-black text-muted">Entry price</span>
          <input class="input" name="entry" inputmode="decimal" value="${L(Number(e.limit_price||e.entry_price||0)||"")}" placeholder="${L(y(e.limit_price||e.entry_price||0,a))}">
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="grid gap-1">
            <span class="text-[10px] uppercase font-black text-muted">Take profit</span>
            <input class="input" name="tp" inputmode="decimal" value="${L(Number(e.tp_price||0)||"")}" placeholder="Optional">
          </label>
          <label class="grid gap-1">
            <span class="text-[10px] uppercase font-black text-muted">Stop loss</span>
            <input class="input" name="sl" inputmode="decimal" value="${L(Number(e.sl_price||0)||"")}" placeholder="Optional">
          </label>
        </div>
        <p class="order-form-status is-info" data-edit-order-status hidden></p>
        <div class="grid grid-cols-2 gap-3 pt-1">
          <button type="button" class="btn-ghost" data-edit-order-close>Cancel</button>
          <button type="submit" class="btn-primary" data-edit-order-save>Save changes</button>
        </div>
      </form>
    </div>`,document.body.appendChild(r);const n=()=>r.remove();r.querySelector("[data-edit-order-backdrop]").addEventListener("click",n),r.querySelector("[data-edit-order-close]").addEventListener("click",n),r.querySelector("[data-edit-order-form]").addEventListener("submit",async l=>{l.preventDefault();const c=l.currentTarget,d=p("[data-edit-order-status]",c),m=p("[data-edit-order-save]",c),f=Number(c.entry.value||0),h=c.tp.value===""?null:Number(c.tp.value||0),k=c.sl.value===""?null:Number(c.sl.value||0);if(!(f>0)){d&&(d.textContent="Entry price is required.",d.hidden=!1,d.className="order-form-status is-warning");return}try{m&&(m.disabled=!0,m.textContent="Saving..."),d&&(d.textContent="Saving order changes...",d.hidden=!1,d.className="order-form-status is-info");const g=await T("/trade/update_order.php",{method:"POST",body:{order_id:s,limit_price:f,tp_price:h,sl_price:k,mode:o("mode")},timeout:1e4});if(g&&g.ok===!1)throw new Error(g.error||"Update failed");n(),await I(t,b),z("Pending order updated","success")}catch(g){d&&(d.textContent=g.message||"Could not update this order.",d.hidden=!1,d.className="order-form-status is-error"),m&&(m.disabled=!1,m.textContent="Save changes")}})}function qt(t){return window.CSS&&typeof window.CSS.escape=="function"?window.CSS.escape(String(t)):String(t).replace(/\\/g,"\\\\").replace(/"/g,'\\"')}function _e(t){return new Promise(s=>{const e=document.getElementById("close-position-modal");e&&e.remove();const a=document.createElement("div");a.id="close-position-modal",a.className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center",a.innerHTML=`<div class="absolute inset-0 bg-black/70" data-close-modal-backdrop></div>
      <div class="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
        <div class="px-5 py-4 border-b border-line">
          <h3 class="text-base font-black">Close position</h3>
          <p class="mt-1 text-xs text-muted">The position will be closed at the current market price.</p>
        </div>
        <div class="grid grid-cols-2 gap-3 px-5 py-4">
          <button class="btn-ghost" data-close-cancel>Cancel</button>
          <button class="btn-danger" data-close-confirm>Close now</button>
        </div>
      </div>`,document.body.appendChild(a);const i=r=>{a.remove(),s(r)};a.querySelector("[data-close-modal-backdrop]").addEventListener("click",()=>i(!1)),a.querySelector("[data-close-cancel]").addEventListener("click",()=>i(!1)),a.querySelector("[data-close-confirm]").addEventListener("click",()=>i(!0))})}function z(t,s="success"){let e=document.getElementById("trade-toast");e||(e=document.createElement("div"),e.id="trade-toast",e.className="trade-toast",document.body.appendChild(e)),e.textContent=t,e.className=`trade-toast is-${s}`,clearTimeout(e.__timer),e.__timer=setTimeout(()=>e.classList.remove("is-success","is-error"),2500)}async function Ct(t,s,e){const a=e||p("[data-order-form]",s)||s;M(a,"","info");const i=o("activeQuote")||{},r=Number(i.price||0);if(!r){M(a,"No live price available yet. Please wait for the quote to load.","warning");return}const n=Number(p("[data-amount]",a)?.value||o("amount")||0),l=Number(p("[data-leverage]",a)?.value||o("leverage")||1),c=Number(p("[data-tp]",a)?.value||0),d=Number(p("[data-sl]",a)?.value||0),m=p("[data-market-type]",a)?.value||o("market")||"spot",f=p("[data-order-type]",a)?.value||o("orderType")||"MARKET",h=Number(p("[data-limit-price]",a)?.value||0);if(n<=0){M(a,"Enter a valid amount first.","warning");return}if(t==="BUY"&&d>0&&d>=r){M(a,"For BUY orders, Stop Loss should be below the current price.","warning");return}if(t==="SELL"&&d>0&&d<=r){M(a,"For SELL orders, Stop Loss should be above the current price.","warning");return}if(await Se({side:t,symbol:o("symbol"),type:o("type"),amount:n,leverage:l,tp:c,sl:d,marketType:m,orderType:f,currentPrice:r,limitInput:h,mode:o("mode")}))try{Lt(a,!0),M(a,`Sending ${t==="BUY"?"buy":"sell"} order...`,"info");const g=await T("/trade/place_order.php",{method:"POST",body:{symbol:o("symbol"),asset_type:o("type"),market_type:m,side:t,order_type:f,usd:n,leverage:l,tp:c||void 0,sl:d||void 0,price:f==="LIMIT"&&h||r,mode:o("mode")},timeout:15e3,retry:1});if(g&&g.ok===!1){M(a,g.error||"Order failed","error");return}M(a,`${t==="BUY"?"Buy":"Sell"} order opened successfully.`,"success"),await I(s,b),T("/wallet/summary.php",{timeout:0,retry:1,cacheTtl:0}).then(_=>{(_?.real||_?.demo)&&S("wallet",{real:_.real||{},demo:_.demo||{}})}).catch(()=>null),setTimeout(()=>{a.closest?.("#mobile-order-sheet")?Ft(s):M(a,"","info")},900)}catch(g){console.error("Order failed:",g),M(a,g.message||"Order failed","error")}finally{Lt(a,!1)}}function Se({side:t,symbol:s,type:e,amount:a,leverage:i,tp:r,sl:n,marketType:l,orderType:c,currentPrice:d,limitInput:m,mode:f}){return new Promise(h=>{const k=document.getElementById("order-confirm-modal");k&&k.remove();const g=t==="BUY",_=c==="LIMIT"&&m||d,J=a*i,Z=r>0?Math.abs(r-_)*(J/_):null,ht=n>0?Math.abs(n-_)*(J/_):null,O=document.createElement("div");O.id="order-confirm-modal",O.className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center",O.innerHTML=`
      <div class="absolute inset-0 bg-black/70" id="confirm-backdrop"></div>
      <div class="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden">
        <div class="px-5 py-4 border-b border-line text-center">
          <h3 class="text-lg font-bold ${g?"text-green-400":"text-red-400"}">${g?v("trade.side.buy","Buy"):v("trade.side.sell","Sell")} ${v("trade.order","Order")}</h3>
          <p class="text-xs text-muted mt-1">${v("trade.review_confirm","Review and confirm your order")}</p>
        </div>
        <div class="px-5 py-4 space-y-3">
          <div class="flex justify-between text-sm"><span class="text-muted">${v("trade.symbol","Symbol")}</span><strong>${u(s)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${v("trade.type","Type")}</span><strong>${u(c)} / ${u(l)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${v("trade.side","Side")}</span><strong class="${g?"text-green-400":"text-red-400"}">${t}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${v("trade.amount","Amount")}</span><strong>$${a.toFixed(2)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${v("trade.leverage","Leverage")}</span><strong>${i}x</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${v("trade.notional","Notional")}</span><strong>$${J.toFixed(2)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${v("trade.price","Price")}</span><strong class="font-mono">${parseFloat(_).toFixed(e==="crypto"?2:4)}</strong></div>
          ${r>0?`<div class="flex justify-between text-sm"><span class="text-muted">${v("trade.take_profit","Take Profit")}</span><strong class="font-mono text-green-400">${parseFloat(r).toFixed(e==="crypto"?2:4)}</strong></div>`:""}
          ${n>0?`<div class="flex justify-between text-sm"><span class="text-muted">${v("trade.stop_loss","Stop Loss")}</span><strong class="font-mono text-red-400">${parseFloat(n).toFixed(e==="crypto"?2:4)}</strong></div>`:""}
          ${Z!==null?`<div class="flex justify-between text-sm"><span class="text-muted">${v("trade.est_profit","Est. Profit")}</span><strong class="text-green-400">$${Z.toFixed(2)}</strong></div>`:""}
          ${ht!==null?`<div class="flex justify-between text-sm"><span class="text-muted">${v("trade.est_loss","Est. Loss")}</span><strong class="text-red-400">$${ht.toFixed(2)}</strong></div>`:""}
          <div class="flex justify-between text-sm"><span class="text-muted">${v("trade.mode","Mode")}</span><strong>${f==="real"?v("mode.real","Real"):v("mode.demo","Demo")}</strong></div>
        </div>
        <div class="grid grid-cols-2 gap-3 px-5 py-4 border-t border-line">
          <button class="btn-ghost py-2.5" id="confirm-cancel">${v("common.cancel","Cancel")}</button>
          <button class="${g?"btn-buy":"btn-sell"} py-2.5 text-white font-bold" id="confirm-execute">${v("trade.confirm","Confirm")} ${t}</button>
        </div>
      </div>`,document.body.appendChild(O),document.body.style.overflow="hidden";const nt=Yt=>{O.remove(),document.body.style.overflow="",h(Yt)};O.querySelector("#confirm-backdrop").addEventListener("click",()=>nt(!1)),O.querySelector("#confirm-cancel").addEventListener("click",()=>nt(!1)),O.querySelector("#confirm-execute").addEventListener("click",()=>nt(!0)),O.querySelector("#confirm-execute").focus()})}function M(t,s,e="info"){const a=p("[data-order-status]",t);a&&(a.textContent=s||"",a.hidden=!s,a.className=`order-form-status is-${e}`)}function Lt(t,s){const e=[t,t.closest?.("#mobile-order-sheet")].filter(Boolean);new Set(e.flatMap(i=>E("[data-side], [data-submit-order]",i))).forEach(i=>{i.disabled=!!s,i.classList.toggle("opacity-60",!!s)}),t.classList.toggle("is-submitting",!!s)}function ke(t){const s=p("#market-drawer",t);if(!s)return;s.classList.add("mobile-market-open"),s.classList.remove("hidden"),document.body.classList.add("trade-modal-open");const e=p("#symbol-list",t);e&&!e.querySelector(".symbol-row")&&!t.__marketDrawerLoading&&(t.__marketDrawerLoading=!0,vt(o("type"),b).then(a=>{a?.items&&(t.__marketItems=a.items,ft(t,a.items),Ht(t,a.items,b),bt(t,a.items,b))}).catch(()=>{e&&(e.innerHTML='<p class="text-muted text-[11px] text-center py-4">Markets unavailable</p>')}).finally(()=>{t.__marketDrawerLoading=!1}))}function Tt(t){const s=p("#market-drawer",t);s&&(s.classList.remove("mobile-market-open"),window.innerWidth<1024&&s.classList.add("hidden"),document.body.classList.remove("trade-modal-open"))}function Ce(t,s){const e=p("#mobile-order-sheet",t);e&&(zt(t,s),e.classList.remove("hidden"),document.body.classList.add("trade-modal-open"),B(t))}function Ft(t){const s=p("#mobile-order-sheet",t);s&&s.classList.add("hidden"),document.body.classList.remove("trade-modal-open")}function zt(t,s){const e=p("#mobile-submit-order",t),a=p("#mobile-order-side-label",t);e&&(e.dataset.submitOrder=s,e.textContent=`Review & ${s==="BUY"?"Buy":"Sell"}`,e.className=`${s==="BUY"?"btn-buy":"btn-sell"} w-full py-3`),a&&(a.textContent=`${s} order`)}function ct(t,s,e){E(`[data-${s}]`,t).forEach(a=>{String(a.value)!==String(e)&&(a.value=e)})}function Le(t,s=b){if(!x(s)||!W||!$||!(t>0))return;const e=Te();e<=$.time?($.close=t,$.high=Math.max($.high,t),$.low=Math.min($.low,t)):$={time:e,open:$.close,high:Math.max($.close,t),low:Math.min($.close,t),close:t,volume:0},W.update({time:$.time,open:$.open,high:$.high,low:$.low,close:$.close})}function Te(){const t=Ee(o("tf")),s=Math.floor(Date.now()/1e3);return Math.floor(s/t)*t}function Ee(t){return{"1m":60,"5m":300,"15m":900,"30m":1800,"1h":3600,"4h":14400,"1d":86400}[t]||60}function it(){return ot||(ot=Qt(()=>import("./chart-DbDccfIU.js"),[])),ot}function Et(t,s){const e=[];for(let a=s-1;a<t.length;a++){let i=0;for(let r=0;r<s;r++)i+=t[a-r].close;e.push({time:t[a].time,value:i/s})}return e}function Ne(t){const s=q(t||"crypto"),e=s==="favorites"?"crypto":s,i={crypto:50,forex:30,stocks:20,commodities:20,arab:10,futures:20}[e]||20;return`/markets.php?type=${encodeURIComponent(e)}&scope=trade&supported=1&lite=1&with_quotes=1&no_rescue=1&limit=${i}`}async function vt(t,s=b,e=!1){const a=q(t||"crypto"),i=a||"crypto",r=_t.get(i),n=Date.now();if(!e&&r&&r.expires>n)return r.data;const l=await T(Ne(a),{timeout:12e3,cacheTtl:15e3});return x(s)&&l?.items&&_t.set(i,{data:l,expires:Date.now()+15e3}),l}function Ht(t,s,e=b){const a=String(o("symbol")||"").toUpperCase(),i=(s||[]).find(n=>String(n.symbol||"").toUpperCase()===a);if(!i)return;Number(i.price||i.q_price||0)>0&&jt(t,i,e)}function Me(t){const s=String(t?.source||"").toLowerCase(),e=String(t?.timing_class||"").toLowerCase();return e==="stale"||e==="seed"||t?.is_stale||s.includes("yahoo")||s.includes("seed")?"bg-spread":"bg-buy"}function Oe(t){const s=String(t?.timing_class||"").toLowerCase(),e=String(t?.source||"").toLowerCase();return Number(t?.price||0)<=0?"Unavailable":s==="seed"||e.includes("seed")?"Reference":s==="stale"||t?.is_stale?"Stale":s==="delayed"||e.includes("yahoo")||["stocks","arab"].includes(q(t?.type||o("type")))?"Delayed":s==="candle_fallback"?"Chart quote":"Live"}function Ue(t){const s=String(t||"").toLowerCase();return s==="live"?"status-chip-live":s==="unavailable"?"status-chip-locked":"status-chip-delayed"}function xt(t,s,e){return`<span class="${e} grid place-items-center overflow-hidden border border-line bg-surface">
    <img src="${L(Kt({symbol:t,type:s},s))}" class="h-full w-full object-cover" alt="${L(t)}" loading="lazy" data-fallback="initial" />
    <b class="hidden h-full w-full place-items-center bg-accent/20 text-[9px] font-black">${u(Vt(t))}</b>
  </span>`}export{Ie as cleanup,Be as mount,je as render};
