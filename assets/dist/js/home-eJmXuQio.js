import{g as r,e as i,m as l,a as c,i as d,p,b as m,n as v}from"./main-DTI-JlRE.js";function $(){const e=r("brand"),t=y(),s=r("mode");return`
    <div class="space-y-6 animate-fade-in">
      <!-- Hero -->
      <section class="card bg-gradient-to-br from-panel-2 to-panel relative overflow-hidden">
        <div class="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_30%_20%,#5d7cff,transparent_50%)]"></div>
        <div class="relative space-y-3">
          <span class="badge-accent">${i(e.name)}</span>
          <h1 class="text-xl lg:text-2xl font-bold">${s==="real"?"Real Trading Workspace":"Demo Trading Workspace"}</h1>
          <p class="text-muted text-sm max-w-lg">${i(e.tagline||"Professional multi-market trading platform")}</p>
        </div>
        <div class="relative mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${o("Available",l(t.available),t.currency)}
          ${o("Balance",l(t.balance),t.currency)}
          ${o("Mode",s==="real"?"Real":"Demo",s==="real"?"Live":"Practice")}
          ${o("Markets","6","Active types")}
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="card">
        <h2 class="text-base font-semibold mb-3">Quick Actions</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          ${n("Deposit","deposit","#/deposit")}
          ${n("Withdraw","withdraw","#/withdraw")}
          ${n("KYC","kyc","#/kyc")}
          ${n("Earn","earn","#/invest")}
          ${n("Support","support","#/support")}
          ${n("News","news","#/news")}
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
          ${f(s)}
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
    </div>`}function w(e){g(e)}async function g(e){try{const[t,s]=await Promise.all([c("/markets.php?type=crypto&lite=1&with_quotes=1",{timeout:7e3}),c("/trade/portfolio.php",{timeout:7e3})]);t&&t.items&&b(e,t.items.slice(0,8)),s&&s.positions&&x(e,s.positions.slice(0,5))}catch{}}function b(e,t){const s=e.querySelector("#home-markets");s&&(s.innerHTML=t.map(a=>`
    <button class="flex items-center gap-3 p-3 rounded-lg border border-line hover:border-accent/40 bg-panel-2/50 text-left transition-colors" data-symbol="${i(a.symbol)}" data-type="${i(a.type||"crypto")}">
      <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/30 to-green/20 grid place-items-center text-[11px] font-black">${i((a.symbol||"").slice(0,3))}</div>
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-sm truncate">${i(a.symbol)}</div>
        <div class="text-[11px] text-muted truncate">${i(a.name||a.symbol)}</div>
      </div>
      <div class="text-right">
        <div class="text-sm font-mono font-semibold">${p(a.price||a.q_price,a.type)}</div>
        <div class="text-[11px] ${Number(a.change_pct||a.q_change||0)>=0?"text-green":"text-red"}">${m(a.change_pct||a.q_change||0)}</div>
      </div>
    </button>
  `).join(""),s.querySelectorAll("[data-symbol]").forEach(a=>{a.addEventListener("click",()=>v("trade",{symbol:a.dataset.symbol,type:a.dataset.type}))}))}function x(e,t){const s=e.querySelector("#home-positions");if(s){if(!t.length){s.innerHTML='<p class="text-muted text-sm text-center py-6">No open positions</p>';return}s.innerHTML=`<div class="space-y-2">${t.map(u).join("")}</div>`}}function u(e){const t=Number(e.pnl||e.unrealized_pnl||0);return`<div class="flex items-center justify-between p-3 rounded-lg bg-panel-2/50 border border-line">
    <div><strong class="text-sm">${i(e.symbol)}</strong><span class="text-[11px] text-muted ml-2">${i(e.side||"BUY")}</span></div>
    <div class="text-right"><div class="text-sm font-mono ${t>=0?"text-green":"text-red"}">${l(t)}</div></div>
  </div>`}function o(e,t,s){return`<div class="p-3 rounded-lg bg-panel-2/60 border border-line/50">
    <div class="text-[10px] uppercase text-muted tracking-wide">${e}</div>
    <div class="text-base font-bold mt-1">${t}</div>
    <div class="text-[10px] text-muted">${s||""}</div>
  </div>`}function n(e,t,s){return`<a href="${s}" class="flex flex-col items-center gap-2 p-3 rounded-lg border border-line hover:border-accent/40 bg-panel-2/30 transition-colors">
    <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-accent/20 to-green/10 grid place-items-center text-accent">${d[t]||""}</span>
    <span class="text-xs font-medium">${e}</span>
  </a>`}function f(e){return e!=="real"?`<div class="relative min-h-[180px]">
      <div class="flex gap-4 overflow-x-auto pb-3 blur-[4px] opacity-50 pointer-events-none">
        ${Array(4).fill(0).map(()=>'<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>').join("")}
      </div>
      <div class="absolute inset-0 grid place-items-center">
        <div class="card-glass text-center p-6 max-w-sm">
          <span class="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-green grid place-items-center mx-auto mb-3">${d.lock}</span>
          <strong class="block">Real Account Only</strong>
          <p class="text-muted text-sm mt-1">Switch to Real and verify KYC to copy live signals.</p>
        </div>
      </div>
    </div>`:`<div class="flex gap-4 overflow-x-auto pb-3 snap-x" id="copy-scroller">
    ${Array(3).fill(0).map(()=>'<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>').join("")}
  </div>`}function y(){const e=r("wallet")||{};return r("mode")==="real"?e.real||{balance:0,available:0,currency:"USDT"}:e.demo||{balance:1e4,available:1e4,currency:"USDT_DEMO"}}export{w as mount,$ as render};
