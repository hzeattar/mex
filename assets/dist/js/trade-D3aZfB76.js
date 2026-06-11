const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["js/chart-uI7-MQXf.js","js/vendor-DJkwUXgC.js"])))=>i.map(i=>d[i]);
import{c as A,s as E,j as c,k as j,t as o,h as S,g as y,o as $,_ as dt,$ as p,a as U,m as P,p as Le,f as ct,q as Ye,d as Te}from"./main-CGd9Gy15.js";import{marketIconPath as ut,marketInitial as pt}from"./marketIcon-D-Yq8Sis.js";let se=null,V=null,D=0,R=null;const mt=3e3;let B={};function ft(e,t,s,a,r={}){if(te(),!e||!e.length)return te;const n=++D,i=Qe(e,r.maxSymbols||18);return i.length&&(!r.forcePolling&&typeof EventSource=="function"?bt(i,t,s,a,n,r):Ge(i,t,s,a,n,r)),te}function Qe(e,t){const s=Math.max(1,Number(t||18));return[...new Set((e||[]).map(a=>String(a||"").toUpperCase()).filter(Boolean))].slice(0,s)}function bt(e,t,s,a,r,n){we(),B={};const i="/api/stream/sse.php?symbols="+encodeURIComponent(e.join(","))+"&type="+encodeURIComponent(t)+"&scope=watchlist&_="+Date.now();let d=!1,u=null;const l=Math.max(5e3,Number(n.fallbackAfter||5e3)),m=()=>{r===D&&(u&&(clearTimeout(u),u=null),B={},we(),Ge(e,t,s,a,r,n))},b=()=>{u&&clearTimeout(u),u=setTimeout(m,Math.max(l+2500,8e3))};let x=setTimeout(()=>{r!==D||d||m()},Math.max(3e3,l));R=new EventSource(i,{withCredentials:!0}),R.addEventListener("open",()=>{d=!0,x&&(clearTimeout(x),x=null),b()}),R.addEventListener("snapshot",_=>{if(r===D)try{const f=JSON.parse(_.data||"[]");if(Array.isArray(f)&&f.length){const h=[];for(const k of f){const g=String(k.symbol||"").toUpperCase();g&&(B[g]=k,h.push(k))}s&&s(h)}b()}catch{}}),R.addEventListener("delta",_=>{if(r===D)try{const f=JSON.parse(_.data||"[]");if(Array.isArray(f)&&f.length){const h=[];for(const k of f){const g=String(k.symbol||"").toUpperCase();g&&(B[g]=Object.assign({},B[g]||{},k),h.push(B[g]))}s&&s(h)}b()}catch{}}),R.addEventListener("message",_=>{if(r===D)try{const f=JSON.parse(_.data||"[]");if(Array.isArray(f)&&f.length&&s){for(const h of f){const k=String(h.symbol||"").toUpperCase();k&&(B[k]=h)}s(f)}b()}catch{}}),R.addEventListener("reconnect",()=>{r===D&&m()}),R.addEventListener("error",_=>{r===D&&m()})}function Ge(e,t,s,a,r,n){Ve(),B={};const i=Math.max(1500,Number(n.interval||mt)),d=Math.max(0,Number(n.initialDelay||0)),u=Qe(e,n.maxSymbols||18),l=async()=>{if(r!==D)return;V=new AbortController;const m=Math.max(3e3,Number(n.timeout||1e4)),b=setTimeout(()=>{try{V?.abort()}catch{}},m);try{const x="/api/quotes.php?symbols="+encodeURIComponent(u.join(","))+"&type="+encodeURIComponent(t)+"&visible=1&purpose=watchlist&_="+Date.now(),_=await A(x,{timeout:m,retry:0,cacheTtl:500,cache:"no-store",signal:V.signal});r===D&&_&&_.items&&s&&s(_.items)}catch(x){x.name}finally{clearTimeout(b),r===D&&(se=setTimeout(l,i))}};se=setTimeout(l,d)}function Ve(){se&&(clearTimeout(se),se=null),V&&(V.abort(),V=null)}function we(){R&&(R.close(),R=null)}function te(){D+=1,B={},we(),Ve()}let T=null,z=null,me=null,Se=null,ke=null,I=null,ue=null,ae=null,K=null,pe=null,re=null,xe=null,L=null,v=0;const Oe=new Map,_e=new Set;let oe=[],be=null;function C(e,t,s,a){oe.push(ct(e,t,s,a))}function yt(){return[{key:"favorites",label:o("market.type.favorites","المفضلة")},{key:"crypto",label:o("markets.crypto","الكريبتو")},{key:"forex",label:o("markets.fx","الفوركس")},{key:"stocks",label:o("markets.stocks","الأسهم")},{key:"commodities",label:o("markets.commodities","السلع")},{key:"futures",label:o("market.type.futures","العقود الآجلة")},{key:"arab",label:o("markets.arab_stocks","الأسهم العربية")}]}const Ie={crypto:[["BTCUSDT","Bitcoin / Tether"],["ETHUSDT","Ethereum / Tether"],["BNBUSDT","BNB / Tether"],["SOLUSDT","Solana / Tether"],["XRPUSDT","XRP / Tether"],["ADAUSDT","Cardano / Tether"],["DOGEUSDT","Dogecoin / Tether"],["AVAXUSDT","Avalanche / Tether"],["TRXUSDT","TRON / Tether"],["LINKUSDT","Chainlink / Tether"]],forex:[["EURUSD","Euro / US Dollar"],["GBPUSD","British Pound / US Dollar"],["USDJPY","US Dollar / Japanese Yen"],["USDCHF","US Dollar / Swiss Franc"],["AUDUSD","Australian Dollar / US Dollar"],["USDCAD","US Dollar / Canadian Dollar"],["NZDUSD","New Zealand Dollar / US Dollar"],["EURGBP","Euro / British Pound"],["EURJPY","Euro / Japanese Yen"],["GBPJPY","British Pound / Japanese Yen"]],stocks:[["AAPL","Apple Inc."],["MSFT","Microsoft Corp."],["NVDA","NVIDIA Corp."],["TSLA","Tesla Inc."],["AMZN","Amazon.com Inc."],["GOOGL","Alphabet Inc."],["META","Meta Platforms"],["NFLX","Netflix Inc."]],commodities:[["XAUUSD","Gold Spot / US Dollar"],["XAGUSD","Silver Spot / US Dollar"],["USOIL","US Oil"],["UKOIL","Brent Oil"],["NATGAS","Natural Gas"],["COPPER","Copper"]],futures:[["ES_F","S&P 500 Futures"],["NQ_F","Nasdaq 100 Futures"],["YM_F","Dow Jones Futures"],["GC_F","Gold Futures"],["CL_F","Crude Oil Futures"]],arab:[["2222","Saudi Aramco"],["1120","Al Rajhi Bank"],["2010","SABIC"],["7010","stc"],["1211","Maaden"],["1150","Alinma Bank"]]},gt=["1m","5m","15m","30m","1h","4h","1d"];function ns(e){e.symbol&&E("symbol",e.symbol.toUpperCase()),e.type&&E("type",e.type),e.tf&&E("tf",e.tf);const t=c("symbol"),s=c("type"),a=c("tf");return`<div class="trade-terminal flex flex-col lg:flex-row h-full mobile-pad">
    <aside id="market-drawer" class="hidden lg:flex flex-col w-[250px] border-r border-line bg-surface shrink-0 overflow-hidden">
      <div class="lg:hidden flex items-center justify-between h-12 px-3 border-b border-line bg-panel">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-muted">${o("common.markets","Markets")}</div>
          <strong class="text-sm">${o("trade.select_instrument","Select instrument")}</strong>
        </div>
        <button class="icon-btn icon-btn-sm" id="close-mob-drawer" aria-label="Close markets">${j.close}</button>
      </div>
      <div class="hidden lg:block p-2 border-b border-line">
        <div class="relative">
          <input type="search" class="input pl-7" placeholder="${S(o("trade.search_symbol","Search symbol..."))}" id="sym-search" />
          <span class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted">${j.search}</span>
        </div>
      </div>
      <div class="flex gap-1 p-2 overflow-x-auto border-b border-line" id="type-tabs">
        ${yt().map(r=>`<button class="btn-xs ${r.key===s?"bg-accent/20 text-accent border-accent/40":"text-muted border-line"} border rounded-md whitespace-nowrap" data-type-tab="${r.key}">${r.label}</button>`).join("")}
      </div>
      <div class="flex-1 overflow-auto p-1" id="symbol-list"><div class="p-4 mobile-menu-centered-loader"><div class="loading-spinner mx-auto"></div></div></div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div class="flex items-center justify-between px-2 lg:px-4 h-11 border-b border-line bg-surface shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <button class="lg:hidden w-8 h-8 grid place-items-center rounded border border-line text-muted shrink-0" id="mob-mkt-btn" aria-label="Open markets">${j.menu}</button>
          <span id="sym-logo-slot">${ie(t,s,"w-7 h-7 rounded-md shrink-0")}</span>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <strong class="text-sm truncate" id="sym-name">${y(t)}</strong>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold" id="live-price">--</span>
              <span class="text-[10px]" id="live-change">+0.00%</span>
            </div>
          </div>
        </div>
        <div class="flex gap-0.5 overflow-x-auto max-w-[46vw] lg:max-w-none" id="tf-bar">
          ${gt.map(r=>`<button class="px-1.5 py-1 text-[10px] rounded shrink-0 ${r===a?"bg-accent/20 text-accent":"text-muted hover:text-text"}" data-tf="${r}">${r}</button>`).join("")}
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
            <button class="activity-expand-btn" data-toggle-activity-expand title="${S(o("trade.expand_activity","Expand trading activity"))}" aria-label="${S(o("trade.expand_activity","Expand trading activity"))}">${j.fullscreen||j.expand||"⛶"}</button>
          </div>
        </div>
        <div id="activity-body"><p class="text-muted text-[11px] text-center py-4">${o("common.loading","Loading...")}</p></div>
      </div>
    </div>

    <aside class="hidden lg:flex flex-col w-[300px] border-l border-line bg-surface shrink-0 overflow-auto">
      <div class="p-3 border-b border-line">
        <div class="text-xs font-semibold">Order Ticket</div>
        <div class="text-[10px] text-muted" id="ticket-instrument">${y(t)} - ${y(s.toUpperCase())}</div>
      </div>
      <div class="p-3 space-y-3" id="order-body">
        ${Ke()}
      </div>
    </aside>

    ${vt(t,s)}
  </div>`}function Ke(){const e=c("orderType")||"MARKET",t=Number(c("amount")||100),s=Number(c("leverage")||10),a=c("market")||"spot",r=a==="perp",n=c("activeQuote")||{},i=Number(n.price||0);return`<div class="space-y-3 order-ticket-panel" data-order-form>
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
      <button class="btn-sell trade-price-button" data-side="SELL"><small>${o("trade.sell","Sell")}</small><span data-sell-price>${i>0?$(i,c("type")):"--"}</span></button>
      <button class="btn-buy trade-price-button" data-side="BUY"><small>${o("trade.buy","Buy")}</small><span data-buy-price>${i>0?$(i*1.0001,c("type")):"--"}</span></button>
      </div>
      <div class="text-center"><span class="spread-display" data-spread-val>${o("trade.spread","Spread")}: --</span></div>
      <div class="mobile-order-summary">
        <span><small>${o("trade.mode","Mode")}</small><strong>${y(c("mode")==="real"?o("trade.real","Real"):o("trade.demo","Demo"))}</strong></span>
        <span><small>${o("trade.symbol","Symbol")}</small><strong>${y(c("symbol")||"--")}</strong></span>
        <span><small>${o("trade.type","Type")}</small><strong>${r?o("trade.perp_futures","Perp/Futures"):o("trade.spot","Spot")}</strong></span>
      </div>
      <div class="order-summary-box">
        <span><small>${o("trade.available","Available")}</small><strong data-avail-bal>--</strong></span>
        <span><small>${o("trade.est_units","Est. Units")}</small><strong data-est-units>--</strong></span>
        <span><small>${o("trade.notional","Notional")}</small><strong data-est-notional>--</strong></span>
    </div>
    <label class="block">
      <span class="text-[10px] text-muted">${o("trade.margin_amount","Margin / Amount (USDT)")}</span>
      <input type="number" min="1" step="any" class="input mt-1" value="${S(String(t))}" data-amount />
    </label>
    <div class="quick-amount-grid" aria-label="Quick order amounts">
      ${[25,50,100,250].map(d=>`<button type="button" data-quick-amount="${d}">$${d}</button>`).join("")}
    </div>
    <label class="block">
      <span class="text-[10px] text-muted">${o("trade.limit_price","Limit price")}</span>
      <input type="number" min="0" step="any" class="input mt-1" placeholder="${i>0?$(i,c("type")):o("trade.required_for_limit","Required for limit")}" data-limit-price />
    </label>
    ${r?`
    <label class="block order-leverage-row" id="leverage-row">
      <span class="text-[10px] text-muted">${o("trade.leverage","Leverage")}: <strong data-lev-val id="leverage-label">${s}x</strong></span>
      <input type="range" min="1" max="100" value="${S(String(s))}" class="w-full mt-1 accent-accent" data-leverage />
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
  </div>`}function vt(e,t){return`<div class="fixed inset-0 z-[230] hidden lg:hidden" id="mobile-order-sheet">
    <div class="absolute inset-0 bg-black/65" data-close-order-sheet></div>
    <div class="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-auto rounded-t-2xl border border-line bg-surface shadow-2xl">
      <div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3">
        <div class="flex items-center gap-2 min-w-0">
          <span id="mobile-order-logo-slot">${ie(e,t,"w-8 h-8 rounded-lg shrink-0")}</span>
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider text-muted" id="mobile-order-side-label">${o("trade.order","Order")}</div>
            <strong class="text-sm truncate" id="mobile-order-symbol">${y(e)}</strong>
          </div>
        </div>
        <button class="icon-btn icon-btn-sm" data-close-order-sheet aria-label="Close order">${j.close}</button>
      </div>
      <div class="p-4">
        ${Ke()}
        <div class="order-action-sticky">
          <button class="btn-primary w-full py-3" id="mobile-submit-order" data-submit-order="BUY">${o("trade.review_place","Review & Place Order")}</button>
        </div>
      </div>
    </div>
  </div>`}function is(e){const t=s=>{if(s.target.tagName==="IMG"&&s.target.dataset.fallback==="initial"){s.target.style.display="none";const a=s.target.nextElementSibling;a&&(a.style.display="grid")}};e.addEventListener("error",t,!0),oe.push(()=>e.removeEventListener("error",t,!0)),ht(e)}function ls(){v+=1,re&&(re.disconnect(),re=null),T&&(T.remove(),T=null,z=null,me=null,L=null),I&&(I(),I=null),ye(),Je(),ve(),te(),oe.forEach(e=>{try{e()}catch{}}),oe=[],be=null,document.body.classList.remove("trade-modal-open")}async function ht(e){const t=c("symbol"),s=c("type"),a=c("tf"),r=++v;E("activeQuote",null);const n=Q();be={container:e,symbol:t,type:s,runId:r},jt(e),xt(),q(e),Ee(e,t,s,r),he(s,r).then(i=>{w(r,t,s)&&i?.items&&(e.__marketItems=i.items,X(e,i.items),Pe(e,i.items,r),setTimeout(()=>{w(r,t,s)&&ne(e,i.items,r,s)},800),ge(e,i.items,r,s).catch(()=>{}))}).catch(()=>{if(!w(r,t,s))return;const i=Ae(s);e.__marketItems=i,X(e,i)}),F(e,r),K=setInterval(()=>F(e,r,!0),2e4),ce(e,t,s,a,r,n),Ne(e,t,s,a,r,n)}function xt(){const e=()=>{if(document.hidden){ye(),Je(),I&&(I(),I=null);return}const t=be;!t||t.runId!==v||(Ee(t.container,t.symbol,t.type,t.runId),K||(F(t.container,t.runId,!0),K=setInterval(()=>F(t.container,t.runId,!0),2e4)),!I&&Array.isArray(t.container.__marketItems)&&ne(t.container,t.container.__marketItems,t.runId))};document.addEventListener("visibilitychange",e),oe.push(()=>document.removeEventListener("visibilitychange",e))}function w(e,t=c("symbol"),s=c("type")){return!(e!==v||t&&String(t).toUpperCase()!==String(c("symbol")||"").toUpperCase()||s&&M(s)!==M(c("type")))}function M(e){const t=String(e||"").toLowerCase();return t==="commodity"?"commodities":t==="stock"?"stocks":t==="future"?"futures":t}function ne(e,t,s=v,a=null){I&&(I(),I=null);const r=M(a||c("type")),n=r==="favorites"?"crypto":r,i=c("symbol"),d=n==="crypto",u=d?36:3,l=[...new Set(t.slice(0,u).map(m=>String(m.symbol||"").toUpperCase()).filter(Boolean).filter(m=>m!==String(i||"").toUpperCase()))];l.length&&(I=ft(l,n,m=>{w(s,i,c("type"))&&fe(e,m)},null,{interval:d?12e3:1e4,initialDelay:900,fallbackAfter:3e3,maxSymbols:u,timeout:9e3,forcePolling:!d}))}function Ee(e,t,s,a=v){ye();const r=M(s)==="favorites"?"crypto":M(s),n=r==="crypto"?4500:6e3,i=r==="crypto"?3e3:12e3,d=r==="crypto"?0:1,u=async()=>{if(w(a,t,s)){ae=new AbortController;try{const l=r==="crypto"?"":"&fresh=1&strict_live=1",m=`/quotes.php?symbol=${encodeURIComponent(t)}&type=${encodeURIComponent(r)}&purpose=focus${l}&_=${Date.now()}`,b=await A(m,{timeout:r==="crypto"?2400:Math.min(i,6e3),retry:d,signal:ae.signal,cacheTtl:500,cache:"no-store"});if(!w(a,t,s))return;b?.items?.[0]&&We(e,b.items[0],a)}catch{w(a,t,s)}finally{w(a,t,s)&&(ue=setTimeout(u,n))}}};u()}function ye(){ue&&(clearTimeout(ue),ue=null),ae&&(ae.abort(),ae=null)}function Je(){K&&(clearInterval(K),K=null)}function _t(e,t,s,a=0){const r=Number(s||0),n=Number(a||0);e.__lastQuotePrices||(e.__lastQuotePrices=new Map);const i=String(t||c("symbol")||"").toUpperCase(),d=i?Number(e.__lastQuotePrices.get(i)||0):0;let u=n>0?"text-buy":n<0?"text-sell":"text-text";return d>0&&r>0&&Math.abs(r-d)>1e-12&&(u=r>d?"text-buy":"text-sell"),i&&r>0&&e.__lastQuotePrices.set(i,r),u}function $t(e){const t=String(e||"").toLowerCase();return t.includes("binance")?100:t.includes("eodhd")?94:t.includes("provider_live")?90:t.includes("yahoo_chart_live")?76:t==="yahoo"||t.includes("yahoo")?68:t.includes("frankfurter")||t.includes("stooq")||t.includes("fallback")?30:t.includes("cache")||t.includes("seed")||t.includes("reference")||t.includes("unavailable")?5:t?45:0}function Y(e){const t=Number(e||0);return t>0?t>1e12?Math.floor(t/1e3):Math.floor(t):0}function wt(e){const t=Math.max(Y(e?.provider_updated_at),Y(e?.provider_ts),Y(e?.as_of),Y(e?.updated_at)),s=Math.max(Y(e?.received_at),Y(e?.ingested_at),Y(e?.cache_updated_at));return{rank:$t(e?.source||e?.provider),providerTs:t,cacheTs:s,effectiveTs:Math.max(t,s)}}function Xe(e,t,s){if(!(Number(t?.price||t?.q_price||0)>0))return!1;e.__quoteQuality||(e.__quoteQuality=new Map);const r=String(s||t?.symbol||"").toUpperCase();if(!r)return!0;const n=wt(t),i=e.__quoteQuality.get(r);return i&&(n.providerTs>0&&i.providerTs>0&&n.providerTs+30<i.providerTs||n.effectiveTs>0&&i.effectiveTs>0&&n.effectiveTs+2<i.effectiveTs&&n.rank<=i.rank||n.rank+20<i.rank&&n.effectiveTs<=i.effectiveTs+60)?!1:(e.__quoteQuality.set(r,n),!0)}function We(e,t,s=v){if(!w(s,String(t?.symbol||c("symbol")).toUpperCase(),t?.type||c("type")))return;const a=Number(t.price||t.q_price||0);if(!Xe(e,{...t,price:a},t.symbol||c("symbol")))return;const r=Number(t.change_pct||t.q_change||0),n=c("type");E("activeQuote",{...t,price:a,change_pct:r});const i=_t(e,t.symbol||c("symbol"),a,r);fe(e,[{...t,price:a,change_pct:r}]);const d=p("#live-price",e),u=p("#live-change",e);d&&(d.textContent=a>0?$(a,n):"--",d.className=`text-xs font-mono font-bold ${i}`),u&&(u.textContent=Le(r),u.className=`text-[10px] ${r>=0?"text-buy":"text-sell"}`),U("[data-sell-price]",e).forEach(l=>{l.textContent=a>0?$(a,n):"--"}),U("[data-buy-price]",e).forEach(l=>{l.textContent=a>0?$(a*1.0001,n):"--"}),U("[data-spread-val]",e).forEach(l=>{l.textContent=a>0?`${o("trade.spread","Spread")}: ${$(a*1e-4,n)}`:`${o("trade.spread","Spread")}: --`}),q(e),Xt(a,s,Number(t.provider_updated_at||t.updated_at||t.cache_updated_at||0),M(t.type||n))}function q(e){const t=c("activeQuote")||{},s=Number(t.price||0),a=c("wallet")||{},r=c("mode")==="real"?a.real||{}:a.demo||{};U("[data-order-form]",e).forEach(n=>{const i=Number(p("[data-amount]",n)?.value||c("amount")||0),d=Number(p("[data-leverage]",n)?.value||c("leverage")||1),l=(p("[data-market-type]",n)?.value||c("market")||"spot")==="perp"?d:1,m=s>0?i*l/s:0,b=i*l,x=p("[data-lev-val]",n);x&&(x.textContent=`${d}x`);const _=p("[data-est-units]",n);_&&(_.textContent=m>0?m.toFixed(m>=10?3:6):"--");const f=p("[data-est-notional]",n);f&&(f.textContent=i>0?`${P(b)} USDT`:"--");const h=p("[data-avail-bal]",n);h&&(h.textContent=`${P(r.available||0)} ${r.currency||""}`)})}function X(e,t){const s=p("#symbol-list",e);if(!s)return;const a=c("symbol"),r=t.slice(0,120);s.innerHTML=r.map(n=>{const i=String(n.symbol||"").toUpperCase(),d=n.type||c("type"),u=Number(n.price||n.q_price||0),l=Number(n.change_pct||n.q_change||0),m=!(u>0);return`<div class="symbol-row ${i===a?"active":""}" data-sym="${S(i)}" data-stype="${S(d)}">
      ${ie(i,d,"w-7 h-7 rounded-md shrink-0")}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <div class="font-semibold text-[11px] truncate">${y(i)}</div>
        </div>
        <div class="text-[9px] text-muted truncate">${y(n.name||d)}</div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-[11px] font-mono text-text" data-price-cell>${u>0?$(u,d):"--"}</div>
        <div class="text-[9px] ${m?"text-muted":l>=0?"text-buy":"text-sell"}" data-change-cell>${m?"--":Le(l)}</div>
      </div>
    </div>`}).join("")}async function ge(e,t,s=v,a=null){const r=M(a||c("type")||"crypto"),n=r==="crypto"?80:24,i=t.slice(0,n).filter(g=>!(Number(g.price||g.q_price||0)>0)).map(g=>String(g.symbol||"").toUpperCase()).filter(Boolean);if(!i.length)return;const d=r==="crypto"?24:3,u=r==="crypto"?80:24,l=r==="crypto"?4500:9e3,m=[...new Set(i)].slice(0,u),b=[],x=async g=>{const H=await A(`/quotes.php?symbols=${encodeURIComponent(g.join(","))}&type=${encodeURIComponent(r)}&visible=1&purpose=watchlist&_=${Date.now()}`,{timeout:r==="crypto"?2600:Math.min(l,5e3),cacheTtl:500,cache:"no-store"}).catch(()=>null);w(s)&&(H?.items?.length&&fe(e,H.items),g.forEach(N=>{const G=U(".symbol-row",e).find(lt=>lt.dataset.sym===N);G&&p("[data-price-cell]",G)?.textContent!=="--"||b.push(N)}))},_=[];for(let g=0;g<m.length;g+=d)_.push(m.slice(g,g+d));const f=r==="crypto"?1:2;for(let g=0;g<_.length;g+=f)if(await Promise.allSettled(_.slice(g,g+f).map(x)),!w(s))return;const h=r==="crypto"?12:3,k=[...new Set(b)].slice(0,24);for(let g=0;g<k.length;g+=h){const H=k.slice(g,g+h),N=await A(`/quotes.php?symbols=${encodeURIComponent(H.join(","))}&type=${encodeURIComponent(r)}&visible=1&purpose=watchlist&_=${Date.now()}`,{timeout:r==="crypto"?2600:Math.min(l,5e3),cacheTtl:500,cache:"no-store"}).catch(()=>null);if(!w(s))return;N?.items?.length&&fe(e,N.items)}}function fe(e,t){if(!t?.length)return;const s=U(".symbol-row",e);if(!s.length)return;const a=new Map;s.forEach(r=>a.set(r.dataset.sym,r)),t.forEach(r=>{const n=String(r.symbol||"").toUpperCase();if(!n)return;const i=a.get(n);if(!i)return;const d=i.dataset.stype||c("type"),u=Number(r.price||r.q_price||0);if(!(u>0)||!Xe(e,{...r,price:u},n))return;const l=Number(r.change_pct||r.q_change||0),m=p("[data-price-cell]",i),b=p("[data-change-cell]",i);m&&(m.textContent=$(u,d),m.className="text-[11px] font-mono text-text"),b&&(b.textContent=Le(l),b.className=`text-[9px] ${l>=0?"text-buy":"text-sell"}`)})}async function F(e,t=v,s=!1,a=!1){if(!w(t)||e.__tradeActivityLoading)return;e.__tradeActivityLoading=!0;const r=p("#activity-body",e);r&&!s&&!e.__tradeActivityLoaded&&(r.innerHTML='<p class="text-muted text-[11px] text-center py-4">Loading trading activity...</p>');const n=a?0:4e3,i=a?"no-store":"default",d=a?`&_=${Date.now()}`:"";try{const u=c("mode"),[l,m]=await Promise.allSettled([A(`/trade/portfolio.php?fast=1&mode=${u}${d}`,{timeout:12e3,retry:1,cacheTtl:n,cache:i}),A(`/trade/orders.php?limit=90&mode=${u}${d}`,{timeout:12e3,retry:1,cacheTtl:n,cache:i})]);if(!w(t))return;const b=l.status==="fulfilled"?l.value:null,x=m.status==="fulfilled"?m.value:null;if(b?.positions&&(e.__tradePositions=b.positions,E("portfolio",b)),(x?.items||x?.orders)&&(e.__tradeOrders=x.items||x.orders||[]),!b&&!x&&!e.__tradeActivityLoaded){r&&(r.innerHTML='<p class="text-muted text-[11px] text-center py-4">Trading activity is reconnecting...</p>');return}e.__tradeActivityLoaded=!0,Ze(e)}finally{e.__tradeActivityLoading=!1}}function Ze(e){const t=(e.__tradePositions||[]).filter(l=>!Re(l)),s=(e.__tradeOrders||[]).filter(l=>!Re(l)),a=s.filter(Me),r=s.filter(Ce);let n=e.__tradeActivityTab||"active";(n==="positions"||n==="orders")&&(n="active"),n==="history"&&(n="closed"),e.__tradeActivityTab=n;const i=p("#active-count",e),d=p("#closed-count",e),u=p("#activity-summary",e);return i&&(i.textContent=String(t.length+a.length)),d&&(d.textContent=String(r.length)),u&&(u.textContent=`${t.length} ${o("trade.open","open")} / ${a.length} ${o("trade.pending","pending")} / ${r.length} ${o("trade.closed","closed")}`),U("[data-activity-tab]",e).forEach(l=>{l.classList.toggle("active",l.dataset.activityTab===n)}),n==="closed"?Lt(e,r):St(e,t,a)}function St(e,t,s){const a=p("#activity-body",e);if(a){if(!t.length&&!s.length){a.innerHTML=`<p class="text-muted text-[11px] text-center py-4">${o("trade.no_active_trades","No active trades yet")}</p>`;return}a.innerHTML=`
    ${t.length?kt(t):`<p class="text-muted text-[11px] text-center py-3">${o("trade.no_open_positions","No open positions")}</p>`}
    ${s.length?`<div class="trade-pending-block">
      <div class="trade-subhead"><span>${o("trade.pending_orders","Pending orders")}</span><b>${s.length}</b></div>
      ${Ct(s)}
    </div>`:""}`}}function kt(e){return`
    <div class="trade-position-cards lg:hidden">
      ${e.slice(0,12).map(Et).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[620px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">${o("trade.symbol","Symbol")}</th><th class="text-left py-1">${o("trade.side","Side")}</th><th class="text-left py-1">${o("trade.type","Type")}</th><th class="text-right py-1">${o("trade.entry","Entry")}</th><th class="text-right py-1">${o("trade.mark","Mark")}</th><th class="text-right py-1">${o("trade.size","Size")}</th><th class="text-right py-1">${o("trade.lev","Lev")}</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1"></th>
      </tr></thead>
      <tbody>${e.slice(0,12).map(Tt).join("")}</tbody>
    </table></div>`}function Ct(e){return`
    <div class="trade-position-cards lg:hidden">
      ${e.slice(0,16).map(Ut).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[820px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">${o("trade.symbol","Symbol")}</th><th class="text-left py-1">${o("trade.side","Side")}</th><th class="text-left py-1">${o("trade.type","Type")}</th><th class="text-right py-1">${o("trade.entry","Entry")}</th><th class="text-right py-1">TP / SL</th><th class="text-right py-1">${o("deposit.amount","Amount")}</th><th class="text-right py-1">${o("trade.lev","Lev")}</th><th class="text-right py-1">${o("kyc.status","Status")}</th><th class="text-right px-3 py-1">${o("common.actions","Actions")}</th>
      </tr></thead>
      <tbody>${e.slice(0,16).map(Mt).join("")}</tbody>
    </table></div>`}function Lt(e,t){const s=p("#activity-body",e);if(s){if(!t.length){s.innerHTML=`<p class="text-muted text-[11px] text-center py-4">${o("trade.no_closed_trades","No closed trades yet")}</p>`;return}s.innerHTML=`
    <div class="trade-position-cards lg:hidden">
      ${t.slice(0,18).map(At).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[820px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">${o("trade.symbol","Symbol")}</th><th class="text-left py-1">${o("trade.side","Side")}</th><th class="text-left py-1">${o("trade.type","Type")}</th><th class="text-right py-1">${o("trade.exit","Exit")}</th><th class="text-right py-1">${o("trade.used","Used")}</th><th class="text-right py-1">${o("trade.fee","Fee")}</th><th class="text-right py-1">${o("trade.pnl","PnL")}</th><th class="text-right py-1">${o("trade.opened","Opened")}</th><th class="text-right px-3 py-1">${o("trade.closed","Closed")}</th>
      </tr></thead>
      <tbody>${t.slice(0,18).map(Nt).join("")}</tbody>
    </table></div>`}}function et(e){const t=Number(e.pnl||e.unrealized_pnl||0),s=String(e.symbol||"").replace("@R@",""),a=e.asset_type||c("type"),r=Number(e.mark_price||e.current_price||e.price||0),n=e.position_id||e.id||"",i=String(e.side||"buy").toUpperCase()==="SELL"?"SELL":"BUY";return{pnl:t,cleanSymbol:s,posType:a,mark:r,id:n,side:i}}function Tt(e){const{pnl:t,cleanSymbol:s,posType:a,mark:r,id:n,side:i}=et(e),d=String(e.market_type||"").toLowerCase()==="perp";return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${y(s)}</td>
    <td>${ee(i)}</td>
    <td class="text-muted">${d?o("trade.perp","Perp"):o("trade.spot","Spot")}</td>
    <td class="text-right font-mono">${$(e.entry_price||e.open_price,a)}</td>
    <td class="text-right font-mono">${r>0?$(r,a):"--"}</td>
    <td class="text-right font-mono">${Ye(e.qty||e.amount||e.size||e.units||0)}</td>
    <td class="text-right font-mono">${d?`${y(String(e.leverage||1))}x`:'<span class="text-muted text-[9px]">—</span>'}</td>
    <td class="text-right font-mono ${t>=0?"text-buy":"text-sell"}">${P(t)}</td>
    <td class="text-right px-3">${n?`<button class="btn-xs btn-ghost text-sell" data-close="${S(n)}">${o("common.close","Close")}</button>`:""}</td>
  </tr>`}function Et(e){const{pnl:t,cleanSymbol:s,posType:a,mark:r,id:n,side:i}=et(e),d=String(e.market_type||"").toLowerCase()==="perp";return`<article class="trade-position-card">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${y(s)}</strong>
        <small>${y(d?o("trade.perp_futures","Perp/Futures"):o("trade.spot","Spot"))} - ${y(e.created_at||e.opened_at||"")}</small>
      </div>
      ${ee(i)}
    </div>
    <div class="trade-position-metrics">
      <span><small>${o("trade.entry","Entry")}</small><strong>${$(e.entry_price||e.open_price,a)}</strong></span>
      <span><small>${o("trade.mark","Mark")}</small><strong>${r>0?$(r,a):"--"}</strong></span>
      <span><small>${o("trade.size","Size")}</small><strong>${Ye(e.qty||e.amount||e.size||e.units||0)}</strong></span>
      <span><small>PnL</small><strong class="${t>=0?"text-buy":"text-sell"}">${P(t)}</strong></span>
      <span><small>${o("trade.margin","Margin")}</small><strong>${P(e.margin_initial||e.margin||0)}</strong></span>
      ${d?`<span><small>${o("trade.leverage","Leverage")}</small><strong>${y(String(e.leverage||1))}x</strong></span>`:""}
      ${d&&e.liquidation_price?`<span><small>${o("trade.liq_price","Liq. Price")}</small><strong class="text-sell">${$(e.liquidation_price,a)}</strong></span>`:""}
    </div>
    ${n?`<button class="btn-xs btn-ghost text-sell w-full" data-close="${S(n)}">${o("trade.close_position","Close position")}</button>`:""}
  </article>`}function Ce(e){const t=String(e.status||"").toLowerCase();return t==="closed"||t==="canceled"||t==="cancelled"||t==="rejected"||Number(e.closed_at||0)>0||Number(e.exit_price||0)>0}function Me(e={}){if(e.is_pending===!0||e.is_pending===1||e.is_pending==="1")return!Ce(e);if(Ce(e))return!1;const t=String(e.raw_status||e.order_status||e.status||"").toLowerCase(),s=["open","pending","armed","submitted","new"].includes(t),a=Number(e.fill_price||e.entry_price||0)>0,r=Number(e.position_id||0)>0&&!(e.can_cancel||e.can_edit);return s&&!a&&!r}function Re(e={}){if(["copy_subscription_id","copy_signal_id","copy_trade_id","copy_id","trading_bot_subscription_id","bot_subscription_id","avalon_subscription_id"].some(a=>e[a]!==void 0&&e[a]!==null&&String(e[a])!==""&&String(e[a])!=="0"))return!0;const s=[e.source,e.origin,e.order_source,e.position_source,e.product_kind,e.strategy_kind,e.category,e.group].map(a=>String(a||"").toLowerCase()).join(" ");return/\b(copy|copied|copy-trading|trading_bot|bot|avalon)\b/.test(s)}function W(e){return String(e.symbol||"").replace("@R@","").replace("@D@","")}function le(e){return String(e.side||"BUY").toUpperCase()==="SELL"?"SELL":String(e.side||"BUY").toUpperCase()==="CLOSE"?"CLOSE":"BUY"}function de(e){return e.asset_type||e.type||c("type")}function Ue(e){return String(e.order_id||e.id||"")}function J(e){const t=Number(e||0);if(!t)return"--";try{return new Date(t*1e3).toLocaleString([],{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})}catch{return String(e)}}function Mt(e){const t=le(e),s=de(e),a=Ue(e);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${y(W(e))}</td>
    <td>${ee(t)}</td>
    <td class="text-muted">${y(e.order_type||e.market_type||"market")}</td>
    <td class="text-right font-mono">${$(e.entry_price||e.fill_price||e.limit_price,s)}</td>
    <td class="text-right font-mono"><span class="text-buy">${e.tp_price?$(e.tp_price,s):"--"}</span> / <span class="text-sell">${e.sl_price?$(e.sl_price,s):"--"}</span></td>
    <td class="text-right font-mono">${P(e.used_usdt||e.usd_amount||e.amount||0)}</td>
    <td class="text-right font-mono">${y(String(e.leverage||1))}x</td>
    <td class="text-right"><span class="status-chip status-chip-derived">${y(e.status||"open")}</span></td>
    <td class="text-right px-3">${tt(a,e)}</td>
  </tr>`}function Ut(e){const t=le(e),s=de(e),a=Ue(e);return`<article class="trade-position-card trade-activity-card">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${y(W(e))}</strong>
        <small>${y(e.order_type||"market")} - ${y(J(e.created_at))}</small>
      </div>
      ${ee(t)}
    </div>
    <div class="trade-position-metrics">
      <span><small>${o("trade.entry","Entry")}</small><strong>${$(e.entry_price||e.fill_price||e.limit_price,s)}</strong></span>
      <span><small>${o("trade.take_profit","Take profit")}</small><strong class="text-buy">${e.tp_price?$(e.tp_price,s):"--"}</strong></span>
      <span><small>${o("trade.stop_loss","Stop loss")}</small><strong class="text-sell">${e.sl_price?$(e.sl_price,s):"--"}</strong></span>
      <span><small>${o("deposit.amount","Amount")}</small><strong>${P(e.used_usdt||e.usd_amount||e.amount||0)}</strong></span>
      <span><small>${o("trade.lev","Lev")}</small><strong>${y(String(e.leverage||1))}x</strong></span>
      <span><small>${o("kyc.status","Status")}</small><strong>${y(e.status||o("trade.open","open"))}</strong></span>
      <span><small>${o("funding.mode","Mode")}</small><strong>${y(e.mode||c("mode")||o("mode.demo","demo"))}</strong></span>
      <span><small>${o("trade.symbol","Symbol")}</small><strong>${y(W(e))}</strong></span>
    </div>
    ${tt(a,e,!0)}
  </article>`}function tt(e,t,s=!1){return!e||!Me(t)?'<span class="text-muted text-[10px]">--</span>':`<div class="${s?"trade-pending-actions is-card":"trade-pending-actions"}">
    <button class="btn-xs btn-ghost" data-edit-order="${S(e)}">${o("common.edit","Edit")}</button>
    <button class="btn-xs btn-danger" data-cancel-order="${S(e)}">${o("common.cancel","Cancel")}</button>
  </div>`}function Nt(e){const t=le(e),s=de(e),a=Number(e.pnl_usd||e.pnl||0);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${y(W(e))}</td>
    <td>${ee(t)}</td>
    <td class="text-muted">${y(e.market_type||e.order_type||"spot")}</td>
    <td class="text-right font-mono">${$(e.exit_price||e.limit_price,s)}</td>
    <td class="text-right font-mono">${P(e.used_usdt||e.usd_amount||0)}</td>
    <td class="text-right font-mono">${P(e.fee_paid||0)}</td>
    <td class="text-right font-mono ${a>=0?"text-buy":"text-sell"}">${P(a)}</td>
    <td class="text-right text-muted">${y(J(e.created_at))}</td>
    <td class="text-right px-3 text-muted">${y(J(e.closed_at||e.created_at))}</td>
  </tr>`}function At(e){const t=le(e),s=de(e),a=Number(e.pnl_usd||e.pnl||0);return`<article class="trade-position-card trade-activity-card is-history">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${y(W(e))}</strong>
        <small>${y(e.close_reason||e.status||o("trade.closed","closed"))} - ${y(J(e.closed_at||e.created_at))}</small>
      </div>
      ${ee(t)}
    </div>
    <div class="trade-position-metrics">
      <span><small>${o("trade.exit","Exit")}</small><strong>${$(e.exit_price||e.limit_price,s)}</strong></span>
      <span><small>${o("trade.opened","Opened")}</small><strong>${y(J(e.created_at))}</strong></span>
      <span><small>${o("trade.closed","Closed")}</small><strong>${y(J(e.closed_at||e.created_at))}</strong></span>
      <span><small>PnL</small><strong class="${a>=0?"text-buy":"text-sell"}">${P(a)}</strong></span>
      <span><small>${o("trade.used","Used")}</small><strong>${P(e.used_usdt||e.usd_amount||0)}</strong></span>
      <span><small>${o("trade.fee","Fee")}</small><strong>${P(e.fee_paid||0)}</strong></span>
    </div>
  </article>`}function ee(e){const t=String(e||"BUY").toUpperCase()==="SELL"?"SELL":"BUY";return`<span class="trade-side-chip is-${t.toLowerCase()}">${y(st(t))}</span>`}function st(e){return String(e||"").toUpperCase()==="SELL"?o("trade.sell","SELL"):o("trade.buy","BUY")}function Pt(e){return(e||[]).map(t=>({time:Number(t.time||t.t),open:Number(t.open||t.o),high:Number(t.high||t.h),low:Number(t.low||t.l),close:Number(t.close||t.c),volume:Number(t.volume||t.v||0)})).filter(t=>t.time>0&&t.open>0&&t.high>0&&t.low>0&&t.close>0).sort((t,s)=>t.time-s.time)}function at(e,{fit:t=!1}={}){if(!z||!me)return!1;const s=Pt(e);if(!s.length)return!1;z.setData(s.map(({time:r,open:n,high:i,low:d,close:u})=>({time:r,open:n,high:i,low:d,close:u}))),me.setData(s.map(r=>({time:r.time,value:r.volume,color:r.close>=r.open?"rgba(0,192,135,0.25)":"rgba(246,70,93,0.2)"})));const a=s.map(r=>({time:r.time,close:r.close}));return Se&&Se.setData(He(a,7)),ke&&ke.setData(He(a,25)),L={...s[s.length-1]},t&&T&&T.timeScale().fitContent(),!0}async function Dt(e,t,s=v){if(!w(s))return;const a=p("#chart-box",e);if(!a)return;const{createChart:r}=await Q();w(s)&&(a.innerHTML="",T=r(a,{layout:{background:{color:"#060A14"},textColor:"#8ba1cf",fontSize:11,fontFamily:"'Inter', system-ui, sans-serif"},grid:{vertLines:{color:"rgba(129,160,220,0.04)"},horzLines:{color:"rgba(129,160,220,0.04)"}},crosshair:{mode:0,vertLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"},horzLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"}},timeScale:{timeVisible:!0,secondsVisible:!1,borderColor:"rgba(129,160,220,0.08)",rightOffset:4,barSpacing:6},rightPriceScale:{borderColor:"rgba(129,160,220,0.08)",scaleMargins:{top:.1,bottom:.2}},watermark:{visible:!0,text:"MEX Group",color:"rgba(93,124,255,0.08)",fontSize:48,horzAlign:"center",vertAlign:"center"},width:Math.max(320,a.clientWidth),height:Math.max(260,a.clientHeight),handleScroll:{vertTouchDrag:!1},handleScale:{axisPressedMouseMove:!0}}),z=T.addCandlestickSeries({upColor:"#00c087",downColor:"#f6465d",borderUpColor:"#00c087",borderDownColor:"#f6465d",wickUpColor:"#00c087",wickDownColor:"#f6465d",wickVisible:!0,borderVisible:!0}),me=T.addHistogramSeries({priceFormat:{type:"volume"},priceScaleId:"vol",color:"rgba(93,124,255,0.3)"}),T.priceScale("vol").applyOptions({scaleMargins:{top:.84,bottom:0}}),Se=T.addLineSeries({color:"rgba(255,193,7,0.55)",lineWidth:1,priceLineVisible:!1,lastValueVisible:!1,crosshairMarkerVisible:!1}),ke=T.addLineSeries({color:"rgba(93,124,255,0.55)",lineWidth:1,priceLineVisible:!1,lastValueVisible:!1,crosshairMarkerVisible:!1}),at(t,{fit:!0}),re=new ResizeObserver(()=>{!T||!a||T.applyOptions({width:Math.max(320,a.clientWidth),height:Math.max(260,a.clientHeight)})}),re.observe(a))}function rt(e,t,s){try{const a=new URLSearchParams({symbol:e,type:t,tf:s}).toString();history.replaceState(null,"",`#/trade?${a}`)}catch{}}function Be(e,t){const s=String(t||"").toUpperCase();U(".symbol-row",e).forEach(a=>{a.classList.toggle("active",String(a.dataset.sym||"").toUpperCase()===s)})}function Ot(e,t){U("[data-tf]",e).forEach(s=>{const a=s.dataset.tf===t;s.classList.toggle("bg-accent/20",a),s.classList.toggle("text-accent",a),s.classList.toggle("text-muted",!a)})}function It(e,t,s){const a=String(t||"").toUpperCase(),r=String(s||"").toUpperCase(),n=p("#sym-logo-slot",e);n&&(n.innerHTML=ie(a,s,"w-7 h-7 rounded-md shrink-0"));const i=p("#sym-name",e);i&&(i.textContent=a);const d=p("#ticket-instrument",e);d&&(d.textContent=`${a} - ${r}`);const u=p("#mobile-order-logo-slot",e);u&&(u.innerHTML=ie(a,s,"w-8 h-8 rounded-lg shrink-0"));const l=p("#mobile-order-symbol",e);l&&(l.textContent=a)}function Rt(e,t,s){const a=String(t||"").toUpperCase();if(!a)return;const r=M(c("type")),n=s||c("type"),i=M(n),d=i!==r,u=c("tf");ye(),ve(),E("symbol",a),E("type",n),E("activeQuote",null);const l=v;be={container:e,symbol:a,type:n,runId:l},rt(a,n,u),It(e,a,n),Be(e,a),q(e),Pe(e,e.__marketItems||[],l);const m=Q();Ee(e,a,n,l),ce(e,a,n,u,l,m),Ne(e,a,n,u,l,m),d?he(i,l,!0).then(b=>{w(l,a,n)&&b&&b.items&&(e.__marketItems=b.items,X(e,b.items),Be(e,a),ge(e,b.items,l,i).catch(()=>{}),ne(e,b.items,l,i))}).catch(()=>{}):Array.isArray(e.__marketItems)&&e.__marketItems.length&&ne(e,e.__marketItems,l,i)}function Bt(e,t){if(!t)return;E("tf",t),Ot(e,t);const s=v,a=c("symbol"),r=c("type");rt(a,r,t),ve();const n=Q();ce(e,a,r,t,s,n),Ne(e,a,r,t,s,n)}function jt(e){p("#mob-mkt-btn",e)?.addEventListener("click",()=>Kt(e)),p("#close-mob-drawer",e)?.addEventListener("click",()=>ze(e)),C(e,"[data-sym]","click",(t,s)=>{ze(e),localStorage.setItem("vp_symbol",s.dataset.sym),localStorage.setItem("vp_type",s.dataset.stype||c("type")),Rt(e,s.dataset.sym,s.dataset.stype||c("type"))}),C(e,"[data-tf]","click",(t,s)=>{localStorage.setItem("vp_tf",s.dataset.tf),Bt(e,s.dataset.tf)}),C(e,"[data-type-tab]","click",async(t,s)=>{const a=M(s.dataset.typeTab||c("type")||"crypto");e.__marketDrawerType=a;const r=await he(a,v,!0).catch(()=>null);r?.items&&(e.__marketItems=r.items,X(e,r.items),ge(e,r.items,v,a),ne(e,r.items,v,a)),U("[data-type-tab]",e).forEach(n=>{const i=n===s;n.classList.toggle("bg-accent/20",i),n.classList.toggle("text-accent",i),n.classList.toggle("border-accent/40",i)})}),C(e,"[data-open-order]","click",(t,s)=>Jt(e,s.dataset.openOrder)),C(e,"[data-close-order-sheet]","click",()=>nt(e)),C(e,"[data-submit-order]","click",(t,s)=>Fe(s.dataset.submitOrder,e,p("#mobile-order-sheet [data-order-form]",e))),C(e,"[data-side]","click",(t,s)=>{const a=s.closest("#mobile-order-sheet"),r=s.closest("[data-order-form]");if(a){it(e,s.dataset.side);return}Fe(s.dataset.side,e,r)}),C(e,"[data-order-type]","change",(t,s)=>E("orderType",s.value)),C(e,"[data-market-type]","change",(t,s)=>{E("market",s.value),localStorage.setItem("vp_market",s.value),U("[data-order-form]",e).forEach(a=>{const r=p("#leverage-row",a);if(!r)return;const n=s.value==="perp",i=Number(c("leverage")||10);n?r.outerHTML=`<label class="block order-leverage-row" id="leverage-row">
          <span class="text-[10px] text-muted">Leverage: <strong data-lev-val id="leverage-label">${i}x</strong></span>
          <input type="range" min="1" max="100" value="${i}" class="w-full mt-1 accent-accent" data-leverage />
        </label>`:r.outerHTML=`<div class="order-spot-note" id="leverage-row">
          <span class="text-[10px] text-muted">Spot order — no leverage</span>
        </div>`}),q(e)}),C(e,"[data-leverage]","input",(t,s)=>{E("leverage",Number(s.value)),$e(e,"leverage",s.value),q(e);const a=Number(s.value),r=Number(s.max)||100,n=a/r,i=n<.3?"#00c087":n<.6?"#fcd535":"#f6465d";s.style.accentColor=i;const d=e.querySelector("#leverage-label");d&&(d.textContent=a+"x",d.style.color=i)}),C(e,"[data-amount]","input",(t,s)=>{E("amount",Number(s.value)),$e(e,"amount",s.value),q(e)}),C(e,"[data-close]","click",async(t,s)=>{await qt(e,s)}),C(e,"[data-cancel-order]","click",async(t,s)=>{await Ht(e,s)}),C(e,"[data-edit-order]","click",(t,s)=>{Qt(e,s.dataset.editOrder)}),C(e,"[data-toggle-activity-expand]","click",()=>Ft(e)),C(e,"[data-retry-chart]","click",()=>{ce(e,c("symbol"),c("type"),c("tf"),v,Q())}),C(e,"[data-activity-tab]","click",(t,s)=>{e.__tradeActivityTab=s.dataset.activityTab||"positions",Ze(e)}),C(e,"[data-quick-amount]","click",(t,s)=>{const a=Number(s.dataset.quickAmount||0);a>0&&(E("amount",a),$e(e,"amount",a),q(e))}),p("#sym-search",e)?.addEventListener("input",t=>{const s=t.target.value.toLowerCase();U(".symbol-row",e).forEach(a=>{a.style.display=a.dataset.sym.toLowerCase().includes(s)?"":"none"})})}function ve(){pe&&(clearInterval(pe),pe=null)}function Ne(e,t,s,a,r=v,n=Q()){ve();const d=M(s||"crypto")==="crypto"?12e3:18e3;pe=setInterval(()=>{w(r,t,s)&&ce(e,t,s,a,r,n,{silent:!0,refresh:!0}).catch(()=>null)},d)}async function ce(e,t,s,a,r=v,n=Q(),i={}){const d=p("#chart-box",e),u=!!(T&&z);d&&!i.silent&&!u&&(d.innerHTML='<div class="absolute inset-0 flex items-center justify-center"><div class="text-center"><div class="loading-spinner mx-auto"></div><p class="text-[10px] text-muted mt-2">Loading chart...</p></div></div>');try{const l=i.refresh?"&refresh=1":"",m=`/trade/candles.php?symbol=${encodeURIComponent(t)}&type=${encodeURIComponent(s)}&tf=${encodeURIComponent(a)}&limit=500&fast=1${l}&_=${Date.now()}`,b=await A(m,{timeout:i.silent?1e4:14e3,retry:1,cacheTtl:0,cache:"no-store"});if(await n,!w(r,t,s))return;b?.items?.length?T&&z?at(b.items,{fit:!i.silent&&!i.refresh}):await Dt(e,b.items,r):!u&&!i.silent&&je(e,"Chart data is still loading from the market provider.")}catch(l){if(!w(r,t,s))return;console.error("Chart:",l),!u&&!i.silent&&je(e,"Chart stream is delayed. Live price and order ticket remain active.")}}function je(e,t){const s=p("#chart-box",e);s&&(s.innerHTML=`<div class="chart-fallback-state">
    <div class="chart-fallback-card">
      <strong>Chart loading</strong>
      <span>${y(t||"Chart provider is delayed.")}</span>
      <button class="btn-ghost btn-sm" data-retry-chart>Retry chart</button>
    </div>
  </div>`)}function Ft(e){const t=p("#positions-section",e);if(!t)return;const s=!t.classList.contains("is-expanded");t.classList.toggle("is-expanded",s),document.body.classList.toggle("trade-activity-expanded-open",s);const a=p("[data-toggle-activity-expand]",e);a&&(a.setAttribute("aria-label",s?o("trade.close_activity","Close trading activity"):o("trade.expand_activity","Expand trading activity")),a.setAttribute("title",s?o("trade.close_activity","Close trading activity"):o("trade.expand_activity","Expand trading activity")),a.innerHTML=s?j.close:j.fullscreen||j.expand||"⛶"),T&&!s&&setTimeout(()=>T.timeScale?.().fitContent?.(),80)}async function qt(e,t){const s=String(t?.dataset?.close||"");if(!s||_e.has(s)||!await Gt())return;_e.add(s);const r=U(`[data-close="${ot(s)}"]`,e);r.forEach(n=>{n.disabled=!0,n.classList.add("opacity-60"),n.dataset.prevText=n.textContent,n.textContent=o("trade.closing","Closing...")});try{const n=await A("/trade/close_position.php",{method:"POST",body:{id:s,position_id:s,mode:c("mode")},timeout:14e3});if(n&&n.ok===!1)throw new Error(n.error||o("trade.close_failed","Close failed"));Te("/trade/portfolio.php","/trade/orders.php"),await Promise.allSettled([F(e,v,!1,!0),A("/wallet/summary.php",{timeout:0,retry:1,cacheTtl:0}).then(i=>{(i?.real||i?.demo)&&E("wallet",{real:i.real||{},demo:i.demo||{}})}).catch(()=>null)]),Z(o("trade.position_closed_success","Position closed successfully"),"success")}catch(n){Z(n.message||o("trade.could_not_close","Could not close this position now."),"error"),r.forEach(i=>{i.disabled=!1,i.classList.remove("opacity-60"),i.textContent=i.dataset.prevText||o("common.close","Close")})}finally{_e.delete(s)}}function zt(e,t){const s=String(t||"");return(e.__tradeOrders||[]).find(a=>Ue(a)===s)||null}async function Ht(e,t){const s=String(t?.dataset?.cancelOrder||"");if(!s||!await Yt())return;const r=U(`[data-cancel-order="${ot(s)}"]`,e);r.forEach(n=>{n.disabled=!0,n.classList.add("opacity-60"),n.dataset.prevText=n.textContent,n.textContent=o("trade.canceling","Canceling...")});try{const n=await A("/trade/cancel.php",{method:"POST",body:{order_id:s,id:s,mode:c("mode")},timeout:1e4});if(n&&n.ok===!1)throw new Error(n.error||o("trade.cancel_failed","Cancel failed"));Te("/trade/portfolio.php","/trade/orders.php"),await F(e,v,!1,!0),Z(o("trade.pending_order_canceled","Pending order canceled"),"success")}catch(n){Z(n.message||o("trade.could_not_cancel_order","Could not cancel this order."),"error"),r.forEach(i=>{i.disabled=!1,i.classList.remove("opacity-60"),i.textContent=i.dataset.prevText||o("common.cancel","Cancel")})}}function Yt(e){return new Promise(t=>{const s=document.getElementById("cancel-order-modal");s&&s.remove();const a=document.createElement("div");a.id="cancel-order-modal",a.className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center",a.innerHTML=`<div class="absolute inset-0 bg-black/70" data-cancel-order-backdrop></div>
      <div class="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
        <div class="px-5 py-4 border-b border-line">
          <h3 class="text-base font-black">${o("trade.cancel_pending_order","Cancel pending order")}</h3>
          <p class="mt-1 text-xs text-muted">${o("trade.cancel_pending_order_copy","This only cancels orders that have not executed yet. Open positions must be closed from the position card.")}</p>
        </div>
        <div class="grid grid-cols-2 gap-3 px-5 py-4">
          <button class="btn-ghost" data-cancel-order-no>${o("trade.keep_order","Keep order")}</button>
          <button class="btn-danger" data-cancel-order-yes>${o("trade.cancel_order","Cancel order")}</button>
        </div>
      </div>`,document.body.appendChild(a);const r=n=>{a.remove(),t(n)};a.querySelector("[data-cancel-order-backdrop]").addEventListener("click",()=>r(!1)),a.querySelector("[data-cancel-order-no]").addEventListener("click",()=>r(!1)),a.querySelector("[data-cancel-order-yes]").addEventListener("click",()=>r(!0))})}function Qt(e,t){const s=zt(e,t);if(!s||!Me(s)){Z(o("trade.order_no_longer_pending","This order is no longer pending."),"error"),F(e,v,!0);return}const a=de(s),r=document.getElementById("edit-order-modal");r&&r.remove();const n=document.createElement("div");n.id="edit-order-modal",n.className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center",n.innerHTML=`<div class="absolute inset-0 bg-black/70" data-edit-order-backdrop></div>
    <div class="relative w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
      <div class="px-5 py-4 border-b border-line">
        <h3 class="text-base font-black">${o("trade.edit_pending_order","Edit pending order")}</h3>
        <p class="mt-1 text-xs text-muted">${y(W(s))} ${y(st(le(s)))} - ${o("trade.edit_pending_copy","changes apply before execution only.")}</p>
      </div>
      <form class="grid gap-3 px-5 py-4" data-edit-order-form>
        <label class="grid gap-1">
            <span class="text-[10px] uppercase font-black text-muted">${o("trade.entry_price","Entry price")}</span>
          <input class="input" name="entry" inputmode="decimal" value="${S(Number(s.limit_price||s.entry_price||0)||"")}" placeholder="${S($(s.limit_price||s.entry_price||0,a))}">
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="grid gap-1">
            <span class="text-[10px] uppercase font-black text-muted">${o("trade.take_profit","Take profit")}</span>
            <input class="input" name="tp" inputmode="decimal" value="${S(Number(s.tp_price||0)||"")}" placeholder="${S(o("funding.optional","Optional"))}">
          </label>
          <label class="grid gap-1">
            <span class="text-[10px] uppercase font-black text-muted">${o("trade.stop_loss","Stop loss")}</span>
            <input class="input" name="sl" inputmode="decimal" value="${S(Number(s.sl_price||0)||"")}" placeholder="${S(o("funding.optional","Optional"))}">
          </label>
        </div>
        <p class="order-form-status is-info" data-edit-order-status hidden></p>
        <div class="grid grid-cols-2 gap-3 pt-1">
          <button type="button" class="btn-ghost" data-edit-order-close>${o("common.cancel","Cancel")}</button>
          <button type="submit" class="btn-primary" data-edit-order-save>${o("common.save_changes","Save changes")}</button>
        </div>
      </form>
    </div>`,document.body.appendChild(n);const i=()=>n.remove();n.querySelector("[data-edit-order-backdrop]").addEventListener("click",i),n.querySelector("[data-edit-order-close]").addEventListener("click",i),n.querySelector("[data-edit-order-form]").addEventListener("submit",async d=>{d.preventDefault();const u=d.currentTarget,l=p("[data-edit-order-status]",u),m=p("[data-edit-order-save]",u),b=Number(u.entry.value||0),x=u.tp.value===""?null:Number(u.tp.value||0),_=u.sl.value===""?null:Number(u.sl.value||0);if(!(b>0)){l&&(l.textContent=o("trade.entry_price_required","Entry price is required."),l.hidden=!1,l.className="order-form-status is-warning");return}try{m&&(m.disabled=!0,m.textContent=o("common.saving","Saving...")),l&&(l.textContent=o("trade.saving_order_changes","Saving order changes..."),l.hidden=!1,l.className="order-form-status is-info");const f=await A("/trade/update_order.php",{method:"POST",body:{order_id:t,limit_price:b,tp_price:x,sl_price:_,mode:c("mode")},timeout:1e4});if(f&&f.ok===!1)throw new Error(f.error||o("trade.update_failed","Update failed"));i(),await F(e,v),Z(o("trade.pending_order_updated","Pending order updated"),"success")}catch(f){l&&(l.textContent=f.message||o("trade.could_not_update_order","Could not update this order."),l.hidden=!1,l.className="order-form-status is-error"),m&&(m.disabled=!1,m.textContent=o("common.save_changes","Save changes"))}})}function ot(e){return window.CSS&&typeof window.CSS.escape=="function"?window.CSS.escape(String(e)):String(e).replace(/\\/g,"\\\\").replace(/"/g,'\\"')}function Gt(e){return new Promise(t=>{const s=document.getElementById("close-position-modal");s&&s.remove();const a=document.createElement("div");a.id="close-position-modal",a.className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center",a.innerHTML=`<div class="absolute inset-0 bg-black/70" data-close-modal-backdrop></div>
      <div class="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
        <div class="px-5 py-4 border-b border-line">
          <h3 class="text-base font-black">${o("trade.close_position","Close position")}</h3>
          <p class="mt-1 text-xs text-muted">${o("trade.close_position_copy","The position will be closed at the current market price.")}</p>
        </div>
        <div class="grid grid-cols-2 gap-3 px-5 py-4">
          <button class="btn-ghost" data-close-cancel>${o("common.cancel","Cancel")}</button>
          <button class="btn-danger" data-close-confirm>${o("trade.close_now","Close now")}</button>
        </div>
      </div>`,document.body.appendChild(a);const r=n=>{a.remove(),t(n)};a.querySelector("[data-close-modal-backdrop]").addEventListener("click",()=>r(!1)),a.querySelector("[data-close-cancel]").addEventListener("click",()=>r(!1)),a.querySelector("[data-close-confirm]").addEventListener("click",()=>r(!0))})}function Z(e,t="success"){let s=document.getElementById("trade-toast");s||(s=document.createElement("div"),s.id="trade-toast",s.className="trade-toast",document.body.appendChild(s)),s.textContent=e,s.className=`trade-toast is-${t}`,clearTimeout(s.__timer),s.__timer=setTimeout(()=>s.classList.remove("is-success","is-error"),2500)}async function Fe(e,t,s){const a=s||p("[data-order-form]",t)||t;O(a,"","info");const r=c("activeQuote")||{},n=Number(r.price||0);if(!n){O(a,"No live price available yet. Please wait for the quote to load.","warning");return}if(!as(r)){O(a,"This quote is not fresh enough for execution yet. Please wait for a live or delayed market quote.","warning");return}const i=Number(p("[data-amount]",a)?.value||c("amount")||0),d=(p("[data-market-type]",a)?.value||c("market")||"spot")==="perp"?Number(p("[data-leverage]",a)?.value||c("leverage")||1):1,u=Number(p("[data-tp]",a)?.value||0),l=Number(p("[data-sl]",a)?.value||0),m=p("[data-market-type]",a)?.value||c("market")||"spot",b=p("[data-order-type]",a)?.value||c("orderType")||"MARKET",x=Number(p("[data-limit-price]",a)?.value||0);if(i<=0){O(a,"Enter a valid amount first.","warning");return}if(e==="BUY"&&l>0&&l>=n){O(a,"For BUY orders, Stop Loss should be below the current price.","warning");return}if(e==="SELL"&&l>0&&l<=n){O(a,"For SELL orders, Stop Loss should be above the current price.","warning");return}if(await Vt({side:e,symbol:c("symbol"),type:c("type"),amount:i,leverage:d,tp:u,sl:l,marketType:m,orderType:b,currentPrice:n,limitInput:x,mode:c("mode")}))try{qe(a,!0),O(a,e==="BUY"?o("trade.order.sending_buy","Sending buy order..."):o("trade.order.sending_sell","Sending sell order..."),"info");const f=await A("/trade/place_order.php",{method:"POST",body:{symbol:c("symbol"),asset_type:c("type"),market_type:m,side:e,order_type:b,usd:i,leverage:d,tp:u||void 0,sl:l||void 0,price:b==="LIMIT"&&x||n,mode:c("mode")},timeout:15e3,retry:1});if(f&&f.ok===!1){O(a,f.error||"Order failed","error");return}O(a,`${e==="BUY"?o("trade.buy","شراء"):o("trade.sell","بيع")} — ${o("trade.order_success","تم فتح الصفقة بنجاح")}`,"success"),Te("/trade/portfolio.php","/trade/orders.php"),await F(t,v,!1,!0),A("/wallet/summary.php",{timeout:0,retry:1,cacheTtl:0}).then(h=>{(h?.real||h?.demo)&&E("wallet",{real:h.real||{},demo:h.demo||{}})}).catch(()=>null),setTimeout(()=>{a.closest?.("#mobile-order-sheet")?nt(t):O(a,"","info")},900)}catch(f){console.error("Order failed:",f);const h=f?.code==="aborted"||f?.name==="AbortError"||f?.name==="RequestAbortError"||String(f?.message||"").toLowerCase().includes("aborted")||String(f?.message||"").toLowerCase().includes("cancelled"),k=f?.code==="timeout"?"Request timed out — please wait for the live price to refresh and try again.":h?"Order was interrupted. Check Open Positions — if the trade is not listed, place the order again.":f.message||"Order failed. Please try again.";O(a,k,"error")}finally{qe(a,!1)}}function Vt({side:e,symbol:t,type:s,amount:a,leverage:r,tp:n,sl:i,marketType:d,orderType:u,currentPrice:l,limitInput:m,mode:b}){return new Promise(x=>{const _=document.getElementById("order-confirm-modal");_&&_.remove();const f=e==="BUY",h=u==="LIMIT"&&m||l,k=a*r,g=n>0?Math.abs(n-h)*(k/h):null,H=i>0?Math.abs(i-h)*(k/h):null,N=document.createElement("div");N.id="order-confirm-modal",N.className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center",N.innerHTML=`
      <div class="absolute inset-0 bg-black/70" id="confirm-backdrop"></div>
      <div class="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden">
        <div class="px-5 py-4 border-b border-line text-center">
          <h3 class="text-lg font-bold ${f?"text-green-400":"text-red-400"}">${f?o("trade.buy","شراء"):o("trade.sell","بيع")} — ${o("trade.order","الأمر")}</h3>
          <p class="text-xs text-muted mt-1">${o("trade.review_confirm","راجع وأكد الأمر")}</p>
        </div>
        <div class="px-5 py-4 space-y-3">
          <div class="flex justify-between text-sm"><span class="text-muted">${o("Symbol")}</span><strong>${y(t)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${o("Type")}</span><strong>${y(u)} / ${y(d)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${o("Side")}</span><strong class="${f?"text-green-400":"text-red-400"}">${o(e)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${o("Amount")}</span><strong>$${a.toFixed(2)}</strong></div>
          ${d==="perp"?`<div class="flex justify-between text-sm"><span class="text-muted">${o("Leverage")}</span><strong>${r}x</strong></div>`:""}
          <div class="flex justify-between text-sm"><span class="text-muted">${o("Notional")}</span><strong>$${k.toFixed(2)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${o("Price")}</span><strong class="font-mono">${parseFloat(h).toFixed(s==="crypto"?2:4)}</strong></div>
          ${n>0?`<div class="flex justify-between text-sm"><span class="text-muted">${o("Take Profit")}</span><strong class="font-mono text-green-400">${parseFloat(n).toFixed(s==="crypto"?2:4)}</strong></div>`:""}
          ${i>0?`<div class="flex justify-between text-sm"><span class="text-muted">${o("Stop Loss")}</span><strong class="font-mono text-red-400">${parseFloat(i).toFixed(s==="crypto"?2:4)}</strong></div>`:""}
          ${g!==null?`<div class="flex justify-between text-sm"><span class="text-muted">${o("Est. Profit")}</span><strong class="text-green-400">$${g.toFixed(2)}</strong></div>`:""}
          ${H!==null?`<div class="flex justify-between text-sm"><span class="text-muted">${o("Est. Loss")}</span><strong class="text-red-400">$${H.toFixed(2)}</strong></div>`:""}
          <div class="flex justify-between text-sm"><span class="text-muted">${o("Mode")}</span><strong>${b==="real"?o("Real"):o("Demo")}</strong></div>
        </div>
        <div class="grid grid-cols-2 gap-3 px-5 py-4 border-t border-line">
          <button class="btn-ghost py-2.5" id="confirm-cancel">${o("Cancel")}</button>
          <button class="${f?"btn-buy":"btn-sell"} py-2.5 text-white font-bold" id="confirm-execute">${o("Confirm")} ${o(e)}</button>
        </div>
      </div>`,document.body.appendChild(N),document.body.style.overflow="hidden";const G=De=>{N.remove(),document.body.style.overflow="",x(De)};N.querySelector("#confirm-backdrop").addEventListener("click",()=>G(!1)),N.querySelector("#confirm-cancel").addEventListener("click",()=>G(!1)),N.querySelector("#confirm-execute").addEventListener("click",()=>G(!0)),N.querySelector("#confirm-execute").focus()})}function O(e,t,s="info"){const a=p("[data-order-status]",e);a&&(a.textContent=t||"",a.hidden=!t,a.className=`order-form-status is-${s}`)}function qe(e,t){const s=[e,e.closest?.("#mobile-order-sheet")].filter(Boolean);new Set(s.flatMap(r=>U("[data-side], [data-submit-order]",r))).forEach(r=>{r.disabled=!!t,r.classList.toggle("opacity-60",!!t)}),e.classList.toggle("is-submitting",!!t)}function Kt(e){const t=p("#market-drawer",e);if(!t)return;t.classList.add("mobile-market-open"),t.classList.remove("hidden"),document.body.classList.add("trade-modal-open");const s=p("#symbol-list",e);if(s&&!s.querySelector(".symbol-row")&&!e.__marketDrawerLoading){e.__marketDrawerLoading=!0;const a=M(e.__marketDrawerType||c("type")||"crypto");e.__marketDrawerType=a,he(a,v).then(r=>{r?.items&&(e.__marketItems=r.items,X(e,r.items),Pe(e,r.items,v),ge(e,r.items,v,a))}).catch(()=>{const r=Ae(c("type"));e.__marketItems=r,X(e,r)}).finally(()=>{e.__marketDrawerLoading=!1})}}function ze(e){const t=p("#market-drawer",e);t&&(t.classList.remove("mobile-market-open"),window.innerWidth<1024&&t.classList.add("hidden"),document.body.classList.remove("trade-modal-open"))}function Jt(e,t){const s=p("#mobile-order-sheet",e);s&&(it(e,t),s.classList.remove("hidden"),document.body.classList.add("trade-modal-open"),q(e))}function nt(e){const t=p("#mobile-order-sheet",e);t&&t.classList.add("hidden"),document.body.classList.remove("trade-modal-open")}function it(e,t){const s=p("#mobile-submit-order",e),a=p("#mobile-order-side-label",e);s&&(s.dataset.submitOrder=t,s.textContent=t==="BUY"?o("trade.order.buy_now","شراء الآن"):o("trade.order.sell_now","بيع الآن"),s.className=`${t==="BUY"?"btn-buy":"btn-sell"} w-full py-3`),a&&(a.textContent=t==="BUY"?o("trade.order.buy_order","BUY order"):o("trade.order.sell_order","SELL order"))}function $e(e,t,s){U(`[data-${t}]`,e).forEach(a=>{String(a.value)!==String(s)&&(a.value=s)})}function Xt(e,t=v,s=0,a=c("type")){if(!w(t)||!z||!L||!(e>0))return;const r=Wt(s,a);r<=L.time?(L.close=e,L.high=Math.max(L.high,e),L.low=Math.min(L.low,e)):L={time:r,open:L.close,high:Math.max(L.close,e),low:Math.min(L.close,e),close:e,volume:0},z.update({time:L.time,open:L.open,high:L.high,low:L.low,close:L.close})}function Wt(e=0,t=c("type")){const s=Zt(c("tf")),a=M(t),r=Number(e||0),n=r>0&&a!=="crypto"?Math.floor(r):Math.floor(Date.now()/1e3);return Math.floor(n/s)*s}function Zt(e){return{"1m":60,"5m":300,"15m":900,"30m":1800,"1h":3600,"4h":14400,"1d":86400}[e]||60}function Q(){return xe||(xe=dt(()=>import("./chart-uI7-MQXf.js"),__vite__mapDeps([0,1]))),xe}function He(e,t){const s=[];for(let a=t-1;a<e.length;a++){let r=0;for(let n=0;n<t;n++)r+=e[a-n].close;s.push({time:e[a].time,value:r/t})}return s}function Ae(e){const t=M(e||"crypto"),s=t==="favorites"?"crypto":t||"crypto";return(Ie[s]||Ie.crypto).map(([r,n],i)=>({id:99e4+i,symbol:r,name:n,type:s,status:"active",sort_order:i+1,price:0,change_pct:0,source:"client_symbol_fallback",timing_class:"warming"}))}function es(e,t){const a=(Array.isArray(e?.items)?e.items:Array.isArray(e?.markets)?e.markets:Array.isArray(e)?e:[]).filter(r=>r&&r.symbol);return a.length?{...e||{},ok:e?.ok!==!1,items:a}:{ok:!0,items:Ae(t),fallback:"client_symbol_fallback"}}function ts(e){const t=M(e||"crypto"),s=t==="favorites"?"crypto":t,r={crypto:50,forex:30,stocks:20,commodities:20,arab:10,futures:20}[s]||20;return`/markets.php?type=${encodeURIComponent(s)}&scope=trade&supported=1&lite=1&with_quotes=1&no_rescue=1&limit=${r}`}async function he(e,t=v,s=!1){const a=M(e||"crypto"),r=a||"crypto",n=Oe.get(r),i=Date.now();if(!s&&n&&n.expires>i)return n.data;let d=null;try{d=await A(ts(a),{timeout:8e3,retry:1,cacheTtl:12e3,cache:"no-store"})}catch{if(n?.data?.items?.length)return n.data;d=null}const u=es(d,a);return w(t)&&Oe.set(r,{data:u,expires:Date.now()+8e3}),u}function Pe(e,t,s=v){const a=String(c("symbol")||"").toUpperCase(),r=(t||[]).find(i=>String(i.symbol||"").toUpperCase()===a);if(!r)return;Number(r.price||r.q_price||0)>0&&We(e,r,s)}function ss(e){const t=String(e?.timing_class||"").toLowerCase(),s=String(e?.source||"").toLowerCase();return Number(e?.price||0)<=0?"unavailable":t==="seed"||s.includes("seed")?"reference":t==="stale"||e?.is_stale?"stale":t==="market_closed"?"closed":t==="delayed"||s.includes("yahoo")||["stocks","arab"].includes(M(e?.type||c("type")))?"delayed":t==="candle_fallback"?"chart_quote":"live"}function as(e){const t=ss(e);return!["reference","stale","unavailable","chart_quote"].includes(t)}function ie(e,t,s){return`<span class="${s} grid place-items-center overflow-hidden border border-line bg-surface">
    <img src="${S(ut({symbol:e,type:t},t))}" class="h-full w-full object-cover" alt="${S(e)}" loading="lazy" data-fallback="initial" />
    <b class="hidden h-full w-full place-items-center bg-accent/20 text-[9px] font-black">${y(pt(e))}</b>
  </span>`}export{ls as cleanup,is as mount,ns as render};
