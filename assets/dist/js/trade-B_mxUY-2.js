import{s as v,g as n,i as M,e as h,a as g,$ as i,b as T,p as w,_ as oe,d as b,n as G,f as k,m as P,c as j}from"./main-BotwwwQy.js";let N=null,O=null,$=0;const le=3e3;function re(e,s,t,o){if(D(),!e||!e.length)return D;const a=++$;return ne(e,s,t,o,a),D}function ne(e,s,t,o,a){Z();const r=[...new Set(e.map(d=>String(d||"").toUpperCase()).filter(Boolean))].slice(0,24),l=async()=>{if(a===$){O=new AbortController;try{const d="/api/quotes.php?symbols="+encodeURIComponent(r.join(","))+"&type="+encodeURIComponent(s)+"&visible=1&purpose=watchlist&_="+Date.now(),p=await fetch(d,{credentials:"same-origin",cache:"no-store",signal:O.signal});if(a!==$)return;if(p.ok){const c=await p.json();a===$&&c&&c.items&&t&&t(c.items)}}catch(d){d.name}finally{a===$&&(N=setTimeout(l,le))}}};l()}function Z(){N&&(clearTimeout(N),N=null),O&&(O.abort(),O=null)}function D(){$+=1,Z()}let x=null,_=null,R=null,S=null,E=null,I=null,u=null,L=0;const ie=[{key:"favorites",label:"Favorites"},{key:"crypto",label:"Crypto"},{key:"forex",label:"Forex"},{key:"stocks",label:"Stocks"},{key:"commodities",label:"Metals"},{key:"futures",label:"Futures"},{key:"arab",label:"Arab"}],de=["1m","5m","15m","30m","1h","4h","1d"],K=new Set(["ada","amzn","apple","arab","avax","bnb","btc","crypto","doge","dot","eth","forex","future","googl","link","metal","microsoft","nvda","oil","sol","stock","tsla","usdc","xrp"]),ce={BTCUSDT:"btc",BTCUSD:"btc",ETHUSDT:"eth",ETHUSD:"eth",BNBUSDT:"bnb",SOLUSDT:"sol",XRPUSDT:"xrp",ADAUSDT:"ada",DOGEUSDT:"doge",DOTUSDT:"dot",AVAXUSDT:"avax",LINKUSDT:"link",USDCUSDT:"usdc",AAPL:"apple",APPLE:"apple",AMZN:"amzn",GOOGL:"googl",GOOGLE:"googl",MSFT:"microsoft",MICROSOFT:"microsoft",NVDA:"nvda",TSLA:"tsla",XAUUSD:"metal",XAGUSD:"metal",GOLD:"metal",USOIL:"oil",UKOIL:"oil"};function Le(e){e.symbol&&v("symbol",e.symbol.toUpperCase()),e.type&&v("type",e.type),e.tf&&v("tf",e.tf);const s=n("symbol"),t=n("type"),o=n("tf");return`<div class="trade-terminal flex flex-col lg:flex-row h-full mobile-pad">
    <aside id="market-drawer" class="hidden lg:flex flex-col w-[250px] border-r border-line bg-surface shrink-0 overflow-hidden">
      <div class="lg:hidden flex items-center justify-between h-12 px-3 border-b border-line bg-panel">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-muted">Markets</div>
          <strong class="text-sm">Select instrument</strong>
        </div>
        <button class="icon-btn icon-btn-sm" id="close-mob-drawer" aria-label="Close markets">${M.close}</button>
      </div>
      <div class="p-2 border-b border-line">
        <div class="relative">
          <input type="search" class="input pl-7" placeholder="Search symbol..." id="sym-search" />
          <span class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted">${M.search}</span>
        </div>
      </div>
      <div class="flex gap-1 p-2 overflow-x-auto border-b border-line" id="type-tabs">
        ${ie.map(a=>`<button class="btn-xs ${a.key===t?"bg-accent/20 text-accent border-accent/40":"text-muted border-line"} border rounded-md whitespace-nowrap" data-type-tab="${a.key}">${a.label}</button>`).join("")}
      </div>
      <div class="flex-1 overflow-auto p-1" id="symbol-list"><div class="p-4"><div class="loading-spinner mx-auto"></div></div></div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div class="flex items-center justify-between px-2 lg:px-4 h-11 border-b border-line bg-surface shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <button class="lg:hidden w-8 h-8 grid place-items-center rounded border border-line text-muted shrink-0" id="mob-mkt-btn" aria-label="Open markets">${M.menu}</button>
          ${H(s,t,"w-7 h-7 rounded-md shrink-0")}
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <strong class="text-sm truncate" id="sym-name">${h(s)}</strong>
              <span class="w-2 h-2 rounded-full bg-muted shrink-0" id="conn-dot" title="Connecting"></span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold" id="live-price">--</span>
              <span class="text-[10px]" id="live-change">+0.00%</span>
            </div>
          </div>
        </div>
        <div class="flex gap-0.5 overflow-x-auto max-w-[46vw] lg:max-w-none" id="tf-bar">
          ${de.map(a=>`<button class="px-1.5 py-1 text-[10px] rounded shrink-0 ${a===o?"bg-accent/20 text-accent":"text-muted hover:text-text"}" data-tf="${a}">${a}</button>`).join("")}
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
        <div class="text-[10px] text-muted">${h(s)} - ${h(t.toUpperCase())}</div>
      </div>
      <div class="p-3 space-y-3" id="order-body">
        ${J()}
      </div>
    </aside>

    ${pe(s,t)}
  </div>`}function J(){const e=n("orderType")||"MARKET",s=Number(n("amount")||100),t=Number(n("leverage")||10),o=n("market")||"spot",a=n("activeQuote")||{},r=Number(a.price||0);return`<div class="space-y-3" data-order-form>
    <div class="grid grid-cols-2 gap-2">
      <label class="block">
        <span class="text-[10px] text-muted">Trading type</span>
        <select class="input mt-1" data-market-type>
          <option value="spot" ${o==="spot"?"selected":""}>Spot</option>
          <option value="perp" ${o==="perp"?"selected":""}>Perpetual / Futures</option>
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
      <button class="btn-sell py-3 text-sm font-bold" data-side="SELL"><small class="block text-[9px] opacity-70">Sell</small><span data-sell-price>${r>0?w(r,n("type")):"--"}</span></button>
      <button class="btn-buy py-3 text-sm font-bold" data-side="BUY"><small class="block text-[9px] opacity-70">Buy</small><span data-buy-price>${r>0?w(r*1.0001,n("type")):"--"}</span></button>
    </div>
    <div class="text-center"><span class="spread-display" data-spread-val>Spread: --</span></div>
    <label class="block">
      <span class="text-[10px] text-muted">Margin / Amount (USDT)</span>
      <input type="number" min="1" step="any" class="input mt-1" value="${T(String(s))}" data-amount />
    </label>
    <label class="block">
      <span class="text-[10px] text-muted">Leverage: <strong data-lev-val>${t}x</strong></span>
      <input type="range" min="1" max="100" value="${T(String(t))}" class="w-full mt-1 accent-accent" data-leverage />
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
  </div>`}function pe(e,s){return`<div class="fixed inset-0 z-[230] hidden lg:hidden" id="mobile-order-sheet">
    <div class="absolute inset-0 bg-black/65" data-close-order-sheet></div>
    <div class="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-auto rounded-t-2xl border border-line bg-surface shadow-2xl">
      <div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3">
        <div class="flex items-center gap-2 min-w-0">
          ${H(e,s,"w-8 h-8 rounded-lg shrink-0")}
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider text-muted" id="mobile-order-side-label">Order</div>
            <strong class="text-sm truncate">${h(e)}</strong>
          </div>
        </div>
        <button class="icon-btn icon-btn-sm" data-close-order-sheet aria-label="Close order">${M.close}</button>
      </div>
      <div class="p-4">
        ${J()}
        <button class="btn-primary w-full mt-4 py-3" id="mobile-submit-order" data-submit-order="BUY">Review & Place Order</button>
      </div>
    </div>
  </div>`}function $e(e){ue(e)}function Ce(){L+=1,E&&(E.disconnect(),E=null),x&&(x.remove(),x=null,_=null,R=null,u=null),S&&(S(),S=null),D(),document.body.classList.remove("trade-modal-open")}async function ue(e){const s=n("symbol"),t=n("type"),o=n("tf"),a=++L;v("activeQuote",null);const r=ae();ve(e),C(e),B(e,[],a),g(`/quotes.php?symbol=${encodeURIComponent(s)}&type=${encodeURIComponent(t)}&purpose=focus`,{timeout:4500}).then(l=>{m(a,s,t)&&l?.items?.[0]&&V(e,l.items[0],a)}).catch(()=>{m(a,s,t)&&me(e)}),g(`/markets.php?type=${t}&lite=1&with_quotes=1`,{timeout:6500}).then(l=>{m(a,s,t)&&l?.items&&(ee(e,l.items),B(e,l.items,a))}).catch(()=>{if(!m(a,s,t))return;const l=i("#symbol-list",e);l&&(l.innerHTML='<p class="text-muted text-[11px] text-center py-4">Markets unavailable</p>')}),g("/trade/portfolio.php",{timeout:5500}).then(l=>{m(a,s,t)&&l?.positions&&z(e,l.positions)}).catch(()=>{if(!m(a,s,t))return;const l=i("#positions-body",e);l&&(l.innerHTML='<p class="text-muted text-[11px] text-center py-3">Positions unavailable</p>')}),g(`/trade/candles.php?symbol=${encodeURIComponent(s)}&type=${encodeURIComponent(t)}&tf=${encodeURIComponent(o)}&limit=220`,{timeout:1e4}).then(async l=>{await r,m(a,s,t)&&(l?.items?.length?await fe(e,l.items,a):i("#chart-box",e).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart data unavailable</p>')}).catch(l=>{m(a,s,t)&&(console.error("Chart:",l),i("#chart-box",e).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart unavailable</p>')})}function m(e,s=n("symbol"),t=n("type")){return!(e!==L||s&&String(s).toUpperCase()!==String(n("symbol")||"").toUpperCase()||t&&Q(t)!==Q(n("type")))}function Q(e){const s=String(e||"").toLowerCase();return s==="commodity"?"commodities":s==="stock"?"stocks":s==="future"?"futures":s}function B(e,s,t=L){S&&(S(),S=null);const o=n("type"),a=n("symbol"),r=o==="crypto"?24:12,l=[...new Set([a,...s.slice(0,r).map(d=>String(d.symbol||"").toUpperCase()).filter(Boolean)])];S=re(l,o,d=>{if(!m(t,a,o))return;be(e,d);const p=d.find(f=>String(f.symbol||"").toUpperCase()===a);p&&V(e,p,t);const c=i("#conn-dot",e);c&&(c.classList.remove("bg-muted","bg-sell"),c.classList.add("bg-buy"),c.title="Live")})}function me(e){const s=i("#conn-dot",e);s&&(s.classList.remove("bg-muted","bg-buy"),s.classList.add("bg-sell"),s.title="Disconnected")}function V(e,s,t=L){if(!m(t,String(s?.symbol||n("symbol")).toUpperCase(),s?.type||n("type")))return;const o=Number(s.price||s.q_price||0),a=Number(s.change_pct||s.q_change||0),r=n("type");v("activeQuote",{...s,price:o,change_pct:a});const l=i("#live-price",e),d=i("#live-change",e);l&&(l.textContent=o>0?w(o,r):"--"),d&&(d.textContent=j(a),d.className=`text-[10px] ${a>=0?"text-buy":"text-sell"}`),k("[data-sell-price]",e).forEach(p=>{p.textContent=o>0?w(o,r):"--"}),k("[data-buy-price]",e).forEach(p=>{p.textContent=o>0?w(o*1.0001,r):"--"}),k("[data-spread-val]",e).forEach(p=>{p.textContent=o>0?`Spread: ${w(o*1e-4,r)}`:"Spread: --"}),C(e),ye(o,t)}function C(e){const s=n("activeQuote")||{},t=Number(s.price||0),o=n("wallet")||{},a=n("mode")==="real"?o.real||{}:o.demo||{};k("[data-order-form]",e).forEach(r=>{const l=Number(i("[data-amount]",r)?.value||n("amount")||0),d=Number(i("[data-leverage]",r)?.value||n("leverage")||1),c=(i("[data-market-type]",r)?.value||n("market")||"spot")==="perp"?d:1,f=t>0?l*c/t:0,A=l*c,y=i("[data-lev-val]",r);y&&(y.textContent=`${d}x`);const U=i("[data-est-units]",r);U&&(U.textContent=f>0?f.toFixed(f>=10?3:6):"--");const F=i("[data-est-notional]",r);F&&(F.textContent=l>0?`${P(A)} USDT`:"--");const Y=i("[data-avail-bal]",r);Y&&(Y.textContent=`${P(a.available||0)} ${a.currency||""}`)})}function ee(e,s){const t=i("#symbol-list",e);if(!t)return;const o=n("symbol");t.innerHTML=s.slice(0,60).map(a=>{const r=String(a.symbol||"").toUpperCase(),l=a.type||n("type"),d=Number(a.price||a.q_price||0),p=Number(a.change_pct||a.q_change||0);return`<div class="symbol-row ${r===o?"active":""}" data-sym="${T(r)}" data-stype="${T(l)}">
      ${H(r,l,"w-7 h-7 rounded-md shrink-0")}
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-[11px] truncate">${h(r)}</div>
        <div class="text-[9px] text-muted truncate">${h(a.name||l)}</div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-[11px] font-mono" data-price-cell>${d>0?w(d,l):"--"}</div>
        <div class="text-[9px] ${p>=0?"text-buy":"text-sell"}" data-change-cell>${j(p)}</div>
      </div>
    </div>`}).join("")}function be(e,s){s?.length&&s.forEach(t=>{const o=String(t.symbol||"").toUpperCase();if(!o)return;const a=k(".symbol-row",e).find(f=>f.dataset.sym===o);if(!a)return;const r=a.dataset.stype||n("type"),l=Number(t.price||t.q_price||0),d=Number(t.change_pct||t.q_change||0),p=i("[data-price-cell]",a),c=i("[data-change-cell]",a);p&&l>0&&(p.textContent=w(l,r)),c&&(c.textContent=j(d),c.className=`text-[9px] ${d>=0?"text-buy":"text-sell"}`)})}function z(e,s){const t=i("#positions-body",e),o=i("#pos-count",e);if(o&&(o.textContent=`(${s.length})`),!!t){if(!s.length){t.innerHTML='<p class="text-muted text-[11px] text-center py-3">No open positions</p>';return}t.innerHTML=`<div class="overflow-x-auto"><table class="min-w-[620px] lg:min-w-0 w-full text-[11px]">
    <thead class="text-[9px] text-muted uppercase"><tr>
      <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">Lev</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1"></th>
    </tr></thead>
    <tbody>${s.slice(0,12).map(a=>{const r=Number(a.pnl||a.unrealized_pnl||0),l=String(a.symbol||"").replace("@R@","");return`<tr class="border-t border-line/50 hover:bg-panel/50">
        <td class="px-3 py-1.5 font-semibold">${h(l)}</td>
        <td><span class="badge-${a.side==="BUY"?"buy":"sell"}">${h(a.side)}</span></td>
        <td class="text-muted">${h(a.market_type||"spot")}</td>
        <td class="text-right font-mono">${w(a.entry_price||a.open_price,a.asset_type||n("type"))}</td>
        <td class="text-right font-mono">${h(String(a.leverage||1))}x</td>
        <td class="text-right font-mono ${r>=0?"text-buy":"text-sell"}">${P(r)}</td>
        <td class="text-right px-3"><button class="btn-xs btn-ghost text-sell" data-close="${T(a.id)}">Close</button></td>
      </tr>`}).join("")}</tbody>
  </table></div>`}}async function fe(e,s,t=L){if(!m(t))return;const o=i("#chart-box",e);if(!o)return;const{createChart:a}=await ae();if(!m(t))return;o.innerHTML="",x=a(o,{layout:{background:{color:"#060A14"},textColor:"#8ba1cf",fontSize:11},grid:{vertLines:{color:"rgba(129,160,220,0.04)"},horzLines:{color:"rgba(129,160,220,0.04)"}},crosshair:{mode:0,vertLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"},horzLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"}},timeScale:{timeVisible:!0,secondsVisible:!1,borderColor:"rgba(129,160,220,0.08)",rightOffset:4},rightPriceScale:{borderColor:"rgba(129,160,220,0.08)"},width:Math.max(320,o.clientWidth),height:Math.max(260,o.clientHeight)}),_=x.addCandlestickSeries({upColor:"#00c087",downColor:"#f6465d",borderUpColor:"#00c087",borderDownColor:"#f6465d",wickUpColor:"#00c087",wickDownColor:"#f6465d"}),R=x.addHistogramSeries({priceFormat:{type:"volume"},priceScaleId:"vol"}),x.priceScale("vol").applyOptions({scaleMargins:{top:.84,bottom:0}});const r=s.map(l=>({time:Number(l.time||l.t),open:Number(l.open||l.o),high:Number(l.high||l.h),low:Number(l.low||l.l),close:Number(l.close||l.c),volume:Number(l.volume||l.v||0)})).filter(l=>l.time>0&&l.open>0).sort((l,d)=>l.time-d.time);_.setData(r.map(({time:l,open:d,high:p,low:c,close:f})=>({time:l,open:d,high:p,low:c,close:f}))),R.setData(r.map(l=>({time:l.time,value:l.volume,color:l.close>=l.open?"rgba(0,192,135,0.25)":"rgba(246,70,93,0.2)"}))),u=r.length?{...r[r.length-1]}:null,x.timeScale().fitContent(),E=new ResizeObserver(()=>{!x||!o||x.applyOptions({width:Math.max(320,o.clientWidth),height:Math.max(260,o.clientHeight)})}),E.observe(o)}function ve(e){i("#mob-mkt-btn",e)?.addEventListener("click",()=>xe(e)),i("#close-mob-drawer",e)?.addEventListener("click",()=>q(e)),b(e,"[data-sym]","click",(s,t)=>{q(e),localStorage.setItem("vp_symbol",t.dataset.sym),localStorage.setItem("vp_type",t.dataset.stype||n("type")),G("trade",{symbol:t.dataset.sym,type:t.dataset.stype||n("type"),tf:n("tf")})}),b(e,"[data-tf]","click",(s,t)=>{v("tf",t.dataset.tf),localStorage.setItem("vp_tf",t.dataset.tf),G("trade",{symbol:n("symbol"),type:n("type"),tf:t.dataset.tf})}),b(e,"[data-type-tab]","click",async(s,t)=>{v("type",t.dataset.typeTab),localStorage.setItem("vp_type",t.dataset.typeTab);const o=await g(`/markets.php?type=${encodeURIComponent(t.dataset.typeTab)}&lite=1&with_quotes=1`,{timeout:6e3}).catch(()=>null);o?.items&&(ee(e,o.items),B(e,o.items)),k("[data-type-tab]",e).forEach(a=>{const r=a===t;a.classList.toggle("bg-accent/20",r),a.classList.toggle("text-accent",r),a.classList.toggle("border-accent/40",r)})}),b(e,"[data-open-order]","click",(s,t)=>he(e,t.dataset.openOrder)),b(e,"[data-close-order-sheet]","click",()=>te(e)),b(e,"[data-submit-order]","click",(s,t)=>X(t.dataset.submitOrder,e,i("#mobile-order-sheet [data-order-form]",e))),b(e,"[data-side]","click",(s,t)=>{const o=t.closest("#mobile-order-sheet"),a=t.closest("[data-order-form]");if(o){se(e,t.dataset.side);return}X(t.dataset.side,e,a)}),b(e,"[data-order-type]","change",(s,t)=>v("orderType",t.value)),b(e,"[data-market-type]","change",(s,t)=>{v("market",t.value),localStorage.setItem("vp_market",t.value),C(e)}),b(e,"[data-leverage]","input",(s,t)=>{v("leverage",Number(t.value)),W(e,"leverage",t.value),C(e)}),b(e,"[data-amount]","input",(s,t)=>{v("amount",Number(t.value)),W(e,"amount",t.value),C(e)}),b(e,"[data-close]","click",async(s,t)=>{await g("/trade/close_position.php",{method:"POST",body:{position_id:t.dataset.close},timeout:8e3}).catch(()=>null);const o=await g("/trade/portfolio.php",{timeout:5e3}).catch(()=>null);o?.positions&&z(e,o.positions)}),i("#sym-search",e)?.addEventListener("input",s=>{const t=s.target.value.toLowerCase();k(".symbol-row",e).forEach(o=>{o.style.display=o.dataset.sym.toLowerCase().includes(t)?"":"none"})})}async function X(e,s,t){const o=n("activeQuote")||{},a=Number(o.price||0);if(!a){alert("No live price available yet. Please wait for the quote to load.");return}const r=t||i("[data-order-form]",s)||s,l=Number(i("[data-amount]",r)?.value||n("amount")||0),d=Number(i("[data-leverage]",r)?.value||n("leverage")||1),p=Number(i("[data-tp]",r)?.value||0),c=Number(i("[data-sl]",r)?.value||0),f=i("[data-market-type]",r)?.value||n("market")||"spot",A=i("[data-order-type]",r)?.value||n("orderType")||"MARKET";if(l<=0){alert("Enter a valid amount first.");return}if(e==="BUY"&&c>0&&c>=a){alert("For BUY orders, Stop Loss should be below the current price.");return}if(e==="SELL"&&c>0&&c<=a){alert("For SELL orders, Stop Loss should be above the current price.");return}try{const y=await g("/trade/place_order.php",{method:"POST",body:{symbol:n("symbol"),asset_type:n("type"),market_type:f,side:e,order_type:A,usd:l,leverage:d,tp:p||void 0,sl:c||void 0,price:a,mode:n("mode")},timeout:1e4});if(y&&y.ok===!1){alert(y.error||"Order failed");return}te(s);const U=await g("/trade/portfolio.php",{timeout:5e3}).catch(()=>null);U?.positions&&z(s,U.positions)}catch(y){console.error("Order failed:",y),alert(y.message||"Order failed")}}function xe(e){const s=i("#market-drawer",e);s&&(s.classList.add("mobile-market-open"),s.classList.remove("hidden"),document.body.classList.add("trade-modal-open"))}function q(e){const s=i("#market-drawer",e);s&&(s.classList.remove("mobile-market-open"),window.innerWidth<1024&&s.classList.add("hidden"),document.body.classList.remove("trade-modal-open"))}function he(e,s){const t=i("#mobile-order-sheet",e);t&&(se(e,s),t.classList.remove("hidden"),document.body.classList.add("trade-modal-open"),C(e))}function te(e){const s=i("#mobile-order-sheet",e);s&&s.classList.add("hidden"),document.body.classList.remove("trade-modal-open")}function se(e,s){const t=i("#mobile-submit-order",e),o=i("#mobile-order-side-label",e);t&&(t.dataset.submitOrder=s,t.textContent=`Review & ${s==="BUY"?"Buy":"Sell"}`,t.className=`${s==="BUY"?"btn-buy":"btn-sell"} w-full mt-4 py-3`),o&&(o.textContent=`${s} order`)}function W(e,s,t){k(`[data-${s}]`,e).forEach(o=>{String(o.value)!==String(t)&&(o.value=t)})}function ye(e,s=L){if(!m(s)||!_||!u||!(e>0))return;const t=ge();t<=u.time?(u.close=e,u.high=Math.max(u.high,e),u.low=Math.min(u.low,e)):u={time:t,open:u.close,high:Math.max(u.close,e),low:Math.min(u.close,e),close:e,volume:0},_.update({time:u.time,open:u.open,high:u.high,low:u.low,close:u.close})}function ge(){const e=we(n("tf")),s=Math.floor(Date.now()/1e3);return Math.floor(s/e)*e}function we(e){return{"1m":60,"5m":300,"15m":900,"30m":1800,"1h":3600,"4h":14400,"1d":86400}[e]||60}function ae(){return I||(I=oe(()=>import("./chart-DbDccfIU.js"),[])),I}function H(e,s,t){return`<img src="./assets/img/markets/${ke(e,s)}.svg" class="${t}" alt="${T(e)}" loading="lazy" />`}function ke(e,s){const t=String(e||"").toUpperCase().replace(/[^A-Z0-9]/g,""),o=ce[t];if(o&&K.has(o))return o;const a=t.replace(/USDT$|USD$|EUR$|GBP$|SAR$/g,"").toLowerCase();return K.has(a)?a:s==="commodities"?t.includes("OIL")?"oil":"metal":s==="stocks"?"stock":s==="futures"?"future":s==="forex"?"forex":s==="arab"?"arab":"crypto"}export{Ce as cleanup,$e as mount,Le as render};
