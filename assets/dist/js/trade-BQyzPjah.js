import{s as v,g as r,i as A,e as h,a as k,$ as d,b as _,c as g,_ as ut,d as f,n as H,f as C,m as D,p as K}from"./main-CoCUWP4H.js";import{m as mt,a as bt}from"./marketIcon-BqfrwX_4.js";let B=null,O=null,w=0,L=null;const ft=6500;function vt(t,s,e,o,a={}){if(U(),!t||!t.length)return U;const n=++w,l=et(t,a.maxSymbols||18);return l.length&&(typeof EventSource=="function"?ht(l,s,e,o,n,a):j(l,s,e,o,n,a)),U}function et(t,s){const e=Math.max(1,Number(s||18));return[...new Set((t||[]).map(o=>String(o||"").toUpperCase()).filter(Boolean))].slice(0,e)}function ht(t,s,e,o,a,n){N();const l="/api/stream/sse.php?symbols="+encodeURIComponent(t.join(","))+"&type="+encodeURIComponent(s)+"&scope=watchlist";let c=!1,i=setTimeout(()=>{a!==w||c||(N(),j(t,s,e,o,a,n))},Math.max(3e3,Number(n.fallbackAfter||5e3)));L=new EventSource(l,{withCredentials:!0}),L.addEventListener("open",()=>{c=!0,i&&(clearTimeout(i),i=null)}),L.addEventListener("message",p=>{if(a===w)try{const u=JSON.parse(p.data||"[]");Array.isArray(u)&&u.length&&e&&e(u)}catch{}}),L.addEventListener("reconnect",()=>{a===w&&(N(),j(t,s,e,o,a,n))}),L.addEventListener("error",p=>{a===w&&(N(),j(t,s,e,o,a,n))})}function j(t,s,e,o,a,n){st();const l=Math.max(4e3,Number(n.interval||ft)),c=et(t,n.maxSymbols||18),i=async()=>{if(a===w){O=new AbortController;try{const p="/api/quotes.php?symbols="+encodeURIComponent(c.join(","))+"&type="+encodeURIComponent(s)+"&visible=1&purpose=watchlist&_="+Date.now(),u=await fetch(p,{credentials:"same-origin",cache:"no-store",signal:O.signal});if(a!==w)return;if(u.ok){const $=await u.json();a===w&&$&&$.items&&e&&e($.items)}}catch(p){p.name}finally{a===w&&(B=setTimeout(i,l))}}};i()}function st(){B&&(clearTimeout(B),B=null),O&&(O.abort(),O=null)}function N(){L&&(L.close(),L=null)}function U(){w+=1,N(),st()}let x=null,I=null,Y=null,T=null,z=null,P=null,R=null,Q=null,m=null,y=0;const yt=[{key:"favorites",label:"Favorites"},{key:"crypto",label:"Crypto"},{key:"forex",label:"Forex"},{key:"stocks",label:"Stocks"},{key:"commodities",label:"Metals"},{key:"futures",label:"Futures"},{key:"arab",label:"Arab"}],xt=["1m","5m","15m","30m","1h","4h","1d"];function Rt(t){t.symbol&&v("symbol",t.symbol.toUpperCase()),t.type&&v("type",t.type),t.tf&&v("tf",t.tf);const s=r("symbol"),e=r("type"),o=r("tf");return`<div class="trade-terminal flex flex-col lg:flex-row h-full mobile-pad">
    <aside id="market-drawer" class="hidden lg:flex flex-col w-[250px] border-r border-line bg-surface shrink-0 overflow-hidden">
      <div class="lg:hidden flex items-center justify-between h-12 px-3 border-b border-line bg-panel">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-muted">Markets</div>
          <strong class="text-sm">Select instrument</strong>
        </div>
        <button class="icon-btn icon-btn-sm" id="close-mob-drawer" aria-label="Close markets">${A.close}</button>
      </div>
      <div class="p-2 border-b border-line">
        <div class="relative">
          <input type="search" class="input pl-7" placeholder="Search symbol..." id="sym-search" />
          <span class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted">${A.search}</span>
        </div>
      </div>
      <div class="flex gap-1 p-2 overflow-x-auto border-b border-line" id="type-tabs">
        ${yt.map(a=>`<button class="btn-xs ${a.key===e?"bg-accent/20 text-accent border-accent/40":"text-muted border-line"} border rounded-md whitespace-nowrap" data-type-tab="${a.key}">${a.label}</button>`).join("")}
      </div>
      <div class="flex-1 overflow-auto p-1" id="symbol-list"><div class="p-4"><div class="loading-spinner mx-auto"></div></div></div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div class="flex items-center justify-between px-2 lg:px-4 h-11 border-b border-line bg-surface shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <button class="lg:hidden w-8 h-8 grid place-items-center rounded border border-line text-muted shrink-0" id="mob-mkt-btn" aria-label="Open markets">${A.menu}</button>
          ${q(s,e,"w-7 h-7 rounded-md shrink-0")}
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
          ${xt.map(a=>`<button class="px-1.5 py-1 text-[10px] rounded shrink-0 ${a===o?"bg-accent/20 text-accent":"text-muted hover:text-text"}" data-tf="${a}">${a}</button>`).join("")}
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
        <div class="text-[10px] text-muted">${h(s)} - ${h(e.toUpperCase())}</div>
      </div>
      <div class="p-3 space-y-3" id="order-body">
        ${at()}
      </div>
    </aside>

    ${gt(s,e)}
  </div>`}function at(){const t=r("orderType")||"MARKET",s=Number(r("amount")||100),e=Number(r("leverage")||10),o=r("market")||"spot",a=r("activeQuote")||{},n=Number(a.price||0);return`<div class="space-y-3" data-order-form>
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
          <option value="MARKET" ${t==="MARKET"?"selected":""}>Market</option>
          <option value="LIMIT" ${t==="LIMIT"?"selected":""}>Limit</option>
        </select>
      </label>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <button class="btn-sell py-3 text-sm font-bold" data-side="SELL"><small class="block text-[9px] opacity-70">Sell</small><span data-sell-price>${n>0?g(n,r("type")):"--"}</span></button>
      <button class="btn-buy py-3 text-sm font-bold" data-side="BUY"><small class="block text-[9px] opacity-70">Buy</small><span data-buy-price>${n>0?g(n*1.0001,r("type")):"--"}</span></button>
    </div>
    <div class="text-center"><span class="spread-display" data-spread-val>Spread: --</span></div>
    <label class="block">
      <span class="text-[10px] text-muted">Margin / Amount (USDT)</span>
      <input type="number" min="1" step="any" class="input mt-1" value="${_(String(s))}" data-amount />
    </label>
    <label class="block">
      <span class="text-[10px] text-muted">Leverage: <strong data-lev-val>${e}x</strong></span>
      <input type="range" min="1" max="100" value="${_(String(e))}" class="w-full mt-1 accent-accent" data-leverage />
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
  </div>`}function gt(t,s){return`<div class="fixed inset-0 z-[230] hidden lg:hidden" id="mobile-order-sheet">
    <div class="absolute inset-0 bg-black/65" data-close-order-sheet></div>
    <div class="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-auto rounded-t-2xl border border-line bg-surface shadow-2xl">
      <div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3">
        <div class="flex items-center gap-2 min-w-0">
          ${q(t,s,"w-8 h-8 rounded-lg shrink-0")}
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider text-muted" id="mobile-order-side-label">Order</div>
            <strong class="text-sm truncate">${h(t)}</strong>
          </div>
        </div>
        <button class="icon-btn icon-btn-sm" data-close-order-sheet aria-label="Close order">${A.close}</button>
      </div>
      <div class="p-4">
        ${at()}
        <button class="btn-primary w-full mt-4 py-3" id="mobile-submit-order" data-submit-order="BUY">Review & Place Order</button>
      </div>
    </div>
  </div>`}function It(t){wt(t)}function At(){y+=1,R&&(R.disconnect(),R=null),x&&(x.remove(),x=null,I=null,Y=null,m=null),T&&(T(),T=null),lt(),U(),document.body.classList.remove("trade-modal-open")}async function wt(t){const s=r("symbol"),e=r("type"),o=r("tf"),a=++y;v("activeQuote",null);const n=dt();$t(t),E(t),kt(t,s,e,a),k(pt(e),{timeout:6500}).then(l=>{b(a,s,e)&&l?.items&&(nt(t,l.items),rt(t,l.items,a),ot(t,l.items,a))}).catch(()=>{if(!b(a,s,e))return;const l=d("#symbol-list",t);l&&(l.innerHTML='<p class="text-muted text-[11px] text-center py-4">Markets unavailable</p>')}),k("/trade/portfolio.php",{timeout:5500}).then(l=>{b(a,s,e)&&l?.positions&&J(t,l.positions)}).catch(()=>{if(!b(a,s,e))return;const l=d("#positions-body",t);l&&(l.innerHTML='<p class="text-muted text-[11px] text-center py-3">Positions unavailable</p>')}),k(`/trade/candles.php?symbol=${encodeURIComponent(s)}&type=${encodeURIComponent(e)}&tf=${encodeURIComponent(o)}&limit=220`,{timeout:1e4}).then(async l=>{await n,b(a,s,e)&&(l?.items?.length?await Ct(t,l.items,a):d("#chart-box",t).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart data unavailable</p>')}).catch(l=>{b(a,s,e)&&(console.error("Chart:",l),d("#chart-box",t).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart unavailable</p>')})}function b(t,s=r("symbol"),e=r("type")){return!(t!==y||s&&String(s).toUpperCase()!==String(r("symbol")||"").toUpperCase()||e&&F(e)!==F(r("type")))}function F(t){const s=String(t||"").toLowerCase();return s==="commodity"?"commodities":s==="stock"?"stocks":s==="future"?"futures":s}function ot(t,s,e=y){T&&(T(),T=null);const o=r("type"),a=r("symbol"),n=o==="crypto"?24:12,l=[...new Set(s.slice(0,n).map(c=>String(c.symbol||"").toUpperCase()).filter(Boolean).filter(c=>c!==String(a||"").toUpperCase()))];l.length&&(T=vt(l,o,c=>{if(!b(e,a,o))return;W(t,c);const i=d("#conn-dot",t);i&&(i.classList.remove("bg-muted","bg-sell"),i.classList.add("bg-buy"),i.title="Live")},null,{interval:o==="crypto"?5200:7200,maxSymbols:n}))}function kt(t,s,e,o=y){lt();const a=e==="crypto"?2200:3e3,n=async()=>{if(b(o,s,e)){P=new AbortController;try{const l=`/quotes.php?symbol=${encodeURIComponent(s)}&type=${encodeURIComponent(e)}&purpose=focus`,c=await k(l,{timeout:4500,signal:P.signal});if(!b(o,s,e))return;c?.items?.[0]&&Lt(t,c.items[0],o)}catch{b(o,s,e)&&St(t)}finally{b(o,s,e)&&(z=setTimeout(n,a))}}};n()}function lt(){z&&(clearTimeout(z),z=null),P&&(P.abort(),P=null)}function St(t){const s=d("#conn-dot",t);s&&(s.classList.remove("bg-muted","bg-buy"),s.classList.add("bg-sell"),s.title="Disconnected")}function Lt(t,s,e=y){if(!b(e,String(s?.symbol||r("symbol")).toUpperCase(),s?.type||r("type")))return;const o=Number(s.price||s.q_price||0),a=Number(s.change_pct||s.q_change||0),n=r("type");v("activeQuote",{...s,price:o,change_pct:a}),W(t,[{...s,price:o,change_pct:a}]);const l=d("#live-price",t),c=d("#live-change",t);l&&(l.textContent=o>0?g(o,n):"--"),c&&(c.textContent=K(a),c.className=`text-[10px] ${a>=0?"text-buy":"text-sell"}`),C("[data-sell-price]",t).forEach(i=>{i.textContent=o>0?g(o,n):"--"}),C("[data-buy-price]",t).forEach(i=>{i.textContent=o>0?g(o*1.0001,n):"--"}),C("[data-spread-val]",t).forEach(i=>{i.textContent=o>0?`Spread: ${g(o*1e-4,n)}`:"Spread: --"}),E(t),Et(o,e)}function E(t){const s=r("activeQuote")||{},e=Number(s.price||0),o=r("wallet")||{},a=r("mode")==="real"?o.real||{}:o.demo||{};C("[data-order-form]",t).forEach(n=>{const l=Number(d("[data-amount]",n)?.value||r("amount")||0),c=Number(d("[data-leverage]",n)?.value||r("leverage")||1),p=(d("[data-market-type]",n)?.value||r("market")||"spot")==="perp"?c:1,u=e>0?l*p/e:0,$=l*p,S=d("[data-lev-val]",n);S&&(S.textContent=`${c}x`);const M=d("[data-est-units]",n);M&&(M.textContent=u>0?u.toFixed(u>=10?3:6):"--");const G=d("[data-est-notional]",n);G&&(G.textContent=l>0?`${D($)} USDT`:"--");const X=d("[data-avail-bal]",n);X&&(X.textContent=`${D(a.available||0)} ${a.currency||""}`)})}function nt(t,s){const e=d("#symbol-list",t);if(!e)return;const o=r("symbol"),a=s.slice(0,60);e.innerHTML=a.map(n=>{const l=String(n.symbol||"").toUpperCase(),c=n.type||r("type"),i=Number(n.price||n.q_price||0),p=Number(n.change_pct||n.q_change||0),u=!(i>0);return`<div class="symbol-row ${l===o?"active":""}" data-sym="${_(l)}" data-stype="${_(c)}">
      ${q(l,c,"w-7 h-7 rounded-md shrink-0")}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <div class="font-semibold text-[11px] truncate">${h(l)}</div>
          <span class="status-dot ${u?"bg-sell":Ut(n)}"></span>
        </div>
        <div class="text-[9px] text-muted truncate">${h(n.name||c)}</div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-[11px] font-mono" data-price-cell>${i>0?g(i,c):"--"}</div>
        <div class="text-[9px] ${p>=0?"text-buy":"text-sell"}" data-change-cell>${u?"Unavailable":K(p)}</div>
      </div>
    </div>`}).join("")}async function rt(t,s,e=y){const o=r("type"),a=s.slice(0,o==="crypto"?18:10).filter(i=>!(Number(i.price||i.q_price||0)>0)).map(i=>String(i.symbol||"").toUpperCase()).filter(Boolean);if(!a.length)return;const n=o==="crypto"?12:2,l=o==="crypto"?18:6,c=[...new Set(a)].slice(0,l);for(let i=0;i<c.length;i+=n){const p=c.slice(i,i+n),u=await k(`/quotes.php?symbols=${encodeURIComponent(p.join(","))}&type=${encodeURIComponent(o)}&cache_only=1&purpose=watchlist`,{timeout:3500}).catch(()=>null);if(!b(e))return;u?.items?.length&&W(t,u.items)}}function W(t,s){s?.length&&s.forEach(e=>{const o=String(e.symbol||"").toUpperCase();if(!o)return;const a=C(".symbol-row",t).find(u=>u.dataset.sym===o);if(!a)return;const n=a.dataset.stype||r("type"),l=Number(e.price||e.q_price||0),c=Number(e.change_pct||e.q_change||0),i=d("[data-price-cell]",a),p=d("[data-change-cell]",a);i&&l>0&&(i.textContent=g(l,n)),p&&(p.textContent=K(c),p.className=`text-[9px] ${c>=0?"text-buy":"text-sell"}`)})}function J(t,s){const e=d("#positions-body",t),o=d("#pos-count",t);if(o&&(o.textContent=`(${s.length})`),!!e){if(!s.length){e.innerHTML='<p class="text-muted text-[11px] text-center py-3">No open positions</p>';return}e.innerHTML=`<div class="overflow-x-auto"><table class="min-w-[620px] lg:min-w-0 w-full text-[11px]">
    <thead class="text-[9px] text-muted uppercase"><tr>
      <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">Mark</th><th class="text-right py-1">Size</th><th class="text-right py-1">Lev</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1"></th>
    </tr></thead>
    <tbody>${s.slice(0,12).map(a=>{const n=Number(a.pnl||a.unrealized_pnl||0),l=String(a.symbol||"").replace("@R@",""),c=a.asset_type||r("type"),i=Number(a.mark_price||a.current_price||a.price||0),p=a.position_id||a.id||"",u=String(a.side||"buy").toUpperCase()==="SELL"?"SELL":"BUY";return`<tr class="border-t border-line/50 hover:bg-panel/50">
        <td class="px-3 py-1.5 font-semibold">${h(l)}</td>
        <td><span class="badge-${u==="BUY"?"buy":"sell"}">${h(u)}</span></td>
        <td class="text-muted">${h(a.market_type||"spot")}</td>
        <td class="text-right font-mono">${g(a.entry_price||a.open_price,c)}</td>
        <td class="text-right font-mono">${i>0?g(i,c):"--"}</td>
        <td class="text-right font-mono">${D(a.qty||a.amount||a.size||a.units||0)}</td>
        <td class="text-right font-mono">${h(String(a.leverage||1))}x</td>
        <td class="text-right font-mono ${n>=0?"text-buy":"text-sell"}">${D(n)}</td>
        <td class="text-right px-3">${p?`<button class="btn-xs btn-ghost text-sell" data-close="${_(p)}">Close</button>`:""}</td>
      </tr>`}).join("")}</tbody>
  </table></div>`}}async function Ct(t,s,e=y){if(!b(e))return;const o=d("#chart-box",t);if(!o)return;const{createChart:a}=await dt();if(!b(e))return;o.innerHTML="",x=a(o,{layout:{background:{color:"#060A14"},textColor:"#8ba1cf",fontSize:11},grid:{vertLines:{color:"rgba(129,160,220,0.04)"},horzLines:{color:"rgba(129,160,220,0.04)"}},crosshair:{mode:0,vertLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"},horzLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"}},timeScale:{timeVisible:!0,secondsVisible:!1,borderColor:"rgba(129,160,220,0.08)",rightOffset:4},rightPriceScale:{borderColor:"rgba(129,160,220,0.08)"},width:Math.max(320,o.clientWidth),height:Math.max(260,o.clientHeight)}),I=x.addCandlestickSeries({upColor:"#00c087",downColor:"#f6465d",borderUpColor:"#00c087",borderDownColor:"#f6465d",wickUpColor:"#00c087",wickDownColor:"#f6465d"}),Y=x.addHistogramSeries({priceFormat:{type:"volume"},priceScaleId:"vol"}),x.priceScale("vol").applyOptions({scaleMargins:{top:.84,bottom:0}});const n=s.map(l=>({time:Number(l.time||l.t),open:Number(l.open||l.o),high:Number(l.high||l.h),low:Number(l.low||l.l),close:Number(l.close||l.c),volume:Number(l.volume||l.v||0)})).filter(l=>l.time>0&&l.open>0).sort((l,c)=>l.time-c.time);I.setData(n.map(({time:l,open:c,high:i,low:p,close:u})=>({time:l,open:c,high:i,low:p,close:u}))),Y.setData(n.map(l=>({time:l.time,value:l.volume,color:l.close>=l.open?"rgba(0,192,135,0.25)":"rgba(246,70,93,0.2)"}))),m=n.length?{...n[n.length-1]}:null,x.timeScale().fitContent(),R=new ResizeObserver(()=>{!x||!o||x.applyOptions({width:Math.max(320,o.clientWidth),height:Math.max(260,o.clientHeight)})}),R.observe(o)}function $t(t){d("#mob-mkt-btn",t)?.addEventListener("click",()=>Tt(t)),d("#close-mob-drawer",t)?.addEventListener("click",()=>V(t)),f(t,"[data-sym]","click",(s,e)=>{V(t),localStorage.setItem("vp_symbol",e.dataset.sym),localStorage.setItem("vp_type",e.dataset.stype||r("type")),H("trade",{symbol:e.dataset.sym,type:e.dataset.stype||r("type"),tf:r("tf")})}),f(t,"[data-tf]","click",(s,e)=>{v("tf",e.dataset.tf),localStorage.setItem("vp_tf",e.dataset.tf),H("trade",{symbol:r("symbol"),type:r("type"),tf:e.dataset.tf})}),f(t,"[data-type-tab]","click",async(s,e)=>{v("type",e.dataset.typeTab),localStorage.setItem("vp_type",e.dataset.typeTab);const o=await k(pt(e.dataset.typeTab),{timeout:6e3}).catch(()=>null);if(o?.items){const a=o.items.find(n=>n?.symbol);if(a?.symbol&&F(e.dataset.typeTab)!=="favorites"){const n=String(a.symbol).toUpperCase();localStorage.setItem("vp_symbol",n),H("trade",{symbol:n,type:e.dataset.typeTab,tf:r("tf")});return}nt(t,o.items),rt(t,o.items,y),ot(t,o.items,y)}C("[data-type-tab]",t).forEach(a=>{const n=a===e;a.classList.toggle("bg-accent/20",n),a.classList.toggle("text-accent",n),a.classList.toggle("border-accent/40",n)})}),f(t,"[data-open-order]","click",(s,e)=>_t(t,e.dataset.openOrder)),f(t,"[data-close-order-sheet]","click",()=>it(t)),f(t,"[data-submit-order]","click",(s,e)=>Z(e.dataset.submitOrder,t,d("#mobile-order-sheet [data-order-form]",t))),f(t,"[data-side]","click",(s,e)=>{const o=e.closest("#mobile-order-sheet"),a=e.closest("[data-order-form]");if(o){ct(t,e.dataset.side);return}Z(e.dataset.side,t,a)}),f(t,"[data-order-type]","change",(s,e)=>v("orderType",e.value)),f(t,"[data-market-type]","change",(s,e)=>{v("market",e.value),localStorage.setItem("vp_market",e.value),E(t)}),f(t,"[data-leverage]","input",(s,e)=>{v("leverage",Number(e.value)),tt(t,"leverage",e.value),E(t)}),f(t,"[data-amount]","input",(s,e)=>{v("amount",Number(e.value)),tt(t,"amount",e.value),E(t)}),f(t,"[data-close]","click",async(s,e)=>{await k("/trade/close_position.php",{method:"POST",body:{position_id:e.dataset.close},timeout:8e3}).catch(()=>null);const o=await k("/trade/portfolio.php",{timeout:5e3}).catch(()=>null);o?.positions&&J(t,o.positions)}),d("#sym-search",t)?.addEventListener("input",s=>{const e=s.target.value.toLowerCase();C(".symbol-row",t).forEach(o=>{o.style.display=o.dataset.sym.toLowerCase().includes(e)?"":"none"})})}async function Z(t,s,e){const o=r("activeQuote")||{},a=Number(o.price||0);if(!a){alert("No live price available yet. Please wait for the quote to load.");return}const n=e||d("[data-order-form]",s)||s,l=Number(d("[data-amount]",n)?.value||r("amount")||0),c=Number(d("[data-leverage]",n)?.value||r("leverage")||1),i=Number(d("[data-tp]",n)?.value||0),p=Number(d("[data-sl]",n)?.value||0),u=d("[data-market-type]",n)?.value||r("market")||"spot",$=d("[data-order-type]",n)?.value||r("orderType")||"MARKET";if(l<=0){alert("Enter a valid amount first.");return}if(t==="BUY"&&p>0&&p>=a){alert("For BUY orders, Stop Loss should be below the current price.");return}if(t==="SELL"&&p>0&&p<=a){alert("For SELL orders, Stop Loss should be above the current price.");return}try{const S=await k("/trade/place_order.php",{method:"POST",body:{symbol:r("symbol"),asset_type:r("type"),market_type:u,side:t,order_type:$,usd:l,leverage:c,tp:i||void 0,sl:p||void 0,price:a,mode:r("mode")},timeout:1e4});if(S&&S.ok===!1){alert(S.error||"Order failed");return}it(s);const M=await k("/trade/portfolio.php",{timeout:5e3}).catch(()=>null);M?.positions&&J(s,M.positions)}catch(S){console.error("Order failed:",S),alert(S.message||"Order failed")}}function Tt(t){const s=d("#market-drawer",t);s&&(s.classList.add("mobile-market-open"),s.classList.remove("hidden"),document.body.classList.add("trade-modal-open"))}function V(t){const s=d("#market-drawer",t);s&&(s.classList.remove("mobile-market-open"),window.innerWidth<1024&&s.classList.add("hidden"),document.body.classList.remove("trade-modal-open"))}function _t(t,s){const e=d("#mobile-order-sheet",t);e&&(ct(t,s),e.classList.remove("hidden"),document.body.classList.add("trade-modal-open"),E(t))}function it(t){const s=d("#mobile-order-sheet",t);s&&s.classList.add("hidden"),document.body.classList.remove("trade-modal-open")}function ct(t,s){const e=d("#mobile-submit-order",t),o=d("#mobile-order-side-label",t);e&&(e.dataset.submitOrder=s,e.textContent=`Review & ${s==="BUY"?"Buy":"Sell"}`,e.className=`${s==="BUY"?"btn-buy":"btn-sell"} w-full mt-4 py-3`),o&&(o.textContent=`${s} order`)}function tt(t,s,e){C(`[data-${s}]`,t).forEach(o=>{String(o.value)!==String(e)&&(o.value=e)})}function Et(t,s=y){if(!b(s)||!I||!m||!(t>0))return;const e=Mt();e<=m.time?(m.close=t,m.high=Math.max(m.high,t),m.low=Math.min(m.low,t)):m={time:e,open:m.close,high:Math.max(m.close,t),low:Math.min(m.close,t),close:t,volume:0},I.update({time:m.time,open:m.open,high:m.high,low:m.low,close:m.close})}function Mt(){const t=Nt(r("tf")),s=Math.floor(Date.now()/1e3);return Math.floor(s/t)*t}function Nt(t){return{"1m":60,"5m":300,"15m":900,"30m":1800,"1h":3600,"4h":14400,"1d":86400}[t]||60}function dt(){return Q||(Q=ut(()=>import("./chart-DbDccfIU.js"),[])),Q}function pt(t){const s=F(t||"crypto");return`/markets.php?type=${encodeURIComponent(s==="favorites"?"crypto":s)}&scope=trade&supported=1&lite=1&with_quotes=1`}function Ut(t){const s=String(t?.source||"").toLowerCase();return String(t?.timing_class||"").toLowerCase()==="stale"||t?.is_stale||s.includes("yahoo")?"bg-spread":"bg-buy"}function q(t,s,e){return`<span class="${e} grid place-items-center overflow-hidden border border-line bg-surface">
    <img src="${_(mt({symbol:t,type:s},s))}" class="h-full w-full object-cover" alt="${_(t)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';" />
    <b class="hidden h-full w-full place-items-center bg-accent/20 text-[9px] font-black">${h(bt(t))}</b>
  </span>`}export{At as cleanup,It as mount,Rt as render};
