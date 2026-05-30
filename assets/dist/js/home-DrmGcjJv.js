import{g,e as o,m as v,b as h,c as x,i as P,p as S,n as U,j as $,t as j}from"./main-B7BYCc04.js";import{marketIconPath as R,marketInitial as D}from"./marketIcon-D-Yq8Sis.js";function ne(){const e=g("brand")||{},s=V(),a=g("mode"),n=(g("level")||{}).current||{};return`
    <div class="space-y-6 animate-fade-in">
      <!-- Hero -->
      <section class="card feature-hero relative overflow-hidden">
        <div class="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.95fr)] lg:items-end">
          <div class="space-y-4">
            <div class="flex flex-wrap items-center gap-2">
              <span class="badge-accent">${o(e.name)}</span>
              <span class="status-chip ${a==="real"?"status-chip-live":"status-chip-delayed"}">${a==="real"?"Real workspace":"Demo workspace"}</span>
              ${X(n)}
            </div>
            <div class="space-y-2">
              <h1 class="text-2xl lg:text-4xl font-bold leading-tight">${a==="real"?"Trading desk":"Practice trading desk"}</h1>
              <p class="text-muted text-sm lg:text-base max-w-2xl">${o(e.tagline||"Professional multi-market trading platform")} with curated markets, copy desk signals, level-linked contracts, and internal execution controls.</p>
            </div>
            <div class="feature-hero__stats">
              <div class="hero-stat">
                <span>Account level</span>
                <strong>${o(n.name||n.name_en||n.level_code||"Starter")}</strong>
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
              <strong>${v(s.balance)}</strong>
              <small>${o(s.currency)}</small>
            </div>
            <div class="grid grid-cols-2 gap-3">
              ${_("Available",v(s.available),s.currency)}
              ${_("Holds",v(s.holds||0),"Locked margin")}
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
          ${Q(a)}
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
        ${q("News room","Desk briefings, catalysts, and curated client headlines.","#/news","badge-accent")}
        ${q("Support desk","Funding review, KYC follow-up, payout status, and account help.","#/support","badge-green")}
      </section>
    </div>`}function ie(e){e.addEventListener("error",s=>{if(s.target.tagName==="IMG"&&s.target.dataset.fallback==="initial"){s.target.style.display="none";const a=s.target.nextElementSibling;a&&(a.style.display="grid")}},!0),T(e)}async function T(e){try{const s=g("mode"),[a,t,n]=await Promise.all([h("/markets.php?scope=home&supported=1&lite=1&with_quotes=1",{timeout:7e3}),h("/trade/portfolio.php",{timeout:7e3}),s==="real"?h("/signals.php?bot=1&home=1&lang=en",{timeout:7e3}).catch(()=>null):Promise.resolve(null)]);if(a&&a.items){const i=a.items.slice(0,12);O(e,i);const r=i.filter(d=>Number(d.price||d.q_price||0)<=0);r.length&&H(e,r)}t&&t.positions&&z(e,t.positions.slice(0,5)),s==="real"&&n&&n.items&&n.items.length&&I(e,n.items)}catch{}}function I(e,s){const a=e.querySelector("#home-copy-section");a&&(a.innerHTML=`<div class="flex gap-3 overflow-x-auto pb-2 snap-x">${s.slice(0,6).map(t=>{const n=(t.direction||"BUY").toUpperCase(),i=t.symbol||t.market_symbol||"--";return`<div class="shrink-0 w-[280px] copy-card snap-start">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2 min-w-0">
          ${E({symbol:i,type:t.type||t.market_type},"market-logo")}
          <div class="min-w-0">
            <strong class="text-xs truncate block">${o(i)}</strong>
            <span class="text-[10px] text-muted truncate block">${o(t.bot_name||t.bot_name_en||t.timeframe||"Copy signal")}</span>
          </div>
        </div>
        <span class="badge-${n==="BUY"?"buy":"sell"}">${n}</span>
      </div>
      <div class="copy-card__quote py-2">
        <span class="status-chip ${Number(t.live_price||0)>0?"status-chip-live":"status-chip-locked"}">${Number(t.live_price||0)>0?"LIVE":"READY"}</span>
        <strong>${Number(t.live_price||0)>0?"$"+v(t.live_price,t.type==="forex"?5:2):"--"}</strong>
        <span class="${Number(t.live_change_pct||0)>=0?"text-buy":"text-sell"}">${S(t.live_change_pct||0)}</span>
      </div>
      <div class="grid grid-cols-3 gap-1 text-[10px] mt-2">
        <div><span class="text-muted">Entry</span><div class="font-mono">${C(t.entry||t.entry_price,t.type)}</div></div>
        <div><span class="text-muted">TP</span><div class="font-mono text-buy">${C(t.tp1||t.take_profit_1||t.take_profit,t.type)}</div></div>
        <div><span class="text-muted">SL</span><div class="font-mono text-sell">${C(t.sl||t.stop_loss,t.type)}</div></div>
      </div>
      ${Z(t)?'<p class="text-[10px] text-muted mt-2">Awaiting desk levels</p>':ee(t)}
      <a href="#/invest" class="btn-primary btn-sm w-full mt-3">Open copy desk</a>
    </div>`}).join("")}</div>`)}function O(e,s){const a=e.querySelector("#home-markets");a&&(a.innerHTML=s.map(t=>`
    <button class="home-market-card" data-symbol="${x(t.symbol)}" data-type="${x(t.type||"crypto")}">
      ${E(t,"home-market-icon")}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <div class="font-semibold text-sm truncate">${o(t.symbol)}</div>
          ${G(t)}
        </div>
        <div class="text-[11px] text-muted truncate">${o(t.name||t.symbol)}</div>
        <div class="mini-spark" aria-hidden="true">${J(t.symbol)}</div>
      </div>
      <div class="text-right">
        <div class="text-sm font-mono font-semibold" data-home-price>${W(t.price||t.q_price,t.type)}</div>
        <div class="text-[11px] ${Number(t.change_pct||t.q_change||0)>=0?"text-green":"text-red"}" data-home-change>${S(t.change_pct||t.q_change||0)}</div>
        <div class="text-[9px] text-muted uppercase mt-1" data-home-source>${k(t)}</div>
      </div>
    </button>
  `).join(""),a.querySelectorAll("[data-symbol]").forEach(t=>{t.addEventListener("click",()=>U("trade",{symbol:t.dataset.symbol,type:t.dataset.type}))}))}async function H(e,s){const a=new Map;s.forEach(n=>{const i=String(n.symbol||"").toUpperCase(),r=n.type||"crypto";i&&(a.has(r)||a.set(r,[]),a.get(r).push(i))});const t=[];await Promise.all([...a.entries()].map(async([n,i])=>{const r=await h(`/quotes.php?symbols=${encodeURIComponent(i.join(","))}&type=${encodeURIComponent(n)}&visible=1&purpose=watchlist`,{timeout:6500}).catch(()=>null),d=new Set;r?.items?.length&&r.items.forEach(l=>{d.add(String(l.symbol||"").toUpperCase()),L(e,l,n)}),i.forEach(l=>{const p=N(e,l),u=p&&p.querySelector("[data-home-price]")?.textContent!=="--";(!d.has(l)||!u)&&t.push({symbol:l,type:n})})})),Y(e,t)}async function Y(e,s){const a=new Map;s.forEach(t=>{!t.symbol||!t.type||(a.has(t.type)||a.set(t.type,[]),a.get(t.type).push(t.symbol))});for(const[t,n]of a.entries()){const i=t==="crypto"?12:2,r=t==="crypto"?12:4,d=[...new Set(n)].slice(0,r),l=[];for(let c=0;c<d.length;c+=i){const w=d.slice(c,c+i),y=await h(`/quotes.php?symbols=${encodeURIComponent(w.join(","))}&type=${encodeURIComponent(t)}&cache_only=1&purpose=watchlist`,{timeout:3500}).catch(()=>null);y?.items?.length&&y.items.forEach(f=>L(e,f,t)),w.forEach(f=>{const M=N(e,f);M&&M.querySelector("[data-home-price]")?.textContent!=="--"||l.push(f)})}const p=t==="crypto"?6:2,u=[...new Set(l)].slice(0,t==="crypto"?6:2);for(let c=0;c<u.length;c+=p){const w=u.slice(c,c+p),y=await h(`/quotes.php?symbols=${encodeURIComponent(w.join(","))}&type=${encodeURIComponent(t)}&purpose=focus`,{timeout:4200}).catch(()=>null);y?.items?.length&&y.items.forEach(f=>L(e,f,t))}}}function L(e,s,a){const t=String(s.symbol||"").toUpperCase(),n=N(e,t);if(!n)return;const i=n.dataset.type||s.type||a,r=Number(s.price||s.q_price||0),d=Number(s.change_pct||s.q_change||0),l=n.querySelector("[data-home-price]"),p=n.querySelector("[data-home-change]"),u=n.querySelector("[data-home-source]");l&&r>0&&(l.textContent=$(r,i)),p&&(p.textContent=S(d),p.className=`text-[11px] ${d>=0?"text-green":"text-red"}`),u&&r>0&&(u.textContent=k(s));const c=n.querySelector("[data-quote-chip]");c&&r>0&&(c.className=`status-chip ${A(s)}`,c.textContent=k(s))}function N(e,s){return[...e.querySelectorAll("[data-symbol]")].find(a=>String(a.dataset.symbol||"").toUpperCase()===String(s||"").toUpperCase())}function E(e,s){const a=e.symbol||"--";return`<span class="${s}">
    <img src="${x(R(e,e.type||"crypto"))}" alt="${x(a)}" loading="lazy" data-fallback="initial" />
    <b style="display:none">${o(D(a))}</b>
  </span>`}function z(e,s){const a=e.querySelector("#home-positions");if(a){if(!s.length){a.innerHTML='<p class="text-muted text-sm text-center py-6">No open positions</p>';return}a.innerHTML=`<div class="grid gap-2 lg:grid-cols-2">${s.map(F).join("")}</div>`}}function F(e){const s=Number(e.pnl||e.unrealized_pnl||0),a=String(e.symbol||"").replace("@R@",""),t=e.asset_type||e.type||"crypto",n=Number(e.mark_price||e.current_price||e.price||0);return`<div class="position-card">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 min-w-0">
        ${E({symbol:a,type:t},"market-logo !h-8 !w-8")}
        <div class="min-w-0">
          <strong class="text-sm truncate block">${o(a)}</strong>
          <span class="text-[10px] text-muted">${o(e.market_type||e.order_type||"spot")} / ${o(B(e))}</span>
        </div>
      </div>
      <div class="text-right">
        <div class="text-sm font-mono ${s>=0?"text-green":"text-red"}">${v(s)}</div>
        <div class="text-[10px] text-muted">PnL</div>
      </div>
    </div>
    <div class="position-metrics mt-3">
      ${m("Entry",$(e.entry_price||e.open_price,t))}
      ${m("Mark",n>0?$(n,t):"--")}
      ${m("Size",v(e.qty||e.amount||e.size||e.units||0))}
      ${m("Lev",`${e.leverage||1}x`)}
      ${m("Margin",v(e.margin_initial||e.margin||0))}
      ${m("ROE",S(e.roe_pct||e.roe||0))}
      ${m("Opened",K(e))}
    </div>
  </div>`}function m(e,s){return`<span><small>${e}</small><strong>${s}</strong></span>`}function B(e){return String(e.side||"buy").toUpperCase()==="SELL"?"SELL":"BUY"}function K(e){const s=e.created_at||e.opened_at||e.open_time||"";if(!s)return"--";const a=typeof s=="number"?s:/^\d+$/.test(String(s))?Number(s):Math.floor(Date.parse(s)/1e3);return Number.isFinite(a)&&a>0?j(a):"--"}function _(e,s,a){return`<div class="hero-metric-card">
    <div class="text-[10px] uppercase text-muted tracking-wide">${e}</div>
    <div class="text-base font-bold mt-1">${s}</div>
    <div class="text-[10px] text-muted">${a||""}</div>
  </div>`}function b(e,s,a){return`<a href="${a}" class="home-action-card">
    <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-accent/20 to-green/10 grid place-items-center text-accent">${P[s]||""}</span>
    <span class="text-xs font-medium">${e}</span>
  </a>`}function q(e,s,a,t){return`<article class="card home-support-card">
    <span class="${t}">${o(e)}</span>
    <strong>${o(e)}</strong>
    <small>${o(s)}</small>
    <a href="${a}" class="btn-ghost btn-sm mt-3">Open</a>
  </article>`}function Q(e){return e!=="real"?`<div class="relative min-h-[180px]">
      <div class="flex gap-4 overflow-x-auto pb-3 blur-[4px] opacity-50 pointer-events-none">
        ${Array(4).fill(0).map(()=>'<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>').join("")}
      </div>
      <div class="absolute inset-0 grid place-items-center">
        <div class="card-glass text-center p-6 max-w-sm">
          <span class="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-green grid place-items-center mx-auto mb-3">${P.lock}</span>
          <strong class="block">Real Account Only</strong>
          <p class="text-muted text-sm mt-1">Switch to Real and verify KYC to copy live signals.</p>
        </div>
      </div>
    </div>`:`<div class="flex gap-4 overflow-x-auto pb-3 snap-x" id="copy-scroller">
    ${Array(3).fill(0).map(()=>'<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>').join("")}
  </div>`}function V(){const e=g("wallet")||{};return g("mode")==="real"?e.real||{balance:0,available:0,currency:"USDT"}:e.demo||{balance:1e4,available:1e4,currency:"USDT_DEMO"}}function W(e,s){const a=Number(e||0);return a>0?$(a,s):"--"}function k(e){const s=String(e.source||e.provider||"").toLowerCase(),a=String(e.timing_class||"").toLowerCase();return Number(e.price||e.q_price||0)<=0?"Unavailable":a==="stale"||e.is_stale?"Stale":e.delayed||s.includes("yahoo")?"Delayed":s.includes("binance")||s.includes("stream")||a==="live"?"Live":s?s.replace(/_/g," "):"Cached"}function A(e){const s=k(e).toLowerCase();return s==="live"?"status-chip-live":s==="unavailable"?"status-chip-locked":"status-chip-delayed"}function G(e){return`<span data-quote-chip class="status-chip ${A(e)}">${k(e)}</span>`}function X(e){const s=String(e?.level_code||e?.name_en||"starter").toLowerCase().replace(/[^a-z0-9]+/g,"-"),a=e?.name||e?.name_en||e?.level_code||"Starter";return`<span class="level-badge level-badge--${x(s)}">${o(a)}</span>`}function J(e){const s=String(e||"").split("").reduce((a,t)=>a+t.charCodeAt(0),0);return Array.from({length:12},(a,t)=>`<i style="height:${18+(s+t*13)%26}px"></i>`).join("")}function C(e,s){const a=Number(e||0);return a>0?$(a,s):"--"}function Z(e){return!(Number(e.entry||e.entry_price||0)>0)||!(Number(e.tp1||e.take_profit_1||e.take_profit||0)>0)||!(Number(e.sl||e.stop_loss||0)>0)}function ee(e){return e.levels_source==="live_derived"?'<p class="text-[10px] text-spread mt-2">Live-derived desk levels</p>':""}export{ie as mount,ne as render};
