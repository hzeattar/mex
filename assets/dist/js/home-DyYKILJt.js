import{g as p,e as o,m,a as d,i as h,b as v,p as $,c as x,n as S}from"./main-KgfuI461.js";import{m as C,a as A}from"./marketIcon-BqfrwX_4.js";function R(){const t=p("brand")||{},a=U(),s=p("mode");return`
    <div class="space-y-6 animate-fade-in">
      <!-- Hero -->
      <section class="card bg-gradient-to-br from-panel-2 to-panel relative overflow-hidden">
        <div class="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_30%_20%,#5d7cff,transparent_50%)]"></div>
        <div class="relative space-y-3">
          <span class="badge-accent">${o(t.name)}</span>
          <h1 class="text-xl lg:text-2xl font-bold">${s==="real"?"Real Trading Workspace":"Demo Trading Workspace"}</h1>
          <p class="text-muted text-sm max-w-lg">${o(t.tagline||"Professional multi-market trading platform")}</p>
        </div>
        <div class="relative mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${c("Available",m(a.available),a.currency)}
          ${c("Balance",m(a.balance),a.currency)}
          ${c("Mode",s==="real"?"Real":"Demo",s==="real"?"Live":"Practice")}
          ${c("Markets","6","Active types")}
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="card">
        <h2 class="text-base font-semibold mb-3">Quick Actions</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          ${r("Deposit","deposit","#/deposit")}
          ${r("Withdraw","withdraw","#/withdraw")}
          ${r("KYC","kyc","#/kyc")}
          ${r("Earn","earn","#/invest")}
          ${r("Support","support","#/support")}
          ${r("News","news","#/news")}
        </div>
      </section>

      <!-- Copy Trading -->
      <section class="card">
        <div class="flex items-center justify-between mb-3">
          <div>
            <span class="badge-green mb-1">Copy Desk</span>
            <h2 class="text-base font-semibold">Copy Trading</h2>
          </div>
          <a href="#/invest" class="btn-ghost btn-sm">View all</a>
        </div>
        <div class="relative" id="home-copy-section">
          ${P(s)}
        </div>
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
    </div>`}function H(t){j(t)}async function j(t){try{const[a,s,e]=await Promise.all([d("/markets.php?type=crypto&lite=1&with_quotes=1",{timeout:7e3}),d("/trade/portfolio.php",{timeout:7e3}),d("/signals.php?bot=1&home=1&lang=en",{timeout:7e3}).catch(()=>null)]);if(a&&a.items){const n=a.items.slice(0,8);E(t,n),M(t,n)}s&&s.positions&&T(t,s.positions.slice(0,5)),e&&e.items&&e.items.length&&q(t,e.items)}catch{}}function q(t,a){const s=t.querySelector("#home-copy-section");s&&(s.innerHTML=`<div class="flex gap-3 overflow-x-auto pb-2 snap-x">${a.slice(0,6).map(e=>{const n=(e.direction||"BUY").toUpperCase(),i=e.symbol||e.market_symbol||"--";return`<div class="shrink-0 w-[280px] copy-card snap-start">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2 min-w-0">
          ${w({symbol:i,type:e.type||e.market_type},"market-logo")}
          <div class="min-w-0">
            <strong class="text-xs truncate block">${o(i)}</strong>
            <span class="text-[10px] text-muted truncate block">${o(e.bot_name||e.bot_name_en||e.timeframe||"Copy signal")}</span>
          </div>
        </div>
        <span class="badge-${n==="BUY"?"buy":"sell"}">${n}</span>
      </div>
      <div class="copy-card__quote py-2">
        <span class="status-chip ${Number(e.live_price||0)>0?"status-chip-live":"status-chip-locked"}">${Number(e.live_price||0)>0?"LIVE":"READY"}</span>
        <strong>${Number(e.live_price||0)>0?"$"+m(e.live_price,e.type==="forex"?5:2):"--"}</strong>
        <span class="${Number(e.live_change_pct||0)>=0?"text-buy":"text-sell"}">${x(e.live_change_pct||0)}</span>
      </div>
      <div class="grid grid-cols-3 gap-1 text-[10px] mt-2">
        <div><span class="text-muted">Entry</span><div class="font-mono">${e.entry||e.entry_price||"--"}</div></div>
        <div><span class="text-muted">TP</span><div class="font-mono text-buy">${e.tp1||e.take_profit_1||"--"}</div></div>
        <div><span class="text-muted">SL</span><div class="font-mono text-sell">${e.sl||e.stop_loss||"--"}</div></div>
      </div>
      <a href="#/invest" class="btn-primary btn-sm w-full mt-3">Open copy desk</a>
    </div>`}).join("")}</div>`)}function E(t,a){const s=t.querySelector("#home-markets");s&&(s.innerHTML=a.map(e=>`
    <button class="home-market-card" data-symbol="${v(e.symbol)}" data-type="${v(e.type||"crypto")}">
      ${w(e,"home-market-icon")}
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-sm truncate">${o(e.symbol)}</div>
        <div class="text-[11px] text-muted truncate">${o(e.name||e.symbol)}</div>
      </div>
      <div class="text-right">
        <div class="text-sm font-mono font-semibold" data-home-price>${$(e.price||e.q_price,e.type)}</div>
        <div class="text-[11px] ${Number(e.change_pct||e.q_change||0)>=0?"text-green":"text-red"}" data-home-change>${x(e.change_pct||e.q_change||0)}</div>
      </div>
    </button>
  `).join(""),s.querySelectorAll("[data-symbol]").forEach(e=>{e.addEventListener("click",()=>S("trade",{symbol:e.dataset.symbol,type:e.dataset.type}))}))}async function M(t,a){const s=new Map;a.forEach(e=>{const n=String(e.symbol||"").toUpperCase(),i=e.type||"crypto";n&&(s.has(i)||s.set(i,[]),s.get(i).push(n))}),await Promise.all([...s.entries()].map(async([e,n])=>{const i=await d(`/quotes.php?symbols=${encodeURIComponent(n.join(","))}&type=${encodeURIComponent(e)}&visible=1&purpose=watchlist`,{timeout:6500}).catch(()=>null);i?.items?.length&&i.items.forEach(l=>{const k=String(l.symbol||"").toUpperCase(),u=[...t.querySelectorAll("[data-symbol]")].find(_=>String(_.dataset.symbol||"").toUpperCase()===k);if(!u)return;const y=Number(l.price||l.q_price||0),f=Number(l.change_pct||l.q_change||0),g=u.querySelector("[data-home-price]"),b=u.querySelector("[data-home-change]");g&&y>0&&(g.textContent=$(y,e)),b&&(b.textContent=x(f),b.className=`text-[11px] ${f>=0?"text-green":"text-red"}`)})}))}function w(t,a){const s=t.symbol||"--";return`<span class="${a}">
    <img src="${v(C(t,t.type||"crypto"))}" alt="${v(s)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';" />
    <b>${o(A(s))}</b>
  </span>`}function T(t,a){const s=t.querySelector("#home-positions");if(s){if(!a.length){s.innerHTML='<p class="text-muted text-sm text-center py-6">No open positions</p>';return}s.innerHTML=`<div class="space-y-2">${a.map(N).join("")}</div>`}}function N(t){const a=Number(t.pnl||t.unrealized_pnl||0);return`<div class="flex items-center justify-between p-3 rounded-lg bg-panel-2/50 border border-line">
    <div><strong class="text-sm">${o(t.symbol)}</strong><span class="text-[11px] text-muted ml-2">${o(t.side||"BUY")}</span></div>
    <div class="text-right"><div class="text-sm font-mono ${a>=0?"text-green":"text-red"}">${m(a)}</div></div>
  </div>`}function c(t,a,s){return`<div class="p-3 rounded-lg bg-panel-2/60 border border-line/50">
    <div class="text-[10px] uppercase text-muted tracking-wide">${t}</div>
    <div class="text-base font-bold mt-1">${a}</div>
    <div class="text-[10px] text-muted">${s||""}</div>
  </div>`}function r(t,a,s){return`<a href="${s}" class="flex flex-col items-center gap-2 p-3 rounded-lg border border-line hover:border-accent/40 bg-panel-2/30 transition-colors">
    <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-accent/20 to-green/10 grid place-items-center text-accent">${h[a]||""}</span>
    <span class="text-xs font-medium">${t}</span>
  </a>`}function P(t){return t!=="real"?`<div class="relative min-h-[180px]">
      <div class="flex gap-4 overflow-x-auto pb-3 blur-[4px] opacity-50 pointer-events-none">
        ${Array(4).fill(0).map(()=>'<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>').join("")}
      </div>
      <div class="absolute inset-0 grid place-items-center">
        <div class="card-glass text-center p-6 max-w-sm">
          <span class="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-green grid place-items-center mx-auto mb-3">${h.lock}</span>
          <strong class="block">Real Account Only</strong>
          <p class="text-muted text-sm mt-1">Switch to Real and verify KYC to copy live signals.</p>
        </div>
      </div>
    </div>`:`<div class="flex gap-4 overflow-x-auto pb-3 snap-x" id="copy-scroller">
    ${Array(3).fill(0).map(()=>'<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>').join("")}
  </div>`}function U(){const t=p("wallet")||{};return p("mode")==="real"?t.real||{balance:0,available:0,currency:"USDT"}:t.demo||{balance:1e4,available:1e4,currency:"USDT_DEMO"}}export{H as mount,R as render};
