import{s as u,g as r,a as y,e as n,i as M,p as C,b as k,c as $,_,d as w}from"./main-DTI-JlRE.js";let p=null,m=null;const I=3e3;function T(e,a,t,s){g();const o=`/api/stream/sse.php?symbols=${encodeURIComponent(e.join(","))}&type=${encodeURIComponent(a)}`;return p=new EventSource(o),p.onmessage=c=>{try{const l=JSON.parse(c.data);t&&t(l)}catch{}},p.onerror=()=>{N(e,a,t)},g}function N(e,a,t,s){g(),m=setTimeout(()=>T(e,a,t),I)}function g(){p&&(p.close(),p=null),m&&(clearTimeout(m),m=null)}let v=null,x=null;function P(e){e.symbol&&u("symbol",e.symbol.toUpperCase()),e.type&&u("type",e.type),e.tf&&u("tf",e.tf);const a=r("symbol"),t=r("type"),s=r("tf");return window.innerWidth<768?O(a,t,s):D(a,t,s)}function D(e,a,t){return`
    <div class="grid grid-cols-[280px_1fr_320px] gap-4 h-[calc(100vh-120px)] animate-fade-in">
      <!-- Watchlist -->
      <aside class="card overflow-hidden flex flex-col">
        <div class="p-3 border-b border-line space-y-2">
          <div class="flex gap-1 overflow-x-auto pb-1" id="market-tabs"></div>
          <div class="relative">
            <input type="search" class="input text-xs pl-8" placeholder="Search symbols" id="market-search" />
            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted">${M.search}</span>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-2 space-y-1" id="watchlist"></div>
      </aside>

      <!-- Chart -->
      <div class="card overflow-hidden flex flex-col">
        <div class="flex items-center justify-between p-3 border-b border-line">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-accent/30 to-green/20 grid place-items-center text-[10px] font-black" id="chart-logo">${n(e.slice(0,3))}</div>
            <div>
              <strong class="text-sm" id="chart-symbol">${n(e)}</strong>
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

      <!-- Order Ticket -->
      <aside class="card overflow-hidden flex flex-col">
        <div class="p-3 border-b border-line">
          <h3 class="font-semibold text-sm">Order Ticket</h3>
          <p class="text-[11px] text-muted">${n(e)} - ${n(a.toUpperCase())}</p>
        </div>
        <div class="flex-1 p-3 space-y-3" id="order-panel">
          ${U()}
        </div>
      </aside>
    </div>`}function O(e,a,t){return`
    <div class="space-y-3 animate-fade-in -mx-4 -mt-4">
      <!-- Price Header -->
      <div class="flex items-center justify-between px-4 py-3 bg-panel border-b border-line">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-accent/30 to-green/20 grid place-items-center text-[10px] font-black">${n(e.slice(0,3))}</div>
          <div>
            <strong class="text-sm" id="chart-symbol">${n(e)}</strong>
            <div class="flex items-center gap-2"><span class="text-sm font-mono font-bold" id="chart-price">--</span><span class="text-[11px]" id="chart-change">+0.00%</span></div>
          </div>
        </div>
        <div class="flex gap-1 overflow-x-auto" id="tf-buttons">
          ${["1m","5m","15m","1h"].map(s=>`<button class="px-2 py-1 text-[10px] rounded border ${s===t?"border-accent bg-accent-soft text-accent":"border-line text-muted"}" data-tf="${s}">${s}</button>`).join("")}
        </div>
      </div>

      <!-- Chart -->
      <div class="relative h-[55vh] bg-panel" id="chart-container">
        <div class="absolute inset-0 grid place-items-center"><div class="skeleton w-full h-full"></div></div>
      </div>

      <!-- Buy/Sell -->
      <div class="grid grid-cols-2 gap-3 px-4">
        <button class="btn bg-red text-white font-bold py-3 rounded-lg" data-side="SELL">Sell ${n(e)}</button>
        <button class="btn bg-green text-white font-bold py-3 rounded-lg" data-side="BUY">Buy ${n(e)}</button>
      </div>

      <!-- Positions -->
      <div class="px-4 pb-24" id="trade-positions">
        <p class="text-muted text-xs text-center py-4">Loading positions...</p>
      </div>
    </div>`}function U(){const e=r("orderType"),a=r("amount"),t=r("leverage");return`
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
    </div>`}function B(e,a){L(e)}function W(){v&&(v.remove(),v=null),x&&(x(),x=null),g()}async function L(e){const a=r("symbol"),t=r("type"),[s,o,c]=await Promise.all([y(`/markets.php?type=${t}&lite=1&with_quotes=1`,{timeout:8e3}).catch(()=>null),y(`/quotes.php?symbol=${a}&type=${t}&purpose=focus`,{timeout:5e3}).catch(()=>null),y(`/trade/candles.php?symbol=${a}&type=${t}&tf=${r("tf")}&limit=180`,{timeout:1e4}).catch(()=>null)]);o&&o.items&&o.items[0]&&S(e,o.items[0]),s&&s.items&&R(e,s.items),c&&c.items&&j(e,c.items),x=T([a],t,h=>{const b=h.find(f=>f.symbol===a);b&&S(e,b)}),q(e)}function S(e,a){const t=e.querySelector("#chart-price"),s=e.querySelector("#chart-change");if(t&&(t.textContent=C(a.price,a.type||r("type"))),s){const o=Number(a.change_pct||0);s.textContent=k(o),s.className=`text-xs ${o>=0?"text-green":"text-red"}`}u("activeQuote",a)}function R(e,a){const t=e.querySelector("#watchlist");t&&(t.innerHTML=a.slice(0,30).map(s=>`<button class="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-colors ${s.symbol===r("symbol")?"bg-accent-soft border border-accent/40":"hover:bg-panel-2 border border-transparent"}" data-watch="${$(s.symbol)}" data-type="${$(s.type||r("type"))}">
      <div class="w-7 h-7 rounded-lg bg-panel-2 grid place-items-center text-[9px] font-black">${n((s.symbol||"").slice(0,3))}</div>
      <div class="flex-1 min-w-0"><div class="font-semibold truncate">${n(s.symbol)}</div><div class="text-[10px] text-muted truncate">${n(s.name||"")}</div></div>
      <div class="text-right"><div class="font-mono">${C(s.price||s.q_price||0,s.type)}</div><div class="${Number(s.change_pct||s.q_change||0)>=0?"text-green":"text-red"}">${k(s.change_pct||s.q_change||0)}</div></div>
    </button>`).join(""))}async function j(e,a){const t=e.querySelector("#chart-container");if(!t)return;const{createChart:s,CandlestickSeries:o,HistogramSeries:c}=await _(async()=>{const{createChart:i,CandlestickSeries:d,HistogramSeries:E}=await import("./chart-Bk8T08OE.js");return{createChart:i,CandlestickSeries:d,HistogramSeries:E}},[]);t.innerHTML="";const l=s(t,{layout:{background:{color:"#071126"},textColor:"#8ba1cf"},grid:{vertLines:{color:"rgba(129,160,220,0.05)"},horzLines:{color:"rgba(129,160,220,0.05)"}},crosshair:{mode:0,vertLine:{color:"rgba(93,124,255,0.4)"},horzLine:{color:"rgba(93,124,255,0.4)"}},timeScale:{timeVisible:!0,secondsVisible:!1,borderColor:"rgba(129,160,220,0.1)"},rightPriceScale:{borderColor:"rgba(129,160,220,0.1)"},width:t.clientWidth,height:t.clientHeight}),h=l.addSeries(o,{upColor:"#24d28d",downColor:"#ff5c7c",borderUpColor:"#24d28d",borderDownColor:"#ff5c7c",wickUpColor:"#24d28d",wickDownColor:"#ff5c7c"}),b=l.addSeries(c,{priceFormat:{type:"volume"},priceScaleId:"vol"});l.priceScale("vol").applyOptions({scaleMargins:{top:.85,bottom:0}});const f=a.map(i=>({time:Number(i.time||i.t),open:Number(i.open||i.o),high:Number(i.high||i.h),low:Number(i.low||i.l),close:Number(i.close||i.c)})).filter(i=>i.time>0&&i.open>0);h.setData(f),b.setData(f.map(i=>({time:i.time,value:Number(a.find(d=>(d.time||d.t)==i.time)?.volume||a.find(d=>(d.time||d.t)==i.time)?.v||0),color:i.close>=i.open?"rgba(36,210,141,0.3)":"rgba(255,92,124,0.25)"}))),l.timeScale().fitContent(),v=l,new ResizeObserver(()=>{l.applyOptions({width:t.clientWidth,height:t.clientHeight})}).observe(t)}function q(e){w(e,"[data-watch]","click",(a,t)=>{const{navigate:s}=_(()=>import("./main-DTI-JlRE.js").then(o=>o.r),[]);s("trade",{symbol:t.dataset.watch,type:t.dataset.type||r("type")})}),w(e,"[data-tf]","click",(a,t)=>{u("tf",t.dataset.tf),localStorage.setItem("vp_tf",t.dataset.tf),L(e)}),w(e,"[data-side]","click",(a,t)=>{console.log("Order:",t.dataset.side,r("symbol"))})}export{W as cleanup,B as mount,P as render};
