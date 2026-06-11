const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["js/chart-uI7-MQXf.js","js/vendor-DJkwUXgC.js"])))=>i.map(i=>d[i]);
import{c as N,s as M,j as u,k as z,t as l,h as C,g as h,o as w,_ as At,$ as m,a as U,m as O,p as Ve,f as Ut,q as ct,d as qe}from"./main-KRyrOb0b.js";import{marketIconPath as Nt,marketInitial as Dt}from"./marketIcon-D-Yq8Sis.js";let ge=null,ae=null,I=0,F=null;const Pt=2e3;let q={};function Ot(e,t,s,a,r={}){if(ye(),!e||!e.length)return ye;const n=++I,i=dt(e,r.maxSymbols||18);return i.length&&(!r.forcePolling&&typeof EventSource=="function"?It(i,t,s,a,n,r):ut(i,t,s,a,n,r)),ye}function dt(e,t){const s=Math.max(1,Number(t||18));return[...new Set((e||[]).map(a=>String(a||"").toUpperCase()).filter(Boolean))].slice(0,s)}function It(e,t,s,a,r,n){Fe(),q={};const i="/api/stream/sse.php?symbols="+encodeURIComponent(e.join(","))+"&type="+encodeURIComponent(t)+"&scope=watchlist&_="+Date.now();let o=!1,d=null;const c=Math.max(5e3,Number(n.fallbackAfter||5e3)),p=()=>{r===I&&(d&&(clearTimeout(d),d=null),q={},Fe(),ut(e,t,s,a,r,n))},b=()=>{d&&clearTimeout(d),d=setTimeout(p,Math.max(c+2500,8e3))};let y=setTimeout(()=>{r!==I||o||p()},Math.max(3e3,c));F=new EventSource(i,{withCredentials:!0}),F.addEventListener("open",()=>{o=!0,y&&(clearTimeout(y),y=null),b()}),F.addEventListener("snapshot",S=>{if(r===I)try{const f=JSON.parse(S.data||"[]");if(Array.isArray(f)&&f.length){const $=[];for(const T of f){const g=String(T.symbol||"").toUpperCase();g&&(q[g]=T,$.push(T))}s&&s($)}b()}catch{}}),F.addEventListener("delta",S=>{if(r===I)try{const f=JSON.parse(S.data||"[]");if(Array.isArray(f)&&f.length){const $=[];for(const T of f){const g=String(T.symbol||"").toUpperCase();g&&(q[g]=Object.assign({},q[g]||{},T),$.push(q[g]))}s&&s($)}b()}catch{}}),F.addEventListener("message",S=>{if(r===I)try{const f=JSON.parse(S.data||"[]");if(Array.isArray(f)&&f.length&&s){for(const $ of f){const T=String($.symbol||"").toUpperCase();T&&(q[T]=$)}s(f)}b()}catch{}}),F.addEventListener("reconnect",()=>{r===I&&p()}),F.addEventListener("error",S=>{r===I&&p()})}function ut(e,t,s,a,r,n){pt(),q={};const i=Math.max(1500,Number(n.interval||Pt)),o=Math.max(0,Number(n.initialDelay||0)),d=dt(e,n.maxSymbols||18),c=async()=>{if(r!==I)return;ae=new AbortController;const p=Math.max(3e3,Number(n.timeout||1e4)),b=setTimeout(()=>{try{ae?.abort()}catch{}},p);try{const y="/quote_focus.php?symbols="+encodeURIComponent(d.join(","))+"&type="+encodeURIComponent(t),S=await N(y,{timeout:p,retry:0,cacheTtl:0,cache:"no-store",signal:ae.signal});r===I&&S&&S.items&&s&&s(S.items)}catch(y){y.name}finally{clearTimeout(b),r===I&&(ge=setTimeout(c,i))}};ge=setTimeout(c,o)}function pt(){ge&&(clearTimeout(ge),ge=null),ae&&(ae.abort(),ae=null)}function Fe(){F&&(F.close(),F=null)}function ye(){I+=1,q={},Fe(),pt()}let v=null,P=null,Z=null,ie=null,oe=null,H=null,V=null,ce=null,de=null,ue=null,pe=null,Q=null,W="",L=[],B={loading:!1,done:!1,nextAt:0},ve=(()=>{try{return localStorage.getItem("vp_chart_type")||"candles"}catch{return"candles"}})(),Y=(()=>{try{return Object.assign({ma:!0,ema:!1,boll:!1},JSON.parse(localStorage.getItem("vp_chart_ind")||"{}"))}catch{return{ma:!0,ema:!1,boll:!1}}})(),se=0,j=null,Te=null,re=null,ne=null,Ee=null,xe=null,Re=null,_=null,x=0;const et=new Map,Be=new Set;let _e=[],Ne=null;function E(e,t,s,a){_e.push(Ut(e,t,s,a))}function Rt(){return[{key:"favorites",label:l("market.type.favorites","المفضلة")},{key:"crypto",label:l("markets.crypto","الكريبتو")},{key:"forex",label:l("markets.fx","الفوركس")},{key:"stocks",label:l("markets.stocks","الأسهم")},{key:"commodities",label:l("markets.commodities","السلع")},{key:"futures",label:l("market.type.futures","العقود الآجلة")},{key:"arab",label:l("markets.arab_stocks","الأسهم العربية")}]}const tt={crypto:[["BTCUSDT","Bitcoin / Tether"],["ETHUSDT","Ethereum / Tether"],["BNBUSDT","BNB / Tether"],["SOLUSDT","Solana / Tether"],["XRPUSDT","XRP / Tether"],["ADAUSDT","Cardano / Tether"],["DOGEUSDT","Dogecoin / Tether"],["AVAXUSDT","Avalanche / Tether"],["TRXUSDT","TRON / Tether"],["LINKUSDT","Chainlink / Tether"]],forex:[["EURUSD","Euro / US Dollar"],["GBPUSD","British Pound / US Dollar"],["USDJPY","US Dollar / Japanese Yen"],["USDCHF","US Dollar / Swiss Franc"],["AUDUSD","Australian Dollar / US Dollar"],["USDCAD","US Dollar / Canadian Dollar"],["NZDUSD","New Zealand Dollar / US Dollar"],["EURGBP","Euro / British Pound"],["EURJPY","Euro / Japanese Yen"],["GBPJPY","British Pound / Japanese Yen"]],stocks:[["AAPL","Apple Inc."],["MSFT","Microsoft Corp."],["NVDA","NVIDIA Corp."],["TSLA","Tesla Inc."],["AMZN","Amazon.com Inc."],["GOOGL","Alphabet Inc."],["META","Meta Platforms"],["NFLX","Netflix Inc."]],commodities:[["XAUUSD","Gold Spot / US Dollar"],["XAGUSD","Silver Spot / US Dollar"],["USOIL","US Oil"],["UKOIL","Brent Oil"],["NATGAS","Natural Gas"],["COPPER","Copper"]],futures:[["ES_F","S&P 500 Futures"],["NQ_F","Nasdaq 100 Futures"],["YM_F","Dow Jones Futures"],["GC_F","Gold Futures"],["CL_F","Crude Oil Futures"]],arab:[["2222","Saudi Aramco"],["1120","Al Rajhi Bank"],["2010","SABIC"],["7010","stc"],["1211","Maaden"],["1150","Alinma Bank"]]},Bt=["1m","3m","5m","15m","30m","1h","2h","4h","12h","1d","1w"];function Os(e){e.symbol&&M("symbol",e.symbol.toUpperCase()),e.type&&M("type",e.type),e.tf&&M("tf",e.tf);const t=u("symbol"),s=u("type"),a=u("tf");return`<div class="trade-terminal flex flex-col lg:flex-row h-full mobile-pad">
    <aside id="market-drawer" class="hidden lg:flex flex-col w-[250px] border-r border-line bg-surface shrink-0 overflow-hidden">
      <div class="lg:hidden flex items-center justify-between h-12 px-3 border-b border-line bg-panel">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-muted">${l("common.markets","Markets")}</div>
          <strong class="text-sm">${l("trade.select_instrument","Select instrument")}</strong>
        </div>
        <button class="icon-btn icon-btn-sm" id="close-mob-drawer" aria-label="Close markets">${z.close}</button>
      </div>
      <div class="hidden lg:block p-2 border-b border-line">
        <div class="relative">
          <input type="search" class="input pl-7" placeholder="${C(l("trade.search_symbol","Search symbol..."))}" id="sym-search" />
          <span class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted">${z.search}</span>
        </div>
      </div>
      <div class="flex gap-1 p-2 overflow-x-auto border-b border-line" id="type-tabs">
        ${Rt().map(r=>`<button class="btn-xs ${r.key===s?"bg-accent/20 text-accent border-accent/40":"text-muted border-line"} border rounded-md whitespace-nowrap" data-type-tab="${r.key}">${r.label}</button>`).join("")}
      </div>
      <div class="flex-1 overflow-auto p-1" id="symbol-list">${ss()}</div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div class="flex items-center justify-between px-2 lg:px-4 h-11 border-b border-line bg-surface shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <button class="lg:hidden w-8 h-8 grid place-items-center rounded border border-line text-muted shrink-0" id="mob-mkt-btn" aria-label="Open markets">${z.menu}</button>
          <span id="sym-logo-slot">${Se(t,s,"w-7 h-7 rounded-md shrink-0")}</span>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <strong class="text-sm truncate" id="sym-name">${h(t)}</strong>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold" id="live-price">--</span>
              <span class="text-[10px]" id="live-change">+0.00%</span>
            </div>
          </div>
        </div>
        <div class="flex gap-0.5 overflow-x-auto max-w-[46vw] lg:max-w-none" id="tf-bar">
          ${Bt.map(r=>`<button class="px-1.5 py-1 text-[10px] rounded shrink-0 ${r===a?"bg-accent/20 text-accent":"text-muted hover:text-text"}" data-tf="${r}">${r}</button>`).join("")}
        </div>
      </div>

      <div class="flex-1 relative min-h-[260px] bg-bg" id="chart-box">
        <div class="absolute inset-0 flex items-center justify-center"><div class="text-center"><div class="loading-spinner mx-auto"></div><p class="text-[10px] text-muted mt-2">${l("trade.loading_chart","Loading live chart...")}</p></div></div>
      </div>

      <div class="lg:hidden grid grid-cols-2 gap-2 p-2 border-t border-line bg-surface shrink-0">
        <button class="btn-sell py-3" data-open-order="SELL">${l("trade.sell","SELL")}</button>
        <button class="btn-buy py-3" data-open-order="BUY">${l("trade.buy","BUY")}</button>
      </div>

      <div class="border-t border-line bg-surface max-h-[320px] lg:max-h-[220px] overflow-auto shrink-0 trade-activity-panel" id="positions-section">
        <div class="trade-activity-head">
          <div class="trade-activity-title">
            <span class="text-[10px] font-semibold text-muted uppercase">${l("trade.activity","Trading activity")}</span>
            <span class="text-[10px] text-muted ml-2" id="activity-summary">${l("common.loading","Loading...")}</span>
          </div>
          <div class="trade-activity-actions">
            <div class="activity-tabs" role="tablist">
              <button class="active" data-activity-tab="active">${l("trade.active_trades","Active trades")} <b id="active-count">0</b></button>
              <button data-activity-tab="closed">${l("trade.closed_trades","Closed trades")} <b id="closed-count">0</b></button>
            </div>
            <button class="activity-expand-btn" data-toggle-activity-expand title="${C(l("trade.expand_activity","Expand trading activity"))}" aria-label="${C(l("trade.expand_activity","Expand trading activity"))}">${z.fullscreen||z.expand||"⛶"}</button>
          </div>
        </div>
        <div id="activity-body"><p class="text-muted text-[11px] text-center py-4">${l("common.loading","Loading...")}</p></div>
      </div>
    </div>

    <aside class="hidden lg:flex flex-col w-[300px] border-l border-line bg-surface shrink-0 overflow-auto">
      <div class="p-3 border-b border-line">
        <div class="text-xs font-semibold">Order Ticket</div>
        <div class="text-[10px] text-muted" id="ticket-instrument">${h(t)} - ${h(s.toUpperCase())}</div>
      </div>
      <div class="p-3 space-y-3" id="order-body">
        ${mt()}
      </div>
    </aside>

    ${jt(t,s)}
  </div>`}function mt(){const e=u("orderType")||"MARKET",t=Number(u("amount")||100),s=Number(u("leverage")||10),a=u("market")||"spot",r=a==="perp",n=u("activeQuote")||{},i=Number(n.price||0);return`<div class="space-y-3 order-ticket-panel" data-order-form>
    <div class="grid grid-cols-2 gap-2">
      <label class="block">
        <span class="text-[10px] text-muted">${l("trade.trading_type","Trading type")}</span>
        <select class="input mt-1" data-market-type>
          <option value="spot" ${a==="spot"?"selected":""}>${l("trade.spot","Spot")}</option>
          <option value="perp" ${a==="perp"?"selected":""}>${l("trade.perp_futures","Perpetual / Futures")}</option>
        </select>
      </label>
      <label class="block">
        <span class="text-[10px] text-muted">${l("trade.order_type_label","Order type")}</span>
        <select class="input mt-1" data-order-type>
          <option value="MARKET" ${e==="MARKET"?"selected":""}>${l("trade.market","Market")}</option>
          <option value="LIMIT" ${e==="LIMIT"?"selected":""}>${l("trade.limit","Limit")}</option>
        </select>
      </label>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <button class="btn-sell trade-price-button" data-side="SELL"><small>${l("trade.sell","Sell")}</small><span data-sell-price>${i>0?w(i,u("type")):"--"}</span></button>
      <button class="btn-buy trade-price-button" data-side="BUY"><small>${l("trade.buy","Buy")}</small><span data-buy-price>${i>0?w(i*1.0001,u("type")):"--"}</span></button>
      </div>
      <div class="text-center"><span class="spread-display" data-spread-val>${l("trade.spread","Spread")}: --</span></div>
      <div class="mobile-order-summary">
        <span><small>${l("trade.mode","Mode")}</small><strong>${h(u("mode")==="real"?l("trade.real","Real"):l("trade.demo","Demo"))}</strong></span>
        <span><small>${l("trade.symbol","Symbol")}</small><strong>${h(u("symbol")||"--")}</strong></span>
        <span><small>${l("trade.type","Type")}</small><strong>${r?l("trade.perp_futures","Perp/Futures"):l("trade.spot","Spot")}</strong></span>
      </div>
      <div class="order-summary-box">
        <span><small>${l("trade.available","Available")}</small><strong data-avail-bal>--</strong></span>
        <span><small>${l("trade.est_units","Est. Units")}</small><strong data-est-units>--</strong></span>
        <span><small>${l("trade.notional","Notional")}</small><strong data-est-notional>--</strong></span>
    </div>
    <label class="block">
      <span class="text-[10px] text-muted">${l("trade.margin_amount","Margin / Amount (USDT)")}</span>
      <input type="number" min="1" step="any" class="input mt-1" value="${C(String(t))}" data-amount />
    </label>
    <div class="quick-amount-grid" aria-label="Quick order amounts">
      ${[25,50,100,250].map(o=>`<button type="button" data-quick-amount="${o}">$${o}</button>`).join("")}
    </div>
    <label class="block">
      <span class="text-[10px] text-muted">${l("trade.limit_price","Limit price")}</span>
      <input type="number" min="0" step="any" class="input mt-1" placeholder="${i>0?w(i,u("type")):l("trade.required_for_limit","Required for limit")}" data-limit-price />
    </label>
    ${r?`
    <label class="block order-leverage-row" id="leverage-row">
      <span class="text-[10px] text-muted">${l("trade.leverage","Leverage")}: <strong data-lev-val id="leverage-label">${s}x</strong></span>
      <input type="range" min="1" max="100" value="${C(String(s))}" class="w-full mt-1 accent-accent" data-leverage />
    </label>`:`
    <div class="order-spot-note" id="leverage-row">
      <span class="text-[10px] text-muted">${l("trade.spot_no_leverage","Spot order — no leverage")}</span>
    </div>`}
    <div class="grid grid-cols-2 gap-2">
      <label class="block">
        <span class="text-[10px] text-muted">${l("trade.take_profit","Take Profit")}</span>
        <input type="number" step="any" class="input mt-1" placeholder="${l("trade.optional","Optional")}" data-tp />
      </label>
      <label class="block">
        <span class="text-[10px] text-muted">${l("trade.stop_loss","Stop Loss")}</span>
        <input type="number" step="any" class="input mt-1" placeholder="${l("trade.optional","Optional")}" data-sl />
      </label>
    </div>
    <p class="order-form-status is-info" data-order-status hidden></p>
    <p class="order-ticket-note">${l("trade.order_note","Orders execute internally on MEX Group at the current platform quote. Use TP/SL to document target risk for review.")}</p>
  </div>`}function jt(e,t){return`<div class="fixed inset-0 z-[230] hidden lg:hidden" id="mobile-order-sheet">
    <div class="absolute inset-0 bg-black/65" data-close-order-sheet></div>
    <div class="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-auto rounded-t-2xl border border-line bg-surface shadow-2xl">
      <div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3">
        <div class="flex items-center gap-2 min-w-0">
          <span id="mobile-order-logo-slot">${Se(e,t,"w-8 h-8 rounded-lg shrink-0")}</span>
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider text-muted" id="mobile-order-side-label">${l("trade.order","Order")}</div>
            <strong class="text-sm truncate" id="mobile-order-symbol">${h(e)}</strong>
          </div>
        </div>
        <button class="icon-btn icon-btn-sm" data-close-order-sheet aria-label="Close order">${z.close}</button>
      </div>
      <div class="p-4">
        ${mt()}
        <div class="order-action-sticky">
          <button class="btn-primary w-full py-3" id="mobile-submit-order" data-submit-order="BUY">${l("trade.review_place","Review & Place Order")}</button>
        </div>
      </div>
    </div>
  </div>`}function Is(e){const t=s=>{if(s.target.tagName==="IMG"&&s.target.dataset.fallback==="initial"){s.target.style.display="none";const a=s.target.nextElementSibling;a&&(a.style.display="grid")}};e.addEventListener("error",t,!0),_e.push(()=>e.removeEventListener("error",t,!0)),Ft(e)}function Rs(){x+=1,xe&&(xe.disconnect(),xe=null),v&&(v.remove(),v=null,P=null,Z=null,ie=null,oe=null,H=null,V=null,ce=null,de=null,ue=null,pe=null,Q=null,_=null),W="",L=[],B={loading:!1,done:!1,nextAt:0},se=0,document.body.classList.remove("chart-fullscreen-open"),j&&(j(),j=null),De(),ft(),Oe(),ye(),_e.forEach(e=>{try{e()}catch{}}),_e=[],Ne=null,document.body.classList.remove("trade-modal-open")}async function Ft(e){const t=u("symbol"),s=u("type"),a=u("tf"),r=++x;M("activeQuote",null);const n=ee();Ne={container:e,symbol:t,type:s,runId:r},fs(e),Ht(),K(e),ze(e,t,s,r),Ie(s,r).then(i=>{k(r,t,s)&&i?.items&&(e.__marketItems=i.items,me(e,i.items),Xe(e,i.items,r),setTimeout(()=>{k(r,t,s)&&$e(e,i.items,r,s)},800),Pe(e,i.items,r,s).catch(()=>{}))}).catch(()=>{if(!k(r,t,s))return;const i=Je(s);e.__marketItems=i,me(e,i)}),G(e,r),ne=setInterval(()=>G(e,r,!0),2e4),Le(e,t,s,a,r,n),We(e,t,s,a,r,n)}function Ht(){const e=()=>{if(document.hidden){De(),ft(),j&&(j(),j=null);return}const t=Ne;!t||t.runId!==x||(ze(t.container,t.symbol,t.type,t.runId),ne||(G(t.container,t.runId,!0),ne=setInterval(()=>G(t.container,t.runId,!0),2e4)),!j&&Array.isArray(t.container.__marketItems)&&$e(t.container,t.container.__marketItems,t.runId))};document.addEventListener("visibilitychange",e),_e.push(()=>document.removeEventListener("visibilitychange",e))}function k(e,t=u("symbol"),s=u("type")){return!(e!==x||t&&String(t).toUpperCase()!==String(u("symbol")||"").toUpperCase()||s&&A(s)!==A(u("type")))}function A(e){const t=String(e||"").toLowerCase();return t==="commodity"?"commodities":t==="stock"?"stocks":t==="future"?"futures":t}function $e(e,t,s=x,a=null){j&&(j(),j=null);const r=A(a||u("type")),n=r==="favorites"?"crypto":r,i=u("symbol"),o=n==="crypto",d=o?36:3,c=[...new Set(t.slice(0,d).map(p=>String(p.symbol||"").toUpperCase()).filter(Boolean).filter(p=>p!==String(i||"").toUpperCase()))];c.length&&(j=Ot(c,n,p=>{k(s,i,u("type"))&&Ae(e,p)},null,{interval:o?6e3:5e3,initialDelay:900,fallbackAfter:3e3,maxSymbols:d,timeout:9e3,forcePolling:!o}))}function ze(e,t,s,a=x){De();const r=A(s)==="favorites"?"crypto":A(s),n=r==="crypto"?1500:2500,i=`/quote_focus.php?symbols=${encodeURIComponent(t)}&type=${encodeURIComponent(r)}`,o=async()=>{if(k(a,t,s)){re=new AbortController;try{let d=await N(i,{timeout:2500,retry:0,signal:re.signal,cacheTtl:0,cache:"no-store"}),c=d?.items?.[0];if(!(Number(c?.price||0)>0)){const p=`/quotes.php?symbol=${encodeURIComponent(t)}&type=${encodeURIComponent(r)}&purpose=focus&_=${Date.now()}`;d=await N(p,{timeout:r==="crypto"?1800:2500,retry:0,signal:re.signal,cacheTtl:500,cache:"no-store"}),c=d?.items?.[0]}if(!k(a,t,s))return;c&&ht(e,c,a)}catch{k(a,t,s)}finally{k(a,t,s)&&(Te=setTimeout(o,n))}}};o()}function De(){Te&&(clearTimeout(Te),Te=null),re&&(re.abort(),re=null)}function ft(){ne&&(clearInterval(ne),ne=null)}function Vt(e,t,s,a=0){const r=Number(s||0),n=Number(a||0);e.__lastQuotePrices||(e.__lastQuotePrices=new Map);const i=String(t||u("symbol")||"").toUpperCase(),o=i?Number(e.__lastQuotePrices.get(i)||0):0;let d=n>0?"text-buy":n<0?"text-sell":"text-text";return o>0&&r>0&&Math.abs(r-o)>1e-12&&(d=r>o?"text-buy":"text-sell"),i&&r>0&&e.__lastQuotePrices.set(i,r),d}function qt(e){const t=String(e||"").toLowerCase();return t.includes("binance")?100:t.includes("eodhd")?94:t.includes("provider_live")?90:t.includes("yahoo_chart_live")?76:t==="yahoo"||t.includes("yahoo")?68:t.includes("frankfurter")||t.includes("stooq")||t.includes("fallback")?30:t.includes("cache")||t.includes("seed")||t.includes("reference")||t.includes("unavailable")?5:t?45:0}function X(e){const t=Number(e||0);return t>0?t>1e12?Math.floor(t/1e3):Math.floor(t):0}function zt(e){const t=Math.max(X(e?.provider_updated_at),X(e?.provider_ts),X(e?.as_of),X(e?.updated_at)),s=Math.max(X(e?.received_at),X(e?.ingested_at),X(e?.cache_updated_at));return{rank:qt(e?.source||e?.provider),providerTs:t,cacheTs:s,effectiveTs:Math.max(t,s)}}function bt(e,t,s){if(!(Number(t?.price||t?.q_price||0)>0))return!1;e.__quoteQuality||(e.__quoteQuality=new Map);const r=String(s||t?.symbol||"").toUpperCase();if(!r)return!0;const n=zt(t),i=e.__quoteQuality.get(r);return i&&(n.providerTs>0&&i.providerTs>0&&n.providerTs+30<i.providerTs||n.effectiveTs>0&&i.effectiveTs>0&&n.effectiveTs+2<i.effectiveTs&&n.rank<=i.rank||n.rank+20<i.rank&&n.effectiveTs<=i.effectiveTs+60)?!1:(e.__quoteQuality.set(r,n),!0)}function ht(e,t,s=x){if(!k(s,String(t?.symbol||u("symbol")).toUpperCase(),t?.type||u("type")))return;const a=Number(t.price||t.q_price||0);if(!bt(e,{...t,price:a},t.symbol||u("symbol")))return;const r=Number(t.change_pct||t.q_change||0),n=u("type");M("activeQuote",{...t,price:a,change_pct:r});const i=Vt(e,t.symbol||u("symbol"),a,r);Ae(e,[{...t,price:a,change_pct:r}]);const o=m("#live-price",e),d=m("#live-change",e);if(o){if(o.textContent=a>0?w(a,n):"--",o.className=`text-xs font-mono font-bold ${i}`,a>0&&se>0&&a!==se){const c=a>se?"price-flash-up":"price-flash-down";o.classList.remove("price-flash-up","price-flash-down"),o.offsetWidth,o.classList.add(c)}a>0&&(se=a)}d&&(d.textContent=Ve(r),d.className=`text-[10px] ${r>=0?"text-buy":"text-sell"}`),U("[data-sell-price]",e).forEach(c=>{c.textContent=a>0?w(a,n):"--"}),U("[data-buy-price]",e).forEach(c=>{c.textContent=a>0?w(a*1.0001,n):"--"}),U("[data-spread-val]",e).forEach(c=>{c.textContent=a>0?`${l("trade.spread","Spread")}: ${w(a*1e-4,n)}`:`${l("trade.spread","Spread")}: --`}),K(e),ks(a,s,Number(t.provider_updated_at||t.updated_at||t.cache_updated_at||0),A(t.type||n))}function K(e){const t=u("activeQuote")||{},s=Number(t.price||0),a=u("wallet")||{},r=u("mode")==="real"?a.real||{}:a.demo||{};U("[data-order-form]",e).forEach(n=>{const i=Number(m("[data-amount]",n)?.value||u("amount")||0),o=Number(m("[data-leverage]",n)?.value||u("leverage")||1),c=(m("[data-market-type]",n)?.value||u("market")||"spot")==="perp"?o:1,p=s>0?i*c/s:0,b=i*c,y=m("[data-lev-val]",n);y&&(y.textContent=`${o}x`);const S=m("[data-est-units]",n);S&&(S.textContent=p>0?p.toFixed(p>=10?3:6):"--");const f=m("[data-est-notional]",n);f&&(f.textContent=i>0?`${O(b)} USDT`:"--");const $=m("[data-avail-bal]",n);$&&($.textContent=`${O(r.available||0)} ${r.currency||""}`)})}function me(e,t){const s=m("#symbol-list",e);if(!s)return;const a=u("symbol"),r=t.slice(0,120);s.innerHTML=r.map(n=>{const i=String(n.symbol||"").toUpperCase(),o=n.type||u("type"),d=Number(n.price||n.q_price||0),c=Number(n.change_pct||n.q_change||0),p=!(d>0);return`<div class="symbol-row ${i===a?"active":""}" data-sym="${C(i)}" data-stype="${C(o)}">
      ${Se(i,o,"w-7 h-7 rounded-md shrink-0")}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <div class="font-semibold text-[11px] truncate">${h(i)}</div>
        </div>
        <div class="text-[9px] text-muted truncate">${h(n.name||o)}</div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-[11px] font-mono text-text" data-price-cell>${d>0?w(d,o):"--"}</div>
        <div class="text-[9px] ${p?"text-muted":c>=0?"text-buy":"text-sell"}" data-change-cell>${p?"--":Ve(c)}</div>
      </div>
    </div>`}).join("")}async function Pe(e,t,s=x,a=null){const r=A(a||u("type")||"crypto"),n=r==="crypto"?80:24,i=t.slice(0,n).filter(g=>!(Number(g.price||g.q_price||0)>0)).map(g=>String(g.symbol||"").toUpperCase()).filter(Boolean);if(!i.length)return;const o=r==="crypto"?24:3,d=r==="crypto"?80:24,c=r==="crypto"?4500:9e3,p=[...new Set(i)].slice(0,d),b=[],y=async g=>{const J=await N(`/quotes.php?symbols=${encodeURIComponent(g.join(","))}&type=${encodeURIComponent(r)}&visible=1&purpose=watchlist&_=${Date.now()}`,{timeout:r==="crypto"?2600:Math.min(c,5e3),cacheTtl:500,cache:"no-store"}).catch(()=>null);k(s)&&(J?.items?.length&&Ae(e,J.items),g.forEach(D=>{const te=U(".symbol-row",e).find(Mt=>Mt.dataset.sym===D);te&&m("[data-price-cell]",te)?.textContent!=="--"||b.push(D)}))},S=[];for(let g=0;g<p.length;g+=o)S.push(p.slice(g,g+o));const f=r==="crypto"?1:2;for(let g=0;g<S.length;g+=f)if(await Promise.allSettled(S.slice(g,g+f).map(y)),!k(s))return;const $=r==="crypto"?12:3,T=[...new Set(b)].slice(0,24);for(let g=0;g<T.length;g+=$){const J=T.slice(g,g+$),D=await N(`/quotes.php?symbols=${encodeURIComponent(J.join(","))}&type=${encodeURIComponent(r)}&visible=1&purpose=watchlist&_=${Date.now()}`,{timeout:r==="crypto"?2600:Math.min(c,5e3),cacheTtl:500,cache:"no-store"}).catch(()=>null);if(!k(s))return;D?.items?.length&&Ae(e,D.items)}}function Ae(e,t){if(!t?.length)return;const s=U(".symbol-row",e);if(!s.length)return;const a=new Map;s.forEach(r=>a.set(r.dataset.sym,r)),t.forEach(r=>{const n=String(r.symbol||"").toUpperCase();if(!n)return;const i=a.get(n);if(!i)return;const o=i.dataset.stype||u("type"),d=Number(r.price||r.q_price||0);if(!(d>0)||!bt(e,{...r,price:d},n))return;const c=Number(r.change_pct||r.q_change||0),p=m("[data-price-cell]",i),b=m("[data-change-cell]",i);p&&(p.textContent=w(d,o),p.className="text-[11px] font-mono text-text"),b&&(b.textContent=Ve(c),b.className=`text-[9px] ${c>=0?"text-buy":"text-sell"}`)})}async function G(e,t=x,s=!1,a=!1){if(!k(t)||e.__tradeActivityLoading)return;e.__tradeActivityLoading=!0;const r=m("#activity-body",e);r&&!s&&!e.__tradeActivityLoaded&&(r.innerHTML='<p class="text-muted text-[11px] text-center py-4">Loading trading activity...</p>');const n=a?0:4e3,i=a?"no-store":"default",o=a?`&_=${Date.now()}`:"";try{const d=u("mode"),[c,p]=await Promise.allSettled([N(`/trade/portfolio.php?fast=1&mode=${d}${o}`,{timeout:12e3,retry:1,cacheTtl:n,cache:i}),N(`/trade/orders.php?limit=90&mode=${d}${o}`,{timeout:12e3,retry:1,cacheTtl:n,cache:i})]);if(!k(t))return;const b=c.status==="fulfilled"?c.value:null,y=p.status==="fulfilled"?p.value:null;if(b?.positions&&(e.__tradePositions=b.positions,M("portfolio",b)),(y?.items||y?.orders)&&(e.__tradeOrders=y.items||y.orders||[]),!b&&!y&&!e.__tradeActivityLoaded){r&&(r.innerHTML='<p class="text-muted text-[11px] text-center py-4">Trading activity is reconnecting...</p>');return}e.__tradeActivityLoaded=!0,yt(e)}finally{e.__tradeActivityLoading=!1}}function yt(e){const t=(e.__tradePositions||[]).filter(c=>!st(c)),s=(e.__tradeOrders||[]).filter(c=>!st(c)),a=s.filter(Ye),r=s.filter(He);let n=e.__tradeActivityTab||"active";(n==="positions"||n==="orders")&&(n="active"),n==="history"&&(n="closed"),e.__tradeActivityTab=n;const i=m("#active-count",e),o=m("#closed-count",e),d=m("#activity-summary",e);return i&&(i.textContent=String(t.length+a.length)),o&&(o.textContent=String(r.length)),d&&(d.textContent=`${t.length} ${l("trade.open","open")} / ${a.length} ${l("trade.pending","pending")} / ${r.length} ${l("trade.closed","closed")}`),U("[data-activity-tab]",e).forEach(c=>{c.classList.toggle("active",c.dataset.activityTab===n)}),n==="closed"?Kt(e,r):Yt(e,t,a)}function Yt(e,t,s){const a=m("#activity-body",e);if(a){if(!t.length&&!s.length){a.innerHTML=`<p class="text-muted text-[11px] text-center py-4">${l("trade.no_active_trades","No active trades yet")}</p>`;return}a.innerHTML=`
    ${t.length?Qt(t):`<p class="text-muted text-[11px] text-center py-3">${l("trade.no_open_positions","No open positions")}</p>`}
    ${s.length?`<div class="trade-pending-block">
      <div class="trade-subhead"><span>${l("trade.pending_orders","Pending orders")}</span><b>${s.length}</b></div>
      ${Gt(s)}
    </div>`:""}`}}function Qt(e){return`
    <div class="trade-position-cards lg:hidden">
      ${e.slice(0,12).map(Jt).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[620px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">${l("trade.symbol","Symbol")}</th><th class="text-left py-1">${l("trade.side","Side")}</th><th class="text-left py-1">${l("trade.type","Type")}</th><th class="text-right py-1">${l("trade.entry","Entry")}</th><th class="text-right py-1">${l("trade.mark","Mark")}</th><th class="text-right py-1">${l("trade.size","Size")}</th><th class="text-right py-1">${l("trade.lev","Lev")}</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1"></th>
      </tr></thead>
      <tbody>${e.slice(0,12).map(Wt).join("")}</tbody>
    </table></div>`}function Gt(e){return`
    <div class="trade-position-cards lg:hidden">
      ${e.slice(0,16).map(Zt).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[820px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">${l("trade.symbol","Symbol")}</th><th class="text-left py-1">${l("trade.side","Side")}</th><th class="text-left py-1">${l("trade.type","Type")}</th><th class="text-right py-1">${l("trade.entry","Entry")}</th><th class="text-right py-1">TP / SL</th><th class="text-right py-1">${l("deposit.amount","Amount")}</th><th class="text-right py-1">${l("trade.lev","Lev")}</th><th class="text-right py-1">${l("kyc.status","Status")}</th><th class="text-right px-3 py-1">${l("common.actions","Actions")}</th>
      </tr></thead>
      <tbody>${e.slice(0,16).map(Xt).join("")}</tbody>
    </table></div>`}function Kt(e,t){const s=m("#activity-body",e);if(s){if(!t.length){s.innerHTML=`<p class="text-muted text-[11px] text-center py-4">${l("trade.no_closed_trades","No closed trades yet")}</p>`;return}s.innerHTML=`
    <div class="trade-position-cards lg:hidden">
      ${t.slice(0,18).map(ts).join("")}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[820px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">${l("trade.symbol","Symbol")}</th><th class="text-left py-1">${l("trade.side","Side")}</th><th class="text-left py-1">${l("trade.type","Type")}</th><th class="text-right py-1">${l("trade.exit","Exit")}</th><th class="text-right py-1">${l("trade.used","Used")}</th><th class="text-right py-1">${l("trade.fee","Fee")}</th><th class="text-right py-1">${l("trade.pnl","PnL")}</th><th class="text-right py-1">${l("trade.opened","Opened")}</th><th class="text-right px-3 py-1">${l("trade.closed","Closed")}</th>
      </tr></thead>
      <tbody>${t.slice(0,18).map(es).join("")}</tbody>
    </table></div>`}}function gt(e){const t=Number(e.pnl||e.unrealized_pnl||0),s=String(e.symbol||"").replace("@R@",""),a=e.asset_type||u("type"),r=Number(e.mark_price||e.current_price||e.price||0),n=e.position_id||e.id||"",i=String(e.side||"buy").toUpperCase()==="SELL"?"SELL":"BUY";return{pnl:t,cleanSymbol:s,posType:a,mark:r,id:n,side:i}}function Wt(e){const{pnl:t,cleanSymbol:s,posType:a,mark:r,id:n,side:i}=gt(e),o=String(e.market_type||"").toLowerCase()==="perp";return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${h(s)}</td>
    <td>${he(i)}</td>
    <td class="text-muted">${o?l("trade.perp","Perp"):l("trade.spot","Spot")}</td>
    <td class="text-right font-mono">${w(e.entry_price||e.open_price,a)}</td>
    <td class="text-right font-mono">${r>0?w(r,a):"--"}</td>
    <td class="text-right font-mono">${ct(e.qty||e.amount||e.size||e.units||0)}</td>
    <td class="text-right font-mono">${o?`${h(String(e.leverage||1))}x`:'<span class="text-muted text-[9px]">—</span>'}</td>
    <td class="text-right font-mono ${t>=0?"text-buy":"text-sell"}">${O(t)}</td>
    <td class="text-right px-3">${n?`<button class="btn-xs btn-ghost text-sell" data-close="${C(n)}">${l("common.close","Close")}</button>`:""}</td>
  </tr>`}function Jt(e){const{pnl:t,cleanSymbol:s,posType:a,mark:r,id:n,side:i}=gt(e),o=String(e.market_type||"").toLowerCase()==="perp";return`<article class="trade-position-card">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${h(s)}</strong>
        <small>${h(o?l("trade.perp_futures","Perp/Futures"):l("trade.spot","Spot"))} - ${h(e.created_at||e.opened_at||"")}</small>
      </div>
      ${he(i)}
    </div>
    <div class="trade-position-metrics">
      <span><small>${l("trade.entry","Entry")}</small><strong>${w(e.entry_price||e.open_price,a)}</strong></span>
      <span><small>${l("trade.mark","Mark")}</small><strong>${r>0?w(r,a):"--"}</strong></span>
      <span><small>${l("trade.size","Size")}</small><strong>${ct(e.qty||e.amount||e.size||e.units||0)}</strong></span>
      <span><small>PnL</small><strong class="${t>=0?"text-buy":"text-sell"}">${O(t)}</strong></span>
      <span><small>${l("trade.margin","Margin")}</small><strong>${O(e.margin_initial||e.margin||0)}</strong></span>
      ${o?`<span><small>${l("trade.leverage","Leverage")}</small><strong>${h(String(e.leverage||1))}x</strong></span>`:""}
      ${o&&e.liquidation_price?`<span><small>${l("trade.liq_price","Liq. Price")}</small><strong class="text-sell">${w(e.liquidation_price,a)}</strong></span>`:""}
    </div>
    ${n?`<button class="btn-xs btn-ghost text-sell w-full" data-close="${C(n)}">${l("trade.close_position","Close position")}</button>`:""}
  </article>`}function He(e){const t=String(e.status||"").toLowerCase();return t==="closed"||t==="canceled"||t==="cancelled"||t==="rejected"||Number(e.closed_at||0)>0||Number(e.exit_price||0)>0}function Ye(e={}){if(e.is_pending===!0||e.is_pending===1||e.is_pending==="1")return!He(e);if(He(e))return!1;const t=String(e.raw_status||e.order_status||e.status||"").toLowerCase(),s=["open","pending","armed","submitted","new"].includes(t),a=Number(e.fill_price||e.entry_price||0)>0,r=Number(e.position_id||0)>0&&!(e.can_cancel||e.can_edit);return s&&!a&&!r}function st(e={}){if(["copy_subscription_id","copy_signal_id","copy_trade_id","copy_id","trading_bot_subscription_id","bot_subscription_id","avalon_subscription_id"].some(a=>e[a]!==void 0&&e[a]!==null&&String(e[a])!==""&&String(e[a])!=="0"))return!0;const s=[e.source,e.origin,e.order_source,e.position_source,e.product_kind,e.strategy_kind,e.category,e.group].map(a=>String(a||"").toLowerCase()).join(" ");return/\b(copy|copied|copy-trading|trading_bot|bot|avalon)\b/.test(s)}function fe(e){return String(e.symbol||"").replace("@R@","").replace("@D@","")}function ke(e){return String(e.side||"BUY").toUpperCase()==="SELL"?"SELL":String(e.side||"BUY").toUpperCase()==="CLOSE"?"CLOSE":"BUY"}function Ce(e){return e.asset_type||e.type||u("type")}function Qe(e){return String(e.order_id||e.id||"")}function le(e){const t=Number(e||0);if(!t)return"--";try{return new Date(t*1e3).toLocaleString([],{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})}catch{return String(e)}}function Xt(e){const t=ke(e),s=Ce(e),a=Qe(e);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${h(fe(e))}</td>
    <td>${he(t)}</td>
    <td class="text-muted">${h(e.order_type||e.market_type||"market")}</td>
    <td class="text-right font-mono">${w(e.entry_price||e.fill_price||e.limit_price,s)}</td>
    <td class="text-right font-mono"><span class="text-buy">${e.tp_price?w(e.tp_price,s):"--"}</span> / <span class="text-sell">${e.sl_price?w(e.sl_price,s):"--"}</span></td>
    <td class="text-right font-mono">${O(e.used_usdt||e.usd_amount||e.amount||0)}</td>
    <td class="text-right font-mono">${h(String(e.leverage||1))}x</td>
    <td class="text-right"><span class="status-chip status-chip-derived">${h(e.status||"open")}</span></td>
    <td class="text-right px-3">${vt(a,e)}</td>
  </tr>`}function Zt(e){const t=ke(e),s=Ce(e),a=Qe(e);return`<article class="trade-position-card trade-activity-card">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${h(fe(e))}</strong>
        <small>${h(e.order_type||"market")} - ${h(le(e.created_at))}</small>
      </div>
      ${he(t)}
    </div>
    <div class="trade-position-metrics">
      <span><small>${l("trade.entry","Entry")}</small><strong>${w(e.entry_price||e.fill_price||e.limit_price,s)}</strong></span>
      <span><small>${l("trade.take_profit","Take profit")}</small><strong class="text-buy">${e.tp_price?w(e.tp_price,s):"--"}</strong></span>
      <span><small>${l("trade.stop_loss","Stop loss")}</small><strong class="text-sell">${e.sl_price?w(e.sl_price,s):"--"}</strong></span>
      <span><small>${l("deposit.amount","Amount")}</small><strong>${O(e.used_usdt||e.usd_amount||e.amount||0)}</strong></span>
      <span><small>${l("trade.lev","Lev")}</small><strong>${h(String(e.leverage||1))}x</strong></span>
      <span><small>${l("kyc.status","Status")}</small><strong>${h(e.status||l("trade.open","open"))}</strong></span>
      <span><small>${l("funding.mode","Mode")}</small><strong>${h(e.mode||u("mode")||l("mode.demo","demo"))}</strong></span>
      <span><small>${l("trade.symbol","Symbol")}</small><strong>${h(fe(e))}</strong></span>
    </div>
    ${vt(a,e,!0)}
  </article>`}function vt(e,t,s=!1){return!e||!Ye(t)?'<span class="text-muted text-[10px]">--</span>':`<div class="${s?"trade-pending-actions is-card":"trade-pending-actions"}">
    <button class="btn-xs btn-ghost" data-edit-order="${C(e)}">${l("common.edit","Edit")}</button>
    <button class="btn-xs btn-danger" data-cancel-order="${C(e)}">${l("common.cancel","Cancel")}</button>
  </div>`}function es(e){const t=ke(e),s=Ce(e),a=Number(e.pnl_usd||e.pnl||0);return`<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${h(fe(e))}</td>
    <td>${he(t)}</td>
    <td class="text-muted">${h(e.market_type||e.order_type||"spot")}</td>
    <td class="text-right font-mono">${w(e.exit_price||e.limit_price,s)}</td>
    <td class="text-right font-mono">${O(e.used_usdt||e.usd_amount||0)}</td>
    <td class="text-right font-mono">${O(e.fee_paid||0)}</td>
    <td class="text-right font-mono ${a>=0?"text-buy":"text-sell"}">${O(a)}</td>
    <td class="text-right text-muted">${h(le(e.created_at))}</td>
    <td class="text-right px-3 text-muted">${h(le(e.closed_at||e.created_at))}</td>
  </tr>`}function ts(e){const t=ke(e),s=Ce(e),a=Number(e.pnl_usd||e.pnl||0);return`<article class="trade-position-card trade-activity-card is-history">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${h(fe(e))}</strong>
        <small>${h(e.close_reason||e.status||l("trade.closed","closed"))} - ${h(le(e.closed_at||e.created_at))}</small>
      </div>
      ${he(t)}
    </div>
    <div class="trade-position-metrics">
      <span><small>${l("trade.exit","Exit")}</small><strong>${w(e.exit_price||e.limit_price,s)}</strong></span>
      <span><small>${l("trade.opened","Opened")}</small><strong>${h(le(e.created_at))}</strong></span>
      <span><small>${l("trade.closed","Closed")}</small><strong>${h(le(e.closed_at||e.created_at))}</strong></span>
      <span><small>PnL</small><strong class="${a>=0?"text-buy":"text-sell"}">${O(a)}</strong></span>
      <span><small>${l("trade.used","Used")}</small><strong>${O(e.used_usdt||e.usd_amount||0)}</strong></span>
      <span><small>${l("trade.fee","Fee")}</small><strong>${O(e.fee_paid||0)}</strong></span>
    </div>
  </article>`}function he(e){const t=String(e||"BUY").toUpperCase()==="SELL"?"SELL":"BUY";return`<span class="trade-side-chip is-${t.toLowerCase()}">${h(xt(t))}</span>`}function xt(e){return String(e||"").toUpperCase()==="SELL"?l("trade.sell","SELL"):l("trade.buy","BUY")}function _t(e){return(e||[]).map(t=>({time:Number(t.time||t.t),open:Number(t.open||t.o),high:Number(t.high||t.h),low:Number(t.low||t.l),close:Number(t.close||t.c),volume:Number(t.volume||t.v||0)})).filter(t=>t.time>0&&t.open>0&&t.high>0&&t.low>0&&t.close>0).sort((t,s)=>t.time-s.time)}function ss(e=9){let t="";for(let s=0;s<e;s++)t+=`<div class="symbol-skeleton-row">
      <div class="skeleton-block w-7 h-7 rounded-full shrink-0"></div>
      <div class="flex-1 min-w-0">
        <div class="skeleton-block h-2.5 w-16 rounded mb-1.5"></div>
        <div class="skeleton-block h-2 w-10 rounded"></div>
      </div>
      <div class="skeleton-block h-2.5 w-12 rounded"></div>
    </div>`;return t}function we(){return`${String(u("symbol")||"").toUpperCase()}|${u("tf")}`}function $t(e,t){const s=new Map;return(e||[]).forEach(a=>s.set(a.time,a)),(t||[]).forEach(a=>s.set(a.time,a)),Array.from(s.values()).sort((a,r)=>a.time-r.time)}function wt(e,{fit:t=!1,key:s=we()}={}){if(!P||!Z)return!1;const a=_t(e);return a.length?(W===s&&L.length?L=$t(L,a):(L=a,B={loading:!1,done:!1,nextAt:0}),W=s,Ge({fit:t}),!0):!1}function Ge({fit:e=!1,preserveRange:t=!1}={}){if(!v||!P||!Z)return;const s=L;if(!s.length)return;let a=null;if(t)try{a=v.timeScale().getVisibleRange()}catch{}P.setData(s.map(({time:i,open:o,high:d,low:c,close:p})=>({time:i,open:o,high:d,low:c,close:p})));const r=s.map(i=>({time:i.time,value:i.close}));H&&H.setData(r),V&&V.setData(r),Z.setData(s.map(i=>({time:i.time,value:i.volume,color:i.close>=i.open?"rgba(0,192,135,0.25)":"rgba(246,70,93,0.2)"})));const n=s.map(i=>({time:i.time,close:i.close}));if(ie&&ie.setData(Y.ma?ot(n,7):[]),oe&&oe.setData(Y.ma?ot(n,25):[]),ce&&ce.setData(Y.ema?Ts(n,20):[]),de&&ue&&pe){const i=Y.boll?Es(n,20,2):{upper:[],mid:[],lower:[]};de.setData(i.upper),ue.setData(i.mid),pe.setData(i.lower)}if(_={...s[s.length-1]},a)try{v.timeScale().setVisibleRange(a)}catch{}else e&&v.timeScale().fitContent();Ue(null)}function St(e){W="",_=null,L=[],B={loading:!1,done:!1,nextAt:0};try{P&&P.setData([]),Z&&Z.setData([]),ie&&ie.setData([]),oe&&oe.setData([]),H&&H.setData([]),V&&V.setData([]),ce&&ce.setData([]),de&&de.setData([]),ue&&ue.setData([]),pe&&pe.setData([])}catch{}Ue(null),v&&kt(e)}function kt(e){const t=m("#chart-box",e);if(!t)return;let s=t.querySelector(".chart-loading-overlay");s||(s=document.createElement("div"),s.className="chart-loading-overlay",s.innerHTML='<div class="loading-spinner"></div>',t.appendChild(s)),s.classList.add("is-visible")}function Me(e){const t=m("#chart-box",e),s=t?t.querySelector(".chart-loading-overlay"):null;s&&s.classList.remove("is-visible")}function Ue(e){if(!Q)return;const t=e||_;if(!t||!(t.open>0)){Q.innerHTML="";return}const s=u("type"),a=t.open>0?(t.close-t.open)/t.open*100:0,r=t.close>=t.open?"is-up":"is-down";Q.innerHTML=`<span>O <b>${w(t.open,s)}</b></span><span>H <b>${w(t.high,s)}</b></span><span>L <b>${w(t.low,s)}</b></span><span>C <b class="${r}">${w(t.close,s)}</b></span><span class="${r}">${a>=0?"+":""}${a.toFixed(2)}%</span>`}function as(e){if(["candles","line","area"].includes(e)){ve=e;try{localStorage.setItem("vp_chart_type",e)}catch{}P&&P.applyOptions({visible:e==="candles"}),H&&H.applyOptions({visible:e==="line"}),V&&V.applyOptions({visible:e==="area"}),Ke()}}function rs(e){if(e in Y){Y[e]=!Y[e];try{localStorage.setItem("vp_chart_ind",JSON.stringify(Y))}catch{}Ge({preserveRange:!0}),Ke()}}function Ke(){const e=v&&Q?Q.parentElement?.querySelector(".chart-toolbar"):null;e&&(e.querySelectorAll("[data-chart-type]").forEach(t=>t.classList.toggle("active",t.dataset.chartType===ve)),e.querySelectorAll("[data-chart-ind]").forEach(t=>t.classList.toggle("active",!!Y[t.dataset.chartInd])))}function ns(e){const t=m("#chart-box",e);if(!t)return;const s=!t.classList.contains("chart-fullscreen");t.classList.toggle("chart-fullscreen",s),document.body.classList.toggle("chart-fullscreen-open",s),setTimeout(()=>{v&&t&&v.applyOptions({width:Math.max(320,t.clientWidth),height:Math.max(260,t.clientHeight)})},60)}async function ls(e){if(!v||B.loading||B.done||!L.length||L.length<50||Date.now()<B.nextAt)return;const s=we();if(W===s){B.loading=!0;try{const a=u("symbol"),r=u("type"),n=u("tf"),i=L[0].time,o=await N(`/trade/candles.php?symbol=${encodeURIComponent(a)}&type=${encodeURIComponent(r)}&tf=${encodeURIComponent(n)}&limit=500&end=${i-1}`,{timeout:12e3,retry:0,cacheTtl:0});if(W!==s||we()!==s)return;const d=_t(o?.items||[]).filter(c=>c.time<i);if(!d.length){B.done=!0;return}L=$t(d,L),Ge({preserveRange:!0}),d.length<20&&(B.done=!0)}catch{}finally{B.loading=!1,B.nextAt=Date.now()+1500}}}const is={candles:'<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M4.5 1h1v2H7v8H5.5v3h-1v-3H3V3h1.5V1zM4 4v6h2V4H4zm6.5-1h1v3H13v5h-1.5v4h-1v-4H9V6h1.5V3zM10 7v3h2V7h-2z"/></svg>',line:'<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12l4-5 3 3 6-7"/></svg>',area:'<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M1 13l4-6 3 3 6-7v10H1z" opacity="0.5"/><path d="M1 12l4-5 3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>'};function os(e){const t=document.createElement("div");return t.className="chart-toolbar",t.innerHTML=["candles","line","area"].map(s=>`<button type="button" data-chart-type="${s}" title="${s}">${is[s]}</button>`).join("")+'<span class="chart-toolbar-sep"></span><button type="button" data-chart-ind="ma" title="MA 7/25">MA</button><button type="button" data-chart-ind="ema" title="EMA 20">EMA</button><button type="button" data-chart-ind="boll" title="Bollinger Bands">BOLL</button><span class="chart-toolbar-sep"></span><button type="button" data-chart-fullscreen="1" title="Fullscreen">⛶</button>',t.addEventListener("click",s=>{const a=s.target.closest("button");a&&(a.dataset.chartType?as(a.dataset.chartType):a.dataset.chartInd?rs(a.dataset.chartInd):a.dataset.chartFullscreen&&ns(e))}),t}async function cs(e,t,s=x){if(!k(s))return;const a=m("#chart-box",e);if(!a)return;const{createChart:r}=await ee();k(s)&&(a.innerHTML="",v=r(a,{layout:{background:{color:"#060A14"},textColor:"#8ba1cf",fontSize:11,fontFamily:"'Inter', system-ui, sans-serif"},grid:{vertLines:{color:"rgba(129,160,220,0.04)"},horzLines:{color:"rgba(129,160,220,0.04)"}},crosshair:{mode:0,vertLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"},horzLine:{color:"rgba(93,124,255,0.3)",labelBackgroundColor:"#5d7cff"}},timeScale:{timeVisible:!0,secondsVisible:!1,borderColor:"rgba(129,160,220,0.08)",rightOffset:4,barSpacing:6},rightPriceScale:{borderColor:"rgba(129,160,220,0.08)",scaleMargins:{top:.1,bottom:.2}},watermark:{visible:!0,text:"MEX Group",color:"rgba(93,124,255,0.08)",fontSize:48,horzAlign:"center",vertAlign:"center"},width:Math.max(320,a.clientWidth),height:Math.max(260,a.clientHeight),handleScroll:{vertTouchDrag:!1},handleScale:{axisPressedMouseMove:!0}}),P=v.addCandlestickSeries({upColor:"#00c087",downColor:"#f6465d",borderUpColor:"#00c087",borderDownColor:"#f6465d",wickUpColor:"#00c087",wickDownColor:"#f6465d",wickVisible:!0,borderVisible:!0,visible:ve==="candles"}),H=v.addLineSeries({color:"#5d7cff",lineWidth:2,priceLineVisible:!1,crosshairMarkerVisible:!0,visible:ve==="line"}),V=v.addAreaSeries({lineColor:"#5d7cff",lineWidth:2,topColor:"rgba(93,124,255,0.30)",bottomColor:"rgba(93,124,255,0.02)",priceLineVisible:!1,crosshairMarkerVisible:!0,visible:ve==="area"}),Z=v.addHistogramSeries({priceFormat:{type:"volume"},priceScaleId:"vol",color:"rgba(93,124,255,0.3)"}),v.priceScale("vol").applyOptions({scaleMargins:{top:.84,bottom:0}}),ie=v.addLineSeries({color:"rgba(255,193,7,0.55)",lineWidth:1,priceLineVisible:!1,lastValueVisible:!1,crosshairMarkerVisible:!1}),oe=v.addLineSeries({color:"rgba(93,124,255,0.55)",lineWidth:1,priceLineVisible:!1,lastValueVisible:!1,crosshairMarkerVisible:!1}),ce=v.addLineSeries({color:"rgba(0,229,255,0.55)",lineWidth:1,priceLineVisible:!1,lastValueVisible:!1,crosshairMarkerVisible:!1}),de=v.addLineSeries({color:"rgba(186,104,200,0.45)",lineWidth:1,priceLineVisible:!1,lastValueVisible:!1,crosshairMarkerVisible:!1}),ue=v.addLineSeries({color:"rgba(186,104,200,0.30)",lineWidth:1,lineStyle:2,priceLineVisible:!1,lastValueVisible:!1,crosshairMarkerVisible:!1}),pe=v.addLineSeries({color:"rgba(186,104,200,0.45)",lineWidth:1,priceLineVisible:!1,lastValueVisible:!1,crosshairMarkerVisible:!1}),Q=document.createElement("div"),Q.className="chart-legend",a.appendChild(Q),a.appendChild(os(e)),Ke(),v.subscribeCrosshairMove(n=>{if(!n||!n.time){Ue(null);return}let i=null;try{const o=n.seriesData&&n.seriesData.get(P);o&&o.open!==void 0&&(i=o)}catch{}i||(i=L.find(o=>o.time===n.time)||null),Ue(i)}),v.timeScale().subscribeVisibleLogicalRangeChange(n=>{!n||n.from>12||ls().catch(()=>{})}),wt(t,{fit:!0}),Me(e),xe=new ResizeObserver(()=>{!v||!a||v.applyOptions({width:Math.max(320,a.clientWidth),height:Math.max(260,a.clientHeight)})}),xe.observe(a))}function Ct(e,t,s){try{const a=new URLSearchParams({symbol:e,type:t,tf:s}).toString();history.replaceState(null,"",`#/trade?${a}`)}catch{}}function at(e,t){const s=String(t||"").toUpperCase();U(".symbol-row",e).forEach(a=>{a.classList.toggle("active",String(a.dataset.sym||"").toUpperCase()===s)})}function ds(e,t){U("[data-tf]",e).forEach(s=>{const a=s.dataset.tf===t;s.classList.toggle("bg-accent/20",a),s.classList.toggle("text-accent",a),s.classList.toggle("text-muted",!a)})}function us(e,t,s){const a=String(t||"").toUpperCase(),r=String(s||"").toUpperCase(),n=m("#sym-logo-slot",e);n&&(n.innerHTML=Se(a,s,"w-7 h-7 rounded-md shrink-0"));const i=m("#sym-name",e);i&&(i.textContent=a);const o=m("#ticket-instrument",e);o&&(o.textContent=`${a} - ${r}`);const d=m("#mobile-order-logo-slot",e);d&&(d.innerHTML=Se(a,s,"w-8 h-8 rounded-lg shrink-0"));const c=m("#mobile-order-symbol",e);c&&(c.textContent=a)}function ps(e,t,s){const a=String(t||"").toUpperCase();if(!a)return;const r=A(u("type")),n=s||u("type"),i=A(n),o=i!==r,d=u("tf");De(),Oe(),St(e),se=0,M("symbol",a),M("type",n),M("activeQuote",null);const c=x;Ne={container:e,symbol:a,type:n,runId:c},Ct(a,n,d),us(e,a,n),at(e,a),K(e),Xe(e,e.__marketItems||[],c);const p=ee();ze(e,a,n,c),Le(e,a,n,d,c,p),We(e,a,n,d,c,p),o?Ie(i,c,!0).then(b=>{k(c,a,n)&&b&&b.items&&(e.__marketItems=b.items,me(e,b.items),at(e,a),Pe(e,b.items,c,i).catch(()=>{}),$e(e,b.items,c,i))}).catch(()=>{}):Array.isArray(e.__marketItems)&&e.__marketItems.length&&$e(e,e.__marketItems,c,i)}function ms(e,t){if(!t)return;M("tf",t),ds(e,t);const s=x,a=u("symbol"),r=u("type");Ct(a,r,t),Oe(),St(e);const n=ee();Le(e,a,r,t,s,n),We(e,a,r,t,s,n)}function fs(e){m("#mob-mkt-btn",e)?.addEventListener("click",()=>ws(e)),m("#close-mob-drawer",e)?.addEventListener("click",()=>it(e)),E(e,"[data-sym]","click",(t,s)=>{it(e),localStorage.setItem("vp_symbol",s.dataset.sym),localStorage.setItem("vp_type",s.dataset.stype||u("type")),ps(e,s.dataset.sym,s.dataset.stype||u("type"))}),E(e,"[data-tf]","click",(t,s)=>{localStorage.setItem("vp_tf",s.dataset.tf),ms(e,s.dataset.tf)}),E(e,"[data-type-tab]","click",async(t,s)=>{const a=A(s.dataset.typeTab||u("type")||"crypto");e.__marketDrawerType=a;const r=await Ie(a,x,!0).catch(()=>null);r?.items&&(e.__marketItems=r.items,me(e,r.items),Pe(e,r.items,x,a),$e(e,r.items,x,a)),U("[data-type-tab]",e).forEach(n=>{const i=n===s;n.classList.toggle("bg-accent/20",i),n.classList.toggle("text-accent",i),n.classList.toggle("border-accent/40",i)})}),E(e,"[data-open-order]","click",(t,s)=>Ss(e,s.dataset.openOrder)),E(e,"[data-close-order-sheet]","click",()=>Tt(e)),E(e,"[data-submit-order]","click",(t,s)=>nt(s.dataset.submitOrder,e,m("#mobile-order-sheet [data-order-form]",e))),E(e,"[data-side]","click",(t,s)=>{const a=s.closest("#mobile-order-sheet"),r=s.closest("[data-order-form]");if(a){Et(e,s.dataset.side);return}nt(s.dataset.side,e,r)}),E(e,"[data-order-type]","change",(t,s)=>M("orderType",s.value)),E(e,"[data-market-type]","change",(t,s)=>{M("market",s.value),localStorage.setItem("vp_market",s.value),U("[data-order-form]",e).forEach(a=>{const r=m("#leverage-row",a);if(!r)return;const n=s.value==="perp",i=Number(u("leverage")||10);n?r.outerHTML=`<label class="block order-leverage-row" id="leverage-row">
          <span class="text-[10px] text-muted">Leverage: <strong data-lev-val id="leverage-label">${i}x</strong></span>
          <input type="range" min="1" max="100" value="${i}" class="w-full mt-1 accent-accent" data-leverage />
        </label>`:r.outerHTML=`<div class="order-spot-note" id="leverage-row">
          <span class="text-[10px] text-muted">Spot order — no leverage</span>
        </div>`}),K(e)}),E(e,"[data-leverage]","input",(t,s)=>{M("leverage",Number(s.value)),je(e,"leverage",s.value),K(e);const a=Number(s.value),r=Number(s.max)||100,n=a/r,i=n<.3?"#00c087":n<.6?"#fcd535":"#f6465d";s.style.accentColor=i;const o=e.querySelector("#leverage-label");o&&(o.textContent=a+"x",o.style.color=i)}),E(e,"[data-amount]","input",(t,s)=>{M("amount",Number(s.value)),je(e,"amount",s.value),K(e)}),E(e,"[data-close]","click",async(t,s)=>{await hs(e,s)}),E(e,"[data-cancel-order]","click",async(t,s)=>{await gs(e,s)}),E(e,"[data-edit-order]","click",(t,s)=>{xs(e,s.dataset.editOrder)}),E(e,"[data-toggle-activity-expand]","click",()=>bs(e)),E(e,"[data-retry-chart]","click",()=>{Le(e,u("symbol"),u("type"),u("tf"),x,ee())}),E(e,"[data-activity-tab]","click",(t,s)=>{e.__tradeActivityTab=s.dataset.activityTab||"positions",yt(e)}),E(e,"[data-quick-amount]","click",(t,s)=>{const a=Number(s.dataset.quickAmount||0);a>0&&(M("amount",a),je(e,"amount",a),K(e))}),m("#sym-search",e)?.addEventListener("input",t=>{const s=t.target.value.toLowerCase();U(".symbol-row",e).forEach(a=>{a.style.display=a.dataset.sym.toLowerCase().includes(s)?"":"none"})})}function Oe(){Ee&&(clearInterval(Ee),Ee=null)}function We(e,t,s,a,r=x,n=ee()){Oe();const o=A(s||"crypto")==="crypto"?12e3:18e3;Ee=setInterval(()=>{k(r,t,s)&&Le(e,t,s,a,r,n,{silent:!0,refresh:!0}).catch(()=>null)},o)}async function Le(e,t,s,a,r=x,n=ee(),i={}){const o=m("#chart-box",e),d=!!(v&&P),c=`${String(t||"").toUpperCase()}|${a}`;o&&!i.silent&&!d?o.innerHTML='<div class="absolute inset-0 flex items-center justify-center"><div class="text-center"><div class="loading-spinner mx-auto"></div><p class="text-[10px] text-muted mt-2">Loading chart...</p></div></div>':d&&!i.silent&&kt(e);try{const p=i.refresh?"&refresh=1":"",b=`/trade/candles.php?symbol=${encodeURIComponent(t)}&type=${encodeURIComponent(s)}&tf=${encodeURIComponent(a)}&limit=500&fast=1${p}`,y=await N(b,{timeout:i.silent?1e4:14e3,retry:1,cacheTtl:0,cache:"no-store"});if(await n,!k(r,t,s)||c!==we())return;y?.items?.length?v&&P?(wt(y.items,{fit:!i.silent&&!i.refresh,key:c}),Me(e)):await cs(e,y.items,r):!d&&!i.silent?rt(e,"Chart data is still loading from the market provider."):d&&!i.silent&&Me(e)}catch(p){if(!k(r,t,s))return;console.error("Chart:",p),!d&&!i.silent?rt(e,"Chart stream is delayed. Live price and order ticket remain active."):d&&!i.silent&&Me(e)}}function rt(e,t){const s=m("#chart-box",e);s&&(s.innerHTML=`<div class="chart-fallback-state">
    <div class="chart-fallback-card">
      <strong>Chart loading</strong>
      <span>${h(t||"Chart provider is delayed.")}</span>
      <button class="btn-ghost btn-sm" data-retry-chart>Retry chart</button>
    </div>
  </div>`)}function bs(e){const t=m("#positions-section",e);if(!t)return;const s=!t.classList.contains("is-expanded");t.classList.toggle("is-expanded",s),document.body.classList.toggle("trade-activity-expanded-open",s);const a=m("[data-toggle-activity-expand]",e);a&&(a.setAttribute("aria-label",s?l("trade.close_activity","Close trading activity"):l("trade.expand_activity","Expand trading activity")),a.setAttribute("title",s?l("trade.close_activity","Close trading activity"):l("trade.expand_activity","Expand trading activity")),a.innerHTML=s?z.close:z.fullscreen||z.expand||"⛶"),v&&!s&&setTimeout(()=>v.timeScale?.().fitContent?.(),80)}async function hs(e,t){const s=String(t?.dataset?.close||"");if(!s||Be.has(s)||!await _s())return;Be.add(s);const r=U(`[data-close="${Lt(s)}"]`,e);r.forEach(n=>{n.disabled=!0,n.classList.add("opacity-60"),n.dataset.prevText=n.textContent,n.textContent=l("trade.closing","Closing...")});try{const n=await N("/trade/close_position.php",{method:"POST",body:{id:s,position_id:s,mode:u("mode")},timeout:14e3});if(n&&n.ok===!1)throw new Error(n.error||l("trade.close_failed","Close failed"));qe("/trade/portfolio.php","/trade/orders.php"),await Promise.allSettled([G(e,x,!1,!0),N("/wallet/summary.php",{timeout:0,retry:1,cacheTtl:0}).then(i=>{(i?.real||i?.demo)&&M("wallet",{real:i.real||{},demo:i.demo||{}})}).catch(()=>null)]),be(l("trade.position_closed_success","Position closed successfully"),"success")}catch(n){be(n.message||l("trade.could_not_close","Could not close this position now."),"error"),r.forEach(i=>{i.disabled=!1,i.classList.remove("opacity-60"),i.textContent=i.dataset.prevText||l("common.close","Close")})}finally{Be.delete(s)}}function ys(e,t){const s=String(t||"");return(e.__tradeOrders||[]).find(a=>Qe(a)===s)||null}async function gs(e,t){const s=String(t?.dataset?.cancelOrder||"");if(!s||!await vs())return;const r=U(`[data-cancel-order="${Lt(s)}"]`,e);r.forEach(n=>{n.disabled=!0,n.classList.add("opacity-60"),n.dataset.prevText=n.textContent,n.textContent=l("trade.canceling","Canceling...")});try{const n=await N("/trade/cancel.php",{method:"POST",body:{order_id:s,id:s,mode:u("mode")},timeout:1e4});if(n&&n.ok===!1)throw new Error(n.error||l("trade.cancel_failed","Cancel failed"));qe("/trade/portfolio.php","/trade/orders.php"),await G(e,x,!1,!0),be(l("trade.pending_order_canceled","Pending order canceled"),"success")}catch(n){be(n.message||l("trade.could_not_cancel_order","Could not cancel this order."),"error"),r.forEach(i=>{i.disabled=!1,i.classList.remove("opacity-60"),i.textContent=i.dataset.prevText||l("common.cancel","Cancel")})}}function vs(e){return new Promise(t=>{const s=document.getElementById("cancel-order-modal");s&&s.remove();const a=document.createElement("div");a.id="cancel-order-modal",a.className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center",a.innerHTML=`<div class="absolute inset-0 bg-black/70" data-cancel-order-backdrop></div>
      <div class="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
        <div class="px-5 py-4 border-b border-line">
          <h3 class="text-base font-black">${l("trade.cancel_pending_order","Cancel pending order")}</h3>
          <p class="mt-1 text-xs text-muted">${l("trade.cancel_pending_order_copy","This only cancels orders that have not executed yet. Open positions must be closed from the position card.")}</p>
        </div>
        <div class="grid grid-cols-2 gap-3 px-5 py-4">
          <button class="btn-ghost" data-cancel-order-no>${l("trade.keep_order","Keep order")}</button>
          <button class="btn-danger" data-cancel-order-yes>${l("trade.cancel_order","Cancel order")}</button>
        </div>
      </div>`,document.body.appendChild(a);const r=n=>{a.remove(),t(n)};a.querySelector("[data-cancel-order-backdrop]").addEventListener("click",()=>r(!1)),a.querySelector("[data-cancel-order-no]").addEventListener("click",()=>r(!1)),a.querySelector("[data-cancel-order-yes]").addEventListener("click",()=>r(!0))})}function xs(e,t){const s=ys(e,t);if(!s||!Ye(s)){be(l("trade.order_no_longer_pending","This order is no longer pending."),"error"),G(e,x,!0);return}const a=Ce(s),r=document.getElementById("edit-order-modal");r&&r.remove();const n=document.createElement("div");n.id="edit-order-modal",n.className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center",n.innerHTML=`<div class="absolute inset-0 bg-black/70" data-edit-order-backdrop></div>
    <div class="relative w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
      <div class="px-5 py-4 border-b border-line">
        <h3 class="text-base font-black">${l("trade.edit_pending_order","Edit pending order")}</h3>
        <p class="mt-1 text-xs text-muted">${h(fe(s))} ${h(xt(ke(s)))} - ${l("trade.edit_pending_copy","changes apply before execution only.")}</p>
      </div>
      <form class="grid gap-3 px-5 py-4" data-edit-order-form>
        <label class="grid gap-1">
            <span class="text-[10px] uppercase font-black text-muted">${l("trade.entry_price","Entry price")}</span>
          <input class="input" name="entry" inputmode="decimal" value="${C(Number(s.limit_price||s.entry_price||0)||"")}" placeholder="${C(w(s.limit_price||s.entry_price||0,a))}">
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="grid gap-1">
            <span class="text-[10px] uppercase font-black text-muted">${l("trade.take_profit","Take profit")}</span>
            <input class="input" name="tp" inputmode="decimal" value="${C(Number(s.tp_price||0)||"")}" placeholder="${C(l("funding.optional","Optional"))}">
          </label>
          <label class="grid gap-1">
            <span class="text-[10px] uppercase font-black text-muted">${l("trade.stop_loss","Stop loss")}</span>
            <input class="input" name="sl" inputmode="decimal" value="${C(Number(s.sl_price||0)||"")}" placeholder="${C(l("funding.optional","Optional"))}">
          </label>
        </div>
        <p class="order-form-status is-info" data-edit-order-status hidden></p>
        <div class="grid grid-cols-2 gap-3 pt-1">
          <button type="button" class="btn-ghost" data-edit-order-close>${l("common.cancel","Cancel")}</button>
          <button type="submit" class="btn-primary" data-edit-order-save>${l("common.save_changes","Save changes")}</button>
        </div>
      </form>
    </div>`,document.body.appendChild(n);const i=()=>n.remove();n.querySelector("[data-edit-order-backdrop]").addEventListener("click",i),n.querySelector("[data-edit-order-close]").addEventListener("click",i),n.querySelector("[data-edit-order-form]").addEventListener("submit",async o=>{o.preventDefault();const d=o.currentTarget,c=m("[data-edit-order-status]",d),p=m("[data-edit-order-save]",d),b=Number(d.entry.value||0),y=d.tp.value===""?null:Number(d.tp.value||0),S=d.sl.value===""?null:Number(d.sl.value||0);if(!(b>0)){c&&(c.textContent=l("trade.entry_price_required","Entry price is required."),c.hidden=!1,c.className="order-form-status is-warning");return}try{p&&(p.disabled=!0,p.textContent=l("common.saving","Saving...")),c&&(c.textContent=l("trade.saving_order_changes","Saving order changes..."),c.hidden=!1,c.className="order-form-status is-info");const f=await N("/trade/update_order.php",{method:"POST",body:{order_id:t,limit_price:b,tp_price:y,sl_price:S,mode:u("mode")},timeout:1e4});if(f&&f.ok===!1)throw new Error(f.error||l("trade.update_failed","Update failed"));i(),await G(e,x),be(l("trade.pending_order_updated","Pending order updated"),"success")}catch(f){c&&(c.textContent=f.message||l("trade.could_not_update_order","Could not update this order."),c.hidden=!1,c.className="order-form-status is-error"),p&&(p.disabled=!1,p.textContent=l("common.save_changes","Save changes"))}})}function Lt(e){return window.CSS&&typeof window.CSS.escape=="function"?window.CSS.escape(String(e)):String(e).replace(/\\/g,"\\\\").replace(/"/g,'\\"')}function _s(e){return new Promise(t=>{const s=document.getElementById("close-position-modal");s&&s.remove();const a=document.createElement("div");a.id="close-position-modal",a.className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center",a.innerHTML=`<div class="absolute inset-0 bg-black/70" data-close-modal-backdrop></div>
      <div class="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
        <div class="px-5 py-4 border-b border-line">
          <h3 class="text-base font-black">${l("trade.close_position","Close position")}</h3>
          <p class="mt-1 text-xs text-muted">${l("trade.close_position_copy","The position will be closed at the current market price.")}</p>
        </div>
        <div class="grid grid-cols-2 gap-3 px-5 py-4">
          <button class="btn-ghost" data-close-cancel>${l("common.cancel","Cancel")}</button>
          <button class="btn-danger" data-close-confirm>${l("trade.close_now","Close now")}</button>
        </div>
      </div>`,document.body.appendChild(a);const r=n=>{a.remove(),t(n)};a.querySelector("[data-close-modal-backdrop]").addEventListener("click",()=>r(!1)),a.querySelector("[data-close-cancel]").addEventListener("click",()=>r(!1)),a.querySelector("[data-close-confirm]").addEventListener("click",()=>r(!0))})}function be(e,t="success"){let s=document.getElementById("trade-toast");s||(s=document.createElement("div"),s.id="trade-toast",s.className="trade-toast",document.body.appendChild(s)),s.textContent=e,s.className=`trade-toast is-${t}`,clearTimeout(s.__timer),s.__timer=setTimeout(()=>s.classList.remove("is-success","is-error"),2500)}async function nt(e,t,s){const a=s||m("[data-order-form]",t)||t;R(a,"","info");const r=u("activeQuote")||{},n=Number(r.price||0);if(!n){R(a,"No live price available yet. Please wait for the quote to load.","warning");return}if(!Ns(r)){R(a,"This quote is not fresh enough for execution yet. Please wait for a live or delayed market quote.","warning");return}const i=Number(m("[data-amount]",a)?.value||u("amount")||0),o=(m("[data-market-type]",a)?.value||u("market")||"spot")==="perp"?Number(m("[data-leverage]",a)?.value||u("leverage")||1):1,d=Number(m("[data-tp]",a)?.value||0),c=Number(m("[data-sl]",a)?.value||0),p=m("[data-market-type]",a)?.value||u("market")||"spot",b=m("[data-order-type]",a)?.value||u("orderType")||"MARKET",y=Number(m("[data-limit-price]",a)?.value||0);if(i<=0){R(a,"Enter a valid amount first.","warning");return}if(e==="BUY"&&c>0&&c>=n){R(a,"For BUY orders, Stop Loss should be below the current price.","warning");return}if(e==="SELL"&&c>0&&c<=n){R(a,"For SELL orders, Stop Loss should be above the current price.","warning");return}if(await $s({side:e,symbol:u("symbol"),type:u("type"),amount:i,leverage:o,tp:d,sl:c,marketType:p,orderType:b,currentPrice:n,limitInput:y,mode:u("mode")}))try{lt(a,!0),R(a,e==="BUY"?l("trade.order.sending_buy","Sending buy order..."):l("trade.order.sending_sell","Sending sell order..."),"info");const f=await N("/trade/place_order.php",{method:"POST",body:{symbol:u("symbol"),asset_type:u("type"),market_type:p,side:e,order_type:b,usd:i,leverage:o,tp:d||void 0,sl:c||void 0,price:b==="LIMIT"&&y||n,mode:u("mode")},timeout:15e3,retry:1});if(f&&f.ok===!1){R(a,f.error||"Order failed","error");return}R(a,`${e==="BUY"?l("trade.buy","شراء"):l("trade.sell","بيع")} — ${l("trade.order_success","تم فتح الصفقة بنجاح")}`,"success"),qe("/trade/portfolio.php","/trade/orders.php"),await G(t,x,!1,!0),N("/wallet/summary.php",{timeout:0,retry:1,cacheTtl:0}).then($=>{($?.real||$?.demo)&&M("wallet",{real:$.real||{},demo:$.demo||{}})}).catch(()=>null),setTimeout(()=>{a.closest?.("#mobile-order-sheet")?Tt(t):R(a,"","info")},900)}catch(f){console.error("Order failed:",f);const $=f?.code==="aborted"||f?.name==="AbortError"||f?.name==="RequestAbortError"||String(f?.message||"").toLowerCase().includes("aborted")||String(f?.message||"").toLowerCase().includes("cancelled"),T=f?.code==="timeout"?"Request timed out — please wait for the live price to refresh and try again.":$?"Order was interrupted. Check Open Positions — if the trade is not listed, place the order again.":f.message||"Order failed. Please try again.";R(a,T,"error")}finally{lt(a,!1)}}function $s({side:e,symbol:t,type:s,amount:a,leverage:r,tp:n,sl:i,marketType:o,orderType:d,currentPrice:c,limitInput:p,mode:b}){return new Promise(y=>{const S=document.getElementById("order-confirm-modal");S&&S.remove();const f=e==="BUY",$=d==="LIMIT"&&p||c,T=a*r,g=n>0?Math.abs(n-$)*(T/$):null,J=i>0?Math.abs(i-$)*(T/$):null,D=document.createElement("div");D.id="order-confirm-modal",D.className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center",D.innerHTML=`
      <div class="absolute inset-0 bg-black/70" id="confirm-backdrop"></div>
      <div class="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden">
        <div class="px-5 py-4 border-b border-line text-center">
          <h3 class="text-lg font-bold ${f?"text-green-400":"text-red-400"}">${f?l("trade.buy","شراء"):l("trade.sell","بيع")} — ${l("trade.order","الأمر")}</h3>
          <p class="text-xs text-muted mt-1">${l("trade.review_confirm","راجع وأكد الأمر")}</p>
        </div>
        <div class="px-5 py-4 space-y-3">
          <div class="flex justify-between text-sm"><span class="text-muted">${l("Symbol")}</span><strong>${h(t)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${l("Type")}</span><strong>${h(d)} / ${h(o)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${l("Side")}</span><strong class="${f?"text-green-400":"text-red-400"}">${l(e)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${l("Amount")}</span><strong>$${a.toFixed(2)}</strong></div>
          ${o==="perp"?`<div class="flex justify-between text-sm"><span class="text-muted">${l("Leverage")}</span><strong>${r}x</strong></div>`:""}
          <div class="flex justify-between text-sm"><span class="text-muted">${l("Notional")}</span><strong>$${T.toFixed(2)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${l("Price")}</span><strong class="font-mono">${parseFloat($).toFixed(s==="crypto"?2:4)}</strong></div>
          ${n>0?`<div class="flex justify-between text-sm"><span class="text-muted">${l("Take Profit")}</span><strong class="font-mono text-green-400">${parseFloat(n).toFixed(s==="crypto"?2:4)}</strong></div>`:""}
          ${i>0?`<div class="flex justify-between text-sm"><span class="text-muted">${l("Stop Loss")}</span><strong class="font-mono text-red-400">${parseFloat(i).toFixed(s==="crypto"?2:4)}</strong></div>`:""}
          ${g!==null?`<div class="flex justify-between text-sm"><span class="text-muted">${l("Est. Profit")}</span><strong class="text-green-400">$${g.toFixed(2)}</strong></div>`:""}
          ${J!==null?`<div class="flex justify-between text-sm"><span class="text-muted">${l("Est. Loss")}</span><strong class="text-red-400">$${J.toFixed(2)}</strong></div>`:""}
          <div class="flex justify-between text-sm"><span class="text-muted">${l("Mode")}</span><strong>${b==="real"?l("Real"):l("Demo")}</strong></div>
        </div>
        <div class="grid grid-cols-2 gap-3 px-5 py-4 border-t border-line">
          <button class="btn-ghost py-2.5" id="confirm-cancel">${l("Cancel")}</button>
          <button class="${f?"btn-buy":"btn-sell"} py-2.5 text-white font-bold" id="confirm-execute">${l("Confirm")} ${l(e)}</button>
        </div>
      </div>`,document.body.appendChild(D),document.body.style.overflow="hidden";const te=Ze=>{D.remove(),document.body.style.overflow="",y(Ze)};D.querySelector("#confirm-backdrop").addEventListener("click",()=>te(!1)),D.querySelector("#confirm-cancel").addEventListener("click",()=>te(!1)),D.querySelector("#confirm-execute").addEventListener("click",()=>te(!0)),D.querySelector("#confirm-execute").focus()})}function R(e,t,s="info"){const a=m("[data-order-status]",e);a&&(a.textContent=t||"",a.hidden=!t,a.className=`order-form-status is-${s}`)}function lt(e,t){const s=[e,e.closest?.("#mobile-order-sheet")].filter(Boolean);new Set(s.flatMap(r=>U("[data-side], [data-submit-order]",r))).forEach(r=>{r.disabled=!!t,r.classList.toggle("opacity-60",!!t)}),e.classList.toggle("is-submitting",!!t)}function ws(e){const t=m("#market-drawer",e);if(!t)return;t.classList.add("mobile-market-open"),t.classList.remove("hidden"),document.body.classList.add("trade-modal-open");const s=m("#symbol-list",e);if(s&&!s.querySelector(".symbol-row")&&!e.__marketDrawerLoading){e.__marketDrawerLoading=!0;const a=A(e.__marketDrawerType||u("type")||"crypto");e.__marketDrawerType=a,Ie(a,x).then(r=>{r?.items&&(e.__marketItems=r.items,me(e,r.items),Xe(e,r.items,x),Pe(e,r.items,x,a))}).catch(()=>{const r=Je(u("type"));e.__marketItems=r,me(e,r)}).finally(()=>{e.__marketDrawerLoading=!1})}}function it(e){const t=m("#market-drawer",e);t&&(t.classList.remove("mobile-market-open"),window.innerWidth<1024&&t.classList.add("hidden"),document.body.classList.remove("trade-modal-open"))}function Ss(e,t){const s=m("#mobile-order-sheet",e);s&&(Et(e,t),s.classList.remove("hidden"),document.body.classList.add("trade-modal-open"),K(e))}function Tt(e){const t=m("#mobile-order-sheet",e);t&&t.classList.add("hidden"),document.body.classList.remove("trade-modal-open")}function Et(e,t){const s=m("#mobile-submit-order",e),a=m("#mobile-order-side-label",e);s&&(s.dataset.submitOrder=t,s.textContent=t==="BUY"?l("trade.order.buy_now","شراء الآن"):l("trade.order.sell_now","بيع الآن"),s.className=`${t==="BUY"?"btn-buy":"btn-sell"} w-full py-3`),a&&(a.textContent=t==="BUY"?l("trade.order.buy_order","BUY order"):l("trade.order.sell_order","SELL order"))}function je(e,t,s){U(`[data-${t}]`,e).forEach(a=>{String(a.value)!==String(s)&&(a.value=s)})}function ks(e,t=x,s=0,a=u("type")){if(!k(t)||!P||!_||!(e>0)||!W||W!==we())return;const r=Cs(s,a);if(r<=_.time?(_.close=e,_.high=Math.max(_.high,e),_.low=Math.min(_.low,e)):_={time:r,open:_.close,high:Math.max(_.close,e),low:Math.min(_.close,e),close:e,volume:0},P.update({time:_.time,open:_.open,high:_.high,low:_.low,close:_.close}),H&&H.update({time:_.time,value:_.close}),V&&V.update({time:_.time,value:_.close}),L.length){const n=L[L.length-1];n.time===_.time?L[L.length-1]={..._}:_.time>n.time&&L.push({..._})}}function Cs(e=0,t=u("type")){const s=Ls(u("tf")),a=A(t),r=Number(e||0),n=r>0&&a!=="crypto"?Math.floor(r):Math.floor(Date.now()/1e3);return Math.floor(n/s)*s}function Ls(e){return{"1m":60,"3m":180,"5m":300,"15m":900,"30m":1800,"1h":3600,"2h":7200,"4h":14400,"6h":21600,"8h":28800,"12h":43200,"1d":86400,"3d":259200,"1w":604800}[e]||60}function ee(){return Re||(Re=At(()=>import("./chart-uI7-MQXf.js"),__vite__mapDeps([0,1]))),Re}function ot(e,t){const s=[];for(let a=t-1;a<e.length;a++){let r=0;for(let n=0;n<t;n++)r+=e[a-n].close;s.push({time:e[a].time,value:r/t})}return s}function Ts(e,t){if(e.length<t)return[];const s=2/(t+1);let a=0;for(let n=0;n<t;n++)a+=e[n].close;a/=t;const r=[{time:e[t-1].time,value:a}];for(let n=t;n<e.length;n++)a=e[n].close*s+a*(1-s),r.push({time:e[n].time,value:a});return r}function Es(e,t=20,s=2){const a=[],r=[],n=[];for(let i=t-1;i<e.length;i++){let o=0;for(let y=0;y<t;y++)o+=e[i-y].close;const d=o/t;let c=0;for(let y=0;y<t;y++){const S=e[i-y].close-d;c+=S*S}const p=Math.sqrt(c/t),b=e[i].time;r.push({time:b,value:d}),a.push({time:b,value:d+s*p}),n.push({time:b,value:d-s*p})}return{upper:a,mid:r,lower:n}}function Je(e){const t=A(e||"crypto"),s=t==="favorites"?"crypto":t||"crypto";return(tt[s]||tt.crypto).map(([r,n],i)=>({id:99e4+i,symbol:r,name:n,type:s,status:"active",sort_order:i+1,price:0,change_pct:0,source:"client_symbol_fallback",timing_class:"warming"}))}function Ms(e,t){const a=(Array.isArray(e?.items)?e.items:Array.isArray(e?.markets)?e.markets:Array.isArray(e)?e:[]).filter(r=>r&&r.symbol);return a.length?{...e||{},ok:e?.ok!==!1,items:a}:{ok:!0,items:Je(t),fallback:"client_symbol_fallback"}}function As(e){const t=A(e||"crypto"),s=t==="favorites"?"crypto":t,r={crypto:50,forex:30,stocks:20,commodities:20,arab:10,futures:20}[s]||20;return`/markets.php?type=${encodeURIComponent(s)}&scope=trade&supported=1&lite=1&with_quotes=1&no_rescue=1&limit=${r}`}async function Ie(e,t=x,s=!1){const a=A(e||"crypto"),r=a||"crypto",n=et.get(r),i=Date.now();if(!s&&n&&n.expires>i)return n.data;let o=null;try{o=await N(As(a),{timeout:8e3,retry:1,cacheTtl:12e3,cache:"no-store"})}catch{if(n?.data?.items?.length)return n.data;o=null}const d=Ms(o,a);return k(t)&&et.set(r,{data:d,expires:Date.now()+8e3}),d}function Xe(e,t,s=x){const a=String(u("symbol")||"").toUpperCase(),r=(t||[]).find(i=>String(i.symbol||"").toUpperCase()===a);if(!r)return;Number(r.price||r.q_price||0)>0&&ht(e,r,s)}function Us(e){const t=String(e?.timing_class||"").toLowerCase(),s=String(e?.source||"").toLowerCase();return Number(e?.price||0)<=0?"unavailable":t==="seed"||s.includes("seed")?"reference":t==="stale"||e?.is_stale?"stale":t==="market_closed"?"closed":t==="delayed"||s.includes("yahoo")||["stocks","arab"].includes(A(e?.type||u("type")))?"delayed":t==="candle_fallback"?"chart_quote":"live"}function Ns(e){const t=Us(e);return!["reference","stale","unavailable","chart_quote"].includes(t)}function Se(e,t,s){return`<span class="${s} grid place-items-center overflow-hidden border border-line bg-surface">
    <img src="${C(Nt({symbol:e,type:t},t))}" class="h-full w-full object-cover" alt="${C(e)}" loading="lazy" data-fallback="initial" />
    <b class="hidden h-full w-full place-items-center bg-accent/20 text-[9px] font-black">${h(Dt(e))}</b>
  </span>`}export{Rs as cleanup,Is as mount,Os as render};
