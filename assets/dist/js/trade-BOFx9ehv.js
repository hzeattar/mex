import{s as h,g as r,i as z,e as f,a as k,$ as i,b as L,c as y,_ as mt,d as v,n as F,f as C,m as N,p as K}from"./main-Vy0nb4vq.js";import{m as bt,a as ft}from"./marketIcon-BqfrwX_4.js";let j=null,P=null,w=0,$=null;const vt=6500;function yt(t,e,s,a,o={}){if(O(),!t||!t.length)return O;const n=++w,l=et(t,o.maxSymbols||18);return l.length&&(typeof EventSource=="function"?ht(l,e,s,a,n,o):D(l,e,s,a,n,o)),O}function et(t,e){const s=Math.max(1,Number(e||18));return[...new Set((t||[]).map(a=>String(a||"").toUpperCase()).filter(Boolean))].slice(0,s)}function ht(t,e,s,a,o,n){M();const l="/api/stream/sse.php?symbols="+encodeURIComponent(t.join(","))+"&type="+encodeURIComponent(e)+"&scope=watchlist";let c=!1,d=setTimeout(()=>{o!==w||c||(M(),D(t,e,s,a,o,n))},Math.max(3e3,Number(n.fallbackAfter||5e3)));$=new EventSource(l,{withCredentials:!0}),$.addEventListener("open",()=>{c=!0,d&&(clearTimeout(d),d=null)}),$.addEventListener("message",p=>{if(o===w)try{const u=JSON.parse(p.data||"[]");Array.isArray(u)&&u.length&&s&&s(u)}catch{}}),$.addEventListener("reconnect",()=>{o===w&&(M(),D(t,e,s,a,o,n))}),$.addEventListener("error",p=>{o===w&&(M(),D(t,e,s,a,o,n))})}function D(t,e,s,a,o,n){st();const l=Math.max(4e3,Number(n.interval||vt)),c=et(t,n.maxSymbols||18),d=async()=>{if(o===w){P=new AbortController;try{const p="/api/quotes.php?symbols="+encodeURIComponent(c.join(","))+"&type="+encodeURIComponent(e)+"&visible=1&purpose=watchlist&_="+Date.now(),u=await fetch(p,{credentials:"same-origin",cache:"no-store",signal:P.signal});if(o!==w)return;if(u.ok){const _=await u.json();o===w&&_&&_.items&&s&&s(_.items)}}catch(p){p.name}finally{o===w&&(j=setTimeout(d,l))}}};d()}function st(){j&&(clearTimeout(j),j=null),P&&(P.abort(),P=null)}function M(){$&&($.close(),$=null)}function O(){w+=1,M(),st()}let x=null,A=null,Q=null,T=null,Y=null,R=null,I=null,H=null,m=null,g=0;const gt=[{key:"favorites",label:"Favorites"},{key:"crypto",label:"Crypto"},{key:"forex",label:"Forex"},{key:"stocks",label:"Stocks"},{key:"commodities",label:"Commodities"},{key:"futures",label:"Futures"},{key:"arab",label:"Arab"}],xt=["1m","5m","15m","30m","1h","4h","1d"];function jt(t){t.symbol&&h("symbol",t.symbol.toUpperCase()),t.type&&h("type",t.type),t.tf&&h("tf",t.tf);const e=r("symbol"),s=r("type"),a=r("tf");return`<div class="trade-terminal flex flex-col lg:flex-row h-full mobile-pad">
    <aside id="market-drawer" class="hidden lg:flex flex-col w-[250px] border-r border-line bg-surface shrink-0 overflow-hidden">
      <div class="lg:hidden flex items-center justify-between h-12 px-3 border-b border-line bg-panel">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-muted">Markets</div>
          <strong class="text-sm">Select instrument</strong>
        </div>
        <button class="icon-btn icon-btn-sm" id="close-mob-drawer" aria-label="Close markets">${z.close}</button>
      </div>
      <div class="p-2 border-b border-line">
        <div class="relative">
          <input type="search" class="input pl-7" placeholder="Search symbol..." id="sym-search" />
          <span class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted">${z.search}</span>
        </div>
      </div>
      <div class="flex gap-1 p-2 overflow-x-auto border-b border-line" id="type-tabs">
        ${gt.map(o=>`<button class="btn-xs ${o.key===s?"bg-accent/20 text-accent border-accent/40":"text-muted border-line"} border rounded-md whitespace-nowrap" data-type-tab="${o.key}">${o.label}</button>`).join("")}
      </div>
      <div class="flex-1 overflow-auto p-1" id="symbol-list"><div class="p-4"><div class="loading-spinner mx-auto"></div></div></div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div class="flex items-center justify-between px-2 lg:px-4 h-11 border-b border-line bg-surface shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <button class="lg:hidden w-8 h-8 grid place-items-center rounded border border-line text-muted shrink-0" id="mob-mkt-btn" aria-label="Open markets">${z.menu}</button>
          ${J(e,s,"w-7 h-7 rounded-md shrink-0")}
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <strong class="text-sm truncate" id="sym-name">${f(e)}</strong>
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
          ${xt.map(o=>`<button class="px-1.5 py-1 text-[10px] rounded shrink-0 ${o===a?"bg-accent/20 text-accent":"text-muted hover:text-text"}" data-tf="${o}">${o}</button>`).join("")}
        </div>
      </div>

      <div class="flex-1 relative min-h-[260px] bg-bg" id="chart-box">
        <div class="absolute inset-0 flex items-center justify-center"><div class="text-center"><div class="loading-spinner mx-auto"></div><p class="text-[10px] text-muted mt-2">Loading live chart...</p></div></div>
      </div>

      <div class="lg:hidden grid grid-cols-2 gap-2 p-2 border-t border-line bg-surface shrink-0">
        <button class="btn-sell py-3" data-open-order="SELL">SELL</button>
        <button class="btn-buy py-3" data-open-order="BUY">BUY</button>
      </div>

      <div class="border-t border-line bg-surface max-h-[260px] lg:max-h-[180px] overflow-auto shrink-0" id="positions-section">
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
        <div class="text-[10px] text-muted">${f(e)} - ${f(s.toUpperCase())}</div>
      </div>
      <div class="p-3 space-y-3" id="order-body">
        ${at()}
      </div>
    </aside>

    ${wt(e,s)}
  </div>`}function at(){const t=r("orderType")||"MARKET",e=Number(r("amount")||100),s=Number(r("leverage")||10),a=r("market")||"spot",o=r("activeQuote")||{},n=Number(o.price||0);return`<div class="space-y-3 order-ticket-panel" data-order-form>
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
      <button class="btn-sell trade-price-button" data-side="SELL"><small>Sell</small><span data-sell-price>${n>0?y(n,r("type")):"--"}</span></button>
      <button class="btn-buy trade-price-button" data-side="BUY"><small>Buy</small><span data-buy-price>${n>0?y(n*1.0001,r("type")):"--"}</span></button>
    </div>
    <div class="text-center"><span class="spread-display" data-spread-val>Spread: --</span></div>
    <div class="order-summary-box">
      <span><small>Available</small><strong data-avail-bal>--</strong></span>
      <span><small>Est. Units</small><strong data-est-units>--</strong></span>
      <span><small>Notional</small><strong data-est-notional>--</strong></span>
    </div>
    <label class="block">
      <span class="text-[10px] text-muted">Margin / Amount (USDT)</span>
      <input type="number" min="1" step="any" class="input mt-1" value="${L(String(e))}" data-amount />
    </label>
    <label class="block">
      <span class="text-[10px] text-muted">Leverage: <strong data-lev-val>${s}x</strong></span>
      <input type="range" min="1" max="100" value="${L(String(s))}" class="w-full mt-1 accent-accent" data-leverage />
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
    <p class="order-ticket-note">Orders execute internally on VertexPluse at the current platform quote. Use TP/SL to document target risk for review.</p>
  </div>`}function wt(t,e){return`<div class="fixed inset-0 z-[230] hidden lg:hidden" id="mobile-order-sheet">
    <div class="absolute inset-0 bg-black/65" data-close-order-sheet></div>
    <div class="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-auto rounded-t-2xl border border-line bg-surface shadow-2xl">
      <div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3">
        <div class="flex items-center gap-2 min-w-0">
          ${J(t,e,"w-8 h-8 rounded-lg shrink-0")}
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider text-muted" id="mobile-order-side-label">Order</div>
            <strong class="text-sm truncate">${f(t)}</strong>
          </div>
        </div>
        <button class="icon-btn icon-btn-sm" data-close-order-sheet aria-label="Close order">${z.close}</button>
      </div>
      <div class="p-4">
        ${at()}
        <div class="order-action-sticky">
          <button class="btn-primary w-full py-3" id="mobile-submit-order" data-submit-order="BUY">Review & Place Order</button>
        </div>
      </div>
    </div>
  </div>`}function Dt(t){kt(t)}function Yt(){g+=1,I&&(I.disconnect(),I=null),x&&(x.remove(),x=null,A=null,Q=null,m=null),T&&(T(),T=null),lt(),O(),document.body.classList.remove("trade-modal-open")}async function kt(t){const e=r("symbol"),s=r("type"),a=r("tf"),o=++g;h("activeQuote",null);const n=pt();Et(t),E(t),St(t,e,s,o),k(ut(s),{timeout:6500}).then(l=>{b(o,e,s)&&l?.items&&(nt(t,l.items),rt(t,l.items,o),ot(t,l.items,o))}).catch(()=>{if(!b(o,e,s))return;const l=i("#symbol-list",t);l&&(l.innerHTML='<p class="text-muted text-[11px] text-center py-4">Markets unavailable</p>')}),k("/trade/portfolio.php",{timeout:5500}).then(l=>{b(o,e,s)&&l?.positions&&W(t,l.positions)}).catch(()=>{if(!b(o,e,s))return;const l=i("#positions-body",t);l&&(l.innerHTML='<p class="text-muted text-[11px] text-center py-3">Positions unavailable</p>')}),k(`/trade/candles.php?symbol=${encodeURIComponent(e)}&type=${encodeURIComponent(s)}&tf=${encodeURIComponent(a)}&limit=220`,{timeout:1e4}).then(async l=>{await n,b(o,e,s)&&(l?.items?.length?await Tt(t,l.items,o):i("#chart-box",t).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart data unavailable</p>')}).catch(l=>{b(o,e,s)&&(console.error("Chart:",l),i("#chart-box",t).innerHTML='<p class="text-muted text-center p-8 text-xs">Chart unavailable</p>')})}function b(t,e=r("symbol"),s=r("type")){return!(t!==g||e&&String(e).toUpperCase()!==String(r("symbol")||"").toUpperCase()||s&&B(s)!==B(r("type")))}function B(t){const e=String(t||"").toLowerCase();return e==="commodity"?"commodities":e==="stock"?"stocks":e==="future"?"futures":e}function ot(t,e,s=g){T&&(T(),T=null);const a=r("type"),o=r("symbol"),n=a==="crypto"?24:12,l=[...new Set(e.slice(0,n).map(c=>String(c.symbol||"").toUpperCase()).filter(Boolean).filter(c=>c!==String(o||"").toUpperCase()))];l.length&&(T=yt(l,a,c=>{if(!b(s,o,a))return;q(t,c);const d=i("#conn-dot",t);d&&(d.classList.remove("bg-muted","bg-sell"),d.classList.add("bg-buy"),d.title="Live")},null,{interval:a==="crypto"?5200:7200,maxSymbols:n}))}function St(t,e,s,a=g){lt();const o=s==="crypto"?2200:3e3,n=async()=>{if(b(a,e,s)){R=new AbortController;try{const l=`/quotes.php?symbol=${encodeURIComponent(e)}&type=${encodeURIComponent(s)}&purpose=focus`,c=await k(l,{timeout:4500,signal:R.signal});if(!b(a,e,s))return;c?.items?.[0]&&Ct(t,c.items[0],a)}catch{b(a,e,s)&&$t(t)}finally{b(a,e,s)&&(Y=setTimeout(n,o))}}};n()}function lt(){Y&&(clearTimeout(Y),Y=null),R&&(R.abort(),R=null)}function $t(t){const e=i("#conn-dot",t);e&&(e.classList.remove("bg-muted","bg-buy"),e.classList.add("bg-sell"),e.title="Disconnected")}function Ct(t,e,s=g){if(!b(s,String(e?.symbol||r("symbol")).toUpperCase(),e?.type||r("type")))return;const a=Number(e.price||e.q_price||0),o=Number(e.change_pct||e.q_change||0),n=r("type");h("activeQuote",{...e,price:a,change_pct:o}),q(t,[{...e,price:a,change_pct:o}]);const l=i("#live-price",t),c=i("#live-change",t);l&&(l.textContent=a>0?y(a,n):"--"),c&&(c.textContent=K(o),c.className=`text-[10px] ${o>=0?"text-buy":"text-sell"}`);const d=i("#quote-state",t);if(d){const p=It(e);d.textContent=p,d.className=`status-chip ${At(p)} !text-[8px] !px-1.5 !py-0.5`}C("[data-sell-price]",t).forEach(p=>{p.textContent=a>0?y(a,n):"--"}),C("[data-buy-price]",t).forEach(p=>{p.textContent=a>0?y(a*1.0001,n):"--"}),C("[data-spread-val]",t).forEach(p=>{p.textContent=a>0?`Spread: ${y(a*1e-4,n)}`:"Spread: --"}),E(t),Mt(a,s)}function E(t){const e=r("activeQuote")||{},s=Number(e.price||0),a=r("wallet")||{},o=r("mode")==="real"?a.real||{}:a.demo||{};C("[data-order-form]",t).forEach(n=>{const l=Number(i("[data-amount]",n)?.value||r("amount")||0),c=Number(i("[data-leverage]",n)?.value||r("leverage")||1),p=(i("[data-market-type]",n)?.value||r("market")||"spot")==="perp"?c:1,u=s>0?l*p/s:0,_=l*p,S=i("[data-lev-val]",n);S&&(S.textContent=`${c}x`);const U=i("[data-est-units]",n);U&&(U.textContent=u>0?u.toFixed(u>=10?3:6):"--");const G=i("[data-est-notional]",n);G&&(G.textContent=l>0?`${N(_)} USDT`:"--");const X=i("[data-avail-bal]",n);X&&(X.textContent=`${N(o.available||0)} ${o.currency||""}`)})}function nt(t,e){const s=i("#symbol-list",t);if(!s)return;const a=r("symbol"),o=e.slice(0,60);s.innerHTML=o.map(n=>{const l=String(n.symbol||"").toUpperCase(),c=n.type||r("type"),d=Number(n.price||n.q_price||0),p=Number(n.change_pct||n.q_change||0),u=!(d>0);return`<div class="symbol-row ${l===a?"active":""}" data-sym="${L(l)}" data-stype="${L(c)}">
      ${J(l,c,"w-7 h-7 rounded-md shrink-0")}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <div class="font-semibold text-[11px] truncate">${f(l)}</div>
          <span class="status-dot ${u?"bg-sell":Rt(n)}"></span>
        </div>
        <div class="text-[9px] text-muted truncate">${f(n.name||c)}</div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-[11px] font-mono" data-price-cell>${d>0?y(d,c):"--"}</div>
        <div class="text-[9px] ${p>=0?"text-buy":"text-sell"}" data-change-cell>${u?"Unavailable":K(p)}</div>
      </div>
    </div>`}).join("")}async function rt(t,e,s=g){const a=r("type"),o=e.slice(0,a==="crypto"?18:10).filter(d=>!(Number(d.price||d.q_price||0)>0)).map(d=>String(d.symbol||"").toUpperCase()).filter(Boolean);if(!o.length)return;const n=a==="crypto"?12:2,l=a==="crypto"?18:6,c=[...new Set(o)].slice(0,l);for(let d=0;d<c.length;d+=n){const p=c.slice(d,d+n),u=await k(`/quotes.php?symbols=${encodeURIComponent(p.join(","))}&type=${encodeURIComponent(a)}&cache_only=1&purpose=watchlist`,{timeout:3500}).catch(()=>null);if(!b(s))return;u?.items?.length&&q(t,u.items)}}function q(t,e){e?.length&&e.forEach(s=>{const a=String(s.symbol||"").toUpperCase();if(!a)return;const o=C(".symbol-row",t).find(u=>u.dataset.sym===a);if(!o)return;const n=o.dataset.stype||r("type"),l=Number(s.price||s.q_price||0),c=Number(s.change_pct||s.q_change||0),d=i("[data-price-cell]",o),p=i("[data-change-cell]",o);d&&l>0&&(d.textContent=y(l,n)),p&&(p.textContent=K(c),p.className=`text-[9px] ${c>=0?"text-buy":"text-sell"}`)})}function W(t,e){const s=i("#positions-body",t),a=i("#pos-count",t);if(a&&(a.textContent=`(${e.length})`),!!s){if(!e.length){s.innerHTML='<p class="text-muted text-[11px] text-center py-3">No open positions</p>';return}s.innerHTML=`
    <div class="trade-position-cards lg:hidden">
      ${e.slice(0,12).map(_t).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[620px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">Mark</th><th class="text-right py-1">Size</th><th class="text-right py-1">Lev</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1"></th>
      </tr></thead>
      <tbody>${e.slice(0,12).map(Lt).join("")}</tbody>
    </table></div>`}}function it(t){const e=Number(t.pnl||t.unrealized_pnl||0),s=String(t.symbol||"").replace("@R@",""),a=t.asset_type||r("type"),o=Number(t.mark_price||t.current_price||t.price||0),n=t.position_id||t.id||"",l=String(t.side||"buy").toUpperCase()==="SELL"?"SELL":"BUY";return{pnl:e,cleanSymbol:s,posType:a,mark:o,id:n,side:l}}function Lt(t){const{pnl:e,cleanSymbol:s,posType:a,mark:o,id:n,side:l}=it(t);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${f(s)}</td>
    <td><span class="badge-${l==="BUY"?"buy":"sell"}">${f(l)}</span></td>
    <td class="text-muted">${f(t.market_type||"spot")}</td>
    <td class="text-right font-mono">${y(t.entry_price||t.open_price,a)}</td>
    <td class="text-right font-mono">${o>0?y(o,a):"--"}</td>
    <td class="text-right font-mono">${N(t.qty||t.amount||t.size||t.units||0)}</td>
    <td class="text-right font-mono">${f(String(t.leverage||1))}x</td>
    <td class="text-right font-mono ${e>=0?"text-buy":"text-sell"}">${N(e)}</td>
    <td class="text-right px-3">${n?`<button class="btn-xs btn-ghost text-sell" data-close="${L(n)}">Close</button>`:""}</td>
  </tr>`}function _t(t){const{pnl:e,cleanSymbol:s,posType:a,mark:o,id:n,side:l}=it(t);return`<article class="trade-position-card">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${f(s)}</strong>
        <small>${f(t.market_type||"spot")} - ${f(t.created_at||t.opened_at||"")}</small>
      </div>
      <span class="badge-${l==="BUY"?"buy":"sell"}">${f(l)}</span>
    </div>
    <div class="trade-position-metrics">
      <span><small>Entry</small><strong>${y(t.entry_price||t.open_price,a)}</strong></span>
      <span><small>Mark</small><strong>${o>0?y(o,a):"--"}</strong></span>
      <span><small>Size</small><strong>${N(t.qty||t.amount||t.size||t.units||0)}</strong></span>
      <span><small>PnL</small><strong class="${e>=0?"text-buy":"text-sell"}">${N(e)}</strong></span>
    </div>
    ${n?`<button class="btn-xs btn-ghost text-sell w-full" data-close="${L(n)}">Close position</button>`:""}
  </article>`}async function Tt(t,e,s=g){if(!b(s))return;const a=i("#chart-box",t);if(!a)return;const{createChart:o}=await pt();if(!b(s))return;a.innerHTML="",x=o(a,{layout:{background:{color:"#060A14"},textColor:"#8ba1cf",fontSize:11},grid:{vertLines:{color:"rgba(129,160,220,0.04)"},horzLines:{color:"rgba(129,160,220,0.04)"}},crosshair:{mode:0,vertLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"},horzLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"}},timeScale:{timeVisible:!0,secondsVisible:!1,borderColor:"rgba(129,160,220,0.08)",rightOffset:4},rightPriceScale:{borderColor:"rgba(129,160,220,0.08)"},width:Math.max(320,a.clientWidth),height:Math.max(260,a.clientHeight)}),A=x.addCandlestickSeries({upColor:"#00c087",downColor:"#f6465d",borderUpColor:"#00c087",borderDownColor:"#f6465d",wickUpColor:"#00c087",wickDownColor:"#f6465d"}),Q=x.addHistogramSeries({priceFormat:{type:"volume"},priceScaleId:"vol"}),x.priceScale("vol").applyOptions({scaleMargins:{top:.84,bottom:0}});const n=e.map(l=>({time:Number(l.time||l.t),open:Number(l.open||l.o),high:Number(l.high||l.h),low:Number(l.low||l.l),close:Number(l.close||l.c),volume:Number(l.volume||l.v||0)})).filter(l=>l.time>0&&l.open>0).sort((l,c)=>l.time-c.time);A.setData(n.map(({time:l,open:c,high:d,low:p,close:u})=>({time:l,open:c,high:d,low:p,close:u}))),Q.setData(n.map(l=>({time:l.time,value:l.volume,color:l.close>=l.open?"rgba(0,192,135,0.25)":"rgba(246,70,93,0.2)"}))),m=n.length?{...n[n.length-1]}:null,x.timeScale().fitContent(),I=new ResizeObserver(()=>{!x||!a||x.applyOptions({width:Math.max(320,a.clientWidth),height:Math.max(260,a.clientHeight)})}),I.observe(a)}function Et(t){i("#mob-mkt-btn",t)?.addEventListener("click",()=>Nt(t)),i("#close-mob-drawer",t)?.addEventListener("click",()=>V(t)),v(t,"[data-sym]","click",(e,s)=>{V(t),localStorage.setItem("vp_symbol",s.dataset.sym),localStorage.setItem("vp_type",s.dataset.stype||r("type")),F("trade",{symbol:s.dataset.sym,type:s.dataset.stype||r("type"),tf:r("tf")})}),v(t,"[data-tf]","click",(e,s)=>{h("tf",s.dataset.tf),localStorage.setItem("vp_tf",s.dataset.tf),F("trade",{symbol:r("symbol"),type:r("type"),tf:s.dataset.tf})}),v(t,"[data-type-tab]","click",async(e,s)=>{h("type",s.dataset.typeTab),localStorage.setItem("vp_type",s.dataset.typeTab);const a=await k(ut(s.dataset.typeTab),{timeout:6e3}).catch(()=>null);if(a?.items){const o=a.items.find(n=>n?.symbol);if(o?.symbol&&B(s.dataset.typeTab)!=="favorites"){const n=String(o.symbol).toUpperCase();localStorage.setItem("vp_symbol",n),F("trade",{symbol:n,type:s.dataset.typeTab,tf:r("tf")});return}nt(t,a.items),rt(t,a.items,g),ot(t,a.items,g)}C("[data-type-tab]",t).forEach(o=>{const n=o===s;o.classList.toggle("bg-accent/20",n),o.classList.toggle("text-accent",n),o.classList.toggle("border-accent/40",n)})}),v(t,"[data-open-order]","click",(e,s)=>Ut(t,s.dataset.openOrder)),v(t,"[data-close-order-sheet]","click",()=>ct(t)),v(t,"[data-submit-order]","click",(e,s)=>Z(s.dataset.submitOrder,t,i("#mobile-order-sheet [data-order-form]",t))),v(t,"[data-side]","click",(e,s)=>{const a=s.closest("#mobile-order-sheet"),o=s.closest("[data-order-form]");if(a){dt(t,s.dataset.side);return}Z(s.dataset.side,t,o)}),v(t,"[data-order-type]","change",(e,s)=>h("orderType",s.value)),v(t,"[data-market-type]","change",(e,s)=>{h("market",s.value),localStorage.setItem("vp_market",s.value),E(t)}),v(t,"[data-leverage]","input",(e,s)=>{h("leverage",Number(s.value)),tt(t,"leverage",s.value),E(t)}),v(t,"[data-amount]","input",(e,s)=>{h("amount",Number(s.value)),tt(t,"amount",s.value),E(t)}),v(t,"[data-close]","click",async(e,s)=>{await k("/trade/close_position.php",{method:"POST",body:{position_id:s.dataset.close},timeout:8e3}).catch(()=>null);const a=await k("/trade/portfolio.php",{timeout:5e3}).catch(()=>null);a?.positions&&W(t,a.positions)}),i("#sym-search",t)?.addEventListener("input",e=>{const s=e.target.value.toLowerCase();C(".symbol-row",t).forEach(a=>{a.style.display=a.dataset.sym.toLowerCase().includes(s)?"":"none"})})}async function Z(t,e,s){const a=r("activeQuote")||{},o=Number(a.price||0);if(!o){alert("No live price available yet. Please wait for the quote to load.");return}const n=s||i("[data-order-form]",e)||e,l=Number(i("[data-amount]",n)?.value||r("amount")||0),c=Number(i("[data-leverage]",n)?.value||r("leverage")||1),d=Number(i("[data-tp]",n)?.value||0),p=Number(i("[data-sl]",n)?.value||0),u=i("[data-market-type]",n)?.value||r("market")||"spot",_=i("[data-order-type]",n)?.value||r("orderType")||"MARKET";if(l<=0){alert("Enter a valid amount first.");return}if(t==="BUY"&&p>0&&p>=o){alert("For BUY orders, Stop Loss should be below the current price.");return}if(t==="SELL"&&p>0&&p<=o){alert("For SELL orders, Stop Loss should be above the current price.");return}try{const S=await k("/trade/place_order.php",{method:"POST",body:{symbol:r("symbol"),asset_type:r("type"),market_type:u,side:t,order_type:_,usd:l,leverage:c,tp:d||void 0,sl:p||void 0,price:o,mode:r("mode")},timeout:1e4});if(S&&S.ok===!1){alert(S.error||"Order failed");return}ct(e);const U=await k("/trade/portfolio.php",{timeout:5e3}).catch(()=>null);U?.positions&&W(e,U.positions)}catch(S){console.error("Order failed:",S),alert(S.message||"Order failed")}}function Nt(t){const e=i("#market-drawer",t);e&&(e.classList.add("mobile-market-open"),e.classList.remove("hidden"),document.body.classList.add("trade-modal-open"))}function V(t){const e=i("#market-drawer",t);e&&(e.classList.remove("mobile-market-open"),window.innerWidth<1024&&e.classList.add("hidden"),document.body.classList.remove("trade-modal-open"))}function Ut(t,e){const s=i("#mobile-order-sheet",t);s&&(dt(t,e),s.classList.remove("hidden"),document.body.classList.add("trade-modal-open"),E(t))}function ct(t){const e=i("#mobile-order-sheet",t);e&&e.classList.add("hidden"),document.body.classList.remove("trade-modal-open")}function dt(t,e){const s=i("#mobile-submit-order",t),a=i("#mobile-order-side-label",t);s&&(s.dataset.submitOrder=e,s.textContent=`Review & ${e==="BUY"?"Buy":"Sell"}`,s.className=`${e==="BUY"?"btn-buy":"btn-sell"} w-full py-3`),a&&(a.textContent=`${e} order`)}function tt(t,e,s){C(`[data-${e}]`,t).forEach(a=>{String(a.value)!==String(s)&&(a.value=s)})}function Mt(t,e=g){if(!b(e)||!A||!m||!(t>0))return;const s=Ot();s<=m.time?(m.close=t,m.high=Math.max(m.high,t),m.low=Math.min(m.low,t)):m={time:s,open:m.close,high:Math.max(m.close,t),low:Math.min(m.close,t),close:t,volume:0},A.update({time:m.time,open:m.open,high:m.high,low:m.low,close:m.close})}function Ot(){const t=Pt(r("tf")),e=Math.floor(Date.now()/1e3);return Math.floor(e/t)*t}function Pt(t){return{"1m":60,"5m":300,"15m":900,"30m":1800,"1h":3600,"4h":14400,"1d":86400}[t]||60}function pt(){return H||(H=mt(()=>import("./chart-DbDccfIU.js"),[])),H}function ut(t){const e=B(t||"crypto");return`/markets.php?type=${encodeURIComponent(e==="favorites"?"crypto":e)}&scope=trade&supported=1&lite=1&with_quotes=1`}function Rt(t){const e=String(t?.source||"").toLowerCase();return String(t?.timing_class||"").toLowerCase()==="stale"||t?.is_stale||e.includes("yahoo")?"bg-spread":"bg-buy"}function It(t){const e=String(t?.timing_class||"").toLowerCase(),s=String(t?.source||"").toLowerCase();return Number(t?.price||0)<=0?"Unavailable":e==="stale"||t?.is_stale?"Stale":e==="delayed"||s.includes("yahoo")||["stocks","arab"].includes(B(t?.type||r("type")))?"Delayed":e==="candle_fallback"?"Chart quote":"Live"}function At(t){const e=String(t||"").toLowerCase();return e==="live"?"status-chip-live":e==="unavailable"?"status-chip-locked":"status-chip-delayed"}function J(t,e,s){return`<span class="${s} grid place-items-center overflow-hidden border border-line bg-surface">
    <img src="${L(bt({symbol:t,type:e},e))}" class="h-full w-full object-cover" alt="${L(t)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';" />
    <b class="hidden h-full w-full place-items-center bg-accent/20 text-[9px] font-black">${f(ft(t))}</b>
  </span>`}export{Yt as cleanup,Dt as mount,jt as render};
