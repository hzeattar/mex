import{s as f,g as r,i as U,e as v,a as h,$ as i,c as $,p as y,_ as V,b as I,d as g,m as M,f as m,n as j}from"./main-43dhkjcl.js";let O=null;const ee=2500;function te(e,s,t,l){return E(),!e||!e.length||se(e,s,t),E}function se(e,s,t){q();const l=async()=>{try{const a="/api/quotes.php?symbols="+encodeURIComponent(e.join(","))+"&type="+encodeURIComponent(s)+"&visible=1&fresh=1",o=await fetch(a,{credentials:"same-origin"});if(o.ok){const n=await o.json();n&&n.items&&t&&t(n.items)}}catch{}O=setTimeout(l,ee)};l()}function q(){O&&(clearTimeout(O),O=null)}function E(){q()}let b=null,T=null,D=null,k=null,C=null,_=null,u=null;const ae=[{key:"favorites",label:"Favorites"},{key:"crypto",label:"Crypto"},{key:"forex",label:"Forex"},{key:"stocks",label:"Stocks"},{key:"commodities",label:"Metals"},{key:"futures",label:"Futures"},{key:"arab",label:"Arab"}],oe=["1m","5m","15m","30m","1h","4h","1d"],z=new Set(["ada","amzn","apple","arab","avax","bnb","btc","crypto","doge","dot","eth","forex","future","googl","link","metal","microsoft","nvda","oil","sol","stock","tsla","usdc","xrp"]),le={BTCUSDT:"btc",BTCUSD:"btc",ETHUSDT:"eth",ETHUSD:"eth",BNBUSDT:"bnb",SOLUSDT:"sol",XRPUSDT:"xrp",ADAUSDT:"ada",DOGEUSDT:"doge",DOTUSDT:"dot",AVAXUSDT:"avax",LINKUSDT:"link",USDCUSDT:"usdc",AAPL:"apple",APPLE:"apple",AMZN:"amzn",GOOGL:"googl",GOOGLE:"googl",MSFT:"microsoft",MICROSOFT:"microsoft",NVDA:"nvda",TSLA:"tsla",XAUUSD:"metal",XAGUSD:"metal",GOLD:"metal",USOIL:"oil",UKOIL:"oil"};function he(e){e.symbol&&f("symbol",e.symbol.toUpperCase()),e.type&&f("type",e.type),e.tf&&f("tf",e.tf);const s=r("symbol"),t=r("type"),l=r("tf");return`<div class="trade-terminal flex flex-col lg:flex-row h-full mobile-pad">
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
        ${ae.map(a=>`<button class="btn-xs ${a.key===t?"bg-accent/20 text-accent border-accent/40":"text-muted border-line"} border rounded-md whitespace-nowrap" data-type-tab="${a.key}">${a.label}</button>`).join("")}
      </div>
      <div class="flex-1 overflow-auto p-1" id="symbol-list"><div class="p-4"><div class="loading-spinner mx-auto"></div></div></div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div class="flex items-center justify-between px-2 lg:px-4 h-11 border-b border-line bg-surface shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <button class="lg:hidden w-8 h-8 grid place-items-center rounded border border-line text-muted shrink-0" id="mob-mkt-btn" aria-label="Open markets">${U.menu}</button>
          ${A(s,t,"w-7 h-7 rounded-md shrink-0")}
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <strong class="text-sm truncate" id="sym-name">${v(s)}</strong>
              <span class="w-2 h-2 rounded-full bg-muted shrink-0" id="conn-dot" title="Connecting"></span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold" id="live-price">--</span>
              <span class="text-[10px]" id="live-change">+0.00%</span>
            </div>
          </div>
        </div>
        <div class="flex gap-0.5 overflow-x-auto max-w-[46vw] lg:max-w-none" id="tf-bar">
          ${oe.map(a=>`<button class="px-1.5 py-1 text-[10px] rounded shrink-0 ${a===l?"bg-accent/20 text-accent":"text-muted hover:text-text"}" data-tf="${a}">${a}</button>`).join("")}
        </div>
      </div>

      <div class="flex-1 relative min-h-[260px] bg-bg" id="chart-box">
        <div class="absolute inset-0 flex items-center justify-center"><div class="text-center"><div class="loading-spinner mx-auto"></div><p class="text-[10px] text-muted mt-2">Loading live chart...</p></div></div>
      </div>

      <div class="lg:hidden grid grid-cols-2 gap-2 p-2 border-t border-line bg-surface shrink-0">
        <button class="btn-sell py-3" data-open-order="SELL">SELL</button>
        <button class="btn-buy py-3" data-open-order="BUY">BUY</button>
      </div>

      <div class="border-t border-line bg-surface max-h-[185px] lg:max-h-[180px] overflow-auto shrink-0" id="positions-section">
        <div class="flex items-center gap-3 px-3 h-8 border-b border-line sticky top-0 bg-surface z-10">
          <span class="text-[10px] font-semibold text-muted uppercase">Open Positions</span>
          <span class="text-[10px] text-muted" id="pos-count">(0)</span>
        </div>
        <div id="positions-body"><p class="text-muted text-[11px] text-center py-4">Loading...</p></div>
      </div>
    </div>

    <aside class="hidden lg:flex flex-col w-[300px] border-l border-line bg-surface shrink-0 overflow-auto">
      <div class="p-3 border-b border-line">
        <div class="text-xs font-semibold">Order Ticket</div>
        <div class="text-[10px] text-muted">${v(s)} - ${v(t.toUpperCase())}</div>
      </div>
      <div class="p-3 space-y-3" id="order-body">
        ${G()}
      </div>
    </aside>

    ${re(s,t)}
  </div>`}function G(){const e=r("orderType")||"MARKET",s=Number(r("amount")||100),t=Number(r("leverage")||10),l=r("market")||"spot",a=r("activeQuote")||{},o=Number(a.price||0);return`<div class="space-y-3" data-order-form>
    <div class="grid grid-cols-2 gap-2">
      <label class="block">
        <span class="text-[10px] text-muted">Trading type</span>
        <select class="input mt-1" data-market-type>
          <option value="spot" ${l==="spot"?"selected":""}>Spot</option>
          <option value="perp" ${l==="perp"?"selected":""}>Perpetual / Futures</option>
        </select>
      </label>
      <label class="block">
        <span class="text-[10px] text-muted">Order type</span>
        <select class="input mt-1" data-order-type>
          <option value="MARKET" ${e==="MARKET"?"selected":""}>Market</option>
          <option value="LIMIT" ${e==="LIMIT"?"selected":""}>Limit</option>
        </select>
      </label>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <button class="btn-sell py-3 text-sm font-bold" data-side="SELL"><small class="block text-[9px] opacity-70">Sell</small><span data-sell-price>${o>0?y(o,r("type")):"--"}</span></button>
      <button class="btn-buy py-3 text-sm font-bold" data-side="BUY"><small class="block text-[9px] opacity-70">Buy</small><span data-buy-price>${o>0?y(o*1.0001,r("type")):"--"}</span></button>
    </div>
    <div class="text-center"><span class="spread-display" data-spread-val>Spread: --</span></div>
    <label class="block">
      <span class="text-[10px] text-muted">Margin / Amount (USDT)</span>
      <input type="number" min="1" step="any" class="input mt-1" value="${$(String(s))}" data-amount />
    </label>
    <label class="block">
      <span class="text-[10px] text-muted">Leverage: <strong data-lev-val>${t}x</strong></span>
      <input type="range" min="1" max="100" value="${$(String(t))}" class="w-full mt-1 accent-accent" data-leverage />
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
    <div class="space-y-1 text-[10px] text-muted pt-2 border-t border-line">
      <div class="flex justify-between"><span>Est. Units</span><span data-est-units>--</span></div>
      <div class="flex justify-between"><span>Est. Notional</span><span data-est-notional>--</span></div>
      <div class="flex justify-between"><span>Available</span><span data-avail-bal>--</span></div>
    </div>
  </div>`}function re(e,s){return`<div class="fixed inset-0 z-[230] hidden lg:hidden" id="mobile-order-sheet">
    <div class="absolute inset-0 bg-black/65" data-close-order-sheet></div>
    <div class="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-auto rounded-t-2xl border border-line bg-surface shadow-2xl">
      <div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3">
        <div class="flex items-center gap-2 min-w-0">
          ${A(e,s,"w-8 h-8 rounded-lg shrink-0")}
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider text-muted" id="mobile-order-side-label">Order</div>
            <strong class="text-sm truncate">${v(e)}</strong>
          </div>
        </div>
        <button class="icon-btn icon-btn-sm" data-close-order-sheet aria-label="Close order">${U.close}</button>
      </div>
      <div class="p-4">
        ${G()}
        <button class="btn-primary w-full mt-4 py-3" id="mobile-submit-order" data-submit-order="BUY">Review & Place Order</button>
      </div>
    </div>
  </div>`}function ye(e){ne(e)}function ge(){C&&(C.disconnect(),C=null),b&&(b.remove(),b=null,T=null,D=null,u=null),k&&(k(),k=null),E(),document.body.classList.remove("trade-modal-open")}async function ne(e){const s=r("symbol"),t=r("type"),l=r("tf"),a=J(),[o,n,d,c]=await Promise.all([h(`/markets.php?type=${t}&lite=1&with_quotes=1`,{timeout:8e3}).catch(()=>null),h(`/quotes.php?symbol=${encodeURIComponent(s)}&type=${encodeURIComponent(t)}&purpose=focus&fresh=1`,{timeout:5e3}).catch(()=>null),h(`/trade/candles.php?symbol=${encodeURIComponent(s)}&type=${encodeURIComponent(t)}&tf=${encodeURIComponent(l)}&limit=120`,{timeout:8e3}).catch(()=>null),h("/trade/portfolio.php",{timeout:6e3}).catch(()=>null)]);o?.items&&X(e,o.items),n?.items?.[0]&&Q(e,n.items[0]),c?.positions&&P(e,c.positions),S(e),ce(e),K(e,o?.items||[]);try{await a,d?.items?.length?await de(e,d.items):i("#chart-box",e).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart data unavailable</p>'}catch(p){console.error("Chart:",p),i("#chart-box",e).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart unavailable</p>'}}function K(e,s){k&&(k(),k=null);const t=r("type"),l=r("symbol"),a=t==="crypto"?40:18,o=[...new Set([l,...s.slice(0,a).map(n=>String(n.symbol||"").toUpperCase()).filter(Boolean)])];k=te(o,t,n=>{ie(e,n);const d=n.find(p=>String(p.symbol||"").toUpperCase()===l);d&&Q(e,d);const c=i("#conn-dot",e);c&&(c.classList.remove("bg-muted","bg-sell"),c.classList.add("bg-buy"),c.title="Live")})}function Q(e,s){const t=Number(s.price||s.q_price||0),l=Number(s.change_pct||s.q_change||0),a=r("type");f("activeQuote",{...s,price:t,change_pct:l});const o=i("#live-price",e),n=i("#live-change",e);o&&(o.textContent=t>0?y(t,a):"--"),n&&(n.textContent=I(l),n.className=`text-[10px] ${l>=0?"text-buy":"text-sell"}`),g("[data-sell-price]",e).forEach(d=>{d.textContent=t>0?y(t,a):"--"}),g("[data-buy-price]",e).forEach(d=>{d.textContent=t>0?y(t*1.0001,a):"--"}),g("[data-spread-val]",e).forEach(d=>{d.textContent=t>0?`Spread: ${y(t*1e-4,a)}`:"Spread: --"}),S(e),me(t)}function S(e){const s=r("activeQuote")||{},t=Number(s.price||0),l=r("wallet")||{},a=r("mode")==="real"?l.real||{}:l.demo||{};g("[data-order-form]",e).forEach(o=>{const n=Number(i("[data-amount]",o)?.value||r("amount")||0),d=Number(i("[data-leverage]",o)?.value||r("leverage")||1),p=(i("[data-market-type]",o)?.value||r("market")||"spot")==="perp"?d:1,w=t>0?n*p/t:0,N=n*p,x=i("[data-lev-val]",o);x&&(x.textContent=`${d}x`);const L=i("[data-est-units]",o);L&&(L.textContent=w>0?w.toFixed(w>=10?3:6):"--");const R=i("[data-est-notional]",o);R&&(R.textContent=n>0?`${M(N)} USDT`:"--");const B=i("[data-avail-bal]",o);B&&(B.textContent=`${M(a.available||0)} ${a.currency||""}`)})}function X(e,s){const t=i("#symbol-list",e);if(!t)return;const l=r("symbol");t.innerHTML=s.slice(0,60).map(a=>{const o=String(a.symbol||"").toUpperCase(),n=a.type||r("type"),d=Number(a.price||a.q_price||0),c=Number(a.change_pct||a.q_change||0);return`<div class="symbol-row ${o===l?"active":""}" data-sym="${$(o)}" data-stype="${$(n)}">
      ${A(o,n,"w-7 h-7 rounded-md shrink-0")}
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-[11px] truncate">${v(o)}</div>
        <div class="text-[9px] text-muted truncate">${v(a.name||n)}</div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-[11px] font-mono" data-price-cell>${d>0?y(d,n):"--"}</div>
        <div class="text-[9px] ${c>=0?"text-buy":"text-sell"}" data-change-cell>${I(c)}</div>
      </div>
    </div>`}).join("")}function ie(e,s){s?.length&&s.forEach(t=>{const l=String(t.symbol||"").toUpperCase();if(!l)return;const a=g(".symbol-row",e).find(w=>w.dataset.sym===l);if(!a)return;const o=a.dataset.stype||r("type"),n=Number(t.price||t.q_price||0),d=Number(t.change_pct||t.q_change||0),c=i("[data-price-cell]",a),p=i("[data-change-cell]",a);c&&n>0&&(c.textContent=y(n,o)),p&&(p.textContent=I(d),p.className=`text-[9px] ${d>=0?"text-buy":"text-sell"}`)})}function P(e,s){const t=i("#positions-body",e),l=i("#pos-count",e);if(l&&(l.textContent=`(${s.length})`),!!t){if(!s.length){t.innerHTML='<p class="text-muted text-[11px] text-center py-3">No open positions</p>';return}t.innerHTML=`<div class="overflow-x-auto"><table class="min-w-[620px] lg:min-w-0 w-full text-[11px]">
    <thead class="text-[9px] text-muted uppercase"><tr>
      <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">Lev</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1"></th>
    </tr></thead>
    <tbody>${s.slice(0,12).map(a=>{const o=Number(a.pnl||a.unrealized_pnl||0),n=String(a.symbol||"").replace("@R@","");return`<tr class="border-t border-line/50 hover:bg-panel/50">
        <td class="px-3 py-1.5 font-semibold">${v(n)}</td>
        <td><span class="badge-${a.side==="BUY"?"buy":"sell"}">${v(a.side)}</span></td>
        <td class="text-muted">${v(a.market_type||"spot")}</td>
        <td class="text-right font-mono">${y(a.entry_price||a.open_price,a.asset_type||r("type"))}</td>
        <td class="text-right font-mono">${v(String(a.leverage||1))}x</td>
        <td class="text-right font-mono ${o>=0?"text-buy":"text-sell"}">${M(o)}</td>
        <td class="text-right px-3"><button class="btn-xs btn-ghost text-sell" data-close="${$(a.id)}">Close</button></td>
      </tr>`}).join("")}</tbody>
  </table></div>`}}async function de(e,s){const t=i("#chart-box",e);if(!t)return;const{createChart:l}=await J();t.innerHTML="",b=l(t,{layout:{background:{color:"#060A14"},textColor:"#8ba1cf",fontSize:11},grid:{vertLines:{color:"rgba(129,160,220,0.04)"},horzLines:{color:"rgba(129,160,220,0.04)"}},crosshair:{mode:0,vertLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"},horzLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"}},timeScale:{timeVisible:!0,secondsVisible:!1,borderColor:"rgba(129,160,220,0.08)",rightOffset:4},rightPriceScale:{borderColor:"rgba(129,160,220,0.08)"},width:Math.max(320,t.clientWidth),height:Math.max(260,t.clientHeight)}),T=b.addCandlestickSeries({upColor:"#00c087",downColor:"#f6465d",borderUpColor:"#00c087",borderDownColor:"#f6465d",wickUpColor:"#00c087",wickDownColor:"#f6465d"}),D=b.addHistogramSeries({priceFormat:{type:"volume"},priceScaleId:"vol"}),b.priceScale("vol").applyOptions({scaleMargins:{top:.84,bottom:0}});const a=s.map(o=>({time:Number(o.time||o.t),open:Number(o.open||o.o),high:Number(o.high||o.h),low:Number(o.low||o.l),close:Number(o.close||o.c),volume:Number(o.volume||o.v||0)})).filter(o=>o.time>0&&o.open>0).sort((o,n)=>o.time-n.time);T.setData(a.map(({time:o,open:n,high:d,low:c,close:p})=>({time:o,open:n,high:d,low:c,close:p}))),D.setData(a.map(o=>({time:o.time,value:o.volume,color:o.close>=o.open?"rgba(0,192,135,0.25)":"rgba(246,70,93,0.2)"}))),u=a.length?{...a[a.length-1]}:null,b.timeScale().fitContent(),C=new ResizeObserver(()=>{!b||!t||b.applyOptions({width:Math.max(320,t.clientWidth),height:Math.max(260,t.clientHeight)})}),C.observe(t)}function ce(e){i("#mob-mkt-btn",e)?.addEventListener("click",()=>pe(e)),i("#close-mob-drawer",e)?.addEventListener("click",()=>H(e)),m(e,"[data-sym]","click",(s,t)=>{H(e),localStorage.setItem("vp_symbol",t.dataset.sym),localStorage.setItem("vp_type",t.dataset.stype||r("type")),j("trade",{symbol:t.dataset.sym,type:t.dataset.stype||r("type"),tf:r("tf")})}),m(e,"[data-tf]","click",(s,t)=>{f("tf",t.dataset.tf),localStorage.setItem("vp_tf",t.dataset.tf),j("trade",{symbol:r("symbol"),type:r("type"),tf:t.dataset.tf})}),m(e,"[data-type-tab]","click",async(s,t)=>{f("type",t.dataset.typeTab),localStorage.setItem("vp_type",t.dataset.typeTab);const l=await h(`/markets.php?type=${encodeURIComponent(t.dataset.typeTab)}&lite=1&with_quotes=1`,{timeout:6e3}).catch(()=>null);l?.items&&(X(e,l.items),K(e,l.items)),g("[data-type-tab]",e).forEach(a=>{const o=a===t;a.classList.toggle("bg-accent/20",o),a.classList.toggle("text-accent",o),a.classList.toggle("border-accent/40",o)})}),m(e,"[data-open-order]","click",(s,t)=>ue(e,t.dataset.openOrder)),m(e,"[data-close-order-sheet]","click",()=>W(e)),m(e,"[data-submit-order]","click",(s,t)=>F(t.dataset.submitOrder,e,i("#mobile-order-sheet [data-order-form]",e))),m(e,"[data-side]","click",(s,t)=>{const l=t.closest("#mobile-order-sheet"),a=t.closest("[data-order-form]");if(l){Z(e,t.dataset.side);return}F(t.dataset.side,e,a)}),m(e,"[data-order-type]","change",(s,t)=>f("orderType",t.value)),m(e,"[data-market-type]","change",(s,t)=>{f("market",t.value),localStorage.setItem("vp_market",t.value),S(e)}),m(e,"[data-leverage]","input",(s,t)=>{f("leverage",Number(t.value)),Y(e,"leverage",t.value),S(e)}),m(e,"[data-amount]","input",(s,t)=>{f("amount",Number(t.value)),Y(e,"amount",t.value),S(e)}),m(e,"[data-close]","click",async(s,t)=>{await h("/trade/close_position.php",{method:"POST",body:{position_id:t.dataset.close},timeout:8e3}).catch(()=>null);const l=await h("/trade/portfolio.php",{timeout:5e3}).catch(()=>null);l?.positions&&P(e,l.positions)}),i("#sym-search",e)?.addEventListener("input",s=>{const t=s.target.value.toLowerCase();g(".symbol-row",e).forEach(l=>{l.style.display=l.dataset.sym.toLowerCase().includes(t)?"":"none"})})}async function F(e,s,t){const l=r("activeQuote")||{},a=Number(l.price||0);if(!a){alert("No live price available yet. Please wait for the quote to load.");return}const o=t||i("[data-order-form]",s)||s,n=Number(i("[data-amount]",o)?.value||r("amount")||0),d=Number(i("[data-leverage]",o)?.value||r("leverage")||1),c=Number(i("[data-tp]",o)?.value||0),p=Number(i("[data-sl]",o)?.value||0),w=i("[data-market-type]",o)?.value||r("market")||"spot",N=i("[data-order-type]",o)?.value||r("orderType")||"MARKET";if(n<=0){alert("Enter a valid amount first.");return}if(e==="BUY"&&p>0&&p>=a){alert("For BUY orders, Stop Loss should be below the current price.");return}if(e==="SELL"&&p>0&&p<=a){alert("For SELL orders, Stop Loss should be above the current price.");return}try{const x=await h("/trade/place_order.php",{method:"POST",body:{symbol:r("symbol"),asset_type:r("type"),market_type:w,side:e,order_type:N,usd:n,leverage:d,tp:c||void 0,sl:p||void 0,price:a,mode:r("mode")},timeout:1e4});if(x&&x.ok===!1){alert(x.error||"Order failed");return}W(s);const L=await h("/trade/portfolio.php",{timeout:5e3}).catch(()=>null);L?.positions&&P(s,L.positions)}catch(x){console.error("Order failed:",x),alert(x.message||"Order failed")}}function pe(e){const s=i("#market-drawer",e);s&&(s.classList.add("mobile-market-open"),s.classList.remove("hidden"),document.body.classList.add("trade-modal-open"))}function H(e){const s=i("#market-drawer",e);s&&(s.classList.remove("mobile-market-open"),window.innerWidth<1024&&s.classList.add("hidden"),document.body.classList.remove("trade-modal-open"))}function ue(e,s){const t=i("#mobile-order-sheet",e);t&&(Z(e,s),t.classList.remove("hidden"),document.body.classList.add("trade-modal-open"),S(e))}function W(e){const s=i("#mobile-order-sheet",e);s&&s.classList.add("hidden"),document.body.classList.remove("trade-modal-open")}function Z(e,s){const t=i("#mobile-submit-order",e),l=i("#mobile-order-side-label",e);t&&(t.dataset.submitOrder=s,t.textContent=`Review & ${s==="BUY"?"Buy":"Sell"}`,t.className=`${s==="BUY"?"btn-buy":"btn-sell"} w-full mt-4 py-3`),l&&(l.textContent=`${s} order`)}function Y(e,s,t){g(`[data-${s}]`,e).forEach(l=>{String(l.value)!==String(t)&&(l.value=t)})}function me(e){if(!T||!u||!(e>0))return;const s=be();s<=u.time?(u.close=e,u.high=Math.max(u.high,e),u.low=Math.min(u.low,e)):u={time:s,open:u.close,high:Math.max(u.close,e),low:Math.min(u.close,e),close:e,volume:0},T.update({time:u.time,open:u.open,high:u.high,low:u.low,close:u.close})}function be(){const e=fe(r("tf")),s=Math.floor(Date.now()/1e3);return Math.floor(s/e)*e}function fe(e){return{"1m":60,"5m":300,"15m":900,"30m":1800,"1h":3600,"4h":14400,"1d":86400}[e]||60}function J(){return _||(_=V(()=>import("./chart-DbDccfIU.js"),[])),_}function A(e,s,t){return`<img src="./assets/img/markets/${ve(e,s)}.svg" class="${t}" alt="${$(e)}" loading="lazy" />`}function ve(e,s){const t=String(e||"").toUpperCase().replace(/[^A-Z0-9]/g,""),l=le[t];if(l&&z.has(l))return l;const a=t.replace(/USDT$|USD$|EUR$|GBP$|SAR$/g,"").toLowerCase();return z.has(a)?a:s==="commodities"?t.includes("OIL")?"oil":"metal":s==="stocks"?"stock":s==="futures"?"future":s==="forex"?"forex":s==="arab"?"arab":"crypto"}export{ge as cleanup,ye as mount,he as render};
