import{g as l,e as i,m as d,a as o,i as p,p as m,b as v,n as b}from"./main-DNMmzAdP.js";function k(){const t=l("brand"),s=$(),a=l("mode");return`
    <div class="space-y-6 animate-fade-in">
      <!-- Hero -->
      <section class="card bg-gradient-to-br from-panel-2 to-panel relative overflow-hidden">
        <div class="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_30%_20%,#5d7cff,transparent_50%)]"></div>
        <div class="relative space-y-3">
          <span class="badge-accent">${i(t.name)}</span>
          <h1 class="text-xl lg:text-2xl font-bold">${a==="real"?"Real Trading Workspace":"Demo Trading Workspace"}</h1>
          <p class="text-muted text-sm max-w-lg">${i(t.tagline||"Professional multi-market trading platform")}</p>
        </div>
        <div class="relative mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${r("Available",d(s.available),s.currency)}
          ${r("Balance",d(s.balance),s.currency)}
          ${r("Mode",a==="real"?"Real":"Demo",a==="real"?"Live":"Practice")}
          ${r("Markets","6","Active types")}
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
          ${h(a)}
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
    </div>`}function _(t){u(t)}async function u(t){try{const[s,a,e,c]=await Promise.all([o("/markets.php?type=crypto&lite=1&with_quotes=1",{timeout:7e3}),o("/trade/portfolio.php",{timeout:7e3}),o("/signals.php?bot=1&home=1&lang=en",{timeout:7e3}).catch(()=>null),o("/trading_bot/my.php?lang=en",{timeout:7e3}).catch(()=>null)]);s&&s.items&&g(t,s.items.slice(0,8)),a&&a.positions&&f(t,a.positions.slice(0,5)),e&&e.items&&e.items.length&&x(t,e.items)}catch{}}function x(t,s){const a=t.querySelector("#home-copy-section");a&&(a.innerHTML=`<div class="flex gap-3 overflow-x-auto pb-2 snap-x">${s.slice(0,6).map(e=>{const c=(e.direction||"BUY").toUpperCase();return`<div class="shrink-0 w-[260px] p-3 rounded-lg border border-line bg-surface snap-start">
      <div class="flex items-center justify-between mb-2">
        <strong class="text-xs">${i(e.market_symbol||e.symbol||"--")}</strong>
        <span class="badge-${c==="BUY"?"buy":"sell"}">${c}</span>
      </div>
      <div class="text-[10px] text-muted mb-1">${i(e.bot_name_en||e.timeframe||"")}</div>
      <div class="grid grid-cols-3 gap-1 text-[10px]">
        <div><span class="text-muted">Entry</span><div class="font-mono">${e.entry_price||"--"}</div></div>
        <div><span class="text-muted">TP</span><div class="font-mono text-buy">${e.take_profit_1||"--"}</div></div>
        <div><span class="text-muted">SL</span><div class="font-mono text-sell">${e.stop_loss||"--"}</div></div>
      </div>
    </div>`}).join("")}</div>`)}function g(t,s){const a=t.querySelector("#home-markets");a&&(a.innerHTML=s.map(e=>`
    <button class="flex items-center gap-3 p-3 rounded-lg border border-line hover:border-accent/40 bg-panel-2/50 text-left transition-colors" data-symbol="${i(e.symbol)}" data-type="${i(e.type||"crypto")}">
      <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/30 to-green/20 grid place-items-center text-[11px] font-black">${i((e.symbol||"").slice(0,3))}</div>
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-sm truncate">${i(e.symbol)}</div>
        <div class="text-[11px] text-muted truncate">${i(e.name||e.symbol)}</div>
      </div>
      <div class="text-right">
        <div class="text-sm font-mono font-semibold">${m(e.price||e.q_price,e.type)}</div>
        <div class="text-[11px] ${Number(e.change_pct||e.q_change||0)>=0?"text-green":"text-red"}">${v(e.change_pct||e.q_change||0)}</div>
      </div>
    </button>
  `).join(""),a.querySelectorAll("[data-symbol]").forEach(e=>{e.addEventListener("click",()=>b("trade",{symbol:e.dataset.symbol,type:e.dataset.type}))}))}function f(t,s){const a=t.querySelector("#home-positions");if(a){if(!s.length){a.innerHTML='<p class="text-muted text-sm text-center py-6">No open positions</p>';return}a.innerHTML=`<div class="space-y-2">${s.map(y).join("")}</div>`}}function y(t){const s=Number(t.pnl||t.unrealized_pnl||0);return`<div class="flex items-center justify-between p-3 rounded-lg bg-panel-2/50 border border-line">
    <div><strong class="text-sm">${i(t.symbol)}</strong><span class="text-[11px] text-muted ml-2">${i(t.side||"BUY")}</span></div>
    <div class="text-right"><div class="text-sm font-mono ${s>=0?"text-green":"text-red"}">${d(s)}</div></div>
  </div>`}function r(t,s,a){return`<div class="p-3 rounded-lg bg-panel-2/60 border border-line/50">
    <div class="text-[10px] uppercase text-muted tracking-wide">${t}</div>
    <div class="text-base font-bold mt-1">${s}</div>
    <div class="text-[10px] text-muted">${a||""}</div>
  </div>`}function n(t,s,a){return`<a href="${a}" class="flex flex-col items-center gap-2 p-3 rounded-lg border border-line hover:border-accent/40 bg-panel-2/30 transition-colors">
    <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-accent/20 to-green/10 grid place-items-center text-accent">${p[s]||""}</span>
    <span class="text-xs font-medium">${t}</span>
  </a>`}function h(t){return t!=="real"?`<div class="relative min-h-[180px]">
      <div class="flex gap-4 overflow-x-auto pb-3 blur-[4px] opacity-50 pointer-events-none">
        ${Array(4).fill(0).map(()=>'<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>').join("")}
      </div>
      <div class="absolute inset-0 grid place-items-center">
        <div class="card-glass text-center p-6 max-w-sm">
          <span class="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-green grid place-items-center mx-auto mb-3">${p.lock}</span>
          <strong class="block">Real Account Only</strong>
          <p class="text-muted text-sm mt-1">Switch to Real and verify KYC to copy live signals.</p>
        </div>
      </div>
    </div>`:`<div class="flex gap-4 overflow-x-auto pb-3 snap-x" id="copy-scroller">
    ${Array(3).fill(0).map(()=>'<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>').join("")}
  </div>`}function $(){const t=l("wallet")||{};return l("mode")==="real"?t.real||{balance:0,available:0,currency:"USDT"}:t.demo||{balance:1e4,available:1e4,currency:"USDT_DEMO"}}export{_ as mount,k as render};
