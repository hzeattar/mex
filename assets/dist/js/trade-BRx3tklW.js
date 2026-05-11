import{s as c,g as i,i as C,e as p,a as b,$ as d,p as u,b as E,c as S,m as N,_ as U,d as x,n as T,f as v}from"./main-Dr_0o_mT.js";let h=null;const j=2500;function A(t,o,e,a){return g(),!t||!t.length||B(t,o,e),g}function B(t,o,e){P();const a=async()=>{try{const s="/api/quotes.php?symbols="+encodeURIComponent(t.join(","))+"&type="+encodeURIComponent(o)+"&visible=1&fresh=1",l=await fetch(s,{credentials:"same-origin"});if(l.ok){const n=await l.json();n&&n.items&&e&&e(n.items)}}catch{}h=setTimeout(a,j)};a()}function P(){h&&(clearTimeout(h),h=null)}function g(){P()}let r=null,k=null,L=null,w=null;const H=[{key:"favorites",label:"Favorites"},{key:"crypto",label:"Crypto"},{key:"forex",label:"Forex"},{key:"stocks",label:"Stocks"},{key:"commodities",label:"Metals"},{key:"futures",label:"Futures"},{key:"arab",label:"Arab"}],D=["1m","5m","15m","30m","1h","4h","1d"];function V(t){t.symbol&&c("symbol",t.symbol.toUpperCase()),t.type&&c("type",t.type),t.tf&&c("tf",t.tf);const o=i("symbol"),e=i("type"),a=i("tf");return`<div class="flex flex-col lg:flex-row h-full mobile-pad">
    <!-- Symbol Sidebar (desktop) -->
    <aside class="hidden lg:flex flex-col w-[240px] border-r border-line bg-surface shrink-0 overflow-hidden">
      <div class="p-2 border-b border-line">
        <div class="relative"><input type="search" class="input pl-7" placeholder="Search..." id="sym-search" /><span class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted">${C.search}</span></div>
      </div>
      <div class="flex gap-1 p-2 overflow-x-auto border-b border-line" id="type-tabs">
        ${H.map(s=>`<button class="btn-xs ${s.key===e?"bg-accent/20 text-accent border-accent/40":"text-muted border-line"} border rounded-md whitespace-nowrap" data-type-tab="${s.key}">${s.label}</button>`).join("")}
      </div>
      <div class="flex-1 overflow-auto" id="symbol-list"><div class="p-4"><div class="loading-spinner mx-auto"></div></div></div>
    </aside>

    <!-- Main Area -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Symbol Header -->
      <div class="flex items-center justify-between px-3 lg:px-4 h-10 border-b border-line bg-surface shrink-0">
        <div class="flex items-center gap-2">
          <button class="lg:hidden w-7 h-7 grid place-items-center rounded border border-line text-muted" id="mob-mkt-btn">${C.menu}</button>
          <div class="w-6 h-6 rounded-md bg-accent/20 grid place-items-center text-[9px] font-black text-accent">${p(o.slice(0,3))}</div>
          <strong class="text-sm" id="sym-name">${p(o)}</strong>
          <span class="text-sm font-mono font-bold" id="live-price">--</span>
          <span class="text-xs" id="live-change">+0.00%</span>
          <span class="w-2 h-2 rounded-full bg-muted" id="conn-dot" title="Disconnected"></span>
        </div>
        <div class="flex gap-0.5" id="tf-bar">
          ${D.map(s=>`<button class="px-1.5 py-0.5 text-[10px] rounded ${s===a?"bg-accent/20 text-accent":"text-muted hover:text-text"}" data-tf="${s}">${s}</button>`).join("")}
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
      <div class="hidden lg:block border-t border-line bg-surface max-h-[180px] overflow-auto" id="positions-section">
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
        <div class="text-[10px] text-muted">${p(o)} - ${p(e.toUpperCase())}</div>
      </div>
      <div class="p-3 space-y-3" id="order-body">
        ${z()}
      </div>
    </aside>
  </div>`}function z(){const t=i("orderType"),o=i("amount"),e=i("leverage"),a=i("activeQuote")||{},s=Number(a.price||0);return`
    <div class="flex rounded overflow-hidden border border-line">
      <button class="flex-1 py-1.5 text-[11px] font-semibold ${t==="MARKET"?"bg-accent/15 text-accent":"text-muted"}" data-otype="MARKET">Market</button>
      <button class="flex-1 py-1.5 text-[11px] font-semibold ${t==="LIMIT"?"bg-accent/15 text-accent":"text-muted"}" data-otype="LIMIT">Limit</button>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <button class="btn-sell py-3 text-sm font-bold" data-side="SELL"><small class="block text-[9px] opacity-70">Sell</small><span id="sell-price">${s>0?u(s,i("type")):"--"}</span></button>
      <button class="btn-buy py-3 text-sm font-bold" data-side="BUY"><small class="block text-[9px] opacity-70">Buy</small><span id="buy-price">${s>0?u(s,i("type")):"--"}</span></button>
    </div>
    <div class="text-center"><span class="spread-display" id="spread-val">Spread: --</span></div>
    <label class="block"><span class="text-[10px] text-muted">Amount (USDT)</span><input type="number" class="input mt-1" value="${o}" id="inp-amount" /></label>
    <label class="block"><span class="text-[10px] text-muted">Leverage: <strong id="lev-val">${e}x</strong></span><input type="range" min="1" max="100" value="${e}" class="w-full mt-1 accent-accent" id="inp-lev" /></label>
    <div class="space-y-1 text-[10px] text-muted pt-2 border-t border-line">
      <div class="flex justify-between"><span>Est. Units</span><span id="est-units">--</span></div>
      <div class="flex justify-between"><span>Available</span><span id="avail-bal">--</span></div>
    </div>`}function K(t){M(t)}function W(){r&&(r.remove(),r=null,k=null,L=null),w&&(w(),w=null),g()}async function M(t){const o=i("symbol"),e=i("type"),a=i("tf"),[s,l,n,y]=await Promise.all([b(`/markets.php?type=${e}&lite=1&with_quotes=1`,{timeout:8e3}).catch(()=>null),b(`/quotes.php?symbol=${o}&type=${e}&purpose=focus`,{timeout:5e3}).catch(()=>null),b(`/trade/candles.php?symbol=${o}&type=${e}&tf=${a}&limit=200`,{timeout:1e4}).catch(()=>null),b("/trade/portfolio.php",{timeout:6e3}).catch(()=>null)]);l?.items?.[0]&&_(t,l.items[0]),s?.items&&O(t,s.items),y?.positions&&q(t,y.positions),$(t);try{n?.items?.length&&await F(t,n.items)}catch(m){console.error("Chart:",m),d("#chart-box",t).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart unavailable</p>'}w=A([o],e,m=>{const f=m.find(I=>I.symbol===o);f&&_(t,f),d("#conn-dot",t)?.classList.replace("bg-muted","bg-buy")}),R(t)}function _(t,o){const e=Number(o.price||0),a=Number(o.change_pct||0),s=i("type");c("activeQuote",o);const l=d("#live-price",t),n=d("#live-change",t);l&&(l.textContent=e>0?u(e,s):"--"),n&&(n.textContent=E(a),n.className=`text-xs ${a>=0?"text-buy":"text-sell"}`),d("#sell-price",t)&&(d("#sell-price",t).textContent=u(e,s)),d("#buy-price",t)&&(d("#buy-price",t).textContent=u(e*1.0001,s)),$(t)}function $(t){const o=i("activeQuote")||{},e=Number(o.price||0),a=Number(d("#inp-amount",t)?.value||i("amount")),s=Number(d("#inp-lev",t)?.value||i("leverage")),l=i("wallet")||{},n=i("mode")==="real"?l.real||{}:l.demo||{},y=e>0?a*s/e:0,m=d("#est-units",t);m&&(m.textContent=y>0?y.toFixed(4):"--");const f=d("#avail-bal",t);f&&(f.textContent=`${N(n.available||0)} ${n.currency||""}`)}function O(t,o){const e=d("#symbol-list",t);if(!e)return;const a=i("symbol");e.innerHTML=o.slice(0,40).map(s=>{const l=Number(s.price||s.q_price||0),n=Number(s.change_pct||s.q_change||0);return`<div class="symbol-row ${s.symbol===a?"active":""}" data-sym="${S(s.symbol)}" data-stype="${S(s.type||i("type"))}">
      <div class="w-6 h-6 rounded bg-panel grid place-items-center text-[8px] font-black">${p(s.symbol.slice(0,3))}</div>
      <div class="flex-1 min-w-0"><div class="font-semibold text-[11px] truncate">${p(s.symbol)}</div><div class="text-[9px] text-muted truncate">${p(s.name||"")}</div></div>
      <div class="text-right shrink-0"><div class="text-[11px] font-mono">${l>0?u(l,s.type):"--"}</div><div class="text-[9px] ${n>=0?"text-buy":"text-sell"}">${E(n)}</div></div>
    </div>`}).join("")}function q(t,o){const e=d("#positions-body",t),a=d("#pos-count",t);if(a&&(a.textContent=`(${o.length})`),!!e){if(!o.length){e.innerHTML='<p class="text-muted text-[11px] text-center py-3">No open positions</p>';return}e.innerHTML=`<table class="w-full text-[11px]"><thead class="text-[9px] text-muted uppercase"><tr><th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-right py-1">Entry</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1"></th></tr></thead><tbody>${o.slice(0,10).map(s=>{const l=Number(s.pnl||s.unrealized_pnl||0);return`<tr class="border-t border-line/50 hover:bg-panel/50"><td class="px-3 py-1.5 font-semibold">${p(s.symbol)}</td><td><span class="badge-${s.side==="BUY"?"buy":"sell"}">${s.side}</span></td><td class="text-right font-mono">${u(s.entry_price||s.open_price)}</td><td class="text-right font-mono ${l>=0?"text-buy":"text-sell"}">${N(l)}</td><td class="text-right px-3"><button class="btn-xs btn-ghost text-sell" data-close="${s.id}">Close</button></td></tr>`}).join("")}</tbody></table>`}}async function F(t,o){const e=d("#chart-box",t);if(!e)return;const{createChart:a}=await U(async()=>{const{createChart:l}=await import("./chart-Bk8T08OE.js");return{createChart:l}},[]);e.innerHTML="",r=a(e,{layout:{background:{color:"#060A14"},textColor:"#8ba1cf",fontSize:11},grid:{vertLines:{color:"rgba(129,160,220,0.04)"},horzLines:{color:"rgba(129,160,220,0.04)"}},crosshair:{mode:0,vertLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"},horzLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"}},timeScale:{timeVisible:!0,secondsVisible:!1,borderColor:"rgba(129,160,220,0.08)"},rightPriceScale:{borderColor:"rgba(129,160,220,0.08)"},width:e.clientWidth,height:e.clientHeight}),k=r.addCandlestickSeries({upColor:"#00c087",downColor:"#f6465d",borderUpColor:"#00c087",borderDownColor:"#f6465d",wickUpColor:"#00c087",wickDownColor:"#f6465d"}),L=r.addHistogramSeries({priceFormat:{type:"volume"},priceScaleId:"vol"}),r.priceScale("vol").applyOptions({scaleMargins:{top:.85,bottom:0}});const s=o.map(l=>({time:Number(l.time||l.t),open:Number(l.open||l.o),high:Number(l.high||l.h),low:Number(l.low||l.l),close:Number(l.close||l.c)})).filter(l=>l.time>0&&l.open>0);k.setData(s),L.setData(s.map(l=>({time:l.time,value:Number(o.find(n=>(n.time||n.t)==l.time)?.volume||o.find(n=>(n.time||n.t)==l.time)?.v||0),color:l.close>=l.open?"rgba(0,192,135,0.25)":"rgba(246,70,93,0.2)"}))),r.timeScale().fitContent(),new ResizeObserver(()=>r?.applyOptions({width:e.clientWidth,height:e.clientHeight})).observe(e)}function R(t){var o=t.querySelector("#mob-mkt-btn");o&&o.addEventListener("click",function(){var e=t.querySelector("aside");e&&(e.classList.contains("hidden")?(e.classList.remove("hidden"),e.style.cssText="position:fixed;inset:0;z-index:200;width:100%;background:#0b1426;display:flex;flex-direction:column;"):(e.classList.add("hidden"),e.style.cssText=""))}),x(t,"[data-sym]","click",(e,a)=>{T("trade",{symbol:a.dataset.sym,type:a.dataset.stype||i("type")})}),x(t,"[data-tf]","click",(e,a)=>{c("tf",a.dataset.tf),localStorage.setItem("vp_tf",a.dataset.tf),T("trade",{symbol:i("symbol"),type:i("type"),tf:a.dataset.tf})}),x(t,"[data-type-tab]","click",async(e,a)=>{c("type",a.dataset.typeTab),localStorage.setItem("vp_type",a.dataset.typeTab);const s=await b(`/markets.php?type=${a.dataset.typeTab}&lite=1&with_quotes=1`,{timeout:6e3}).catch(()=>null);s?.items&&O(t,s.items),v("[data-type-tab]",t).forEach(l=>l.classList.toggle("bg-accent/20",l===a)),v("[data-type-tab]",t).forEach(l=>l.classList.toggle("text-accent",l===a))}),x(t,"[data-side]","click",(e,a)=>Y(a.dataset.side,t)),x(t,"[data-otype]","click",(e,a)=>{c("orderType",a.dataset.otype),v("[data-otype]",t).forEach(s=>{s.classList.toggle("bg-accent/15",s===a),s.classList.toggle("text-accent",s===a)})}),x(t,"[data-close]","click",async(e,a)=>{await b("/trade/close_position.php",{method:"POST",body:{position_id:a.dataset.close},timeout:8e3}).catch(()=>null),M(t)}),d("#inp-lev",t)?.addEventListener("input",e=>{const a=e.target.value;c("leverage",Number(a)),d("#lev-val",t).textContent=a+"x",$(t)}),d("#inp-amount",t)?.addEventListener("input",e=>{c("amount",Number(e.target.value)),$(t)}),d("#sym-search",t)?.addEventListener("input",e=>{const a=e.target.value.toLowerCase();v(".symbol-row",t).forEach(s=>s.style.display=s.dataset.sym.toLowerCase().includes(a)?"":"none")})}async function Y(t,o){const e=i("activeQuote")||{};if(e.price)try{await b("/trade/place_order.php",{method:"POST",body:{symbol:i("symbol"),type:i("type"),market:i("market"),side:t,order_type:i("orderType"),amount:i("amount"),leverage:i("leverage"),price:e.price},timeout:1e4});const a=await b("/trade/portfolio.php",{timeout:5e3}).catch(()=>null);a?.positions&&q(o,a.positions)}catch(a){console.error("Order failed:",a)}}export{W as cleanup,K as mount,V as render};
