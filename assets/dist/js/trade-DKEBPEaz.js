const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["js/chart-uI7-MQXf.js","js/vendor-DJkwUXgC.js"])))=>i.map(i=>d[i]);
import{s as T,j as c,k as I,t as o,h as $,g as f,o as x,_ as lt,$ as p,a as U,m as N,c as A,p as Ce,f as dt,q as He,d as Le}from"./main-4sNiSzdn.js";import{marketIconPath as ct,marketInitial as ut}from"./marketIcon-D-Yq8Sis.js";let te=null,G=null,D=0,j=null;const pt=1e4;function mt(e,t,s,a,r={}){if(ee(),!e||!e.length)return ee;const n=++D,i=Qe(e,r.maxSymbols||18);return i.length&&(!r.forcePolling&&typeof EventSource=="function"?ft(i,t,s,a,n,r):Ye(i,t,s,a,n,r)),ee}function Qe(e,t){const s=Math.max(1,Number(t||18));return[...new Set((e||[]).map(a=>String(a||"").toUpperCase()).filter(Boolean))].slice(0,s)}function ft(e,t,s,a,r,n){$e();const i="/api/stream/sse.php?symbols="+encodeURIComponent(e.join(","))+"&type="+encodeURIComponent(t)+"&scope=watchlist&_="+Date.now();let d=!1,u=null;const l=Math.max(5e3,Number(n.fallbackAfter||5e3)),m=()=>{r===D&&(u&&(clearTimeout(u),u=null),$e(),Ye(e,t,s,a,r,n))},b=()=>{u&&clearTimeout(u),u=setTimeout(m,Math.max(l+2500,8e3))};let v=setTimeout(()=>{r!==D||d||m()},Math.max(3e3,l));j=new EventSource(i,{withCredentials:!0}),j.addEventListener("open",()=>{d=!0,v&&(clearTimeout(v),v=null),b()}),j.addEventListener("message",w=>{if(r===D)try{const y=JSON.parse(w.data||"[]");Array.isArray(y)&&y.length&&s&&s(y),b()}catch{}}),j.addEventListener("reconnect",()=>{r===D&&m()}),j.addEventListener("error",w=>{r===D&&m()})}function Ye(e,t,s,a,r,n){Ge();const i=Math.max(8e3,Number(n.interval||pt)),d=Math.max(0,Number(n.initialDelay||0)),u=Qe(e,n.maxSymbols||18),l=async()=>{if(r!==D)return;G=new AbortController;const m=Math.max(3e3,Number(n.timeout||15e3)),b=setTimeout(()=>G?.abort(),m);try{const v="/api/quotes.php?symbols="+encodeURIComponent(u.join(","))+"&type="+encodeURIComponent(t)+"&visible=1&purpose=watchlist&_="+Date.now(),w=await fetch(v,{credentials:"same-origin",cache:"no-store",signal:G.signal});if(r!==D)return;if(w.ok){const y=await w.json();r===D&&y&&y.items&&s&&s(y.items)}}catch(v){v.name}finally{clearTimeout(b),r===D&&(te=setTimeout(l,i))}};te=setTimeout(l,d)}function Ge(){te&&(clearTimeout(te),te=null),G&&(G.abort(),G=null)}function $e(){j&&(j.close(),j=null)}function ee(){D+=1,$e(),Ge()}let L=null,q=null,pe=null,we=null,Se=null,O=null,ce=null,se=null,V=null,ue=null,ae=null,he=null,C=null,g=0;const De=new Map,xe=new Set;let re=[],fe=null;function k(e,t,s,a){re.push(dt(e,t,s,a))}function bt(){return[{key:"favorites",label:o("market.type.favorites","المفضلة")},{key:"crypto",label:o("markets.crypto","الكريبتو")},{key:"forex",label:o("markets.fx","الفوركس")},{key:"stocks",label:o("markets.stocks","الأسهم")},{key:"commodities",label:o("markets.commodities","السلع")},{key:"futures",label:o("market.type.futures","العقود الآجلة")},{key:"arab",label:o("markets.arab_stocks","الأسهم العربية")}]}const Oe={crypto:[["BTCUSDT","Bitcoin / Tether"],["ETHUSDT","Ethereum / Tether"],["BNBUSDT","BNB / Tether"],["SOLUSDT","Solana / Tether"],["XRPUSDT","XRP / Tether"],["ADAUSDT","Cardano / Tether"],["DOGEUSDT","Dogecoin / Tether"],["AVAXUSDT","Avalanche / Tether"],["TRXUSDT","TRON / Tether"],["LINKUSDT","Chainlink / Tether"]],forex:[["EURUSD","Euro / US Dollar"],["GBPUSD","British Pound / US Dollar"],["USDJPY","US Dollar / Japanese Yen"],["USDCHF","US Dollar / Swiss Franc"],["AUDUSD","Australian Dollar / US Dollar"],["USDCAD","US Dollar / Canadian Dollar"],["NZDUSD","New Zealand Dollar / US Dollar"],["EURGBP","Euro / British Pound"],["EURJPY","Euro / Japanese Yen"],["GBPJPY","British Pound / Japanese Yen"]],stocks:[["AAPL","Apple Inc."],["MSFT","Microsoft Corp."],["NVDA","NVIDIA Corp."],["TSLA","Tesla Inc."],["AMZN","Amazon.com Inc."],["GOOGL","Alphabet Inc."],["META","Meta Platforms"],["NFLX","Netflix Inc."]],commodities:[["XAUUSD","Gold Spot / US Dollar"],["XAGUSD","Silver Spot / US Dollar"],["USOIL","US Oil"],["UKOIL","Brent Oil"],["NATGAS","Natural Gas"],["COPPER","Copper"]],futures:[["ES_F","S&P 500 Futures"],["NQ_F","Nasdaq 100 Futures"],["YM_F","Dow Jones Futures"],["GC_F","Gold Futures"],["CL_F","Crude Oil Futures"]],arab:[["2222","Saudi Aramco"],["1120","Al Rajhi Bank"],["2010","SABIC"],["7010","stc"],["1211","Maaden"],["1150","Alinma Bank"]]},yt=["1m","5m","15m","30m","1h","4h","1d"];function os(e){e.symbol&&T("symbol",e.symbol.toUpperCase()),e.type&&T("type",e.type),e.tf&&T("tf",e.tf);const t=c("symbol"),s=c("type"),a=c("tf");return`<div class="trade-terminal flex flex-col lg:flex-row h-full mobile-pad">
    <aside id="market-drawer" class="hidden lg:flex flex-col w-[250px] border-r border-line bg-surface shrink-0 overflow-hidden">
      <div class="lg:hidden flex items-center justify-between h-12 px-3 border-b border-line bg-panel">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-muted">${o("common.markets","Markets")}</div>
          <strong class="text-sm">${o("trade.select_instrument","Select instrument")}</strong>
        </div>
        <button class="icon-btn icon-btn-sm" id="close-mob-drawer" aria-label="Close markets">${I.close}</button>
      </div>
      <div class="hidden lg:block p-2 border-b border-line">
        <div class="relative">
          <input type="search" class="input pl-7" placeholder="${$(o("trade.search_symbol","Search symbol..."))}" id="sym-search" />
          <span class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted">${I.search}</span>
        </div>
      </div>
      <div class="flex gap-1 p-2 overflow-x-auto border-b border-line" id="type-tabs">
        ${bt().map(r=>`<button class="btn-xs ${r.key===s?"bg-accent/20 text-accent border-accent/40":"text-muted border-line"} border rounded-md whitespace-nowrap" data-type-tab="${r.key}">${r.label}</button>`).join("")}
      </div>
      <div class="flex-1 overflow-auto p-1" id="symbol-list"><div class="p-4 mobile-menu-centered-loader"><div class="loading-spinner mx-auto"></div></div></div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div class="flex items-center justify-between px-2 lg:px-4 h-11 border-b border-line bg-surface shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <button class="lg:hidden w-8 h-8 grid place-items-center rounded border border-line text-muted shrink-0" id="mob-mkt-btn" aria-label="Open markets">${I.menu}</button>
          <span id="sym-logo-slot">${ne(t,s,"w-7 h-7 rounded-md shrink-0")}</span>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <strong class="text-sm truncate" id="sym-name">${f(t)}</strong>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold" id="live-price">--</span>
              <span class="text-[10px]" id="live-change">+0.00%</span>
            </div>
          </div>
        </div>
        <div class="flex gap-0.5 overflow-x-auto max-w-[46vw] lg:max-w-none" id="tf-bar">
          ${yt.map(r=>`<button class="px-1.5 py-1 text-[10px] rounded shrink-0 ${r===a?"bg-accent/20 text-accent":"text-muted hover:text-text"}" data-tf="${r}">${r}</button>`).join("")}
        </div>
      </div>

      <div class="flex-1 relative min-h-[260px] bg-bg" id="chart-box">
        <div class="absolute inset-0 flex items-center justify-center"><div class="text-center"><div class="loading-spinner mx-auto"></div><p class="text-[10px] text-muted mt-2">${o("trade.loading_chart","Loading live chart...")}</p></div></div>
      </div>

      <div class="lg:hidden grid grid-cols-2 gap-2 p-2 border-t border-line bg-surface shrink-0">
        <button class="btn-sell py-3" data-open-order="SELL">${o("trade.sell","SELL")}</button>
        <button class="btn-buy py-3" data-open-order="BUY">${o("trade.buy","BUY")}</button>
      </div>

      <div class="border-t border-line bg-surface max-h-[320px] lg:max-h-[220px] overflow-auto shrink-0 trade-activity-panel" id="positions-section">
        <div class="trade-activity-head">
          <div class="trade-activity-title">
            <span class="text-[10px] font-semibold text-muted uppercase">${o("trade.activity","Trading activity")}</span>
            <span class="text-[10px] text-muted ml-2" id="activity-summary">${o("common.loading","Loading...")}</span>
          </div>
          <div class="trade-activity-actions">
            <div class="activity-tabs" role="tablist">
              <button class="active" data-activity-tab="active">${o("trade.active_trades","Active trades")} <b id="active-count">0</b></button>
              <button data-activity-tab="closed">${o("trade.closed_trades","Closed trades")} <b id="closed-count">0</b></button>
            </div>
            <button class="activity-expand-btn" data-toggle-activity-expand title="${$(o("trade.expand_activity","Expand trading activity"))}" aria-label="${$(o("trade.expand_activity","Expand trading activity"))}">${I.fullscreen||I.expand||"⛶"}</button>
          </div>
        </div>
        <div id="activity-body"><p class="text-muted text-[11px] text-center py-4">${o("common.loading","Loading...")}</p></div>
      </div>
    </div>

    <aside class="hidden lg:flex flex-col w-[300px] border-l border-line bg-surface shrink-0 overflow-auto">
      <div class="p-3 border-b border-line">
        <div class="text-xs font-semibold">Order Ticket</div>
        <div class="text-[10px] text-muted" id="ticket-instrument">${f(t)} - ${f(s.toUpperCase())}</div>
      </div>
      <div class="p-3 space-y-3" id="order-body">
        ${Ve()}
      </div>
    </aside>

    ${gt(t,s)}
  </div>`}function Ve(){const e=c("orderType")||"MARKET",t=Number(c("amount")||100),s=Number(c("leverage")||10),a=c("market")||"spot",r=a==="perp",n=c("activeQuote")||{},i=Number(n.price||0);return`<div class="space-y-3 order-ticket-panel" data-order-form>
    <div class="grid grid-cols-2 gap-2">
      <label class="block">
        <span class="text-[10px] text-muted">${o("trade.trading_type","Trading type")}</span>
        <select class="input mt-1" data-market-type>
          <option value="spot" ${a==="spot"?"selected":""}>${o("trade.spot","Spot")}</option>
          <option value="perp" ${a==="perp"?"selected":""}>${o("trade.perp_futures","Perpetual / Futures")}</option>
        </select>
      </label>
      <label class="block">
        <span class="text-[10px] text-muted">${o("trade.order_type_label","Order type")}</span>
        <select class="input mt-1" data-order-type>
          <option value="MARKET" ${e==="MARKET"?"selected":""}>${o("trade.market","Market")}</option>
          <option value="LIMIT" ${e==="LIMIT"?"selected":""}>${o("trade.limit","Limit")}</option>
        </select>
      </label>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <button class="btn-sell trade-price-button" data-side="SELL"><small>${o("trade.sell","Sell")}</small><span data-sell-price>${i>0?x(i,c("type")):"--"}</span></button>
      <button class="btn-buy trade-price-button" data-side="BUY"><small>${o("trade.buy","Buy")}</small><span data-buy-price>${i>0?x(i*1.0001,c("type")):"--"}</span></button>
      </div>
      <div class="text-center"><span class="spread-display" data-spread-val>${o("trade.spread","Spread")}: --</span></div>
      <div class="mobile-order-summary">
        <span><small>${o("trade.mode","Mode")}</small><strong>${f(c("mode")==="real"?o("trade.real","Real"):o("trade.demo","Demo"))}</strong></span>
        <span><small>${o("trade.symbol","Symbol")}</small><strong>${f(c("symbol")||"--")}</strong></span>
        <span><small>${o("trade.type","Type")}</small><strong>${r?o("trade.perp_futures","Perp/Futures"):o("trade.spot","Spot")}</strong></span>
      </div>
      <div class="order-summary-box">
        <span><small>${o("trade.available","Available")}</small><strong data-avail-bal>--</strong></span>
        <span><small>${o("trade.est_units","Est. Units")}</small><strong data-est-units>--</strong></span>
        <span><small>${o("trade.notional","Notional")}</small><strong data-est-notional>--</strong></span>
    </div>
    <label class="block">
      <span class="text-[10px] text-muted">${o("trade.margin_amount","Margin / Amount (USDT)")}</span>
      <input type="number" min="1" step="any" class="input mt-1" value="${$(String(t))}" data-amount />
    </label>
    <div class="quick-amount-grid" aria-label="Quick order amounts">
      ${[25,50,100,250].map(d=>`<button type="button" data-quick-amount="${d}">$${d}</button>`).join("")}
    </div>
    <label class="block">
      <span class="text-[10px] text-muted">${o("trade.limit_price","Limit price")}</span>
      <input type="number" min="0" step="any" class="input mt-1" placeholder="${i>0?x(i,c("type")):o("trade.required_for_limit","Required for limit")}" data-limit-price />
    </label>
    ${r?`
    <label class="block order-leverage-row" id="leverage-row">
      <span class="text-[10px] text-muted">${o("trade.leverage","Leverage")}: <strong data-lev-val id="leverage-label">${s}x</strong></span>
      <input type="range" min="1" max="100" value="${$(String(s))}" class="w-full mt-1 accent-accent" data-leverage />
    </label>`:`
    <div class="order-spot-note" id="leverage-row">
      <span class="text-[10px] text-muted">${o("trade.spot_no_leverage","Spot order — no leverage")}</span>
    </div>`}
    <div class="grid grid-cols-2 gap-2">
      <label class="block">
        <span class="text-[10px] text-muted">${o("trade.take_profit","Take Profit")}</span>
        <input type="number" step="any" class="input mt-1" placeholder="${o("trade.optional","Optional")}" data-tp />
      </label>
      <label class="block">
        <span class="text-[10px] text-muted">${o("trade.stop_loss","Stop Loss")}</span>
        <input type="number" step="any" class="input mt-1" placeholder="${o("trade.optional","Optional")}" data-sl />
      </label>
    </div>
    <p class="order-form-status is-info" data-order-status hidden></p>
    <p class="order-ticket-note">${o("trade.order_note","Orders execute internally on MEX Group at the current platform quote. Use TP/SL to document target risk for review.")}</p>
  </div>`}function gt(e,t){return`<div class="fixed inset-0 z-[230] hidden lg:hidden" id="mobile-order-sheet">
    <div class="absolute inset-0 bg-black/65" data-close-order-sheet></div>
    <div class="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-auto rounded-t-2xl border border-line bg-surface shadow-2xl">
      <div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3">
        <div class="flex items-center gap-2 min-w-0">
          <span id="mobile-order-logo-slot">${ne(e,t,"w-8 h-8 rounded-lg shrink-0")}</span>
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider text-muted" id="mobile-order-side-label">${o("trade.order","Order")}</div>
            <strong class="text-sm truncate" id="mobile-order-symbol">${f(e)}</strong>
          </div>
        </div>
        <button class="icon-btn icon-btn-sm" data-close-order-sheet aria-label="Close order">${I.close}</button>
      </div>
      <div class="p-4">
        ${Ve()}
        <div class="order-action-sticky">
          <button class="btn-primary w-full py-3" id="mobile-submit-order" data-submit-order="BUY">${o("trade.review_place","Review & Place Order")}</button>
        </div>
      </div>
    </div>
  </div>`}function ns(e){const t=s=>{if(s.target.tagName==="IMG"&&s.target.dataset.fallback==="initial"){s.target.style.display="none";const a=s.target.nextElementSibling;a&&(a.style.display="grid")}};e.addEventListener("error",t,!0),re.push(()=>e.removeEventListener("error",t,!0)),vt(e)}function is(){g+=1,ae&&(ae.disconnect(),ae=null),L&&(L.remove(),L=null,q=null,pe=null,C=null),O&&(O(),O=null),be(),Ke(),ge(),ee(),re.forEach(e=>{try{e()}catch{}}),re=[],fe=null,document.body.classList.remove("trade-modal-open")}async function vt(e){const t=c("symbol"),s=c("type"),a=c("tf"),r=++g;T("activeQuote",null);const n=Q();fe={container:e,symbol:t,type:s,runId:r},Bt(e),ht(),F(e),Te(e,t,s,r),ve(s,r).then(i=>{_(r,t,s)&&i?.items&&(e.__marketItems=i.items,X(e,i.items),Ae(e,i.items,r),setTimeout(()=>{_(r,t,s)&&oe(e,i.items,r,s)},800),ye(e,i.items,r,s).catch(()=>{}))}).catch(()=>{if(!_(r,t,s))return;const i=Ne(s);e.__marketItems=i,X(e,i)}),R(e,r),V=setInterval(()=>R(e,r,!0),2e4),de(e,t,s,a,r,n),Me(e,t,s,a,r,n)}function ht(){const e=()=>{if(document.hidden){be(),Ke(),O&&(O(),O=null);return}const t=fe;!t||t.runId!==g||(Te(t.container,t.symbol,t.type,t.runId),V||(R(t.container,t.runId,!0),V=setInterval(()=>R(t.container,t.runId,!0),2e4)),!O&&Array.isArray(t.container.__marketItems)&&oe(t.container,t.container.__marketItems,t.runId))};document.addEventListener("visibilitychange",e),re.push(()=>document.removeEventListener("visibilitychange",e))}function _(e,t=c("symbol"),s=c("type")){return!(e!==g||t&&String(t).toUpperCase()!==String(c("symbol")||"").toUpperCase()||s&&E(s)!==E(c("type")))}function E(e){const t=String(e||"").toLowerCase();return t==="commodity"?"commodities":t==="stock"?"stocks":t==="future"?"futures":t}function oe(e,t,s=g,a=null){O&&(O(),O=null);const r=E(a||c("type")),n=r==="favorites"?"crypto":r,i=c("symbol"),d=n==="crypto",u=d?36:3,l=[...new Set(t.slice(0,u).map(m=>String(m.symbol||"").toUpperCase()).filter(Boolean).filter(m=>m!==String(i||"").toUpperCase()))];l.length&&(O=mt(l,n,m=>{_(s,i,c("type"))&&me(e,m)},null,{interval:d?12e3:1e4,initialDelay:900,fallbackAfter:3e3,maxSymbols:u,timeout:9e3,forcePolling:!d}))}function Te(e,t,s,a=g){be();const r=E(s)==="favorites"?"crypto":E(s),n=r==="crypto"?4500:6e3,i=r==="crypto"?3e3:12e3,d=r==="crypto"?0:1,u=async()=>{if(_(a,t,s)){se=new AbortController;try{const l=r==="crypto"?"":"&fresh=1&strict_live=1",m=`/quotes.php?symbol=${encodeURIComponent(t)}&type=${encodeURIComponent(r)}&purpose=focus${l}&_=${Date.now()}`,b=await A(m,{timeout:i,retry:d,signal:se.signal,cacheTtl:0,cache:"no-store"});if(!_(a,t,s))return;b?.items?.[0]&&Je(e,b.items[0],a)}catch{_(a,t,s)}finally{_(a,t,s)&&(ce=setTimeout(u,n))}}};u()}function be(){ce&&(clearTimeout(ce),ce=null),se&&(se.abort(),se=null)}function Ke(){V&&(clearInterval(V),V=null)}function xt(e,t,s,a=0){const r=Number(s||0),n=Number(a||0);e.__lastQuotePrices||(e.__lastQuotePrices=new Map);const i=String(t||c("symbol")||"").toUpperCase(),d=i?Number(e.__lastQuotePrices.get(i)||0):0;let u=n>0?"text-buy":n<0?"text-sell":"text-text";return d>0&&r>0&&Math.abs(r-d)>1e-12&&(u=r>d?"text-buy":"text-sell"),i&&r>0&&e.__lastQuotePrices.set(i,r),u}function _t(e){const t=String(e||"").toLowerCase();return t.includes("binance")?100:t.includes("eodhd")?94:t.includes("provider_live")?90:t.includes("yahoo_chart_live")?76:t==="yahoo"||t.includes("yahoo")?68:t.includes("frankfurter")||t.includes("stooq")||t.includes("fallback")?30:t.includes("cache")||t.includes("seed")||t.includes("reference")||t.includes("unavailable")?5:t?45:0}function H(e){const t=Number(e||0);return t>0?t>1e12?Math.floor(t/1e3):Math.floor(t):0}function $t(e){const t=Math.max(H(e?.provider_updated_at),H(e?.provider_ts),H(e?.as_of),H(e?.updated_at)),s=Math.max(H(e?.received_at),H(e?.ingested_at),H(e?.cache_updated_at));return{rank:_t(e?.source||e?.provider),providerTs:t,cacheTs:s,effectiveTs:Math.max(t,s)}}function Xe(e,t,s){if(!(Number(t?.price||t?.q_price||0)>0))return!1;e.__quoteQuality||(e.__quoteQuality=new Map);const r=String(s||t?.symbol||"").toUpperCase();if(!r)return!0;const n=$t(t),i=e.__quoteQuality.get(r);return i&&(n.providerTs>0&&i.providerTs>0&&n.providerTs+30<i.providerTs||n.effectiveTs>0&&i.effectiveTs>0&&n.effectiveTs+2<i.effectiveTs&&n.rank<=i.rank||n.rank+20<i.rank&&n.effectiveTs<=i.effectiveTs+60)?!1:(e.__quoteQuality.set(r,n),!0)}function Je(e,t,s=g){if(!_(s,String(t?.symbol||c("symbol")).toUpperCase(),t?.type||c("type")))return;const a=Number(t.price||t.q_price||0);if(!Xe(e,{...t,price:a},t.symbol||c("symbol")))return;const r=Number(t.change_pct||t.q_change||0),n=c("type");T("activeQuote",{...t,price:a,change_pct:r});const i=xt(e,t.symbol||c("symbol"),a,r);me(e,[{...t,price:a,change_pct:r}]);const d=p("#live-price",e),u=p("#live-change",e);d&&(d.textContent=a>0?x(a,n):"--",d.className=`text-xs font-mono font-bold ${i}`),u&&(u.textContent=Ce(r),u.className=`text-[10px] ${r>=0?"text-buy":"text-sell"}`),U("[data-sell-price]",e).forEach(l=>{l.textContent=a>0?x(a,n):"--"}),U("[data-buy-price]",e).forEach(l=>{l.textContent=a>0?x(a*1.0001,n):"--"}),U("[data-spread-val]",e).forEach(l=>{l.textContent=a>0?`${o("trade.spread","Spread")}: ${x(a*1e-4,n)}`:`${o("trade.spread","Spread")}: --`}),F(e),Xt(a,s,Number(t.provider_updated_at||t.updated_at||t.cache_updated_at||0),E(t.type||n))}function F(e){const t=c("activeQuote")||{},s=Number(t.price||0),a=c("wallet")||{},r=c("mode")==="real"?a.real||{}:a.demo||{};U("[data-order-form]",e).forEach(n=>{const i=Number(p("[data-amount]",n)?.value||c("amount")||0),d=Number(p("[data-leverage]",n)?.value||c("leverage")||1),l=(p("[data-market-type]",n)?.value||c("market")||"spot")==="perp"?d:1,m=s>0?i*l/s:0,b=i*l,v=p("[data-lev-val]",n);v&&(v.textContent=`${d}x`);const w=p("[data-est-units]",n);w&&(w.textContent=m>0?m.toFixed(m>=10?3:6):"--");const y=p("[data-est-notional]",n);y&&(y.textContent=i>0?`${N(b)} USDT`:"--");const S=p("[data-avail-bal]",n);S&&(S.textContent=`${N(r.available||0)} ${r.currency||""}`)})}function X(e,t){const s=p("#symbol-list",e);if(!s)return;const a=c("symbol"),r=t.slice(0,120);s.innerHTML=r.map(n=>{const i=String(n.symbol||"").toUpperCase(),d=n.type||c("type"),u=Number(n.price||n.q_price||0),l=Number(n.change_pct||n.q_change||0),m=!(u>0);return`<div class="symbol-row ${i===a?"active":""}" data-sym="${$(i)}" data-stype="${$(d)}">
      ${ne(i,d,"w-7 h-7 rounded-md shrink-0")}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <div class="font-semibold text-[11px] truncate">${f(i)}</div>
        </div>
        <div class="text-[9px] text-muted truncate">${f(n.name||d)}</div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-[11px] font-mono text-text" data-price-cell>${u>0?x(u,d):"--"}</div>
        <div class="text-[9px] ${m?"text-muted":l>=0?"text-buy":"text-sell"}" data-change-cell>${m?"--":Ce(l)}</div>
      </div>
    </div>`}).join("")}async function ye(e,t,s=g,a=null){const r=E(a||c("type")||"crypto"),n=r==="crypto"?80:24,i=t.slice(0,n).filter(h=>!(Number(h.price||h.q_price||0)>0)).map(h=>String(h.symbol||"").toUpperCase()).filter(Boolean);if(!i.length)return;const d=r==="crypto"?24:3,u=r==="crypto"?80:24,l=r==="crypto"?4500:9e3,m=[...new Set(i)].slice(0,u),b=[],v=async h=>{const z=await A(`/quotes.php?symbols=${encodeURIComponent(h.join(","))}&type=${encodeURIComponent(r)}&visible=1&purpose=watchlist&_=${Date.now()}`,{timeout:l,cacheTtl:0,cache:"no-store"}).catch(()=>null);_(s)&&(z?.items?.length&&me(e,z.items),h.forEach(M=>{const Y=U(".symbol-row",e).find(it=>it.dataset.sym===M);Y&&p("[data-price-cell]",Y)?.textContent!=="--"||b.push(M)}))},w=[];for(let h=0;h<m.length;h+=d)w.push(m.slice(h,h+d));const y=r==="crypto"?1:2;for(let h=0;h<w.length;h+=y)if(await Promise.allSettled(w.slice(h,h+y).map(v)),!_(s))return;const S=r==="crypto"?12:3,B=[...new Set(b)].slice(0,24);for(let h=0;h<B.length;h+=S){const z=B.slice(h,h+S),M=await A(`/quotes.php?symbols=${encodeURIComponent(z.join(","))}&type=${encodeURIComponent(r)}&visible=1&purpose=watchlist&_=${Date.now()}`,{timeout:l,cacheTtl:0,cache:"no-store"}).catch(()=>null);if(!_(s))return;M?.items?.length&&me(e,M.items)}}function me(e,t){if(!t?.length)return;const s=U(".symbol-row",e);if(!s.length)return;const a=new Map;s.forEach(r=>a.set(r.dataset.sym,r)),t.forEach(r=>{const n=String(r.symbol||"").toUpperCase();if(!n)return;const i=a.get(n);if(!i)return;const d=i.dataset.stype||c("type"),u=Number(r.price||r.q_price||0);if(!(u>0)||!Xe(e,{...r,price:u},n))return;const l=Number(r.change_pct||r.q_change||0),m=p("[data-price-cell]",i),b=p("[data-change-cell]",i);m&&(m.textContent=x(u,d),m.className="text-[11px] font-mono text-text"),b&&(b.textContent=Ce(l),b.className=`text-[9px] ${l>=0?"text-buy":"text-sell"}`)})}async function R(e,t=g,s=!1,a=!1){if(!_(t)||e.__tradeActivityLoading)return;e.__tradeActivityLoading=!0;const r=p("#activity-body",e);r&&!s&&!e.__tradeActivityLoaded&&(r.innerHTML='<p class="text-muted text-[11px] text-center py-4">Loading trading activity...</p>');const n=a?0:4e3,i=a?"no-store":"default",d=a?`&_=${Date.now()}`:"";try{const u=c("mode"),[l,m]=await Promise.allSettled([A(`/trade/portfolio.php?fast=1&mode=${u}${d}`,{timeout:12e3,retry:1,cacheTtl:n,cache:i}),A(`/trade/orders.php?limit=90&mode=${u}${d}`,{timeout:12e3,retry:1,cacheTtl:n,cache:i})]);if(!_(t))return;const b=l.status==="fulfilled"?l.value:null,v=m.status==="fulfilled"?m.value:null;if(b?.positions&&(e.__tradePositions=b.positions,T("portfolio",b)),(v?.items||v?.orders)&&(e.__tradeOrders=v.items||v.orders||[]),!b&&!v&&!e.__tradeActivityLoaded){r&&(r.innerHTML='<p class="text-muted text-[11px] text-center py-4">Trading activity is reconnecting...</p>');return}e.__tradeActivityLoaded=!0,We(e)}finally{e.__tradeActivityLoading=!1}}function We(e){const t=(e.__tradePositions||[]).filter(l=>!Ie(l)),s=(e.__tradeOrders||[]).filter(l=>!Ie(l)),a=s.filter(Ee),r=s.filter(ke);let n=e.__tradeActivityTab||"active";(n==="positions"||n==="orders")&&(n="active"),n==="history"&&(n="closed"),e.__tradeActivityTab=n;const i=p("#active-count",e),d=p("#closed-count",e),u=p("#activity-summary",e);return i&&(i.textContent=String(t.length+a.length)),d&&(d.textContent=String(r.length)),u&&(u.textContent=`${t.length} ${o("trade.open","open")} / ${a.length} ${o("trade.pending","pending")} / ${r.length} ${o("trade.closed","closed")}`),U("[data-activity-tab]",e).forEach(l=>{l.classList.toggle("active",l.dataset.activityTab===n)}),n==="closed"?Ct(e,r):wt(e,t,a)}function wt(e,t,s){const a=p("#activity-body",e);if(a){if(!t.length&&!s.length){a.innerHTML=`<p class="text-muted text-[11px] text-center py-4">${o("trade.no_active_trades","No active trades yet")}</p>`;return}a.innerHTML=`
    ${t.length?St(t):`<p class="text-muted text-[11px] text-center py-3">${o("trade.no_open_positions","No open positions")}</p>`}
    ${s.length?`<div class="trade-pending-block">
      <div class="trade-subhead"><span>${o("trade.pending_orders","Pending orders")}</span><b>${s.length}</b></div>
      ${kt(s)}
    </div>`:""}`}}function St(e){return`
    <div class="trade-position-cards lg:hidden">
      ${e.slice(0,12).map(Tt).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[620px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">${o("trade.symbol","Symbol")}</th><th class="text-left py-1">${o("trade.side","Side")}</th><th class="text-left py-1">${o("trade.type","Type")}</th><th class="text-right py-1">${o("trade.entry","Entry")}</th><th class="text-right py-1">${o("trade.mark","Mark")}</th><th class="text-right py-1">${o("trade.size","Size")}</th><th class="text-right py-1">${o("trade.lev","Lev")}</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1"></th>
      </tr></thead>
      <tbody>${e.slice(0,12).map(Lt).join("")}</tbody>
    </table></div>`}function kt(e){return`
    <div class="trade-position-cards lg:hidden">
      ${e.slice(0,16).map(Ut).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[820px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">${o("trade.symbol","Symbol")}</th><th class="text-left py-1">${o("trade.side","Side")}</th><th class="text-left py-1">${o("trade.type","Type")}</th><th class="text-right py-1">${o("trade.entry","Entry")}</th><th class="text-right py-1">TP / SL</th><th class="text-right py-1">${o("deposit.amount","Amount")}</th><th class="text-right py-1">${o("trade.lev","Lev")}</th><th class="text-right py-1">${o("kyc.status","Status")}</th><th class="text-right px-3 py-1">${o("common.actions","Actions")}</th>
      </tr></thead>
      <tbody>${e.slice(0,16).map(Et).join("")}</tbody>
    </table></div>`}function Ct(e,t){const s=p("#activity-body",e);if(s){if(!t.length){s.innerHTML=`<p class="text-muted text-[11px] text-center py-4">${o("trade.no_closed_trades","No closed trades yet")}</p>`;return}s.innerHTML=`
    <div class="trade-position-cards lg:hidden">
      ${t.slice(0,18).map(Nt).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[820px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">${o("trade.symbol","Symbol")}</th><th class="text-left py-1">${o("trade.side","Side")}</th><th class="text-left py-1">${o("trade.type","Type")}</th><th class="text-right py-1">${o("trade.exit","Exit")}</th><th class="text-right py-1">${o("trade.used","Used")}</th><th class="text-right py-1">${o("trade.fee","Fee")}</th><th class="text-right py-1">${o("trade.pnl","PnL")}</th><th class="text-right py-1">${o("trade.opened","Opened")}</th><th class="text-right px-3 py-1">${o("trade.closed","Closed")}</th>
      </tr></thead>
      <tbody>${t.slice(0,18).map(Mt).join("")}</tbody>
    </table></div>`}}function Ze(e){const t=Number(e.pnl||e.unrealized_pnl||0),s=String(e.symbol||"").replace("@R@",""),a=e.asset_type||c("type"),r=Number(e.mark_price||e.current_price||e.price||0),n=e.position_id||e.id||"",i=String(e.side||"buy").toUpperCase()==="SELL"?"SELL":"BUY";return{pnl:t,cleanSymbol:s,posType:a,mark:r,id:n,side:i}}function Lt(e){const{pnl:t,cleanSymbol:s,posType:a,mark:r,id:n,side:i}=Ze(e),d=String(e.market_type||"").toLowerCase()==="perp";return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${f(s)}</td>
    <td>${Z(i)}</td>
    <td class="text-muted">${d?o("trade.perp","Perp"):o("trade.spot","Spot")}</td>
    <td class="text-right font-mono">${x(e.entry_price||e.open_price,a)}</td>
    <td class="text-right font-mono">${r>0?x(r,a):"--"}</td>
    <td class="text-right font-mono">${He(e.qty||e.amount||e.size||e.units||0)}</td>
    <td class="text-right font-mono">${d?`${f(String(e.leverage||1))}x`:'<span class="text-muted text-[9px]">—</span>'}</td>
    <td class="text-right font-mono ${t>=0?"text-buy":"text-sell"}">${N(t)}</td>
    <td class="text-right px-3">${n?`<button class="btn-xs btn-ghost text-sell" data-close="${$(n)}">${o("common.close","Close")}</button>`:""}</td>
  </tr>`}function Tt(e){const{pnl:t,cleanSymbol:s,posType:a,mark:r,id:n,side:i}=Ze(e),d=String(e.market_type||"").toLowerCase()==="perp";return`<article class="trade-position-card">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${f(s)}</strong>
        <small>${f(d?o("trade.perp_futures","Perp/Futures"):o("trade.spot","Spot"))} - ${f(e.created_at||e.opened_at||"")}</small>
      </div>
      ${Z(i)}
    </div>
    <div class="trade-position-metrics">
      <span><small>${o("trade.entry","Entry")}</small><strong>${x(e.entry_price||e.open_price,a)}</strong></span>
      <span><small>${o("trade.mark","Mark")}</small><strong>${r>0?x(r,a):"--"}</strong></span>
      <span><small>${o("trade.size","Size")}</small><strong>${He(e.qty||e.amount||e.size||e.units||0)}</strong></span>
      <span><small>PnL</small><strong class="${t>=0?"text-buy":"text-sell"}">${N(t)}</strong></span>
      <span><small>${o("trade.margin","Margin")}</small><strong>${N(e.margin_initial||e.margin||0)}</strong></span>
      ${d?`<span><small>${o("trade.leverage","Leverage")}</small><strong>${f(String(e.leverage||1))}x</strong></span>`:""}
      ${d&&e.liquidation_price?`<span><small>${o("trade.liq_price","Liq. Price")}</small><strong class="text-sell">${x(e.liquidation_price,a)}</strong></span>`:""}
    </div>
    ${n?`<button class="btn-xs btn-ghost text-sell w-full" data-close="${$(n)}">${o("trade.close_position","Close position")}</button>`:""}
  </article>`}function ke(e){const t=String(e.status||"").toLowerCase();return t==="closed"||t==="canceled"||t==="cancelled"||t==="rejected"||Number(e.closed_at||0)>0||Number(e.exit_price||0)>0}function Ee(e={}){if(e.is_pending===!0||e.is_pending===1||e.is_pending==="1")return!ke(e);if(ke(e))return!1;const t=String(e.raw_status||e.order_status||e.status||"").toLowerCase(),s=["open","pending","armed","submitted","new"].includes(t),a=Number(e.fill_price||e.entry_price||0)>0,r=Number(e.position_id||0)>0&&!(e.can_cancel||e.can_edit);return s&&!a&&!r}function Ie(e={}){if(["copy_subscription_id","copy_signal_id","copy_trade_id","copy_id","trading_bot_subscription_id","bot_subscription_id","avalon_subscription_id"].some(a=>e[a]!==void 0&&e[a]!==null&&String(e[a])!==""&&String(e[a])!=="0"))return!0;const s=[e.source,e.origin,e.order_source,e.position_source,e.product_kind,e.strategy_kind,e.category,e.group].map(a=>String(a||"").toLowerCase()).join(" ");return/\b(copy|copied|copy-trading|trading_bot|bot|avalon)\b/.test(s)}function J(e){return String(e.symbol||"").replace("@R@","").replace("@D@","")}function ie(e){return String(e.side||"BUY").toUpperCase()==="SELL"?"SELL":String(e.side||"BUY").toUpperCase()==="CLOSE"?"CLOSE":"BUY"}function le(e){return e.asset_type||e.type||c("type")}function Ue(e){return String(e.order_id||e.id||"")}function K(e){const t=Number(e||0);if(!t)return"--";try{return new Date(t*1e3).toLocaleString([],{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})}catch{return String(e)}}function Et(e){const t=ie(e),s=le(e),a=Ue(e);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${f(J(e))}</td>
    <td>${Z(t)}</td>
    <td class="text-muted">${f(e.order_type||e.market_type||"market")}</td>
    <td class="text-right font-mono">${x(e.entry_price||e.fill_price||e.limit_price,s)}</td>
    <td class="text-right font-mono"><span class="text-buy">${e.tp_price?x(e.tp_price,s):"--"}</span> / <span class="text-sell">${e.sl_price?x(e.sl_price,s):"--"}</span></td>
    <td class="text-right font-mono">${N(e.used_usdt||e.usd_amount||e.amount||0)}</td>
    <td class="text-right font-mono">${f(String(e.leverage||1))}x</td>
    <td class="text-right"><span class="status-chip status-chip-derived">${f(e.status||"open")}</span></td>
    <td class="text-right px-3">${et(a,e)}</td>
  </tr>`}function Ut(e){const t=ie(e),s=le(e),a=Ue(e);return`<article class="trade-position-card trade-activity-card">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${f(J(e))}</strong>
        <small>${f(e.order_type||"market")} - ${f(K(e.created_at))}</small>
      </div>
      ${Z(t)}
    </div>
    <div class="trade-position-metrics">
      <span><small>${o("trade.entry","Entry")}</small><strong>${x(e.entry_price||e.fill_price||e.limit_price,s)}</strong></span>
      <span><small>${o("trade.take_profit","Take profit")}</small><strong class="text-buy">${e.tp_price?x(e.tp_price,s):"--"}</strong></span>
      <span><small>${o("trade.stop_loss","Stop loss")}</small><strong class="text-sell">${e.sl_price?x(e.sl_price,s):"--"}</strong></span>
      <span><small>${o("deposit.amount","Amount")}</small><strong>${N(e.used_usdt||e.usd_amount||e.amount||0)}</strong></span>
      <span><small>${o("trade.lev","Lev")}</small><strong>${f(String(e.leverage||1))}x</strong></span>
      <span><small>${o("kyc.status","Status")}</small><strong>${f(e.status||o("trade.open","open"))}</strong></span>
      <span><small>${o("funding.mode","Mode")}</small><strong>${f(e.mode||c("mode")||o("mode.demo","demo"))}</strong></span>
      <span><small>${o("trade.symbol","Symbol")}</small><strong>${f(J(e))}</strong></span>
    </div>
    ${et(a,e,!0)}
  </article>`}function et(e,t,s=!1){return!e||!Ee(t)?'<span class="text-muted text-[10px]">--</span>':`<div class="${s?"trade-pending-actions is-card":"trade-pending-actions"}">
    <button class="btn-xs btn-ghost" data-edit-order="${$(e)}">${o("common.edit","Edit")}</button>
    <button class="btn-xs btn-danger" data-cancel-order="${$(e)}">${o("common.cancel","Cancel")}</button>
  </div>`}function Mt(e){const t=ie(e),s=le(e),a=Number(e.pnl_usd||e.pnl||0);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${f(J(e))}</td>
    <td>${Z(t)}</td>
    <td class="text-muted">${f(e.market_type||e.order_type||"spot")}</td>
    <td class="text-right font-mono">${x(e.exit_price||e.limit_price,s)}</td>
    <td class="text-right font-mono">${N(e.used_usdt||e.usd_amount||0)}</td>
    <td class="text-right font-mono">${N(e.fee_paid||0)}</td>
    <td class="text-right font-mono ${a>=0?"text-buy":"text-sell"}">${N(a)}</td>
    <td class="text-right text-muted">${f(K(e.created_at))}</td>
    <td class="text-right px-3 text-muted">${f(K(e.closed_at||e.created_at))}</td>
  </tr>`}function Nt(e){const t=ie(e),s=le(e),a=Number(e.pnl_usd||e.pnl||0);return`<article class="trade-position-card trade-activity-card is-history">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${f(J(e))}</strong>
        <small>${f(e.close_reason||e.status||o("trade.closed","closed"))} - ${f(K(e.closed_at||e.created_at))}</small>
      </div>
      ${Z(t)}
    </div>
    <div class="trade-position-metrics">
      <span><small>${o("trade.exit","Exit")}</small><strong>${x(e.exit_price||e.limit_price,s)}</strong></span>
      <span><small>${o("trade.opened","Opened")}</small><strong>${f(K(e.created_at))}</strong></span>
      <span><small>${o("trade.closed","Closed")}</small><strong>${f(K(e.closed_at||e.created_at))}</strong></span>
      <span><small>PnL</small><strong class="${a>=0?"text-buy":"text-sell"}">${N(a)}</strong></span>
      <span><small>${o("trade.used","Used")}</small><strong>${N(e.used_usdt||e.usd_amount||0)}</strong></span>
      <span><small>${o("trade.fee","Fee")}</small><strong>${N(e.fee_paid||0)}</strong></span>
    </div>
  </article>`}function Z(e){const t=String(e||"BUY").toUpperCase()==="SELL"?"SELL":"BUY";return`<span class="trade-side-chip is-${t.toLowerCase()}">${f(tt(t))}</span>`}function tt(e){return String(e||"").toUpperCase()==="SELL"?o("trade.sell","SELL"):o("trade.buy","BUY")}function At(e){return(e||[]).map(t=>({time:Number(t.time||t.t),open:Number(t.open||t.o),high:Number(t.high||t.h),low:Number(t.low||t.l),close:Number(t.close||t.c),volume:Number(t.volume||t.v||0)})).filter(t=>t.time>0&&t.open>0&&t.high>0&&t.low>0&&t.close>0).sort((t,s)=>t.time-s.time)}function st(e,{fit:t=!1}={}){if(!q||!pe)return!1;const s=At(e);if(!s.length)return!1;q.setData(s.map(({time:r,open:n,high:i,low:d,close:u})=>({time:r,open:n,high:i,low:d,close:u}))),pe.setData(s.map(r=>({time:r.time,value:r.volume,color:r.close>=r.open?"rgba(0,192,135,0.25)":"rgba(246,70,93,0.2)"})));const a=s.map(r=>({time:r.time,close:r.close}));return we&&we.setData(ze(a,7)),Se&&Se.setData(ze(a,25)),C={...s[s.length-1]},t&&L&&L.timeScale().fitContent(),!0}async function Pt(e,t,s=g){if(!_(s))return;const a=p("#chart-box",e);if(!a)return;const{createChart:r}=await Q();_(s)&&(a.innerHTML="",L=r(a,{layout:{background:{color:"#060A14"},textColor:"#8ba1cf",fontSize:11,fontFamily:"'Inter', system-ui, sans-serif"},grid:{vertLines:{color:"rgba(129,160,220,0.04)"},horzLines:{color:"rgba(129,160,220,0.04)"}},crosshair:{mode:0,vertLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"},horzLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"}},timeScale:{timeVisible:!0,secondsVisible:!1,borderColor:"rgba(129,160,220,0.08)",rightOffset:4,barSpacing:6},rightPriceScale:{borderColor:"rgba(129,160,220,0.08)",scaleMargins:{top:.1,bottom:.2}},watermark:{visible:!0,text:"MEX Group",color:"rgba(93,124,255,0.08)",fontSize:48,horzAlign:"center",vertAlign:"center"},width:Math.max(320,a.clientWidth),height:Math.max(260,a.clientHeight),handleScroll:{vertTouchDrag:!1},handleScale:{axisPressedMouseMove:!0}}),q=L.addCandlestickSeries({upColor:"#00c087",downColor:"#f6465d",borderUpColor:"#00c087",borderDownColor:"#f6465d",wickUpColor:"#00c087",wickDownColor:"#f6465d",wickVisible:!0,borderVisible:!0}),pe=L.addHistogramSeries({priceFormat:{type:"volume"},priceScaleId:"vol",color:"rgba(93,124,255,0.3)"}),L.priceScale("vol").applyOptions({scaleMargins:{top:.84,bottom:0}}),we=L.addLineSeries({color:"rgba(255,193,7,0.55)",lineWidth:1,priceLineVisible:!1,lastValueVisible:!1,crosshairMarkerVisible:!1}),Se=L.addLineSeries({color:"rgba(93,124,255,0.55)",lineWidth:1,priceLineVisible:!1,lastValueVisible:!1,crosshairMarkerVisible:!1}),st(t,{fit:!0}),ae=new ResizeObserver(()=>{!L||!a||L.applyOptions({width:Math.max(320,a.clientWidth),height:Math.max(260,a.clientHeight)})}),ae.observe(a))}function at(e,t,s){try{const a=new URLSearchParams({symbol:e,type:t,tf:s}).toString();history.replaceState(null,"",`#/trade?${a}`)}catch{}}function Re(e,t){const s=String(t||"").toUpperCase();U(".symbol-row",e).forEach(a=>{a.classList.toggle("active",String(a.dataset.sym||"").toUpperCase()===s)})}function Dt(e,t){U("[data-tf]",e).forEach(s=>{const a=s.dataset.tf===t;s.classList.toggle("bg-accent/20",a),s.classList.toggle("text-accent",a),s.classList.toggle("text-muted",!a)})}function Ot(e,t,s){const a=String(t||"").toUpperCase(),r=String(s||"").toUpperCase(),n=p("#sym-logo-slot",e);n&&(n.innerHTML=ne(a,s,"w-7 h-7 rounded-md shrink-0"));const i=p("#sym-name",e);i&&(i.textContent=a);const d=p("#ticket-instrument",e);d&&(d.textContent=`${a} - ${r}`);const u=p("#mobile-order-logo-slot",e);u&&(u.innerHTML=ne(a,s,"w-8 h-8 rounded-lg shrink-0"));const l=p("#mobile-order-symbol",e);l&&(l.textContent=a)}function It(e,t,s){const a=String(t||"").toUpperCase();if(!a)return;const r=E(c("type")),n=s||c("type"),i=E(n),d=i!==r,u=c("tf");be(),ge(),T("symbol",a),T("type",n),T("activeQuote",null);const l=g;fe={container:e,symbol:a,type:n,runId:l},at(a,n,u),Ot(e,a,n),Re(e,a),F(e),Ae(e,e.__marketItems||[],l);const m=Q();Te(e,a,n,l),de(e,a,n,u,l,m),Me(e,a,n,u,l,m),d?ve(i,l,!0).then(b=>{_(l,a,n)&&b&&b.items&&(e.__marketItems=b.items,X(e,b.items),Re(e,a),ye(e,b.items,l,i).catch(()=>{}),oe(e,b.items,l,i))}).catch(()=>{}):Array.isArray(e.__marketItems)&&e.__marketItems.length&&oe(e,e.__marketItems,l,i)}function Rt(e,t){if(!t)return;T("tf",t),Dt(e,t);const s=g,a=c("symbol"),r=c("type");at(a,r,t),ge();const n=Q();de(e,a,r,t,s,n),Me(e,a,r,t,s,n)}function Bt(e){p("#mob-mkt-btn",e)?.addEventListener("click",()=>Vt(e)),p("#close-mob-drawer",e)?.addEventListener("click",()=>qe(e)),k(e,"[data-sym]","click",(t,s)=>{qe(e),localStorage.setItem("vp_symbol",s.dataset.sym),localStorage.setItem("vp_type",s.dataset.stype||c("type")),It(e,s.dataset.sym,s.dataset.stype||c("type"))}),k(e,"[data-tf]","click",(t,s)=>{localStorage.setItem("vp_tf",s.dataset.tf),Rt(e,s.dataset.tf)}),k(e,"[data-type-tab]","click",async(t,s)=>{const a=E(s.dataset.typeTab||c("type")||"crypto");e.__marketDrawerType=a;const r=await ve(a,g,!0).catch(()=>null);r?.items&&(e.__marketItems=r.items,X(e,r.items),ye(e,r.items,g,a),oe(e,r.items,g,a)),U("[data-type-tab]",e).forEach(n=>{const i=n===s;n.classList.toggle("bg-accent/20",i),n.classList.toggle("text-accent",i),n.classList.toggle("border-accent/40",i)})}),k(e,"[data-open-order]","click",(t,s)=>Kt(e,s.dataset.openOrder)),k(e,"[data-close-order-sheet]","click",()=>ot(e)),k(e,"[data-submit-order]","click",(t,s)=>je(s.dataset.submitOrder,e,p("#mobile-order-sheet [data-order-form]",e))),k(e,"[data-side]","click",(t,s)=>{const a=s.closest("#mobile-order-sheet"),r=s.closest("[data-order-form]");if(a){nt(e,s.dataset.side);return}je(s.dataset.side,e,r)}),k(e,"[data-order-type]","change",(t,s)=>T("orderType",s.value)),k(e,"[data-market-type]","change",(t,s)=>{T("market",s.value),localStorage.setItem("vp_market",s.value),U("[data-order-form]",e).forEach(a=>{const r=p("#leverage-row",a);if(!r)return;const n=s.value==="perp",i=Number(c("leverage")||10);n?r.outerHTML=`<label class="block order-leverage-row" id="leverage-row">
          <span class="text-[10px] text-muted">Leverage: <strong data-lev-val id="leverage-label">${i}x</strong></span>
          <input type="range" min="1" max="100" value="${i}" class="w-full mt-1 accent-accent" data-leverage />
        </label>`:r.outerHTML=`<div class="order-spot-note" id="leverage-row">
          <span class="text-[10px] text-muted">Spot order — no leverage</span>
        </div>`}),F(e)}),k(e,"[data-leverage]","input",(t,s)=>{T("leverage",Number(s.value)),_e(e,"leverage",s.value),F(e);const a=Number(s.value),r=Number(s.max)||100,n=a/r,i=n<.3?"#00c087":n<.6?"#fcd535":"#f6465d";s.style.accentColor=i;const d=e.querySelector("#leverage-label");d&&(d.textContent=a+"x",d.style.color=i)}),k(e,"[data-amount]","input",(t,s)=>{T("amount",Number(s.value)),_e(e,"amount",s.value),F(e)}),k(e,"[data-close]","click",async(t,s)=>{await Ft(e,s)}),k(e,"[data-cancel-order]","click",async(t,s)=>{await zt(e,s)}),k(e,"[data-edit-order]","click",(t,s)=>{Qt(e,s.dataset.editOrder)}),k(e,"[data-toggle-activity-expand]","click",()=>jt(e)),k(e,"[data-retry-chart]","click",()=>{de(e,c("symbol"),c("type"),c("tf"),g,Q())}),k(e,"[data-activity-tab]","click",(t,s)=>{e.__tradeActivityTab=s.dataset.activityTab||"positions",We(e)}),k(e,"[data-quick-amount]","click",(t,s)=>{const a=Number(s.dataset.quickAmount||0);a>0&&(T("amount",a),_e(e,"amount",a),F(e))}),p("#sym-search",e)?.addEventListener("input",t=>{const s=t.target.value.toLowerCase();U(".symbol-row",e).forEach(a=>{a.style.display=a.dataset.sym.toLowerCase().includes(s)?"":"none"})})}function ge(){ue&&(clearInterval(ue),ue=null)}function Me(e,t,s,a,r=g,n=Q()){ge();const d=E(s||"crypto")==="crypto"?12e3:18e3;ue=setInterval(()=>{_(r,t,s)&&de(e,t,s,a,r,n,{silent:!0,refresh:!0}).catch(()=>null)},d)}async function de(e,t,s,a,r=g,n=Q(),i={}){const d=p("#chart-box",e),u=!!(L&&q);d&&!i.silent&&!u&&(d.innerHTML='<div class="absolute inset-0 flex items-center justify-center"><div class="text-center"><div class="loading-spinner mx-auto"></div><p class="text-[10px] text-muted mt-2">Loading chart...</p></div></div>');try{const l=i.refresh?"&refresh=1":"",m=`/trade/candles.php?symbol=${encodeURIComponent(t)}&type=${encodeURIComponent(s)}&tf=${encodeURIComponent(a)}&limit=500&fast=1${l}&_=${Date.now()}`,b=await A(m,{timeout:i.silent?1e4:14e3,retry:1,cacheTtl:0,cache:"no-store"});if(await n,!_(r,t,s))return;b?.items?.length?L&&q?st(b.items,{fit:!i.silent&&!i.refresh}):await Pt(e,b.items,r):!u&&!i.silent&&Be(e,"Chart data is still loading from the market provider.")}catch(l){if(!_(r,t,s))return;console.error("Chart:",l),!u&&!i.silent&&Be(e,"Chart stream is delayed. Live price and order ticket remain active.")}}function Be(e,t){const s=p("#chart-box",e);s&&(s.innerHTML=`<div class="chart-fallback-state">
    <div class="chart-fallback-card">
      <strong>Chart loading</strong>
      <span>${f(t||"Chart provider is delayed.")}</span>
      <button class="btn-ghost btn-sm" data-retry-chart>Retry chart</button>
    </div>
  </div>`)}function jt(e){const t=p("#positions-section",e);if(!t)return;const s=!t.classList.contains("is-expanded");t.classList.toggle("is-expanded",s),document.body.classList.toggle("trade-activity-expanded-open",s);const a=p("[data-toggle-activity-expand]",e);a&&(a.setAttribute("aria-label",s?o("trade.close_activity","Close trading activity"):o("trade.expand_activity","Expand trading activity")),a.setAttribute("title",s?o("trade.close_activity","Close trading activity"):o("trade.expand_activity","Expand trading activity")),a.innerHTML=s?I.close:I.fullscreen||I.expand||"⛶"),L&&!s&&setTimeout(()=>L.timeScale?.().fitContent?.(),80)}async function Ft(e,t){const s=String(t?.dataset?.close||"");if(!s||xe.has(s)||!await Yt())return;xe.add(s);const r=U(`[data-close="${rt(s)}"]`,e);r.forEach(n=>{n.disabled=!0,n.classList.add("opacity-60"),n.dataset.prevText=n.textContent,n.textContent=o("trade.closing","Closing...")});try{const n=await A("/trade/close_position.php",{method:"POST",body:{id:s,position_id:s,mode:c("mode")},timeout:14e3});if(n&&n.ok===!1)throw new Error(n.error||o("trade.close_failed","Close failed"));Le("/trade/portfolio.php","/trade/orders.php"),await Promise.allSettled([R(e,g,!1,!0),A("/wallet/summary.php",{timeout:0,retry:1,cacheTtl:0}).then(i=>{(i?.real||i?.demo)&&T("wallet",{real:i.real||{},demo:i.demo||{}})}).catch(()=>null)]),W(o("trade.position_closed_success","Position closed successfully"),"success")}catch(n){W(n.message||o("trade.could_not_close","Could not close this position now."),"error"),r.forEach(i=>{i.disabled=!1,i.classList.remove("opacity-60"),i.textContent=i.dataset.prevText||o("common.close","Close")})}finally{xe.delete(s)}}function qt(e,t){const s=String(t||"");return(e.__tradeOrders||[]).find(a=>Ue(a)===s)||null}async function zt(e,t){const s=String(t?.dataset?.cancelOrder||"");if(!s||!await Ht())return;const r=U(`[data-cancel-order="${rt(s)}"]`,e);r.forEach(n=>{n.disabled=!0,n.classList.add("opacity-60"),n.dataset.prevText=n.textContent,n.textContent=o("trade.canceling","Canceling...")});try{const n=await A("/trade/cancel.php",{method:"POST",body:{order_id:s,id:s,mode:c("mode")},timeout:1e4});if(n&&n.ok===!1)throw new Error(n.error||o("trade.cancel_failed","Cancel failed"));Le("/trade/portfolio.php","/trade/orders.php"),await R(e,g,!1,!0),W(o("trade.pending_order_canceled","Pending order canceled"),"success")}catch(n){W(n.message||o("trade.could_not_cancel_order","Could not cancel this order."),"error"),r.forEach(i=>{i.disabled=!1,i.classList.remove("opacity-60"),i.textContent=i.dataset.prevText||o("common.cancel","Cancel")})}}function Ht(e){return new Promise(t=>{const s=document.getElementById("cancel-order-modal");s&&s.remove();const a=document.createElement("div");a.id="cancel-order-modal",a.className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center",a.innerHTML=`<div class="absolute inset-0 bg-black/70" data-cancel-order-backdrop></div>
      <div class="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
        <div class="px-5 py-4 border-b border-line">
          <h3 class="text-base font-black">${o("trade.cancel_pending_order","Cancel pending order")}</h3>
          <p class="mt-1 text-xs text-muted">${o("trade.cancel_pending_order_copy","This only cancels orders that have not executed yet. Open positions must be closed from the position card.")}</p>
        </div>
        <div class="grid grid-cols-2 gap-3 px-5 py-4">
          <button class="btn-ghost" data-cancel-order-no>${o("trade.keep_order","Keep order")}</button>
          <button class="btn-danger" data-cancel-order-yes>${o("trade.cancel_order","Cancel order")}</button>
        </div>
      </div>`,document.body.appendChild(a);const r=n=>{a.remove(),t(n)};a.querySelector("[data-cancel-order-backdrop]").addEventListener("click",()=>r(!1)),a.querySelector("[data-cancel-order-no]").addEventListener("click",()=>r(!1)),a.querySelector("[data-cancel-order-yes]").addEventListener("click",()=>r(!0))})}function Qt(e,t){const s=qt(e,t);if(!s||!Ee(s)){W(o("trade.order_no_longer_pending","This order is no longer pending."),"error"),R(e,g,!0);return}const a=le(s),r=document.getElementById("edit-order-modal");r&&r.remove();const n=document.createElement("div");n.id="edit-order-modal",n.className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center",n.innerHTML=`<div class="absolute inset-0 bg-black/70" data-edit-order-backdrop></div>
    <div class="relative w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
      <div class="px-5 py-4 border-b border-line">
        <h3 class="text-base font-black">${o("trade.edit_pending_order","Edit pending order")}</h3>
        <p class="mt-1 text-xs text-muted">${f(J(s))} ${f(tt(ie(s)))} - ${o("trade.edit_pending_copy","changes apply before execution only.")}</p>
      </div>
      <form class="grid gap-3 px-5 py-4" data-edit-order-form>
        <label class="grid gap-1">
            <span class="text-[10px] uppercase font-black text-muted">${o("trade.entry_price","Entry price")}</span>
          <input class="input" name="entry" inputmode="decimal" value="${$(Number(s.limit_price||s.entry_price||0)||"")}" placeholder="${$(x(s.limit_price||s.entry_price||0,a))}">
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="grid gap-1">
            <span class="text-[10px] uppercase font-black text-muted">${o("trade.take_profit","Take profit")}</span>
            <input class="input" name="tp" inputmode="decimal" value="${$(Number(s.tp_price||0)||"")}" placeholder="${$(o("funding.optional","Optional"))}">
          </label>
          <label class="grid gap-1">
            <span class="text-[10px] uppercase font-black text-muted">${o("trade.stop_loss","Stop loss")}</span>
            <input class="input" name="sl" inputmode="decimal" value="${$(Number(s.sl_price||0)||"")}" placeholder="${$(o("funding.optional","Optional"))}">
          </label>
        </div>
        <p class="order-form-status is-info" data-edit-order-status hidden></p>
        <div class="grid grid-cols-2 gap-3 pt-1">
          <button type="button" class="btn-ghost" data-edit-order-close>${o("common.cancel","Cancel")}</button>
          <button type="submit" class="btn-primary" data-edit-order-save>${o("common.save_changes","Save changes")}</button>
        </div>
      </form>
    </div>`,document.body.appendChild(n);const i=()=>n.remove();n.querySelector("[data-edit-order-backdrop]").addEventListener("click",i),n.querySelector("[data-edit-order-close]").addEventListener("click",i),n.querySelector("[data-edit-order-form]").addEventListener("submit",async d=>{d.preventDefault();const u=d.currentTarget,l=p("[data-edit-order-status]",u),m=p("[data-edit-order-save]",u),b=Number(u.entry.value||0),v=u.tp.value===""?null:Number(u.tp.value||0),w=u.sl.value===""?null:Number(u.sl.value||0);if(!(b>0)){l&&(l.textContent=o("trade.entry_price_required","Entry price is required."),l.hidden=!1,l.className="order-form-status is-warning");return}try{m&&(m.disabled=!0,m.textContent=o("common.saving","Saving...")),l&&(l.textContent=o("trade.saving_order_changes","Saving order changes..."),l.hidden=!1,l.className="order-form-status is-info");const y=await A("/trade/update_order.php",{method:"POST",body:{order_id:t,limit_price:b,tp_price:v,sl_price:w,mode:c("mode")},timeout:1e4});if(y&&y.ok===!1)throw new Error(y.error||o("trade.update_failed","Update failed"));i(),await R(e,g),W(o("trade.pending_order_updated","Pending order updated"),"success")}catch(y){l&&(l.textContent=y.message||o("trade.could_not_update_order","Could not update this order."),l.hidden=!1,l.className="order-form-status is-error"),m&&(m.disabled=!1,m.textContent=o("common.save_changes","Save changes"))}})}function rt(e){return window.CSS&&typeof window.CSS.escape=="function"?window.CSS.escape(String(e)):String(e).replace(/\\/g,"\\\\").replace(/"/g,'\\"')}function Yt(e){return new Promise(t=>{const s=document.getElementById("close-position-modal");s&&s.remove();const a=document.createElement("div");a.id="close-position-modal",a.className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center",a.innerHTML=`<div class="absolute inset-0 bg-black/70" data-close-modal-backdrop></div>
      <div class="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
        <div class="px-5 py-4 border-b border-line">
          <h3 class="text-base font-black">${o("trade.close_position","Close position")}</h3>
          <p class="mt-1 text-xs text-muted">${o("trade.close_position_copy","The position will be closed at the current market price.")}</p>
        </div>
        <div class="grid grid-cols-2 gap-3 px-5 py-4">
          <button class="btn-ghost" data-close-cancel>${o("common.cancel","Cancel")}</button>
          <button class="btn-danger" data-close-confirm>${o("trade.close_now","Close now")}</button>
        </div>
      </div>`,document.body.appendChild(a);const r=n=>{a.remove(),t(n)};a.querySelector("[data-close-modal-backdrop]").addEventListener("click",()=>r(!1)),a.querySelector("[data-close-cancel]").addEventListener("click",()=>r(!1)),a.querySelector("[data-close-confirm]").addEventListener("click",()=>r(!0))})}function W(e,t="success"){let s=document.getElementById("trade-toast");s||(s=document.createElement("div"),s.id="trade-toast",s.className="trade-toast",document.body.appendChild(s)),s.textContent=e,s.className=`trade-toast is-${t}`,clearTimeout(s.__timer),s.__timer=setTimeout(()=>s.classList.remove("is-success","is-error"),2500)}async function je(e,t,s){const a=s||p("[data-order-form]",t)||t;P(a,"","info");const r=c("activeQuote")||{},n=Number(r.price||0);if(!n){P(a,"No live price available yet. Please wait for the quote to load.","warning");return}if(!ss(r)){P(a,"This quote is not fresh enough for execution yet. Please wait for a live or delayed market quote.","warning");return}const i=Number(p("[data-amount]",a)?.value||c("amount")||0),d=(p("[data-market-type]",a)?.value||c("market")||"spot")==="perp"?Number(p("[data-leverage]",a)?.value||c("leverage")||1):1,u=Number(p("[data-tp]",a)?.value||0),l=Number(p("[data-sl]",a)?.value||0),m=p("[data-market-type]",a)?.value||c("market")||"spot",b=p("[data-order-type]",a)?.value||c("orderType")||"MARKET",v=Number(p("[data-limit-price]",a)?.value||0);if(i<=0){P(a,"Enter a valid amount first.","warning");return}if(e==="BUY"&&l>0&&l>=n){P(a,"For BUY orders, Stop Loss should be below the current price.","warning");return}if(e==="SELL"&&l>0&&l<=n){P(a,"For SELL orders, Stop Loss should be above the current price.","warning");return}if(await Gt({side:e,symbol:c("symbol"),type:c("type"),amount:i,leverage:d,tp:u,sl:l,marketType:m,orderType:b,currentPrice:n,limitInput:v,mode:c("mode")}))try{Fe(a,!0),P(a,`Sending ${e==="BUY"?"buy":"sell"} order...`,"info");const y=await A("/trade/place_order.php",{method:"POST",body:{symbol:c("symbol"),asset_type:c("type"),market_type:m,side:e,order_type:b,usd:i,leverage:d,tp:u||void 0,sl:l||void 0,price:b==="LIMIT"&&v||n,mode:c("mode")},timeout:15e3,retry:1});if(y&&y.ok===!1){P(a,y.error||"Order failed","error");return}P(a,`${e==="BUY"?o("trade.buy","شراء"):o("trade.sell","بيع")} — ${o("trade.order_success","تم فتح الصفقة بنجاح")}`,"success"),Le("/trade/portfolio.php","/trade/orders.php"),await R(t,g,!1,!0),A("/wallet/summary.php",{timeout:0,retry:1,cacheTtl:0}).then(S=>{(S?.real||S?.demo)&&T("wallet",{real:S.real||{},demo:S.demo||{}})}).catch(()=>null),setTimeout(()=>{a.closest?.("#mobile-order-sheet")?ot(t):P(a,"","info")},900)}catch(y){console.error("Order failed:",y);const S=y?.code==="aborted"||y?.name==="AbortError"||y?.name==="RequestAbortError"||String(y?.message||"").toLowerCase().includes("aborted")||String(y?.message||"").toLowerCase().includes("cancelled"),B=y?.code==="timeout"?"Request timed out — please wait for the live price to refresh and try again.":S?"Order was interrupted. Check Open Positions — if the trade is not listed, place the order again.":y.message||"Order failed. Please try again.";P(a,B,"error")}finally{Fe(a,!1)}}function Gt({side:e,symbol:t,type:s,amount:a,leverage:r,tp:n,sl:i,marketType:d,orderType:u,currentPrice:l,limitInput:m,mode:b}){return new Promise(v=>{const w=document.getElementById("order-confirm-modal");w&&w.remove();const y=e==="BUY",S=u==="LIMIT"&&m||l,B=a*r,h=n>0?Math.abs(n-S)*(B/S):null,z=i>0?Math.abs(i-S)*(B/S):null,M=document.createElement("div");M.id="order-confirm-modal",M.className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center",M.innerHTML=`
      <div class="absolute inset-0 bg-black/70" id="confirm-backdrop"></div>
      <div class="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden">
        <div class="px-5 py-4 border-b border-line text-center">
          <h3 class="text-lg font-bold ${y?"text-green-400":"text-red-400"}">${y?o("trade.buy","شراء"):o("trade.sell","بيع")} — ${o("trade.order","الأمر")}</h3>
          <p class="text-xs text-muted mt-1">${o("trade.review_confirm","راجع وأكد الأمر")}</p>
        </div>
        <div class="px-5 py-4 space-y-3">
          <div class="flex justify-between text-sm"><span class="text-muted">${o("Symbol")}</span><strong>${f(t)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${o("Type")}</span><strong>${f(u)} / ${f(d)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${o("Side")}</span><strong class="${y?"text-green-400":"text-red-400"}">${o(e)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${o("Amount")}</span><strong>$${a.toFixed(2)}</strong></div>
          ${d==="perp"?`<div class="flex justify-between text-sm"><span class="text-muted">${o("Leverage")}</span><strong>${r}x</strong></div>`:""}
          <div class="flex justify-between text-sm"><span class="text-muted">${o("Notional")}</span><strong>$${B.toFixed(2)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${o("Price")}</span><strong class="font-mono">${parseFloat(S).toFixed(s==="crypto"?2:4)}</strong></div>
          ${n>0?`<div class="flex justify-between text-sm"><span class="text-muted">${o("Take Profit")}</span><strong class="font-mono text-green-400">${parseFloat(n).toFixed(s==="crypto"?2:4)}</strong></div>`:""}
          ${i>0?`<div class="flex justify-between text-sm"><span class="text-muted">${o("Stop Loss")}</span><strong class="font-mono text-red-400">${parseFloat(i).toFixed(s==="crypto"?2:4)}</strong></div>`:""}
          ${h!==null?`<div class="flex justify-between text-sm"><span class="text-muted">${o("Est. Profit")}</span><strong class="text-green-400">$${h.toFixed(2)}</strong></div>`:""}
          ${z!==null?`<div class="flex justify-between text-sm"><span class="text-muted">${o("Est. Loss")}</span><strong class="text-red-400">$${z.toFixed(2)}</strong></div>`:""}
          <div class="flex justify-between text-sm"><span class="text-muted">${o("Mode")}</span><strong>${b==="real"?o("Real"):o("Demo")}</strong></div>
        </div>
        <div class="grid grid-cols-2 gap-3 px-5 py-4 border-t border-line">
          <button class="btn-ghost py-2.5" id="confirm-cancel">${o("Cancel")}</button>
          <button class="${y?"btn-buy":"btn-sell"} py-2.5 text-white font-bold" id="confirm-execute">${o("Confirm")} ${o(e)}</button>
        </div>
      </div>`,document.body.appendChild(M),document.body.style.overflow="hidden";const Y=Pe=>{M.remove(),document.body.style.overflow="",v(Pe)};M.querySelector("#confirm-backdrop").addEventListener("click",()=>Y(!1)),M.querySelector("#confirm-cancel").addEventListener("click",()=>Y(!1)),M.querySelector("#confirm-execute").addEventListener("click",()=>Y(!0)),M.querySelector("#confirm-execute").focus()})}function P(e,t,s="info"){const a=p("[data-order-status]",e);a&&(a.textContent=t||"",a.hidden=!t,a.className=`order-form-status is-${s}`)}function Fe(e,t){const s=[e,e.closest?.("#mobile-order-sheet")].filter(Boolean);new Set(s.flatMap(r=>U("[data-side], [data-submit-order]",r))).forEach(r=>{r.disabled=!!t,r.classList.toggle("opacity-60",!!t)}),e.classList.toggle("is-submitting",!!t)}function Vt(e){const t=p("#market-drawer",e);if(!t)return;t.classList.add("mobile-market-open"),t.classList.remove("hidden"),document.body.classList.add("trade-modal-open");const s=p("#symbol-list",e);if(s&&!s.querySelector(".symbol-row")&&!e.__marketDrawerLoading){e.__marketDrawerLoading=!0;const a=E(e.__marketDrawerType||c("type")||"crypto");e.__marketDrawerType=a,ve(a,g).then(r=>{r?.items&&(e.__marketItems=r.items,X(e,r.items),Ae(e,r.items,g),ye(e,r.items,g,a))}).catch(()=>{const r=Ne(c("type"));e.__marketItems=r,X(e,r)}).finally(()=>{e.__marketDrawerLoading=!1})}}function qe(e){const t=p("#market-drawer",e);t&&(t.classList.remove("mobile-market-open"),window.innerWidth<1024&&t.classList.add("hidden"),document.body.classList.remove("trade-modal-open"))}function Kt(e,t){const s=p("#mobile-order-sheet",e);s&&(nt(e,t),s.classList.remove("hidden"),document.body.classList.add("trade-modal-open"),F(e))}function ot(e){const t=p("#mobile-order-sheet",e);t&&t.classList.add("hidden"),document.body.classList.remove("trade-modal-open")}function nt(e,t){const s=p("#mobile-submit-order",e),a=p("#mobile-order-side-label",e);s&&(s.dataset.submitOrder=t,s.textContent=t==="BUY"?o("trade.order.buy_now","شراء الآن"):o("trade.order.sell_now","بيع الآن"),s.className=`${t==="BUY"?"btn-buy":"btn-sell"} w-full py-3`),a&&(a.textContent=`${t} order`)}function _e(e,t,s){U(`[data-${t}]`,e).forEach(a=>{String(a.value)!==String(s)&&(a.value=s)})}function Xt(e,t=g,s=0,a=c("type")){if(!_(t)||!q||!C||!(e>0))return;const r=Jt(s,a);r<=C.time?(C.close=e,C.high=Math.max(C.high,e),C.low=Math.min(C.low,e)):C={time:r,open:C.close,high:Math.max(C.close,e),low:Math.min(C.close,e),close:e,volume:0},q.update({time:C.time,open:C.open,high:C.high,low:C.low,close:C.close})}function Jt(e=0,t=c("type")){const s=Wt(c("tf")),a=E(t),r=Number(e||0),n=r>0&&a!=="crypto"?Math.floor(r):Math.floor(Date.now()/1e3);return Math.floor(n/s)*s}function Wt(e){return{"1m":60,"5m":300,"15m":900,"30m":1800,"1h":3600,"4h":14400,"1d":86400}[e]||60}function Q(){return he||(he=lt(()=>import("./chart-uI7-MQXf.js"),__vite__mapDeps([0,1]))),he}function ze(e,t){const s=[];for(let a=t-1;a<e.length;a++){let r=0;for(let n=0;n<t;n++)r+=e[a-n].close;s.push({time:e[a].time,value:r/t})}return s}function Ne(e){const t=E(e||"crypto"),s=t==="favorites"?"crypto":t||"crypto";return(Oe[s]||Oe.crypto).map(([r,n],i)=>({id:99e4+i,symbol:r,name:n,type:s,status:"active",sort_order:i+1,price:0,change_pct:0,source:"client_symbol_fallback",timing_class:"warming"}))}function Zt(e,t){const a=(Array.isArray(e?.items)?e.items:Array.isArray(e?.markets)?e.markets:Array.isArray(e)?e:[]).filter(r=>r&&r.symbol);return a.length?{...e||{},ok:e?.ok!==!1,items:a}:{ok:!0,items:Ne(t),fallback:"client_symbol_fallback"}}function es(e){const t=E(e||"crypto");return`/markets.php?type=${encodeURIComponent(t==="favorites"?"crypto":t)}&scope=trade&supported=1&lite=1&with_quotes=0&fast_list=1&show_unpriced=1&limit=80`}async function ve(e,t=g,s=!1){const a=E(e||"crypto"),r=a||"crypto",n=De.get(r),i=Date.now();if(!s&&n&&n.expires>i)return n.data;let d=null;try{d=await A(es(a),{timeout:8e3,retry:1,cacheTtl:12e3,cache:"no-store"})}catch{if(n?.data?.items?.length)return n.data;d=null}const u=Zt(d,a);return _(t)&&De.set(r,{data:u,expires:Date.now()+8e3}),u}function Ae(e,t,s=g){const a=String(c("symbol")||"").toUpperCase(),r=(t||[]).find(i=>String(i.symbol||"").toUpperCase()===a);if(!r)return;Number(r.price||r.q_price||0)>0&&Je(e,r,s)}function ts(e){const t=String(e?.timing_class||"").toLowerCase(),s=String(e?.source||"").toLowerCase();return Number(e?.price||0)<=0?"unavailable":t==="seed"||s.includes("seed")?"reference":t==="stale"||e?.is_stale?"stale":t==="market_closed"?"closed":t==="delayed"||s.includes("yahoo")||["stocks","arab"].includes(E(e?.type||c("type")))?"delayed":t==="candle_fallback"?"chart_quote":"live"}function ss(e){const t=ts(e);return!["reference","stale","unavailable","chart_quote"].includes(t)}function ne(e,t,s){return`<span class="${s} grid place-items-center overflow-hidden border border-line bg-surface">
    <img src="${$(ct({symbol:e,type:t},t))}" class="h-full w-full object-cover" alt="${$(e)}" loading="lazy" data-fallback="initial" />
    <b class="hidden h-full w-full place-items-center bg-accent/20 text-[9px] font-black">${f(ut(e))}</b>
  </span>`}export{is as cleanup,ns as mount,os as render};
