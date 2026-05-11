import{s as m,g as l,a as x,i as E,e as d,p as C,b as T,c as $,_,d as y}from"./main-uNfiIqMk.js";let u=null,v=null;const I=3e3;function M(e,a,t,s){if(b(),!e||!e.length)return b;const i=`/api/stream/sse.php?symbols=${encodeURIComponent(e.join(","))}&type=${encodeURIComponent(a)}`;try{u=new EventSource(i)}catch{return w(e,a,t),b}let r=0;u.onmessage=n=>{try{r=0;const c=JSON.parse(n.data);t&&t(c)}catch{}},u.onerror=()=>{r++,r>=3&&(console.warn("SSE failed, switching to HTTP polling"),b(),w(e,a,t))};const p=setTimeout(()=>{u&&u.readyState!==EventSource.OPEN&&(b(),w(e,a,t))},5e3);return()=>{clearTimeout(p),b()}}function w(e,a,t){k();const s=async()=>{try{const i=`/api/quotes.php?symbols=${encodeURIComponent(e.join(","))}&type=${encodeURIComponent(a)}&visible=1&fresh=1`,r=await fetch(i,{credentials:"same-origin"});if(r.ok){const p=await r.json();p&&p.items&&t&&t(p.items)}}catch{}v=setTimeout(s,I)};s()}function k(){v&&(clearTimeout(v),v=null)}function b(){u&&(u.close(),u=null),k()}let h=null,g=null;function U(e){e.symbol&&m("symbol",e.symbol.toUpperCase()),e.type&&m("type",e.type),e.tf&&m("tf",e.tf);const a=l("symbol"),t=l("type"),s=l("tf");return D(a,t,s)}function D(e,a,t){return`
    <div class="flex flex-col lg:grid lg:grid-cols-[280px_1fr_320px] gap-4 lg:h-[calc(100vh-120px)] animate-fade-in">
      <!-- Watchlist -->
      <aside class="card overflow-hidden hidden lg:flex flex-col">
        <div class="p-3 border-b border-line space-y-2">
          <div class="flex gap-1 overflow-x-auto pb-1" id="market-tabs"></div>
          <div class="relative">
            <input type="search" class="input text-xs pl-8" placeholder="Search symbols" id="market-search" />
            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted">${E.search}</span>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-2 space-y-1" id="watchlist"></div>
      </aside>

      <!-- Chart -->
      <div class="card overflow-hidden flex flex-col">
        <div class="flex items-center justify-between p-3 border-b border-line">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-accent/30 to-green/20 grid place-items-center text-[10px] font-black" id="chart-logo">${d(e.slice(0,3))}</div>
            <div>
              <strong class="text-sm" id="chart-symbol">${d(e)}</strong>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-base font-mono font-bold" id="chart-price">--</span>
                <span class="text-xs" id="chart-change">+0.00%</span>
              </div>
            </div>
          </div>
          <div class="flex gap-1" id="tf-buttons">
            ${["1m","5m","15m","30m","1h"].map(s=>`<button class="px-2 py-1 text-[11px] rounded-md border ${s===t?"border-accent bg-accent-soft text-accent":"border-line text-muted hover:text-text"}" data-tf="${s}">${s}</button>`).join("")}
          </div>
        </div>
        <div class="flex-1 relative min-h-[300px]" id="chart-container">
          <div class="absolute inset-0 grid place-items-center"><div class="skeleton w-full h-full rounded"></div></div>
        </div>
      </div>

      <!-- Mobile Buy/Sell (visible only on mobile) -->
      <div class="grid grid-cols-2 gap-3 p-4 lg:hidden">
        <button class="btn bg-red text-white font-bold py-3 rounded-lg" data-side="SELL">Sell ${d(e)}</button>
        <button class="btn bg-green text-white font-bold py-3 rounded-lg" data-side="BUY">Buy ${d(e)}</button>
      </div>

      <!-- Order Ticket -->
      <aside class="card overflow-hidden hidden lg:flex flex-col">
        <div class="p-3 border-b border-line">
          <h3 class="font-semibold text-sm">Order Ticket</h3>
          <p class="text-[11px] text-muted">${d(e)} - ${d(a.toUpperCase())}</p>
        </div>
        <div class="flex-1 p-3 space-y-3" id="order-panel">
          ${N()}
        </div>
      </aside>
    </div>`}function N(){const e=l("orderType"),a=l("amount"),t=l("leverage");return`
    <div class="flex rounded-lg overflow-hidden border border-line">
      <button class="flex-1 py-2 text-xs font-semibold ${e==="MARKET"?"bg-accent-soft text-accent":"text-muted"}" data-order-type="MARKET">Market</button>
      <button class="flex-1 py-2 text-xs font-semibold ${e==="LIMIT"?"bg-accent-soft text-accent":"text-muted"}" data-order-type="LIMIT">Limit</button>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <button class="btn bg-red/90 text-white font-bold py-3" data-side="SELL">SELL</button>
      <button class="btn bg-green/90 text-white font-bold py-3" data-side="BUY">BUY</button>
    </div>
    <label class="block"><span class="text-[11px] text-muted">Amount (USDT)</span><input type="number" class="input mt-1" value="${a}" id="order-amount" /></label>
    <label class="block"><span class="text-[11px] text-muted">Leverage</span><input type="range" min="1" max="100" value="${t}" class="w-full mt-1" id="order-leverage" /><span class="text-xs text-accent" id="lev-label">${t}x</span></label>
    <div class="pt-2 border-t border-line text-[11px] text-muted space-y-1">
      <div class="flex justify-between"><span>Est. Units</span><span id="est-units">--</span></div>
      <div class="flex justify-between"><span>Available</span><span id="wallet-avail">--</span></div>
    </div>`}function j(e,a){L(e)}function H(){h&&(h.remove(),h=null),g&&(g(),g=null),b()}async function L(e){const a=l("symbol"),t=l("type"),[s,i,r]=await Promise.all([x(`/markets.php?type=${t}&lite=1&with_quotes=1`,{timeout:8e3}).catch(()=>null),x(`/quotes.php?symbol=${a}&type=${t}&purpose=focus`,{timeout:5e3}).catch(()=>null),x(`/trade/candles.php?symbol=${a}&type=${t}&tf=${l("tf")}&limit=180`,{timeout:1e4}).catch(()=>null)]);i&&i.items&&i.items[0]&&S(e,i.items[0]),s&&s.items&&O(e,s.items);try{r&&r.items&&await q(e,r.items)}catch(n){console.error("Chart init failed:",n);const c=e.querySelector("#chart-container");c&&(c.innerHTML='<p class="text-muted text-sm text-center p-8">Chart temporarily unavailable</p>')}g=M([a],t,n=>{const c=n.find(o=>o.symbol===a);c&&S(e,c)}),P(e)}function S(e,a){const t=e.querySelector("#chart-price"),s=e.querySelector("#chart-change");if(t&&(t.textContent=C(a.price,a.type||l("type"))),s){const i=Number(a.change_pct||0);s.textContent=T(i),s.className=`text-xs ${i>=0?"text-green":"text-red"}`}m("activeQuote",a)}function O(e,a){const t=e.querySelector("#watchlist");t&&(t.innerHTML=a.slice(0,30).map(s=>`<button class="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-colors ${s.symbol===l("symbol")?"bg-accent-soft border border-accent/40":"hover:bg-panel-2 border border-transparent"}" data-watch="${$(s.symbol)}" data-type="${$(s.type||l("type"))}">
      <div class="w-7 h-7 rounded-lg bg-panel-2 grid place-items-center text-[9px] font-black">${d((s.symbol||"").slice(0,3))}</div>
      <div class="flex-1 min-w-0"><div class="font-semibold truncate">${d(s.symbol)}</div><div class="text-[10px] text-muted truncate">${d(s.name||"")}</div></div>
      <div class="text-right"><div class="font-mono">${C(s.price||s.q_price||0,s.type)}</div><div class="${Number(s.change_pct||s.q_change||0)>=0?"text-green":"text-red"}">${T(s.change_pct||s.q_change||0)}</div></div>
    </button>`).join(""))}async function q(e,a){const t=e.querySelector("#chart-container");if(!t)return;const{createChart:s}=await _(async()=>{const{createChart:o}=await import("./chart-Bk8T08OE.js");return{createChart:o}},[]);t.innerHTML="";const i=s(t,{layout:{background:{color:"#071126"},textColor:"#8ba1cf"},grid:{vertLines:{color:"rgba(129,160,220,0.05)"},horzLines:{color:"rgba(129,160,220,0.05)"}},crosshair:{mode:0,vertLine:{color:"rgba(93,124,255,0.4)"},horzLine:{color:"rgba(93,124,255,0.4)"}},timeScale:{timeVisible:!0,secondsVisible:!1,borderColor:"rgba(129,160,220,0.1)"},rightPriceScale:{borderColor:"rgba(129,160,220,0.1)"},width:t.clientWidth,height:t.clientHeight}),r=i.addCandlestickSeries({upColor:"#24d28d",downColor:"#ff5c7c",borderUpColor:"#24d28d",borderDownColor:"#ff5c7c",wickUpColor:"#24d28d",wickDownColor:"#ff5c7c"}),p=i.addHistogramSeries({priceFormat:{type:"volume"},priceScaleId:"vol"});i.priceScale("vol").applyOptions({scaleMargins:{top:.85,bottom:0}});const n=a.map(o=>({time:Number(o.time||o.t),open:Number(o.open||o.o),high:Number(o.high||o.h),low:Number(o.low||o.l),close:Number(o.close||o.c)})).filter(o=>o.time>0&&o.open>0);r.setData(n),p.setData(n.map(o=>({time:o.time,value:Number(a.find(f=>(f.time||f.t)==o.time)?.volume||a.find(f=>(f.time||f.t)==o.time)?.v||0),color:o.close>=o.open?"rgba(36,210,141,0.3)":"rgba(255,92,124,0.25)"}))),i.timeScale().fitContent(),h=i,new ResizeObserver(()=>{i.applyOptions({width:t.clientWidth,height:t.clientHeight})}).observe(t)}function P(e){y(e,"[data-watch]","click",(a,t)=>{_(async()=>{const{navigate:s}=await import("./main-uNfiIqMk.js").then(i=>i.r);return{navigate:s}},[]).then(({navigate:s})=>{s("trade",{symbol:t.dataset.watch,type:t.dataset.type||l("type")})})}),y(e,"[data-tf]","click",(a,t)=>{m("tf",t.dataset.tf),localStorage.setItem("vp_tf",t.dataset.tf),L(e)}),y(e,"[data-side]","click",(a,t)=>{console.log("Order:",t.dataset.side,l("symbol"))})}export{H as cleanup,j as mount,U as render};
