import{s as L,h as o,i as Q,e as d,b as M,$ as c,f as O,k as f,_ as Nt,d as h,n as at,a as C,m as x,p as it}from"./main-CO2_3DUR.js";import{marketIconPath as Ut,marketInitial as Ot}from"./marketIcon-D-Yq8Sis.js";let V=null,B=null,E=0,U=null;const Pt=6500;function jt(t,e,s,a,l={}){if(A(),!t||!t.length)return A;const r=++E,i=gt(t,l.maxSymbols||18);return i.length&&(typeof EventSource=="function"?Rt(i,e,s,a,r,l):W(i,e,s,a,r,l)),A}function gt(t,e){const s=Math.max(1,Number(e||18));return[...new Set((t||[]).map(a=>String(a||"").toUpperCase()).filter(Boolean))].slice(0,s)}function Rt(t,e,s,a,l,r){R();const i="/api/stream/sse.php?symbols="+encodeURIComponent(t.join(","))+"&type="+encodeURIComponent(e)+"&scope=watchlist";let n=!1,u=setTimeout(()=>{l!==E||n||(R(),W(t,e,s,a,l,r))},Math.max(3e3,Number(r.fallbackAfter||5e3)));U=new EventSource(i,{withCredentials:!0}),U.addEventListener("open",()=>{n=!0,u&&(clearTimeout(u),u=null)}),U.addEventListener("message",p=>{if(l===E)try{const m=JSON.parse(p.data||"[]");Array.isArray(m)&&m.length&&s&&s(m)}catch{}}),U.addEventListener("reconnect",()=>{l===E&&(R(),W(t,e,s,a,l,r))}),U.addEventListener("error",p=>{l===E&&(R(),W(t,e,s,a,l,r))})}function W(t,e,s,a,l,r){vt();const i=Math.max(4e3,Number(r.interval||Pt)),n=gt(t,r.maxSymbols||18),u=async()=>{if(l===E){B=new AbortController;try{const p="/api/quotes.php?symbols="+encodeURIComponent(n.join(","))+"&type="+encodeURIComponent(e)+"&visible=1&purpose=watchlist&_="+Date.now(),m=await fetch(p,{credentials:"same-origin",cache:"no-store",signal:B.signal});if(l!==E)return;if(m.ok){const b=await m.json();l===E&&b&&b.items&&s&&s(b.items)}}catch(p){p.name}finally{l===E&&(V=setTimeout(u,i))}}};u()}function vt(){V&&(clearTimeout(V),V=null),B&&(B.abort(),B=null)}function R(){U&&(U.close(),U=null)}function A(){E+=1,R(),vt()}let k=null,D=null,nt=null,dt=null,pt=null,P=null,K=null,I=null,G=null,F=null,lt=null,y=null,$=0;const At=[{key:"favorites",label:"Favorites"},{key:"crypto",label:"Crypto"},{key:"forex",label:"Forex"},{key:"stocks",label:"Stocks"},{key:"commodities",label:"Commodities"},{key:"futures",label:"Futures"},{key:"arab",label:"Arab"}],Bt=["1m","5m","15m","30m","1h","4h","1d"];function me(t){t.symbol&&L("symbol",t.symbol.toUpperCase()),t.type&&L("type",t.type),t.tf&&L("tf",t.tf);const e=o("symbol"),s=o("type"),a=o("tf");return`<div class="trade-terminal flex flex-col lg:flex-row h-full mobile-pad">
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
        ${At.map(l=>`<button class="btn-xs ${l.key===s?"bg-accent/20 text-accent border-accent/40":"text-muted border-line"} border rounded-md whitespace-nowrap" data-type-tab="${l.key}">${l.label}</button>`).join("")}
      </div>
      <div class="flex-1 overflow-auto p-1" id="symbol-list"><div class="p-4"><div class="loading-spinner mx-auto"></div></div></div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div class="flex items-center justify-between px-2 lg:px-4 h-11 border-b border-line bg-surface shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <button class="lg:hidden w-8 h-8 grid place-items-center rounded border border-line text-muted shrink-0" id="mob-mkt-btn" aria-label="Open markets">${Q.menu}</button>
          ${ot(e,s,"w-7 h-7 rounded-md shrink-0")}
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
          ${Bt.map(l=>`<button class="px-1.5 py-1 text-[10px] rounded shrink-0 ${l===a?"bg-accent/20 text-accent":"text-muted hover:text-text"}" data-tf="${l}">${l}</button>`).join("")}
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
        ${xt()}
      </div>
    </aside>

    ${It(e,s)}
  </div>`}function xt(){const t=o("orderType")||"MARKET",e=Number(o("amount")||100),s=Number(o("leverage")||10),a=o("market")||"spot",l=o("activeQuote")||{},r=Number(l.price||0);return`<div class="space-y-3 order-ticket-panel" data-order-form>
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
      <button class="btn-sell trade-price-button" data-side="SELL"><small>Sell</small><span data-sell-price>${r>0?f(r,o("type")):"--"}</span></button>
      <button class="btn-buy trade-price-button" data-side="BUY"><small>Buy</small><span data-buy-price>${r>0?f(r*1.0001,o("type")):"--"}</span></button>
      </div>
      <div class="text-center"><span class="spread-display" data-spread-val>Spread: --</span></div>
      <div class="mobile-order-summary">
        <span><small>Mode</small><strong>${d(o("mode")==="real"?"Real":"Demo")}</strong></span>
        <span><small>Symbol</small><strong>${d(o("symbol")||"--")}</strong></span>
        <span><small>Asset</small><strong>${d(o("type")||"--")}</strong></span>
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
      ${[25,50,100,250].map(i=>`<button type="button" data-quick-amount="${i}">$${i}</button>`).join("")}
    </div>
    <label class="block">
      <span class="text-[10px] text-muted">Limit price</span>
      <input type="number" min="0" step="any" class="input mt-1" placeholder="${r>0?f(r,o("type")):"Required for limit"}" data-limit-price />
    </label>
    <label class="block">
      <span class="text-[10px] text-muted">Leverage: <strong data-lev-val id="leverage-label">${s}x</strong></span>
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
  </div>`}function It(t,e){return`<div class="fixed inset-0 z-[230] hidden lg:hidden" id="mobile-order-sheet">
    <div class="absolute inset-0 bg-black/65" data-close-order-sheet></div>
    <div class="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-auto rounded-t-2xl border border-line bg-surface shadow-2xl">
      <div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3">
        <div class="flex items-center gap-2 min-w-0">
          ${ot(t,e,"w-8 h-8 rounded-lg shrink-0")}
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider text-muted" id="mobile-order-side-label">Order</div>
            <strong class="text-sm truncate">${d(t)}</strong>
          </div>
        </div>
        <button class="icon-btn icon-btn-sm" data-close-order-sheet aria-label="Close order">${Q.close}</button>
      </div>
      <div class="p-4">
        ${xt()}
        <div class="order-action-sticky">
          <button class="btn-primary w-full py-3" id="mobile-submit-order" data-submit-order="BUY">Review & Place Order</button>
        </div>
      </div>
    </div>
  </div>`}function be(t){t.addEventListener("error",e=>{if(e.target.tagName==="IMG"&&e.target.dataset.fallback==="initial"){e.target.style.display="none";const s=e.target.nextElementSibling;s&&(s.style.display="grid")}},!0),Ft(t)}function fe(){$+=1,F&&(F.disconnect(),F=null),k&&(k.remove(),k=null,D=null,nt=null,y=null),P&&(P(),P=null),$t(),Ht(),A(),document.body.classList.remove("trade-modal-open")}async function Ft(t){const e=o("symbol"),s=o("type"),a=o("tf"),l=++$;L("activeQuote",null);const r=Tt();ee(t),j(t),Dt(t,e,s,l),M(Et(s),{timeout:6500}).then(i=>{v(l,e,s)&&i?.items&&(wt(t,i.items),St(t,i.items,l),ht(t,i.items,l))}).catch(()=>{if(!v(l,e,s))return;const i=c("#symbol-list",t);i&&(i.innerHTML='<p class="text-muted text-[11px] text-center py-4">Markets unavailable</p>')}),J(t,l),G=setInterval(()=>J(t,l,!0),12e3),M(`/trade/candles.php?symbol=${encodeURIComponent(e)}&type=${encodeURIComponent(s)}&tf=${encodeURIComponent(a)}&limit=220`,{timeout:1e4}).then(async i=>{await r,v(l,e,s)&&(i?.items?.length?await te(t,i.items,l):c("#chart-box",t).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart data unavailable</p>')}).catch(i=>{v(l,e,s)&&(console.error("Chart:",i),c("#chart-box",t).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart unavailable</p>')})}function v(t,e=o("symbol"),s=o("type")){return!(t!==$||e&&String(e).toUpperCase()!==String(o("symbol")||"").toUpperCase()||s&&H(s)!==H(o("type")))}function H(t){const e=String(t||"").toLowerCase();return e==="commodity"?"commodities":e==="stock"?"stocks":e==="future"?"futures":e}function ht(t,e,s=$){P&&(P(),P=null);const a=o("type"),l=o("symbol"),r=a==="crypto"?24:12,i=[...new Set(e.slice(0,r).map(n=>String(n.symbol||"").toUpperCase()).filter(Boolean).filter(n=>n!==String(l||"").toUpperCase()))];i.length&&(P=jt(i,a,n=>{if(!v(s,l,a))return;X(t,n);const u=c("#conn-dot",t);u&&(u.classList.remove("bg-muted","bg-sell"),u.classList.add("bg-buy"),u.title="Live")},null,{interval:a==="crypto"?5200:7200,maxSymbols:r}))}function Dt(t,e,s,a=$){$t();const l=s==="crypto"?2200:3e3,r=async()=>{if(v(a,e,s)){I=new AbortController;try{const i=`/quotes.php?symbol=${encodeURIComponent(e)}&type=${encodeURIComponent(s)}&purpose=focus`,n=await M(i,{timeout:4500,signal:I.signal});if(!v(a,e,s))return;n?.items?.[0]&&Yt(t,n.items[0],a)}catch{v(a,e,s)&&zt(t)}finally{v(a,e,s)&&(K=setTimeout(r,l))}}};r()}function $t(){K&&(clearTimeout(K),K=null),I&&(I.abort(),I=null)}function Ht(){G&&(clearInterval(G),G=null)}function zt(t){const e=c("#conn-dot",t);e&&(e.classList.remove("bg-muted","bg-buy"),e.classList.add("bg-sell"),e.title="Disconnected")}function Yt(t,e,s=$){if(!v(s,String(e?.symbol||o("symbol")).toUpperCase(),e?.type||o("type")))return;const a=Number(e.price||e.q_price||0),l=Number(e.change_pct||e.q_change||0),r=o("type");L("activeQuote",{...e,price:a,change_pct:l}),X(t,[{...e,price:a,change_pct:l}]);const i=c("#live-price",t),n=c("#live-change",t);i&&(i.textContent=a>0?f(a,r):"--"),n&&(n.textContent=it(l),n.className=`text-[10px] ${l>=0?"text-buy":"text-sell"}`);const u=c("#quote-state",t);if(u){const p=ce(e);u.textContent=p,u.className=`status-chip ${de(p)} !text-[8px] !px-1.5 !py-0.5`}C("[data-sell-price]",t).forEach(p=>{p.textContent=a>0?f(a,r):"--"}),C("[data-buy-price]",t).forEach(p=>{p.textContent=a>0?f(a*1.0001,r):"--"}),C("[data-spread-val]",t).forEach(p=>{p.textContent=a>0?`Spread: ${f(a*1e-4,r)}`:"Spread: --"}),j(t),re(a,s)}function j(t){const e=o("activeQuote")||{},s=Number(e.price||0),a=o("wallet")||{},l=o("mode")==="real"?a.real||{}:a.demo||{};C("[data-order-form]",t).forEach(r=>{const i=Number(c("[data-amount]",r)?.value||o("amount")||0),n=Number(c("[data-leverage]",r)?.value||o("leverage")||1),p=(c("[data-market-type]",r)?.value||o("market")||"spot")==="perp"?n:1,m=s>0?i*p/s:0,b=i*p,w=c("[data-lev-val]",r);w&&(w.textContent=`${n}x`);const S=c("[data-est-units]",r);S&&(S.textContent=m>0?m.toFixed(m>=10?3:6):"--");const g=c("[data-est-notional]",r);g&&(g.textContent=i>0?`${x(b)} USDT`:"--");const _=c("[data-avail-bal]",r);_&&(_.textContent=`${x(l.available||0)} ${l.currency||""}`)})}function wt(t,e){const s=c("#symbol-list",t);if(!s)return;const a=o("symbol"),l=e.slice(0,60);s.innerHTML=l.map(r=>{const i=String(r.symbol||"").toUpperCase(),n=r.type||o("type"),u=Number(r.price||r.q_price||0),p=Number(r.change_pct||r.q_change||0),m=!(u>0);return`<div class="symbol-row ${i===a?"active":""}" data-sym="${O(i)}" data-stype="${O(n)}">
      ${ot(i,n,"w-7 h-7 rounded-md shrink-0")}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <div class="font-semibold text-[11px] truncate">${d(i)}</div>
          <span class="status-dot ${m?"bg-sell":oe(r)}"></span>
        </div>
        <div class="text-[9px] text-muted truncate">${d(r.name||n)}</div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-[11px] font-mono" data-price-cell>${u>0?f(u,n):"--"}</div>
        <div class="text-[9px] ${p>=0?"text-buy":"text-sell"}" data-change-cell>${m?"Unavailable":it(p)}</div>
      </div>
    </div>`}).join("")}async function St(t,e,s=$){const a=o("type"),l=e.slice(0,a==="crypto"?18:10).filter(b=>!(Number(b.price||b.q_price||0)>0)).map(b=>String(b.symbol||"").toUpperCase()).filter(Boolean);if(!l.length)return;const r=a==="crypto"?12:2,i=a==="crypto"?18:6,n=[...new Set(l)].slice(0,i),u=[];for(let b=0;b<n.length;b+=r){const w=n.slice(b,b+r),S=await M(`/quotes.php?symbols=${encodeURIComponent(w.join(","))}&type=${encodeURIComponent(a)}&cache_only=1&purpose=watchlist`,{timeout:3500}).catch(()=>null);if(!v(s))return;S?.items?.length&&X(t,S.items),w.forEach(g=>{const _=C(".symbol-row",t).find(q=>q.dataset.sym===g);_&&c("[data-price-cell]",_)?.textContent!=="--"||u.push(g)})}const p=a==="crypto"?6:2,m=[...new Set(u)].slice(0,a==="crypto"?8:3);for(let b=0;b<m.length;b+=p){const w=m.slice(b,b+p),S=await M(`/quotes.php?symbols=${encodeURIComponent(w.join(","))}&type=${encodeURIComponent(a)}&purpose=focus`,{timeout:4200}).catch(()=>null);if(!v(s))return;S?.items?.length&&X(t,S.items)}}function X(t,e){e?.length&&e.forEach(s=>{const a=String(s.symbol||"").toUpperCase();if(!a)return;const l=C(".symbol-row",t).find(m=>m.dataset.sym===a);if(!l)return;const r=l.dataset.stype||o("type"),i=Number(s.price||s.q_price||0),n=Number(s.change_pct||s.q_change||0),u=c("[data-price-cell]",l),p=c("[data-change-cell]",l);u&&i>0&&(u.textContent=f(i,r)),p&&(p.textContent=it(n),p.className=`text-[9px] ${n>=0?"text-buy":"text-sell"}`)})}async function J(t,e=$,s=!1){if(!v(e))return;const a=c("#activity-body",t);a&&!s&&!t.__tradeActivityLoaded&&(a.innerHTML='<p class="text-muted text-[11px] text-center py-4">Loading trading activity...</p>');const[l,r]=await Promise.allSettled([M("/trade/portfolio.php",{timeout:6500}),M("/trade/orders.php?limit=90",{timeout:6500})]);if(!v(e))return;const i=l.status==="fulfilled"?l.value:null,n=r.status==="fulfilled"?r.value:null;i?.positions&&(t.__tradePositions=i.positions),(n?.items||n?.orders)&&(t.__tradeOrders=n.items||n.orders||[]),t.__tradeActivityLoaded=!0,kt(t)}function kt(t){const e=t.__tradePositions||[],s=t.__tradeOrders||[],a=s.filter(m=>!ut(m)),l=s.filter(ut),r=t.__tradeActivityTab||"positions",i=c("#pos-count",t),n=c("#orders-count",t),u=c("#history-count",t),p=c("#activity-summary",t);return i&&(i.textContent=String(e.length)),n&&(n.textContent=String(a.length)),u&&(u.textContent=String(l.length)),p&&(p.textContent=`${e.length} open / ${a.length} pending / ${l.length} closed`),C("[data-activity-tab]",t).forEach(m=>{m.classList.toggle("active",m.dataset.activityTab===r)}),r==="orders"?Qt(t,a):r==="history"?Vt(t,l):qt(t,e)}function qt(t,e){const s=c("#activity-body",t);if(s){if(!e.length){s.innerHTML='<p class="text-muted text-[11px] text-center py-3">No open positions</p>';return}s.innerHTML=`
    <div class="trade-position-cards lg:hidden">
      ${e.slice(0,12).map(Kt).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[620px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">Mark</th><th class="text-right py-1">Size</th><th class="text-right py-1">Lev</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1"></th>
      </tr></thead>
      <tbody>${e.slice(0,12).map(Wt).join("")}</tbody>
    </table></div>`}}function Qt(t,e){const s=c("#activity-body",t);if(s){if(!e.length){s.innerHTML='<p class="text-muted text-[11px] text-center py-4">No pending or armed orders</p>';return}s.innerHTML=`
    <div class="trade-position-cards lg:hidden">
      ${e.slice(0,16).map(Xt).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[720px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">Amount</th><th class="text-right py-1">Lev</th><th class="text-right py-1">Status</th><th class="text-right px-3 py-1">Created</th>
      </tr></thead>
      <tbody>${e.slice(0,16).map(Gt).join("")}</tbody>
    </table></div>`}}function Vt(t,e){const s=c("#activity-body",t);if(s){if(!e.length){s.innerHTML='<p class="text-muted text-[11px] text-center py-4">No closed trades yet</p>';return}s.innerHTML=`
    <div class="trade-position-cards lg:hidden">
      ${e.slice(0,18).map(Zt).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[820px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">Exit</th><th class="text-right py-1">Used</th><th class="text-right py-1">Fee</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1">Closed</th>
      </tr></thead>
      <tbody>${e.slice(0,18).map(Jt).join("")}</tbody>
    </table></div>`}}function Lt(t){const e=Number(t.pnl||t.unrealized_pnl||0),s=String(t.symbol||"").replace("@R@",""),a=t.asset_type||o("type"),l=Number(t.mark_price||t.current_price||t.price||0),r=t.position_id||t.id||"",i=String(t.side||"buy").toUpperCase()==="SELL"?"SELL":"BUY";return{pnl:e,cleanSymbol:s,posType:a,mark:l,id:r,side:i}}function Wt(t){const{pnl:e,cleanSymbol:s,posType:a,mark:l,id:r,side:i}=Lt(t);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${d(s)}</td>
    <td><span class="badge-${i==="BUY"?"buy":"sell"}">${d(i)}</span></td>
    <td class="text-muted">${d(t.market_type||"spot")}</td>
    <td class="text-right font-mono">${f(t.entry_price||t.open_price,a)}</td>
    <td class="text-right font-mono">${l>0?f(l,a):"--"}</td>
    <td class="text-right font-mono">${x(t.qty||t.amount||t.size||t.units||0)}</td>
    <td class="text-right font-mono">${d(String(t.leverage||1))}x</td>
    <td class="text-right font-mono ${e>=0?"text-buy":"text-sell"}">${x(e)}</td>
    <td class="text-right px-3">${r?`<button class="btn-xs btn-ghost text-sell" data-close="${O(r)}">Close</button>`:""}</td>
  </tr>`}function Kt(t){const{pnl:e,cleanSymbol:s,posType:a,mark:l,id:r,side:i}=Lt(t);return`<article class="trade-position-card">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${d(s)}</strong>
        <small>${d(t.market_type||"spot")} - ${d(t.created_at||t.opened_at||"")}</small>
      </div>
      <span class="badge-${i==="BUY"?"buy":"sell"}">${d(i)}</span>
    </div>
    <div class="trade-position-metrics">
      <span><small>Entry</small><strong>${f(t.entry_price||t.open_price,a)}</strong></span>
      <span><small>Mark</small><strong>${l>0?f(l,a):"--"}</strong></span>
      <span><small>Size</small><strong>${x(t.qty||t.amount||t.size||t.units||0)}</strong></span>
      <span><small>PnL</small><strong class="${e>=0?"text-buy":"text-sell"}">${x(e)}</strong></span>
      <span><small>Margin</small><strong>${x(t.margin_initial||t.margin||0)}</strong></span>
      <span><small>Leverage</small><strong>${d(String(t.leverage||1))}x</strong></span>
    </div>
    ${r?`<button class="btn-xs btn-ghost text-sell w-full" data-close="${O(r)}">Close position</button>`:""}
  </article>`}function ut(t){const e=String(t.status||"").toLowerCase();return e==="closed"||e==="canceled"||e==="cancelled"||e==="rejected"||Number(t.closed_at||0)>0||Number(t.exit_price||0)>0}function z(t){return String(t.symbol||"").replace("@R@","").replace("@D@","")}function Z(t){return String(t.side||"BUY").toUpperCase()==="SELL"?"SELL":String(t.side||"BUY").toUpperCase()==="CLOSE"?"CLOSE":"BUY"}function tt(t){return t.asset_type||t.type||o("type")}function et(t){const e=Number(t||0);if(!e)return"--";try{return new Date(e*1e3).toLocaleString([],{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})}catch{return String(t)}}function Gt(t){const e=Z(t),s=tt(t);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${d(z(t))}</td>
    <td><span class="badge-${e==="SELL"?"sell":"buy"}">${d(e)}</span></td>
    <td class="text-muted">${d(t.order_type||t.market_type||"market")}</td>
    <td class="text-right font-mono">${f(t.entry_price||t.fill_price||t.limit_price,s)}</td>
    <td class="text-right font-mono">${x(t.used_usdt||t.usd_amount||t.amount||0)}</td>
    <td class="text-right font-mono">${d(String(t.leverage||1))}x</td>
    <td class="text-right"><span class="status-chip status-chip-derived">${d(t.status||"open")}</span></td>
    <td class="text-right px-3 text-muted">${d(et(t.created_at))}</td>
  </tr>`}function Xt(t){const e=Z(t),s=tt(t);return`<article class="trade-position-card trade-activity-card">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${d(z(t))}</strong>
        <small>${d(t.order_type||"market")} - ${d(et(t.created_at))}</small>
      </div>
      <span class="badge-${e==="SELL"?"sell":"buy"}">${d(e)}</span>
    </div>
    <div class="trade-position-metrics">
      <span><small>Entry</small><strong>${f(t.entry_price||t.fill_price||t.limit_price,s)}</strong></span>
      <span><small>Amount</small><strong>${x(t.used_usdt||t.usd_amount||t.amount||0)}</strong></span>
      <span><small>Lev</small><strong>${d(String(t.leverage||1))}x</strong></span>
      <span><small>Status</small><strong>${d(t.status||"open")}</strong></span>
      <span><small>Mode</small><strong>${d(t.mode||o("mode")||"demo")}</strong></span>
      <span><small>Symbol</small><strong>${d(z(t))}</strong></span>
    </div>
  </article>`}function Jt(t){const e=Z(t),s=tt(t),a=Number(t.pnl_usd||t.pnl||0);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${d(z(t))}</td>
    <td><span class="badge-${e==="SELL"?"sell":"buy"}">${d(e)}</span></td>
    <td class="text-muted">${d(t.market_type||t.order_type||"spot")}</td>
    <td class="text-right font-mono">${f(t.entry_price||t.fill_price,s)}</td>
    <td class="text-right font-mono">${f(t.exit_price||t.limit_price,s)}</td>
    <td class="text-right font-mono">${x(t.used_usdt||t.usd_amount||0)}</td>
    <td class="text-right font-mono">${x(t.fee_paid||0)}</td>
    <td class="text-right font-mono ${a>=0?"text-buy":"text-sell"}">${x(a)}</td>
    <td class="text-right px-3 text-muted">${d(et(t.closed_at||t.created_at))}</td>
  </tr>`}function Zt(t){const e=Z(t),s=tt(t),a=Number(t.pnl_usd||t.pnl||0);return`<article class="trade-position-card trade-activity-card is-history">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${d(z(t))}</strong>
        <small>${d(t.close_reason||t.status||"closed")} - ${d(et(t.closed_at||t.created_at))}</small>
      </div>
      <span class="badge-${e==="SELL"?"sell":"buy"}">${d(e)}</span>
    </div>
    <div class="trade-position-metrics">
      <span><small>Entry</small><strong>${f(t.entry_price||t.fill_price,s)}</strong></span>
      <span><small>Exit</small><strong>${f(t.exit_price||t.limit_price,s)}</strong></span>
      <span><small>Used</small><strong>${x(t.used_usdt||t.usd_amount||0)}</strong></span>
      <span><small>PnL</small><strong class="${a>=0?"text-buy":"text-sell"}">${x(a)}</strong></span>
      <span><small>Fee</small><strong>${x(t.fee_paid||0)}</strong></span>
      <span><small>Type</small><strong>${d(t.market_type||t.order_type||"--")}</strong></span>
    </div>
  </article>`}async function te(t,e,s=$){if(!v(s))return;const a=c("#chart-box",t);if(!a)return;const{createChart:l}=await Tt();if(!v(s))return;a.innerHTML="",k=l(a,{layout:{background:{color:"#060A14"},textColor:"#8ba1cf",fontSize:11},grid:{vertLines:{color:"rgba(129,160,220,0.04)"},horzLines:{color:"rgba(129,160,220,0.04)"}},crosshair:{mode:0,vertLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"},horzLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"}},timeScale:{timeVisible:!0,secondsVisible:!1,borderColor:"rgba(129,160,220,0.08)",rightOffset:4},rightPriceScale:{borderColor:"rgba(129,160,220,0.08)"},watermark:{visible:!0,text:"MEX Group",color:"rgba(93,124,255,0.08)",fontSize:48,horzAlign:"center",vertAlign:"center"},width:Math.max(320,a.clientWidth),height:Math.max(260,a.clientHeight)}),D=k.addCandlestickSeries({upColor:"#00c087",downColor:"#f6465d",borderUpColor:"#00c087",borderDownColor:"#f6465d",wickUpColor:"#00c087",wickDownColor:"#f6465d"}),nt=k.addHistogramSeries({priceFormat:{type:"volume"},priceScaleId:"vol"}),k.priceScale("vol").applyOptions({scaleMargins:{top:.84,bottom:0}}),dt=k.addLineSeries({color:"rgba(255,193,7,0.55)",lineWidth:1,priceLineVisible:!1,lastValueVisible:!1,crosshairMarkerVisible:!1}),pt=k.addLineSeries({color:"rgba(93,124,255,0.55)",lineWidth:1,priceLineVisible:!1,lastValueVisible:!1,crosshairMarkerVisible:!1});const r=e.map(n=>({time:Number(n.time||n.t),open:Number(n.open||n.o),high:Number(n.high||n.h),low:Number(n.low||n.l),close:Number(n.close||n.c),volume:Number(n.volume||n.v||0)})).filter(n=>n.time>0&&n.open>0).sort((n,u)=>n.time-u.time);D.setData(r.map(({time:n,open:u,high:p,low:m,close:b})=>({time:n,open:u,high:p,low:m,close:b}))),nt.setData(r.map(n=>({time:n.time,value:n.volume,color:n.close>=n.open?"rgba(0,192,135,0.25)":"rgba(246,70,93,0.2)"})));const i=r.map(n=>({time:n.time,close:n.close}));dt.setData(yt(i,7)),pt.setData(yt(i,25)),y=r.length?{...r[r.length-1]}:null,k.timeScale().fitContent(),F=new ResizeObserver(()=>{!k||!a||k.applyOptions({width:Math.max(320,a.clientWidth),height:Math.max(260,a.clientHeight)})}),F.observe(a)}function ee(t){c("#mob-mkt-btn",t)?.addEventListener("click",()=>ae(t)),c("#close-mob-drawer",t)?.addEventListener("click",()=>ft(t)),h(t,"[data-sym]","click",(e,s)=>{ft(t),localStorage.setItem("vp_symbol",s.dataset.sym),localStorage.setItem("vp_type",s.dataset.stype||o("type")),at("trade",{symbol:s.dataset.sym,type:s.dataset.stype||o("type"),tf:o("tf")})}),h(t,"[data-tf]","click",(e,s)=>{L("tf",s.dataset.tf),localStorage.setItem("vp_tf",s.dataset.tf),at("trade",{symbol:o("symbol"),type:o("type"),tf:s.dataset.tf})}),h(t,"[data-type-tab]","click",async(e,s)=>{L("type",s.dataset.typeTab),localStorage.setItem("vp_type",s.dataset.typeTab);const a=await M(Et(s.dataset.typeTab),{timeout:6e3}).catch(()=>null);if(a?.items){const l=a.items.find(r=>r?.symbol);if(l?.symbol&&H(s.dataset.typeTab)!=="favorites"){const r=String(l.symbol).toUpperCase();localStorage.setItem("vp_symbol",r),at("trade",{symbol:r,type:s.dataset.typeTab,tf:o("tf")});return}wt(t,a.items),St(t,a.items,$),ht(t,a.items,$)}C("[data-type-tab]",t).forEach(l=>{const r=l===s;l.classList.toggle("bg-accent/20",r),l.classList.toggle("text-accent",r),l.classList.toggle("border-accent/40",r)})}),h(t,"[data-open-order]","click",(e,s)=>le(t,s.dataset.openOrder)),h(t,"[data-close-order-sheet]","click",()=>_t(t)),h(t,"[data-submit-order]","click",(e,s)=>mt(s.dataset.submitOrder,t,c("#mobile-order-sheet [data-order-form]",t))),h(t,"[data-side]","click",(e,s)=>{const a=s.closest("#mobile-order-sheet"),l=s.closest("[data-order-form]");if(a){Ct(t,s.dataset.side);return}mt(s.dataset.side,t,l)}),h(t,"[data-order-type]","change",(e,s)=>L("orderType",s.value)),h(t,"[data-market-type]","change",(e,s)=>{L("market",s.value),localStorage.setItem("vp_market",s.value),j(t)}),h(t,"[data-leverage]","input",(e,s)=>{L("leverage",Number(s.value)),rt(t,"leverage",s.value),j(t);const a=Number(s.value),l=Number(s.max)||100,r=a/l,i=r<.3?"#00c087":r<.6?"#fcd535":"#f6465d";s.style.accentColor=i;const n=t.querySelector("#leverage-label");n&&(n.textContent=a+"x",n.style.color=i)}),h(t,"[data-amount]","input",(e,s)=>{L("amount",Number(s.value)),rt(t,"amount",s.value),j(t)}),h(t,"[data-close]","click",async(e,s)=>{await M("/trade/close_position.php",{method:"POST",body:{position_id:s.dataset.close},timeout:8e3}).catch(()=>null),await J(t,$)}),h(t,"[data-activity-tab]","click",(e,s)=>{t.__tradeActivityTab=s.dataset.activityTab||"positions",kt(t)}),h(t,"[data-quick-amount]","click",(e,s)=>{const a=Number(s.dataset.quickAmount||0);a>0&&(L("amount",a),rt(t,"amount",a),j(t))}),c("#sym-search",t)?.addEventListener("input",e=>{const s=e.target.value.toLowerCase();C(".symbol-row",t).forEach(a=>{a.style.display=a.dataset.sym.toLowerCase().includes(s)?"":"none"})})}async function mt(t,e,s){const a=s||c("[data-order-form]",e)||e;T(a,"","info");const l=o("activeQuote")||{},r=Number(l.price||0);if(!r){T(a,"No live price available yet. Please wait for the quote to load.","warning");return}const i=Number(c("[data-amount]",a)?.value||o("amount")||0),n=Number(c("[data-leverage]",a)?.value||o("leverage")||1),u=Number(c("[data-tp]",a)?.value||0),p=Number(c("[data-sl]",a)?.value||0),m=c("[data-market-type]",a)?.value||o("market")||"spot",b=c("[data-order-type]",a)?.value||o("orderType")||"MARKET",w=Number(c("[data-limit-price]",a)?.value||0);if(i<=0){T(a,"Enter a valid amount first.","warning");return}if(t==="BUY"&&p>0&&p>=r){T(a,"For BUY orders, Stop Loss should be below the current price.","warning");return}if(t==="SELL"&&p>0&&p<=r){T(a,"For SELL orders, Stop Loss should be above the current price.","warning");return}if(await se({side:t,symbol:o("symbol"),type:o("type"),amount:i,leverage:n,tp:u,sl:p,marketType:m,orderType:b,currentPrice:r,limitInput:w,mode:o("mode")}))try{bt(a,!0),T(a,`Sending ${t==="BUY"?"buy":"sell"} order...`,"info");const g=await M("/trade/place_order.php",{method:"POST",body:{symbol:o("symbol"),asset_type:o("type"),market_type:m,side:t,order_type:b,usd:i,leverage:n,tp:u||void 0,sl:p||void 0,price:b==="LIMIT"&&w||r,mode:o("mode")},timeout:1e4});if(g&&g.ok===!1){T(a,g.error||"Order failed","error");return}T(a,`${t==="BUY"?"Buy":"Sell"} order opened successfully.`,"success"),await J(e,$),setTimeout(()=>{a.closest?.("#mobile-order-sheet")?_t(e):T(a,"","info")},900)}catch(g){console.error("Order failed:",g),T(a,g.message||"Order failed","error")}finally{bt(a,!1)}}function se({side:t,symbol:e,type:s,amount:a,leverage:l,tp:r,sl:i,marketType:n,orderType:u,currentPrice:p,limitInput:m,mode:b}){return new Promise(w=>{const S=document.getElementById("order-confirm-modal");S&&S.remove();const g=t==="BUY",_=u==="LIMIT"&&m||p,Y=a*l,q=r>0?Math.abs(r-_)*(Y/_):null,ct=i>0?Math.abs(i-_)*(Y/_):null,N=document.createElement("div");N.id="order-confirm-modal",N.className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center",N.innerHTML=`
      <div class="absolute inset-0 bg-black/70" id="confirm-backdrop"></div>
      <div class="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden">
        <div class="px-5 py-4 border-b border-line text-center">
          <h3 class="text-lg font-bold ${g?"text-green-400":"text-red-400"}">${g?"Buy":"Sell"} Order</h3>
          <p class="text-xs text-muted mt-1">Review and confirm your order</p>
        </div>
        <div class="px-5 py-4 space-y-3">
          <div class="flex justify-between text-sm"><span class="text-muted">Symbol</span><strong>${d(e)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">Type</span><strong>${d(u)} / ${d(n)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">Side</span><strong class="${g?"text-green-400":"text-red-400"}">${t}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">Amount</span><strong>$${a.toFixed(2)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">Leverage</span><strong>${l}x</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">Notional</span><strong>$${Y.toFixed(2)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">Price</span><strong class="font-mono">${parseFloat(_).toFixed(s==="crypto"?2:4)}</strong></div>
          ${r>0?`<div class="flex justify-between text-sm"><span class="text-muted">Take Profit</span><strong class="font-mono text-green-400">${parseFloat(r).toFixed(s==="crypto"?2:4)}</strong></div>`:""}
          ${i>0?`<div class="flex justify-between text-sm"><span class="text-muted">Stop Loss</span><strong class="font-mono text-red-400">${parseFloat(i).toFixed(s==="crypto"?2:4)}</strong></div>`:""}
          ${q!==null?`<div class="flex justify-between text-sm"><span class="text-muted">Est. Profit</span><strong class="text-green-400">$${q.toFixed(2)}</strong></div>`:""}
          ${ct!==null?`<div class="flex justify-between text-sm"><span class="text-muted">Est. Loss</span><strong class="text-red-400">$${ct.toFixed(2)}</strong></div>`:""}
          <div class="flex justify-between text-sm"><span class="text-muted">Mode</span><strong>${b==="real"?"Real":"Demo"}</strong></div>
        </div>
        <div class="grid grid-cols-2 gap-3 px-5 py-4 border-t border-line">
          <button class="btn-ghost py-2.5" id="confirm-cancel">Cancel</button>
          <button class="${g?"btn-buy":"btn-sell"} py-2.5 text-white font-bold" id="confirm-execute">Confirm ${t}</button>
        </div>
      </div>`,document.body.appendChild(N),document.body.style.overflow="hidden";const st=Mt=>{N.remove(),document.body.style.overflow="",w(Mt)};N.querySelector("#confirm-backdrop").addEventListener("click",()=>st(!1)),N.querySelector("#confirm-cancel").addEventListener("click",()=>st(!1)),N.querySelector("#confirm-execute").addEventListener("click",()=>st(!0)),N.querySelector("#confirm-execute").focus()})}function T(t,e,s="info"){const a=c("[data-order-status]",t);a&&(a.textContent=e||"",a.hidden=!e,a.className=`order-form-status is-${s}`)}function bt(t,e){const s=[t,t.closest?.("#mobile-order-sheet")].filter(Boolean);new Set(s.flatMap(l=>C("[data-side], [data-submit-order]",l))).forEach(l=>{l.disabled=!!e,l.classList.toggle("opacity-60",!!e)}),t.classList.toggle("is-submitting",!!e)}function ae(t){const e=c("#market-drawer",t);e&&(e.classList.add("mobile-market-open"),e.classList.remove("hidden"),document.body.classList.add("trade-modal-open"))}function ft(t){const e=c("#market-drawer",t);e&&(e.classList.remove("mobile-market-open"),window.innerWidth<1024&&e.classList.add("hidden"),document.body.classList.remove("trade-modal-open"))}function le(t,e){const s=c("#mobile-order-sheet",t);s&&(Ct(t,e),s.classList.remove("hidden"),document.body.classList.add("trade-modal-open"),j(t))}function _t(t){const e=c("#mobile-order-sheet",t);e&&e.classList.add("hidden"),document.body.classList.remove("trade-modal-open")}function Ct(t,e){const s=c("#mobile-submit-order",t),a=c("#mobile-order-side-label",t);s&&(s.dataset.submitOrder=e,s.textContent=`Review & ${e==="BUY"?"Buy":"Sell"}`,s.className=`${e==="BUY"?"btn-buy":"btn-sell"} w-full py-3`),a&&(a.textContent=`${e} order`)}function rt(t,e,s){C(`[data-${e}]`,t).forEach(a=>{String(a.value)!==String(s)&&(a.value=s)})}function re(t,e=$){if(!v(e)||!D||!y||!(t>0))return;const s=ne();s<=y.time?(y.close=t,y.high=Math.max(y.high,t),y.low=Math.min(y.low,t)):y={time:s,open:y.close,high:Math.max(y.close,t),low:Math.min(y.close,t),close:t,volume:0},D.update({time:y.time,open:y.open,high:y.high,low:y.low,close:y.close})}function ne(){const t=ie(o("tf")),e=Math.floor(Date.now()/1e3);return Math.floor(e/t)*t}function ie(t){return{"1m":60,"5m":300,"15m":900,"30m":1800,"1h":3600,"4h":14400,"1d":86400}[t]||60}function Tt(){return lt||(lt=Nt(()=>import("./chart-DbDccfIU.js"),[])),lt}function yt(t,e){const s=[];for(let a=e-1;a<t.length;a++){let l=0;for(let r=0;r<e;r++)l+=t[a-r].close;s.push({time:t[a].time,value:l/e})}return s}function Et(t){const e=H(t||"crypto");return`/markets.php?type=${encodeURIComponent(e==="favorites"?"crypto":e)}&scope=trade&supported=1&lite=1&with_quotes=1`}function oe(t){const e=String(t?.source||"").toLowerCase();return String(t?.timing_class||"").toLowerCase()==="stale"||t?.is_stale||e.includes("yahoo")?"bg-spread":"bg-buy"}function ce(t){const e=String(t?.timing_class||"").toLowerCase(),s=String(t?.source||"").toLowerCase();return Number(t?.price||0)<=0?"Unavailable":e==="stale"||t?.is_stale?"Stale":e==="delayed"||s.includes("yahoo")||["stocks","arab"].includes(H(t?.type||o("type")))?"Delayed":e==="candle_fallback"?"Chart quote":"Live"}function de(t){const e=String(t||"").toLowerCase();return e==="live"?"status-chip-live":e==="unavailable"?"status-chip-locked":"status-chip-delayed"}function ot(t,e,s){return`<span class="${s} grid place-items-center overflow-hidden border border-line bg-surface">
    <img src="${O(Ut({symbol:t,type:e},e))}" class="h-full w-full object-cover" alt="${O(t)}" loading="lazy" data-fallback="initial" />
    <b class="hidden h-full w-full place-items-center bg-accent/20 text-[9px] font-black">${d(Ot(t))}</b>
  </span>`}export{fe as cleanup,be as mount,me as render};
