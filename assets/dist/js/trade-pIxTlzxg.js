import{s as f,g as r,i as U,e as v,a as h,$ as n,c as L,p as y,_ as V,d as m,n as H,f as g,m as _,b as P}from"./main-DNMmzAdP.js";let O=null;const ee=1500;function te(e,s,t,l){return E(),!e||!e.length||se(e,s,t),E}function se(e,s,t){q();const l=async()=>{try{const o="/api/quotes.php?symbols="+encodeURIComponent(e.join(","))+"&type="+encodeURIComponent(s)+"&visible=1&fresh=1",a=await fetch(o,{credentials:"same-origin"});if(a.ok){const i=await a.json();i&&i.items&&t&&t(i.items)}}catch{}O=setTimeout(l,ee)};l()}function q(){O&&(clearTimeout(O),O=null)}function E(){q()}let b=null,T=null,D=null,k=null,C=null,N=null,c=null;const ae=[{key:"favorites",label:"Favorites"},{key:"crypto",label:"Crypto"},{key:"forex",label:"Forex"},{key:"stocks",label:"Stocks"},{key:"commodities",label:"Metals"},{key:"futures",label:"Futures"},{key:"arab",label:"Arab"}],oe=["1m","5m","15m","30m","1h","4h","1d"],z=new Set(["ada","amzn","apple","arab","avax","bnb","btc","crypto","doge","dot","eth","forex","future","googl","link","metal","microsoft","nvda","oil","sol","stock","tsla","usdc","xrp"]),le={BTCUSDT:"btc",BTCUSD:"btc",ETHUSDT:"eth",ETHUSD:"eth",BNBUSDT:"bnb",SOLUSDT:"sol",XRPUSDT:"xrp",ADAUSDT:"ada",DOGEUSDT:"doge",DOTUSDT:"dot",AVAXUSDT:"avax",LINKUSDT:"link",USDCUSDT:"usdc",AAPL:"apple",APPLE:"apple",AMZN:"amzn",GOOGL:"googl",GOOGLE:"googl",MSFT:"microsoft",MICROSOFT:"microsoft",NVDA:"nvda",TSLA:"tsla",XAUUSD:"metal",XAGUSD:"metal",GOLD:"metal",USOIL:"oil",UKOIL:"oil"};function ye(e){e.symbol&&f("symbol",e.symbol.toUpperCase()),e.type&&f("type",e.type),e.tf&&f("tf",e.tf);const s=r("symbol"),t=r("type"),l=r("tf");return`<div class="trade-terminal flex flex-col lg:flex-row h-full mobile-pad">
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
        ${ae.map(o=>`<button class="btn-xs ${o.key===t?"bg-accent/20 text-accent border-accent/40":"text-muted border-line"} border rounded-md whitespace-nowrap" data-type-tab="${o.key}">${o.label}</button>`).join("")}
      </div>
      <div class="flex-1 overflow-auto p-1" id="symbol-list"><div class="p-4"><div class="loading-spinner mx-auto"></div></div></div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div class="flex items-center justify-between px-2 lg:px-4 h-11 border-b border-line bg-surface shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <button class="lg:hidden w-8 h-8 grid place-items-center rounded border border-line text-muted shrink-0" id="mob-mkt-btn" aria-label="Open markets">${U.menu}</button>
          ${R(s,t,"w-7 h-7 rounded-md shrink-0")}
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
          ${oe.map(o=>`<button class="px-1.5 py-1 text-[10px] rounded shrink-0 ${o===l?"bg-accent/20 text-accent":"text-muted hover:text-text"}" data-tf="${o}">${o}</button>`).join("")}
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
        ${K()}
      </div>
    </aside>

    ${re(s,t)}
  </div>`}function K(){const e=r("orderType")||"MARKET",s=Number(r("amount")||100),t=Number(r("leverage")||10),l=r("market")||"spot",o=r("activeQuote")||{},a=Number(o.price||0);return`<div class="space-y-3" data-order-form>
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
      <button class="btn-sell py-3 text-sm font-bold" data-side="SELL"><small class="block text-[9px] opacity-70">Sell</small><span data-sell-price>${a>0?y(a,r("type")):"--"}</span></button>
      <button class="btn-buy py-3 text-sm font-bold" data-side="BUY"><small class="block text-[9px] opacity-70">Buy</small><span data-buy-price>${a>0?y(a*1.0001,r("type")):"--"}</span></button>
    </div>
    <div class="text-center"><span class="spread-display" data-spread-val>Spread: --</span></div>
    <label class="block">
      <span class="text-[10px] text-muted">Margin / Amount (USDT)</span>
      <input type="number" min="1" step="any" class="input mt-1" value="${L(String(s))}" data-amount />
    </label>
    <label class="block">
      <span class="text-[10px] text-muted">Leverage: <strong data-lev-val>${t}x</strong></span>
      <input type="range" min="1" max="100" value="${L(String(t))}" class="w-full mt-1 accent-accent" data-leverage />
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
          ${R(e,s,"w-8 h-8 rounded-lg shrink-0")}
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider text-muted" id="mobile-order-side-label">Order</div>
            <strong class="text-sm truncate">${v(e)}</strong>
          </div>
        </div>
        <button class="icon-btn icon-btn-sm" data-close-order-sheet aria-label="Close order">${U.close}</button>
      </div>
      <div class="p-4">
        ${K()}
        <button class="btn-primary w-full mt-4 py-3" id="mobile-submit-order" data-submit-order="BUY">Review & Place Order</button>
      </div>
    </div>
  </div>`}function ge(e){ne(e)}function we(){C&&(C.disconnect(),C=null),b&&(b.remove(),b=null,T=null,D=null,c=null),k&&(k(),k=null),E(),document.body.classList.remove("trade-modal-open")}async function ne(e){const s=r("symbol"),t=r("type"),l=r("tf"),o=J();pe(e),S(e),I(e,[]),h(`/quotes.php?symbol=${encodeURIComponent(s)}&type=${encodeURIComponent(t)}&purpose=focus&fresh=1`,{timeout:4500}).then(a=>{a?.items?.[0]&&Q(e,a.items[0])}).catch(()=>ie(e)),h(`/markets.php?type=${t}&lite=1&with_quotes=1`,{timeout:6500}).then(a=>{a?.items&&(X(e,a.items),I(e,a.items))}).catch(()=>{const a=n("#symbol-list",e);a&&(a.innerHTML='<p class="text-muted text-[11px] text-center py-4">Markets unavailable</p>')}),h("/trade/portfolio.php",{timeout:5500}).then(a=>{a?.positions&&A(e,a.positions)}).catch(()=>{const a=n("#positions-body",e);a&&(a.innerHTML='<p class="text-muted text-[11px] text-center py-3">Positions unavailable</p>')}),h(`/trade/candles.php?symbol=${encodeURIComponent(s)}&type=${encodeURIComponent(t)}&tf=${encodeURIComponent(l)}&limit=120`,{timeout:8e3}).then(async a=>{await o,a?.items?.length?await ce(e,a.items):n("#chart-box",e).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart data unavailable</p>'}).catch(a=>{console.error("Chart:",a),n("#chart-box",e).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart unavailable</p>'})}function I(e,s){k&&(k(),k=null);const t=r("type"),l=r("symbol"),o=t==="crypto"?40:18,a=[...new Set([l,...s.slice(0,o).map(i=>String(i.symbol||"").toUpperCase()).filter(Boolean)])];k=te(a,t,i=>{de(e,i);const d=i.find(p=>String(p.symbol||"").toUpperCase()===l);d&&Q(e,d);const u=n("#conn-dot",e);u&&(u.classList.remove("bg-muted","bg-sell"),u.classList.add("bg-buy"),u.title="Live")})}function ie(e){const s=n("#conn-dot",e);s&&(s.classList.remove("bg-muted","bg-buy"),s.classList.add("bg-sell"),s.title="Disconnected")}function Q(e,s){const t=Number(s.price||s.q_price||0),l=Number(s.change_pct||s.q_change||0),o=r("type");f("activeQuote",{...s,price:t,change_pct:l});const a=n("#live-price",e),i=n("#live-change",e);a&&(a.textContent=t>0?y(t,o):"--"),i&&(i.textContent=P(l),i.className=`text-[10px] ${l>=0?"text-buy":"text-sell"}`),g("[data-sell-price]",e).forEach(d=>{d.textContent=t>0?y(t,o):"--"}),g("[data-buy-price]",e).forEach(d=>{d.textContent=t>0?y(t*1.0001,o):"--"}),g("[data-spread-val]",e).forEach(d=>{d.textContent=t>0?`Spread: ${y(t*1e-4,o)}`:"Spread: --"}),S(e),be(t)}function S(e){const s=r("activeQuote")||{},t=Number(s.price||0),l=r("wallet")||{},o=r("mode")==="real"?l.real||{}:l.demo||{};g("[data-order-form]",e).forEach(a=>{const i=Number(n("[data-amount]",a)?.value||r("amount")||0),d=Number(n("[data-leverage]",a)?.value||r("leverage")||1),p=(n("[data-market-type]",a)?.value||r("market")||"spot")==="perp"?d:1,w=t>0?i*p/t:0,M=i*p,x=n("[data-lev-val]",a);x&&(x.textContent=`${d}x`);const $=n("[data-est-units]",a);$&&($.textContent=w>0?w.toFixed(w>=10?3:6):"--");const B=n("[data-est-notional]",a);B&&(B.textContent=i>0?`${_(M)} USDT`:"--");const j=n("[data-avail-bal]",a);j&&(j.textContent=`${_(o.available||0)} ${o.currency||""}`)})}function X(e,s){const t=n("#symbol-list",e);if(!t)return;const l=r("symbol");t.innerHTML=s.slice(0,60).map(o=>{const a=String(o.symbol||"").toUpperCase(),i=o.type||r("type"),d=Number(o.price||o.q_price||0),u=Number(o.change_pct||o.q_change||0);return`<div class="symbol-row ${a===l?"active":""}" data-sym="${L(a)}" data-stype="${L(i)}">
      ${R(a,i,"w-7 h-7 rounded-md shrink-0")}
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-[11px] truncate">${v(a)}</div>
        <div class="text-[9px] text-muted truncate">${v(o.name||i)}</div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-[11px] font-mono" data-price-cell>${d>0?y(d,i):"--"}</div>
        <div class="text-[9px] ${u>=0?"text-buy":"text-sell"}" data-change-cell>${P(u)}</div>
      </div>
    </div>`}).join("")}function de(e,s){s?.length&&s.forEach(t=>{const l=String(t.symbol||"").toUpperCase();if(!l)return;const o=g(".symbol-row",e).find(w=>w.dataset.sym===l);if(!o)return;const a=o.dataset.stype||r("type"),i=Number(t.price||t.q_price||0),d=Number(t.change_pct||t.q_change||0),u=n("[data-price-cell]",o),p=n("[data-change-cell]",o);u&&i>0&&(u.textContent=y(i,a)),p&&(p.textContent=P(d),p.className=`text-[9px] ${d>=0?"text-buy":"text-sell"}`)})}function A(e,s){const t=n("#positions-body",e),l=n("#pos-count",e);if(l&&(l.textContent=`(${s.length})`),!!t){if(!s.length){t.innerHTML='<p class="text-muted text-[11px] text-center py-3">No open positions</p>';return}t.innerHTML=`<div class="overflow-x-auto"><table class="min-w-[620px] lg:min-w-0 w-full text-[11px]">
    <thead class="text-[9px] text-muted uppercase"><tr>
      <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">Lev</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1"></th>
    </tr></thead>
    <tbody>${s.slice(0,12).map(o=>{const a=Number(o.pnl||o.unrealized_pnl||0),i=String(o.symbol||"").replace("@R@","");return`<tr class="border-t border-line/50 hover:bg-panel/50">
        <td class="px-3 py-1.5 font-semibold">${v(i)}</td>
        <td><span class="badge-${o.side==="BUY"?"buy":"sell"}">${v(o.side)}</span></td>
        <td class="text-muted">${v(o.market_type||"spot")}</td>
        <td class="text-right font-mono">${y(o.entry_price||o.open_price,o.asset_type||r("type"))}</td>
        <td class="text-right font-mono">${v(String(o.leverage||1))}x</td>
        <td class="text-right font-mono ${a>=0?"text-buy":"text-sell"}">${_(a)}</td>
        <td class="text-right px-3"><button class="btn-xs btn-ghost text-sell" data-close="${L(o.id)}">Close</button></td>
      </tr>`}).join("")}</tbody>
  </table></div>`}}async function ce(e,s){const t=n("#chart-box",e);if(!t)return;const{createChart:l}=await J();t.innerHTML="",b=l(t,{layout:{background:{color:"#060A14"},textColor:"#8ba1cf",fontSize:11},grid:{vertLines:{color:"rgba(129,160,220,0.04)"},horzLines:{color:"rgba(129,160,220,0.04)"}},crosshair:{mode:0,vertLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"},horzLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"}},timeScale:{timeVisible:!0,secondsVisible:!1,borderColor:"rgba(129,160,220,0.08)",rightOffset:4},rightPriceScale:{borderColor:"rgba(129,160,220,0.08)"},width:Math.max(320,t.clientWidth),height:Math.max(260,t.clientHeight)}),T=b.addCandlestickSeries({upColor:"#00c087",downColor:"#f6465d",borderUpColor:"#00c087",borderDownColor:"#f6465d",wickUpColor:"#00c087",wickDownColor:"#f6465d"}),D=b.addHistogramSeries({priceFormat:{type:"volume"},priceScaleId:"vol"}),b.priceScale("vol").applyOptions({scaleMargins:{top:.84,bottom:0}});const o=s.map(a=>({time:Number(a.time||a.t),open:Number(a.open||a.o),high:Number(a.high||a.h),low:Number(a.low||a.l),close:Number(a.close||a.c),volume:Number(a.volume||a.v||0)})).filter(a=>a.time>0&&a.open>0).sort((a,i)=>a.time-i.time);T.setData(o.map(({time:a,open:i,high:d,low:u,close:p})=>({time:a,open:i,high:d,low:u,close:p}))),D.setData(o.map(a=>({time:a.time,value:a.volume,color:a.close>=a.open?"rgba(0,192,135,0.25)":"rgba(246,70,93,0.2)"}))),c=o.length?{...o[o.length-1]}:null,b.timeScale().fitContent(),C=new ResizeObserver(()=>{!b||!t||b.applyOptions({width:Math.max(320,t.clientWidth),height:Math.max(260,t.clientHeight)})}),C.observe(t)}function pe(e){n("#mob-mkt-btn",e)?.addEventListener("click",()=>ue(e)),n("#close-mob-drawer",e)?.addEventListener("click",()=>Y(e)),m(e,"[data-sym]","click",(s,t)=>{Y(e),localStorage.setItem("vp_symbol",t.dataset.sym),localStorage.setItem("vp_type",t.dataset.stype||r("type")),H("trade",{symbol:t.dataset.sym,type:t.dataset.stype||r("type"),tf:r("tf")})}),m(e,"[data-tf]","click",(s,t)=>{f("tf",t.dataset.tf),localStorage.setItem("vp_tf",t.dataset.tf),H("trade",{symbol:r("symbol"),type:r("type"),tf:t.dataset.tf})}),m(e,"[data-type-tab]","click",async(s,t)=>{f("type",t.dataset.typeTab),localStorage.setItem("vp_type",t.dataset.typeTab);const l=await h(`/markets.php?type=${encodeURIComponent(t.dataset.typeTab)}&lite=1&with_quotes=1`,{timeout:6e3}).catch(()=>null);l?.items&&(X(e,l.items),I(e,l.items)),g("[data-type-tab]",e).forEach(o=>{const a=o===t;o.classList.toggle("bg-accent/20",a),o.classList.toggle("text-accent",a),o.classList.toggle("border-accent/40",a)})}),m(e,"[data-open-order]","click",(s,t)=>me(e,t.dataset.openOrder)),m(e,"[data-close-order-sheet]","click",()=>W(e)),m(e,"[data-submit-order]","click",(s,t)=>F(t.dataset.submitOrder,e,n("#mobile-order-sheet [data-order-form]",e))),m(e,"[data-side]","click",(s,t)=>{const l=t.closest("#mobile-order-sheet"),o=t.closest("[data-order-form]");if(l){Z(e,t.dataset.side);return}F(t.dataset.side,e,o)}),m(e,"[data-order-type]","change",(s,t)=>f("orderType",t.value)),m(e,"[data-market-type]","change",(s,t)=>{f("market",t.value),localStorage.setItem("vp_market",t.value),S(e)}),m(e,"[data-leverage]","input",(s,t)=>{f("leverage",Number(t.value)),G(e,"leverage",t.value),S(e)}),m(e,"[data-amount]","input",(s,t)=>{f("amount",Number(t.value)),G(e,"amount",t.value),S(e)}),m(e,"[data-close]","click",async(s,t)=>{await h("/trade/close_position.php",{method:"POST",body:{position_id:t.dataset.close},timeout:8e3}).catch(()=>null);const l=await h("/trade/portfolio.php",{timeout:5e3}).catch(()=>null);l?.positions&&A(e,l.positions)}),n("#sym-search",e)?.addEventListener("input",s=>{const t=s.target.value.toLowerCase();g(".symbol-row",e).forEach(l=>{l.style.display=l.dataset.sym.toLowerCase().includes(t)?"":"none"})})}async function F(e,s,t){const l=r("activeQuote")||{},o=Number(l.price||0);if(!o){alert("No live price available yet. Please wait for the quote to load.");return}const a=t||n("[data-order-form]",s)||s,i=Number(n("[data-amount]",a)?.value||r("amount")||0),d=Number(n("[data-leverage]",a)?.value||r("leverage")||1),u=Number(n("[data-tp]",a)?.value||0),p=Number(n("[data-sl]",a)?.value||0),w=n("[data-market-type]",a)?.value||r("market")||"spot",M=n("[data-order-type]",a)?.value||r("orderType")||"MARKET";if(i<=0){alert("Enter a valid amount first.");return}if(e==="BUY"&&p>0&&p>=o){alert("For BUY orders, Stop Loss should be below the current price.");return}if(e==="SELL"&&p>0&&p<=o){alert("For SELL orders, Stop Loss should be above the current price.");return}try{const x=await h("/trade/place_order.php",{method:"POST",body:{symbol:r("symbol"),asset_type:r("type"),market_type:w,side:e,order_type:M,usd:i,leverage:d,tp:u||void 0,sl:p||void 0,price:o,mode:r("mode")},timeout:1e4});if(x&&x.ok===!1){alert(x.error||"Order failed");return}W(s);const $=await h("/trade/portfolio.php",{timeout:5e3}).catch(()=>null);$?.positions&&A(s,$.positions)}catch(x){console.error("Order failed:",x),alert(x.message||"Order failed")}}function ue(e){const s=n("#market-drawer",e);s&&(s.classList.add("mobile-market-open"),s.classList.remove("hidden"),document.body.classList.add("trade-modal-open"))}function Y(e){const s=n("#market-drawer",e);s&&(s.classList.remove("mobile-market-open"),window.innerWidth<1024&&s.classList.add("hidden"),document.body.classList.remove("trade-modal-open"))}function me(e,s){const t=n("#mobile-order-sheet",e);t&&(Z(e,s),t.classList.remove("hidden"),document.body.classList.add("trade-modal-open"),S(e))}function W(e){const s=n("#mobile-order-sheet",e);s&&s.classList.add("hidden"),document.body.classList.remove("trade-modal-open")}function Z(e,s){const t=n("#mobile-submit-order",e),l=n("#mobile-order-side-label",e);t&&(t.dataset.submitOrder=s,t.textContent=`Review & ${s==="BUY"?"Buy":"Sell"}`,t.className=`${s==="BUY"?"btn-buy":"btn-sell"} w-full mt-4 py-3`),l&&(l.textContent=`${s} order`)}function G(e,s,t){g(`[data-${s}]`,e).forEach(l=>{String(l.value)!==String(t)&&(l.value=t)})}function be(e){if(!T||!c||!(e>0))return;const s=fe();s<=c.time?(c.close=e,c.high=Math.max(c.high,e),c.low=Math.min(c.low,e)):c={time:s,open:c.close,high:Math.max(c.close,e),low:Math.min(c.close,e),close:e,volume:0},T.update({time:c.time,open:c.open,high:c.high,low:c.low,close:c.close})}function fe(){const e=ve(r("tf")),s=Math.floor(Date.now()/1e3);return Math.floor(s/e)*e}function ve(e){return{"1m":60,"5m":300,"15m":900,"30m":1800,"1h":3600,"4h":14400,"1d":86400}[e]||60}function J(){return N||(N=V(()=>import("./chart-DbDccfIU.js"),[])),N}function R(e,s,t){return`<img src="./assets/img/markets/${xe(e,s)}.svg" class="${t}" alt="${L(e)}" loading="lazy" />`}function xe(e,s){const t=String(e||"").toUpperCase().replace(/[^A-Z0-9]/g,""),l=le[t];if(l&&z.has(l))return l;const o=t.replace(/USDT$|USD$|EUR$|GBP$|SAR$/g,"").toLowerCase();return z.has(o)?o:s==="commodities"?t.includes("OIL")?"oil":"metal":s==="stocks"?"stock":s==="futures"?"future":s==="forex"?"forex":s==="arab"?"arab":"crypto"}export{we as cleanup,ge as mount,ye as render};
