import{h,e as c,m as v,b as g,f as x,i as A,p as S,n as U,k as $,l as R}from"./main-BvBtKEZ9.js";import{marketIconPath as j,marketInitial as D}from"./marketIcon-D-Yq8Sis.js";function ie(){const e=h("brand")||{},t=W(),a=h("mode"),n=(h("level")||{}).current||{};return`
    <div class="space-y-6 animate-fade-in">
      <!-- Hero -->
      <section class="card feature-hero relative overflow-hidden">
        <div class="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.95fr)] lg:items-end">
          <div class="space-y-4">
            <div class="flex flex-wrap items-center gap-2">
              <span class="badge-accent">${c(e.name)}</span>
              <span class="status-chip ${a==="real"?"status-chip-live":"status-chip-delayed"}">${a==="real"?"Real workspace":"Demo workspace"}</span>
              ${J(n)}
            </div>
            <div class="space-y-2">
              <h1 class="text-2xl lg:text-4xl font-bold leading-tight">${a==="real"?"Trading desk":"Practice trading desk"}</h1>
              <p class="text-muted text-sm lg:text-base max-w-2xl">${c(e.tagline||"Professional multi-market trading platform")} with curated markets, copy desk signals, level-linked contracts, and internal execution controls.</p>
            </div>
            <div class="feature-hero__stats">
              <div class="hero-stat">
                <span>Account level</span>
                <strong>${c(n.name||n.name_en||n.level_code||"Starter")}</strong>
                <small>Contracts and copy permissions</small>
              </div>
              <div class="hero-stat">
                <span>Execution mode</span>
                <strong>${a==="real"?"Real":"Demo"}</strong>
                <small>${a==="real"?"Internal live review":"Practice flow enabled"}</small>
              </div>
              <div class="hero-stat">
                <span>Market coverage</span>
                <strong>6 desks</strong>
                <small>Crypto, FX, stocks, metals, futures, Arab</small>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <a href="#/trade" class="btn-primary">Open trade</a>
              <a href="#/funding?action=deposit" class="btn-ghost">Deposit</a>
              <a href="#/invest" class="btn-ghost">Copy & contracts</a>
            </div>
          </div>
          <div class="grid gap-3">
            <div class="hero-balance-card">
              <span>${a==="real"?"Live balance":"Practice balance"}</span>
              <strong data-count-to="${t.balance}">${v(t.balance)}</strong>
              <small>${c(t.currency)}</small>
            </div>
            <div class="grid grid-cols-2 gap-3">
              ${_("Available",v(t.available),t.currency)}
              ${_("Holds",v(t.holds||0),"Locked margin")}
              ${_("Workspace",a==="real"?"Live":"Demo",a==="real"?"Review enabled":"Practice")}
              ${_("Markets","Curated","Fast watch")}
            </div>
          </div>
        </div>
      </section>

      <!-- Funding Shortcuts -->
      <section class="card">
        <div class="flex items-center justify-between gap-3 mb-3">
          <div>
            <span class="badge-green mb-1">Funding</span>
            <h2 class="text-base font-semibold">Quick Actions</h2>
          </div>
        </div>
        <div class="grid grid-cols-3 sm:grid-cols-5 gap-3 home-action-grid">
          ${b("Deposit","deposit","#/funding?action=deposit")}
          ${b("Withdraw","withdraw","#/funding?action=withdraw")}
          ${b("KYC","kyc","#/kyc")}
          ${b("Support","support","#/support")}
          ${b("News","news","#/news")}
        </div>
      </section>

      <!-- Copy Trading -->
      <section class="card blur-gate ${a!=="real"?"blur-active":""}">
        <div class="flex items-center justify-between mb-3">
          <div>
            <span class="badge-green mb-1">Copy Desk</span>
            <h2 class="text-base font-semibold">Copy Trading</h2>
          </div>
          <a href="#/invest" class="btn-ghost btn-sm">View all</a>
        </div>
        <div class="blur-gate-content relative" id="home-copy-section">
          ${V(a)}
        </div>
        ${a!=="real"?'<div class="blur-gate-overlay"><span class="badge">Real Account Only — Switch to Real & verify KYC</span></div>':""}
      </section>

      <!-- Featured Markets -->
      <section class="card">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-semibold">Markets</h2>
          <a href="#/trade" class="btn-ghost btn-sm">Trade</a>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" id="home-markets">
          ${Array(4).fill(0).map(()=>'<div class="skeleton h-16 rounded-lg"></div>').join("")}
        </div>
      </section>

      <!-- Positions -->
      <section class="card">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-semibold">Open Positions</h2>
          <a href="#/portfolio" class="btn-ghost btn-sm">Portfolio</a>
        </div>
        <div id="home-positions">
          <p class="text-muted text-sm text-center py-6">Loading positions...</p>
        </div>
      </section>

      <section class="home-support-strip">
        ${N("News room","Desk briefings, catalysts, and curated client headlines.","#/news","badge-accent")}
        ${N("Support desk","Funding review, KYC follow-up, payout status, and account help.","#/support","badge-green")}
      </section>
    </div>`}function oe(e){e.addEventListener("error",t=>{if(t.target.tagName==="IMG"&&t.target.dataset.fallback==="initial"){t.target.style.display="none";const a=t.target.nextElementSibling;a&&(a.style.display="grid")}},!0),e.querySelectorAll("[data-count-to]").forEach(t=>{T(t,0,parseFloat(t.dataset.countTo)||0,900)}),setTimeout(()=>{e.querySelectorAll("#home-markets > *").forEach((t,a)=>{t.classList.add("stagger-item"),t.style.animationDelay=`${a*.05+.1}s`})},50),F(e)}function T(e,t,a,s){const n=performance.now(),o=a%1!==0;function i(d){const l=d-n,p=Math.min(l/s,1),u=1-Math.pow(1-p,3),r=t+(a-t)*u;e.textContent=o?r.toFixed(2):Math.round(r).toLocaleString(),p<1&&requestAnimationFrame(i)}requestAnimationFrame(i)}async function F(e){try{const t=h("mode"),[a,s,n]=await Promise.all([g("/markets.php?scope=home&supported=1&lite=1&with_quotes=1",{timeout:7e3}),g("/trade/portfolio.php",{timeout:7e3}),t==="real"?g("/signals.php?bot=1&home=1&lang=en",{timeout:7e3}).catch(()=>null):Promise.resolve(null)]);if(a&&a.items){const o=a.items.slice(0,12);O(e,o);const i=o.filter(d=>Number(d.price||d.q_price||0)<=0);i.length&&H(e,i)}s&&s.positions&&z(e,s.positions.slice(0,5)),t==="real"&&n&&n.items&&n.items.length&&I(e,n.items)}catch{}}function I(e,t){const a=e.querySelector("#home-copy-section");a&&(a.innerHTML=`<div class="flex gap-3 overflow-x-auto pb-2 snap-x">${t.slice(0,6).map(s=>{const n=(s.direction||"BUY").toUpperCase(),o=s.symbol||s.market_symbol||"--";return`<div class="shrink-0 w-[280px] copy-card snap-start">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2 min-w-0">
          ${M({symbol:o,type:s.type||s.market_type},"market-logo")}
          <div class="min-w-0">
            <strong class="text-xs truncate block">${c(o)}</strong>
            <span class="text-[10px] text-muted truncate block">${c(s.bot_name||s.bot_name_en||s.timeframe||"Copy signal")}</span>
          </div>
        </div>
        <span class="badge-${n==="BUY"?"buy":"sell"}">${n}</span>
      </div>
      <div class="copy-card__quote py-2">
        <span class="status-chip ${Number(s.live_price||0)>0?"status-chip-live":"status-chip-locked"}">${Number(s.live_price||0)>0?"LIVE":"READY"}</span>
        <strong>${Number(s.live_price||0)>0?"$"+v(s.live_price,s.type==="forex"?5:2):"--"}</strong>
        <span class="${Number(s.live_change_pct||0)>=0?"text-buy":"text-sell"}">${S(s.live_change_pct||0)}</span>
      </div>
      <div class="grid grid-cols-3 gap-1 text-[10px] mt-2">
        <div><span class="text-muted">Entry</span><div class="font-mono">${C(s.entry||s.entry_price,s.type)}</div></div>
        <div><span class="text-muted">TP</span><div class="font-mono text-buy">${C(s.tp1||s.take_profit_1||s.take_profit,s.type)}</div></div>
        <div><span class="text-muted">SL</span><div class="font-mono text-sell">${C(s.sl||s.stop_loss,s.type)}</div></div>
      </div>
      ${ee(s)?'<p class="text-[10px] text-muted mt-2">Awaiting desk levels</p>':te(s)}
      <a href="#/invest" class="btn-primary btn-sm w-full mt-3">Open copy desk</a>
    </div>`}).join("")}</div>`)}function O(e,t){const a=e.querySelector("#home-markets");a&&(a.innerHTML=t.map(s=>`
    <button class="home-market-card" data-symbol="${x(s.symbol)}" data-type="${x(s.type||"crypto")}">
      ${M(s,"home-market-icon")}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <div class="font-semibold text-sm truncate">${c(s.symbol)}</div>
          ${X(s)}
        </div>
        <div class="text-[11px] text-muted truncate">${c(s.name||s.symbol)}</div>
        <div class="mini-spark" aria-hidden="true">${Z(s.symbol)}</div>
      </div>
      <div class="text-right">
        <div class="text-sm font-mono font-semibold" data-home-price>${G(s.price||s.q_price,s.type)}</div>
        <div class="text-[11px] ${Number(s.change_pct||s.q_change||0)>=0?"text-green":"text-red"}" data-home-change>${S(s.change_pct||s.q_change||0)}</div>
        <div class="text-[9px] text-muted uppercase mt-1" data-home-source>${k(s)}</div>
      </div>
    </button>
  `).join(""),a.querySelectorAll("[data-symbol]").forEach(s=>{s.addEventListener("click",()=>U("trade",{symbol:s.dataset.symbol,type:s.dataset.type}))}))}async function H(e,t){const a=new Map;t.forEach(n=>{const o=String(n.symbol||"").toUpperCase(),i=n.type||"crypto";o&&(a.has(i)||a.set(i,[]),a.get(i).push(o))});const s=[];await Promise.all([...a.entries()].map(async([n,o])=>{const i=await g(`/quotes.php?symbols=${encodeURIComponent(o.join(","))}&type=${encodeURIComponent(n)}&visible=1&purpose=watchlist`,{timeout:6500}).catch(()=>null),d=new Set;i?.items?.length&&i.items.forEach(l=>{d.add(String(l.symbol||"").toUpperCase()),L(e,l,n)}),o.forEach(l=>{const p=q(e,l),u=p&&p.querySelector("[data-home-price]")?.textContent!=="--";(!d.has(l)||!u)&&s.push({symbol:l,type:n})})})),Y(e,s)}async function Y(e,t){const a=new Map;t.forEach(s=>{!s.symbol||!s.type||(a.has(s.type)||a.set(s.type,[]),a.get(s.type).push(s.symbol))});for(const[s,n]of a.entries()){const o=s==="crypto"?12:2,i=s==="crypto"?12:4,d=[...new Set(n)].slice(0,i),l=[];for(let r=0;r<d.length;r+=o){const w=d.slice(r,r+o),y=await g(`/quotes.php?symbols=${encodeURIComponent(w.join(","))}&type=${encodeURIComponent(s)}&cache_only=1&purpose=watchlist`,{timeout:3500}).catch(()=>null);y?.items?.length&&y.items.forEach(f=>L(e,f,s)),w.forEach(f=>{const E=q(e,f);E&&E.querySelector("[data-home-price]")?.textContent!=="--"||l.push(f)})}const p=s==="crypto"?6:2,u=[...new Set(l)].slice(0,s==="crypto"?6:2);for(let r=0;r<u.length;r+=p){const w=u.slice(r,r+p),y=await g(`/quotes.php?symbols=${encodeURIComponent(w.join(","))}&type=${encodeURIComponent(s)}&purpose=focus`,{timeout:4200}).catch(()=>null);y?.items?.length&&y.items.forEach(f=>L(e,f,s))}}}function L(e,t,a){const s=String(t.symbol||"").toUpperCase(),n=q(e,s);if(!n)return;const o=n.dataset.type||t.type||a,i=Number(t.price||t.q_price||0),d=Number(t.change_pct||t.q_change||0),l=n.querySelector("[data-home-price]"),p=n.querySelector("[data-home-change]"),u=n.querySelector("[data-home-source]");l&&i>0&&(l.textContent=$(i,o)),p&&(p.textContent=S(d),p.className=`text-[11px] ${d>=0?"text-green":"text-red"}`),u&&i>0&&(u.textContent=k(t));const r=n.querySelector("[data-quote-chip]");r&&i>0&&(r.className=`status-chip ${P(t)}`,r.textContent=k(t))}function q(e,t){return[...e.querySelectorAll("[data-symbol]")].find(a=>String(a.dataset.symbol||"").toUpperCase()===String(t||"").toUpperCase())}function M(e,t){const a=e.symbol||"--";return`<span class="${t}">
    <img src="${x(j(e,e.type||"crypto"))}" alt="${x(a)}" loading="lazy" data-fallback="initial" />
    <b style="display:none">${c(D(a))}</b>
  </span>`}function z(e,t){const a=e.querySelector("#home-positions");if(a){if(!t.length){a.innerHTML='<p class="text-muted text-sm text-center py-6">No open positions</p>';return}a.innerHTML=`<div class="grid gap-2 lg:grid-cols-2">${t.map(B).join("")}</div>`}}function B(e){const t=Number(e.pnl||e.unrealized_pnl||0),a=String(e.symbol||"").replace("@R@",""),s=e.asset_type||e.type||"crypto",n=Number(e.mark_price||e.current_price||e.price||0);return`<div class="position-card">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 min-w-0">
        ${M({symbol:a,type:s},"market-logo !h-8 !w-8")}
        <div class="min-w-0">
          <strong class="text-sm truncate block">${c(a)}</strong>
          <span class="text-[10px] text-muted">${c(e.market_type||e.order_type||"spot")} / ${c(K(e))}</span>
        </div>
      </div>
      <div class="text-right">
        <div class="text-sm font-mono ${t>=0?"text-green":"text-red"}">${v(t)}</div>
        <div class="text-[10px] text-muted">PnL</div>
      </div>
    </div>
    <div class="position-metrics mt-3">
      ${m("Entry",$(e.entry_price||e.open_price,s))}
      ${m("Mark",n>0?$(n,s):"--")}
      ${m("Size",v(e.qty||e.amount||e.size||e.units||0))}
      ${m("Lev",`${e.leverage||1}x`)}
      ${m("Margin",v(e.margin_initial||e.margin||0))}
      ${m("ROE",S(e.roe_pct||e.roe||0))}
      ${m("Opened",Q(e))}
    </div>
  </div>`}function m(e,t){return`<span><small>${e}</small><strong>${t}</strong></span>`}function K(e){return String(e.side||"buy").toUpperCase()==="SELL"?"SELL":"BUY"}function Q(e){const t=e.created_at||e.opened_at||e.open_time||"";if(!t)return"--";const a=typeof t=="number"?t:/^\d+$/.test(String(t))?Number(t):Math.floor(Date.parse(t)/1e3);return Number.isFinite(a)&&a>0?R(a):"--"}function _(e,t,a){return`<div class="hero-metric-card">
    <div class="text-[10px] uppercase text-muted tracking-wide">${e}</div>
    <div class="text-base font-bold mt-1">${t}</div>
    <div class="text-[10px] text-muted">${a||""}</div>
  </div>`}function b(e,t,a){return`<a href="${a}" class="home-action-card">
    <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-accent/20 to-green/10 grid place-items-center text-accent">${A[t]||""}</span>
    <span class="text-xs font-medium">${e}</span>
  </a>`}function N(e,t,a,s){return`<article class="card home-support-card">
    <span class="${s}">${c(e)}</span>
    <strong>${c(e)}</strong>
    <small>${c(t)}</small>
    <a href="${a}" class="btn-ghost btn-sm mt-3">Open</a>
  </article>`}function V(e){return e!=="real"?`<div class="relative min-h-[180px]">
      <div class="flex gap-4 overflow-x-auto pb-3 blur-[4px] opacity-50 pointer-events-none">
        ${Array(4).fill(0).map(()=>'<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>').join("")}
      </div>
      <div class="absolute inset-0 grid place-items-center">
        <div class="card-glass text-center p-6 max-w-sm">
          <span class="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-green grid place-items-center mx-auto mb-3">${A.lock}</span>
          <strong class="block">Real Account Only</strong>
          <p class="text-muted text-sm mt-1">Switch to Real and verify KYC to copy live signals.</p>
        </div>
      </div>
    </div>`:`<div class="flex gap-4 overflow-x-auto pb-3 snap-x" id="copy-scroller">
    ${Array(3).fill(0).map(()=>'<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>').join("")}
  </div>`}function W(){const e=h("wallet")||{};return h("mode")==="real"?e.real||{balance:0,available:0,currency:"USDT"}:e.demo||{balance:1e4,available:1e4,currency:"USDT_DEMO"}}function G(e,t){const a=Number(e||0);return a>0?$(a,t):"--"}function k(e){const t=String(e.source||e.provider||"").toLowerCase(),a=String(e.timing_class||"").toLowerCase();return Number(e.price||e.q_price||0)<=0?"Unavailable":a==="stale"||e.is_stale?"Stale":e.delayed||t.includes("yahoo")?"Delayed":t.includes("binance")||t.includes("stream")||a==="live"?"Live":t?t.replace(/_/g," "):"Cached"}function P(e){const t=k(e).toLowerCase();return t==="live"?"status-chip-live":t==="unavailable"?"status-chip-locked":"status-chip-delayed"}function X(e){return`<span data-quote-chip class="status-chip ${P(e)}">${k(e)}</span>`}function J(e){const t=String(e?.level_code||e?.name_en||"starter").toLowerCase().replace(/[^a-z0-9]+/g,"-"),a=e?.name||e?.name_en||e?.level_code||"Starter";return`<span class="level-badge level-badge--${x(t)}">${c(a)}</span>`}function Z(e){const t=String(e||"").split("").reduce((a,s)=>a+s.charCodeAt(0),0);return Array.from({length:12},(a,s)=>`<i style="height:${18+(t+s*13)%26}px"></i>`).join("")}function C(e,t){const a=Number(e||0);return a>0?$(a,t):"--"}function ee(e){return!(Number(e.entry||e.entry_price||0)>0)||!(Number(e.tp1||e.take_profit_1||e.take_profit||0)>0)||!(Number(e.sl||e.stop_loss||0)>0)}function te(e){return e.levels_source==="live_derived"?'<p class="text-[10px] text-spread mt-2">Live-derived desk levels</p>':""}export{oe as mount,ie as render};
