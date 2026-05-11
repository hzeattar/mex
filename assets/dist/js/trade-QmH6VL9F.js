import{s as p,g as i,i as q,e as m,a as f,$ as r,p as y,b as N,c as T,m as P,_ as A,d as v,n as E,f as g}from"./main-Dfs15V3a.js";let b=null,w=null;const U=3e3;function B(t,a,e,o){if(x(),!t||!t.length)return x;const s=`/api/stream/sse.php?symbols=${encodeURIComponent(t.join(","))}&type=${encodeURIComponent(a)}`;try{b=new EventSource(s)}catch{return S(t,a,e),x}let l=0;b.onmessage=u=>{try{l=0;const c=JSON.parse(u.data);e&&e(c)}catch{}},b.onerror=()=>{l++,l>=3&&(console.warn("SSE failed, switching to HTTP polling"),x(),S(t,a,e))};const n=setTimeout(()=>{b&&b.readyState!==EventSource.OPEN&&(x(),S(t,a,e))},5e3);return()=>{clearTimeout(n),x()}}function S(t,a,e){O();const o=async()=>{try{const s=`/api/quotes.php?symbols=${encodeURIComponent(t.join(","))}&type=${encodeURIComponent(a)}&visible=1&fresh=1`,l=await fetch(s,{credentials:"same-origin"});if(l.ok){const n=await l.json();n&&n.items&&e&&e(n.items)}}catch{}w=setTimeout(o,U)};o()}function O(){w&&(clearTimeout(w),w=null)}function x(){b&&(b.close(),b=null),O()}let d=null,C=null,L=null,$=null;const R=[{key:"favorites",label:"Favorites"},{key:"crypto",label:"Crypto"},{key:"forex",label:"Forex"},{key:"stocks",label:"Stocks"},{key:"commodities",label:"Metals"},{key:"futures",label:"Futures"},{key:"arab",label:"Arab"}],D=["1m","5m","15m","30m","1h","4h","1d"];function K(t){t.symbol&&p("symbol",t.symbol.toUpperCase()),t.type&&p("type",t.type),t.tf&&p("tf",t.tf);const a=i("symbol"),e=i("type"),o=i("tf");return`<div class="flex flex-col lg:flex-row h-full mobile-pad">
    <!-- Symbol Sidebar (desktop) -->
    <aside class="hidden lg:flex flex-col w-[240px] border-r border-line bg-surface shrink-0 overflow-hidden">
      <div class="p-2 border-b border-line">
        <div class="relative"><input type="search" class="input pl-7" placeholder="Search..." id="sym-search" /><span class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted">${q.search}</span></div>
      </div>
      <div class="flex gap-1 p-2 overflow-x-auto border-b border-line" id="type-tabs">
        ${R.map(s=>`<button class="btn-xs ${s.key===e?"bg-accent/20 text-accent border-accent/40":"text-muted border-line"} border rounded-md whitespace-nowrap" data-type-tab="${s.key}">${s.label}</button>`).join("")}
      </div>
      <div class="flex-1 overflow-auto" id="symbol-list"><div class="p-4"><div class="loading-spinner mx-auto"></div></div></div>
    </aside>

    <!-- Main Area -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Symbol Header -->
      <div class="flex items-center justify-between px-3 lg:px-4 h-10 border-b border-line bg-surface shrink-0">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-md bg-accent/20 grid place-items-center text-[9px] font-black text-accent">${m(a.slice(0,3))}</div>
          <strong class="text-sm" id="sym-name">${m(a)}</strong>
          <span class="text-sm font-mono font-bold" id="live-price">--</span>
          <span class="text-xs" id="live-change">+0.00%</span>
          <span class="w-2 h-2 rounded-full bg-muted" id="conn-dot" title="Disconnected"></span>
        </div>
        <div class="flex gap-0.5" id="tf-bar">
          ${D.map(s=>`<button class="px-1.5 py-0.5 text-[10px] rounded ${s===o?"bg-accent/20 text-accent":"text-muted hover:text-text"}" data-tf="${s}">${s}</button>`).join("")}
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
        <div class="text-[10px] text-muted">${m(a)} - ${m(e.toUpperCase())}</div>
      </div>
      <div class="p-3 space-y-3" id="order-body">
        ${F()}
      </div>
    </aside>
  </div>`}function F(){const t=i("orderType"),a=i("amount"),e=i("leverage"),o=i("activeQuote")||{},s=Number(o.price||0);return`
    <div class="flex rounded overflow-hidden border border-line">
      <button class="flex-1 py-1.5 text-[11px] font-semibold ${t==="MARKET"?"bg-accent/15 text-accent":"text-muted"}" data-otype="MARKET">Market</button>
      <button class="flex-1 py-1.5 text-[11px] font-semibold ${t==="LIMIT"?"bg-accent/15 text-accent":"text-muted"}" data-otype="LIMIT">Limit</button>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <button class="btn-sell py-3 text-sm font-bold" data-side="SELL"><small class="block text-[9px] opacity-70">Sell</small><span id="sell-price">${s>0?y(s,i("type")):"--"}</span></button>
      <button class="btn-buy py-3 text-sm font-bold" data-side="BUY"><small class="block text-[9px] opacity-70">Buy</small><span id="buy-price">${s>0?y(s,i("type")):"--"}</span></button>
    </div>
    <div class="text-center"><span class="spread-display" id="spread-val">Spread: --</span></div>
    <label class="block"><span class="text-[10px] text-muted">Amount (USDT)</span><input type="number" class="input mt-1" value="${a}" id="inp-amount" /></label>
    <label class="block"><span class="text-[10px] text-muted">Leverage: <strong id="lev-val">${e}x</strong></span><input type="range" min="1" max="100" value="${e}" class="w-full mt-1 accent-accent" id="inp-lev" /></label>
    <div class="space-y-1 text-[10px] text-muted pt-2 border-t border-line">
      <div class="flex justify-between"><span>Est. Units</span><span id="est-units">--</span></div>
      <div class="flex justify-between"><span>Available</span><span id="avail-bal">--</span></div>
    </div>`}function W(t){M(t)}function J(){d&&(d.remove(),d=null,C=null,L=null),$&&($(),$=null),x()}async function M(t){const a=i("symbol"),e=i("type"),o=i("tf"),[s,l,n,u]=await Promise.all([f(`/markets.php?type=${e}&lite=1&with_quotes=1`,{timeout:8e3}).catch(()=>null),f(`/quotes.php?symbol=${a}&type=${e}&purpose=focus`,{timeout:5e3}).catch(()=>null),f(`/trade/candles.php?symbol=${a}&type=${e}&tf=${o}&limit=200`,{timeout:1e4}).catch(()=>null),f("/trade/portfolio.php",{timeout:6e3}).catch(()=>null)]);l?.items?.[0]&&_(t,l.items[0]),s?.items&&I(t,s.items),u?.positions&&j(t,u.positions),k(t);try{n?.items?.length&&await z(t,n.items)}catch(c){console.error("Chart:",c),r("#chart-box",t).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart unavailable</p>'}$=B([a],e,c=>{const h=c.find(H=>H.symbol===a);h&&_(t,h),r("#conn-dot",t)?.classList.replace("bg-muted","bg-buy")}),Y(t)}function _(t,a){const e=Number(a.price||0),o=Number(a.change_pct||0),s=i("type");p("activeQuote",a);const l=r("#live-price",t),n=r("#live-change",t);l&&(l.textContent=e>0?y(e,s):"--"),n&&(n.textContent=N(o),n.className=`text-xs ${o>=0?"text-buy":"text-sell"}`),r("#sell-price",t)&&(r("#sell-price",t).textContent=y(e,s)),r("#buy-price",t)&&(r("#buy-price",t).textContent=y(e*1.0001,s)),k(t)}function k(t){const a=i("activeQuote")||{},e=Number(a.price||0),o=Number(r("#inp-amount",t)?.value||i("amount")),s=Number(r("#inp-lev",t)?.value||i("leverage")),l=i("wallet")||{},n=i("mode")==="real"?l.real||{}:l.demo||{},u=e>0?o*s/e:0,c=r("#est-units",t);c&&(c.textContent=u>0?u.toFixed(4):"--");const h=r("#avail-bal",t);h&&(h.textContent=`${P(n.available||0)} ${n.currency||""}`)}function I(t,a){const e=r("#symbol-list",t);if(!e)return;const o=i("symbol");e.innerHTML=a.slice(0,40).map(s=>{const l=Number(s.price||s.q_price||0),n=Number(s.change_pct||s.q_change||0);return`<div class="symbol-row ${s.symbol===o?"active":""}" data-sym="${T(s.symbol)}" data-stype="${T(s.type||i("type"))}">
      <div class="w-6 h-6 rounded bg-panel grid place-items-center text-[8px] font-black">${m(s.symbol.slice(0,3))}</div>
      <div class="flex-1 min-w-0"><div class="font-semibold text-[11px] truncate">${m(s.symbol)}</div><div class="text-[9px] text-muted truncate">${m(s.name||"")}</div></div>
      <div class="text-right shrink-0"><div class="text-[11px] font-mono">${l>0?y(l,s.type):"--"}</div><div class="text-[9px] ${n>=0?"text-buy":"text-sell"}">${N(n)}</div></div>
    </div>`}).join("")}function j(t,a){const e=r("#positions-body",t),o=r("#pos-count",t);if(o&&(o.textContent=`(${a.length})`),!!e){if(!a.length){e.innerHTML='<p class="text-muted text-[11px] text-center py-3">No open positions</p>';return}e.innerHTML=`<table class="w-full text-[11px]"><thead class="text-[9px] text-muted uppercase"><tr><th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-right py-1">Entry</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1"></th></tr></thead><tbody>${a.slice(0,10).map(s=>{const l=Number(s.pnl||s.unrealized_pnl||0);return`<tr class="border-t border-line/50 hover:bg-panel/50"><td class="px-3 py-1.5 font-semibold">${m(s.symbol)}</td><td><span class="badge-${s.side==="BUY"?"buy":"sell"}">${s.side}</span></td><td class="text-right font-mono">${y(s.entry_price||s.open_price)}</td><td class="text-right font-mono ${l>=0?"text-buy":"text-sell"}">${P(l)}</td><td class="text-right px-3"><button class="btn-xs btn-ghost text-sell" data-close="${s.id}">Close</button></td></tr>`}).join("")}</tbody></table>`}}async function z(t,a){const e=r("#chart-box",t);if(!e)return;const{createChart:o}=await A(async()=>{const{createChart:l}=await import("./chart-Bk8T08OE.js");return{createChart:l}},[]);e.innerHTML="",d=o(e,{layout:{background:{color:"#060A14"},textColor:"#8ba1cf",fontSize:11},grid:{vertLines:{color:"rgba(129,160,220,0.04)"},horzLines:{color:"rgba(129,160,220,0.04)"}},crosshair:{mode:0,vertLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"},horzLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"}},timeScale:{timeVisible:!0,secondsVisible:!1,borderColor:"rgba(129,160,220,0.08)"},rightPriceScale:{borderColor:"rgba(129,160,220,0.08)"},width:e.clientWidth,height:e.clientHeight}),C=d.addCandlestickSeries({upColor:"#00c087",downColor:"#f6465d",borderUpColor:"#00c087",borderDownColor:"#f6465d",wickUpColor:"#00c087",wickDownColor:"#f6465d"}),L=d.addHistogramSeries({priceFormat:{type:"volume"},priceScaleId:"vol"}),d.priceScale("vol").applyOptions({scaleMargins:{top:.85,bottom:0}});const s=a.map(l=>({time:Number(l.time||l.t),open:Number(l.open||l.o),high:Number(l.high||l.h),low:Number(l.low||l.l),close:Number(l.close||l.c)})).filter(l=>l.time>0&&l.open>0);C.setData(s),L.setData(s.map(l=>({time:l.time,value:Number(a.find(n=>(n.time||n.t)==l.time)?.volume||a.find(n=>(n.time||n.t)==l.time)?.v||0),color:l.close>=l.open?"rgba(0,192,135,0.25)":"rgba(246,70,93,0.2)"}))),d.timeScale().fitContent(),new ResizeObserver(()=>d?.applyOptions({width:e.clientWidth,height:e.clientHeight})).observe(e)}function Y(t){v(t,"[data-sym]","click",(a,e)=>{E("trade",{symbol:e.dataset.sym,type:e.dataset.stype||i("type")})}),v(t,"[data-tf]","click",(a,e)=>{p("tf",e.dataset.tf),localStorage.setItem("vp_tf",e.dataset.tf),E("trade",{symbol:i("symbol"),type:i("type"),tf:e.dataset.tf})}),v(t,"[data-type-tab]","click",async(a,e)=>{p("type",e.dataset.typeTab),localStorage.setItem("vp_type",e.dataset.typeTab);const o=await f(`/markets.php?type=${e.dataset.typeTab}&lite=1&with_quotes=1`,{timeout:6e3}).catch(()=>null);o?.items&&I(t,o.items),g("[data-type-tab]",t).forEach(s=>s.classList.toggle("bg-accent/20",s===e)),g("[data-type-tab]",t).forEach(s=>s.classList.toggle("text-accent",s===e))}),v(t,"[data-side]","click",(a,e)=>Q(e.dataset.side,t)),v(t,"[data-otype]","click",(a,e)=>{p("orderType",e.dataset.otype),g("[data-otype]",t).forEach(o=>{o.classList.toggle("bg-accent/15",o===e),o.classList.toggle("text-accent",o===e)})}),v(t,"[data-close]","click",async(a,e)=>{await f("/trade/close_position.php",{method:"POST",body:{position_id:e.dataset.close},timeout:8e3}).catch(()=>null),M(t)}),r("#inp-lev",t)?.addEventListener("input",a=>{const e=a.target.value;p("leverage",Number(e)),r("#lev-val",t).textContent=e+"x",k(t)}),r("#inp-amount",t)?.addEventListener("input",a=>{p("amount",Number(a.target.value)),k(t)}),r("#sym-search",t)?.addEventListener("input",a=>{const e=a.target.value.toLowerCase();g(".symbol-row",t).forEach(o=>o.style.display=o.dataset.sym.toLowerCase().includes(e)?"":"none")})}async function Q(t,a){const e=i("activeQuote")||{};if(e.price)try{await f("/trade/place_order.php",{method:"POST",body:{symbol:i("symbol"),type:i("type"),market:i("market"),side:t,order_type:i("orderType"),amount:i("amount"),leverage:i("leverage"),price:e.price},timeout:1e4});const o=await f("/trade/portfolio.php",{timeout:5e3}).catch(()=>null);o?.positions&&j(a,o.positions)}catch(o){console.error("Order failed:",o)}}export{J as cleanup,W as mount,K as render};
