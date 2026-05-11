import{s as u,g as o,i as L,e as b,a as m,$ as r,p as y,b as E,c as C,m as N,_ as U,d as x,n as T,f as v}from"./main-C96G9szY.js";let h=null;const j=2500;function A(e,i,t,l){return g(),!e||!e.length||B(e,i,t),g}function B(e,i,t){P();const l=async()=>{try{const s="/api/quotes.php?symbols="+encodeURIComponent(e.join(","))+"&type="+encodeURIComponent(i)+"&visible=1&fresh=1",a=await fetch(s,{credentials:"same-origin"});if(a.ok){const n=await a.json();n&&n.items&&t&&t(n.items)}}catch{}h=setTimeout(l,j)};l()}function P(){h&&(clearTimeout(h),h=null)}function g(){P()}let p=null,k=null,S=null,w=null;const H=[{key:"favorites",label:"Favorites"},{key:"crypto",label:"Crypto"},{key:"forex",label:"Forex"},{key:"stocks",label:"Stocks"},{key:"commodities",label:"Metals"},{key:"futures",label:"Futures"},{key:"arab",label:"Arab"}],D=["1m","5m","15m","30m","1h","4h","1d"];function V(e){e.symbol&&u("symbol",e.symbol.toUpperCase()),e.type&&u("type",e.type),e.tf&&u("tf",e.tf);const i=o("symbol"),t=o("type"),l=o("tf");return`<div class="flex flex-col lg:flex-row h-full mobile-pad">
    <!-- Symbol Sidebar (desktop) -->
    <aside class="hidden lg:flex flex-col w-[240px] border-r border-line bg-surface shrink-0 overflow-hidden">
      <div class="p-2 border-b border-line">
        <div class="relative"><input type="search" class="input pl-7" placeholder="Search..." id="sym-search" /><span class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted">${L.search}</span></div>
      </div>
      <div class="flex gap-1 p-2 overflow-x-auto border-b border-line" id="type-tabs">
        ${H.map(s=>`<button class="btn-xs ${s.key===t?"bg-accent/20 text-accent border-accent/40":"text-muted border-line"} border rounded-md whitespace-nowrap" data-type-tab="${s.key}">${s.label}</button>`).join("")}
      </div>
      <div class="flex-1 overflow-auto" id="symbol-list"><div class="p-4"><div class="loading-spinner mx-auto"></div></div></div>
    </aside>

    <!-- Main Area -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Symbol Header -->
      <div class="flex items-center justify-between px-3 lg:px-4 h-10 border-b border-line bg-surface shrink-0">
        <div class="flex items-center gap-2">
          <button class="lg:hidden w-7 h-7 grid place-items-center rounded border border-line text-muted" id="mob-mkt-btn">${L.menu}</button>
          <img src="./assets/img/markets/${t.replace("commodities","metal")}.svg" class="w-6 h-6 rounded-md" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'" /><div class="w-6 h-6 rounded-md bg-accent/20 grid place-items-center text-[9px] font-black text-accent" style="display:none">${b(i.slice(0,3))}</div>
          <strong class="text-sm" id="sym-name">${b(i)}</strong>
          <span class="text-sm font-mono font-bold" id="live-price">--</span>
          <span class="text-xs" id="live-change">+0.00%</span>
          <span class="w-2 h-2 rounded-full bg-muted" id="conn-dot" title="Disconnected"></span>
        </div>
        <div class="flex gap-0.5" id="tf-bar">
          ${D.map(s=>`<button class="px-1.5 py-0.5 text-[10px] rounded ${s===l?"bg-accent/20 text-accent":"text-muted hover:text-text"}" data-tf="${s}">${s}</button>`).join("")}
        </div>
      </div>

      <!-- Chart -->
      <div class="flex-1 relative min-h-[200px] bg-bg" id="chart-box">
        <div class="absolute inset-0 flex items-center justify-center"><div class="loading-spinner"></div></div>
      </div>

      <!-- Mobile Buy/Sell -->
      <div class="lg:hidden flex gap-2 p-2 border-t border-line bg-surface">
        <button class="btn-sell flex-1 py-2.5" data-side="SELL">SELL</button>
        <button class="btn-buy flex-1 py-2.5" data-side="BUY">BUY</button>
      </div>

      <!-- Positions (below chart on desktop) -->
      <div class="border-t border-line bg-surface max-h-[180px] overflow-auto" id="positions-section">
        <div class="flex items-center gap-3 px-3 h-8 border-b border-line">
          <span class="text-[10px] font-semibold text-muted uppercase">Open Positions</span>
          <span class="text-[10px] text-muted" id="pos-count">(0)</span>
        </div>
        <div id="positions-body"><p class="text-muted text-[11px] text-center py-4">Loading...</p></div>
      </div>
    </div>

    <!-- Order Panel (desktop) -->
    <aside class="hidden lg:flex flex-col w-[280px] border-l border-line bg-surface shrink-0 overflow-auto">
      <div class="p-3 border-b border-line">
        <div class="text-xs font-semibold">Order</div>
        <div class="text-[10px] text-muted">${b(i)} - ${b(t.toUpperCase())}</div>
      </div>
      <div class="p-3 space-y-3" id="order-body">
        ${z()}
      </div>
    </aside>
  </div>`}function z(){const e=o("orderType"),i=o("amount"),t=o("leverage"),l=o("activeQuote")||{},s=Number(l.price||0);return`
    <div class="flex rounded overflow-hidden border border-line">
      <button class="flex-1 py-1.5 text-[11px] font-semibold ${e==="MARKET"?"bg-accent/15 text-accent":"text-muted"}" data-otype="MARKET">Market</button>
      <button class="flex-1 py-1.5 text-[11px] font-semibold ${e==="LIMIT"?"bg-accent/15 text-accent":"text-muted"}" data-otype="LIMIT">Limit</button>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <button class="btn-sell py-3 text-sm font-bold" data-side="SELL"><small class="block text-[9px] opacity-70">Sell</small><span id="sell-price">${s>0?y(s,o("type")):"--"}</span></button>
      <button class="btn-buy py-3 text-sm font-bold" data-side="BUY"><small class="block text-[9px] opacity-70">Buy</small><span id="buy-price">${s>0?y(s,o("type")):"--"}</span></button>
    </div>
    <div class="text-center"><span class="spread-display" id="spread-val">Spread: --</span></div>
    <label class="block"><span class="text-[10px] text-muted">Amount (USDT)</span><input type="number" class="input mt-1" value="${i}" id="inp-amount" /></label>
    <label class="block"><span class="text-[10px] text-muted">Leverage: <strong id="lev-val">${t}x</strong></span><input type="range" min="1" max="100" value="${t}" class="w-full mt-1 accent-accent" id="inp-lev" /></label>
    <div class="grid grid-cols-2 gap-2">
      <label class="block"><span class="text-[10px] text-muted">Take Profit</span><input type="number" step="any" class="input mt-1" placeholder="Optional" id="inp-tp" /></label>
      <label class="block"><span class="text-[10px] text-muted">Stop Loss</span><input type="number" step="any" class="input mt-1" placeholder="Optional" id="inp-sl" /></label>
    </div>
    <div class="space-y-1 text-[10px] text-muted pt-2 border-t border-line">
      <div class="flex justify-between"><span>Est. Units</span><span id="est-units">--</span></div>
      <div class="flex justify-between"><span>Available</span><span id="avail-bal">--</span></div>
    </div>`}function K(e){O(e)}function W(){p&&(p.remove(),p=null,k=null,S=null),w&&(w(),w=null),g()}async function O(e){const i=o("symbol"),t=o("type"),l=o("tf"),[s,a,n,d]=await Promise.all([m(`/markets.php?type=${t}&lite=1&with_quotes=1`,{timeout:8e3}).catch(()=>null),m(`/quotes.php?symbol=${i}&type=${t}&purpose=focus`,{timeout:5e3}).catch(()=>null),m(`/trade/candles.php?symbol=${i}&type=${t}&tf=${l}&limit=200`,{timeout:1e4}).catch(()=>null),m("/trade/portfolio.php",{timeout:6e3}).catch(()=>null)]);a?.items?.[0]&&_(e,a.items[0]),s?.items&&q(e,s.items),d?.positions&&M(e,d.positions),$(e);try{n?.items?.length&&await F(e,n.items)}catch(c){console.error("Chart:",c),r("#chart-box",e).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart unavailable</p>'}w=A([i],t,c=>{const f=c.find(I=>I.symbol===i);f&&_(e,f),r("#conn-dot",e)?.classList.replace("bg-muted","bg-buy")}),R(e)}function _(e,i){const t=Number(i.price||0),l=Number(i.change_pct||0),s=o("type");u("activeQuote",i);const a=r("#live-price",e),n=r("#live-change",e);a&&(a.textContent=t>0?y(t,s):"--"),n&&(n.textContent=E(l),n.className=`text-xs ${l>=0?"text-buy":"text-sell"}`),r("#sell-price",e)&&(r("#sell-price",e).textContent=y(t,s)),r("#buy-price",e)&&(r("#buy-price",e).textContent=y(t*1.0001,s)),$(e)}function $(e){const i=o("activeQuote")||{},t=Number(i.price||0),l=Number(r("#inp-amount",e)?.value||o("amount")),s=Number(r("#inp-lev",e)?.value||o("leverage")),a=o("wallet")||{},n=o("mode")==="real"?a.real||{}:a.demo||{},d=t>0?l*s/t:0,c=r("#est-units",e);c&&(c.textContent=d>0?d.toFixed(4):"--");const f=r("#avail-bal",e);f&&(f.textContent=`${N(n.available||0)} ${n.currency||""}`)}function q(e,i){const t=r("#symbol-list",e);if(!t)return;const l=o("symbol");t.innerHTML=i.slice(0,40).map(s=>{const a=Number(s.price||s.q_price||0),n=Number(s.change_pct||s.q_change||0);return`<div class="symbol-row ${s.symbol===l?"active":""}" data-sym="${C(s.symbol)}" data-stype="${C(s.type||o("type"))}">
      <img src="./assets/img/markets/${(s.type||o("type")).replace("commodities","metal")}.svg" class="w-6 h-6 rounded" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'" /><div class="w-6 h-6 rounded bg-panel grid place-items-center text-[8px] font-black" style="display:none">${b(s.symbol.slice(0,3))}</div>
      <div class="flex-1 min-w-0"><div class="font-semibold text-[11px] truncate">${b(s.symbol)}</div><div class="text-[9px] text-muted truncate">${b(s.name||"")}</div></div>
      <div class="text-right shrink-0"><div class="text-[11px] font-mono">${a>0?y(a,s.type):"--"}</div><div class="text-[9px] ${n>=0?"text-buy":"text-sell"}">${E(n)}</div></div>
    </div>`}).join("")}function M(e,i){const t=r("#positions-body",e),l=r("#pos-count",e);if(l&&(l.textContent=`(${i.length})`),!!t){if(!i.length){t.innerHTML='<p class="text-muted text-[11px] text-center py-3">No open positions</p>';return}t.innerHTML=`<table class="w-full text-[11px]"><thead class="text-[9px] text-muted uppercase"><tr><th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-right py-1">Entry</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1"></th></tr></thead><tbody>${i.slice(0,10).map(s=>{const a=Number(s.pnl||s.unrealized_pnl||0);return`<tr class="border-t border-line/50 hover:bg-panel/50"><td class="px-3 py-1.5 font-semibold">${b(s.symbol)}</td><td><span class="badge-${s.side==="BUY"?"buy":"sell"}">${s.side}</span></td><td class="text-right font-mono">${y(s.entry_price||s.open_price)}</td><td class="text-right font-mono ${a>=0?"text-buy":"text-sell"}">${N(a)}</td><td class="text-right px-3"><button class="btn-xs btn-ghost text-sell" data-close="${s.id}">Close</button></td></tr>`}).join("")}</tbody></table>`}}async function F(e,i){const t=r("#chart-box",e);if(!t)return;const{createChart:l}=await U(async()=>{const{createChart:a}=await import("./chart-Bk8T08OE.js");return{createChart:a}},[]);t.innerHTML="",p=l(t,{layout:{background:{color:"#060A14"},textColor:"#8ba1cf",fontSize:11},grid:{vertLines:{color:"rgba(129,160,220,0.04)"},horzLines:{color:"rgba(129,160,220,0.04)"}},crosshair:{mode:0,vertLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"},horzLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"}},timeScale:{timeVisible:!0,secondsVisible:!1,borderColor:"rgba(129,160,220,0.08)"},rightPriceScale:{borderColor:"rgba(129,160,220,0.08)"},width:t.clientWidth,height:t.clientHeight}),k=p.addCandlestickSeries({upColor:"#00c087",downColor:"#f6465d",borderUpColor:"#00c087",borderDownColor:"#f6465d",wickUpColor:"#00c087",wickDownColor:"#f6465d"}),S=p.addHistogramSeries({priceFormat:{type:"volume"},priceScaleId:"vol"}),p.priceScale("vol").applyOptions({scaleMargins:{top:.85,bottom:0}});const s=i.map(a=>({time:Number(a.time||a.t),open:Number(a.open||a.o),high:Number(a.high||a.h),low:Number(a.low||a.l),close:Number(a.close||a.c)})).filter(a=>a.time>0&&a.open>0);k.setData(s),S.setData(s.map(a=>({time:a.time,value:Number(i.find(n=>(n.time||n.t)==a.time)?.volume||i.find(n=>(n.time||n.t)==a.time)?.v||0),color:a.close>=a.open?"rgba(0,192,135,0.25)":"rgba(246,70,93,0.2)"}))),p.timeScale().fitContent(),new ResizeObserver(()=>p?.applyOptions({width:t.clientWidth,height:t.clientHeight})).observe(t)}function R(e){var i=e.querySelector("#mob-mkt-btn");i&&i.addEventListener("click",function(){var t=e.querySelector("aside");t&&(t.classList.contains("hidden")?(t.classList.remove("hidden"),t.style.cssText="position:fixed;inset:0;z-index:200;width:100%;background:#0b1426;display:flex;flex-direction:column;"):(t.classList.add("hidden"),t.style.cssText=""))}),x(e,"[data-sym]","click",(t,l)=>{T("trade",{symbol:l.dataset.sym,type:l.dataset.stype||o("type")})}),x(e,"[data-tf]","click",(t,l)=>{u("tf",l.dataset.tf),localStorage.setItem("vp_tf",l.dataset.tf),T("trade",{symbol:o("symbol"),type:o("type"),tf:l.dataset.tf})}),x(e,"[data-type-tab]","click",async(t,l)=>{u("type",l.dataset.typeTab),localStorage.setItem("vp_type",l.dataset.typeTab);const s=await m(`/markets.php?type=${l.dataset.typeTab}&lite=1&with_quotes=1`,{timeout:6e3}).catch(()=>null);s?.items&&q(e,s.items),v("[data-type-tab]",e).forEach(a=>a.classList.toggle("bg-accent/20",a===l)),v("[data-type-tab]",e).forEach(a=>a.classList.toggle("text-accent",a===l))}),x(e,"[data-side]","click",(t,l)=>Y(l.dataset.side,e)),x(e,"[data-otype]","click",(t,l)=>{u("orderType",l.dataset.otype),v("[data-otype]",e).forEach(s=>{s.classList.toggle("bg-accent/15",s===l),s.classList.toggle("text-accent",s===l)})}),x(e,"[data-close]","click",async(t,l)=>{await m("/trade/close_position.php",{method:"POST",body:{position_id:l.dataset.close},timeout:8e3}).catch(()=>null),O(e)}),r("#inp-lev",e)?.addEventListener("input",t=>{const l=t.target.value;u("leverage",Number(l)),r("#lev-val",e).textContent=l+"x",$(e)}),r("#inp-amount",e)?.addEventListener("input",t=>{u("amount",Number(t.target.value)),$(e)}),r("#sym-search",e)?.addEventListener("input",t=>{const l=t.target.value.toLowerCase();v(".symbol-row",e).forEach(s=>s.style.display=s.dataset.sym.toLowerCase().includes(l)?"":"none")})}async function Y(e,i){const t=o("activeQuote")||{};if(!t.price){alert("No price available");return}const l=Number(i.querySelector("#inp-amount")?.value||o("amount")),s=Number(i.querySelector("#inp-lev")?.value||o("leverage")),a=Number(i.querySelector("#inp-tp")?.value||0),n=Number(i.querySelector("#inp-sl")?.value||0);if(l<=0){alert("Enter a valid amount");return}try{const d=await m("/trade/place_order.php",{method:"POST",body:{symbol:o("symbol"),asset_type:o("type"),market_type:o("market")||"spot",side:e,order_type:o("orderType"),usd:l,leverage:s,tp:a||void 0,sl:n||void 0,price:t.price},timeout:1e4});if(d&&d.ok===!1){alert(d.error||"Order failed");return}const c=await m("/trade/portfolio.php",{timeout:5e3}).catch(()=>null);c?.positions&&M(i,c.positions)}catch(d){console.error("Order failed:",d)}}export{W as cleanup,K as mount,V as render};
