import{g,e as c,m as y,a as v,i as S,b as $,p as w,n as q,c as f}from"./main-D-aN4DSy.js";import{m as L,a as E}from"./marketIcon-BqfrwX_4.js";function K(){const e=g("brand")||{},s=I(),a=g("mode");return`
    <div class="space-y-6 animate-fade-in">
      <!-- Hero -->
      <section class="card bg-gradient-to-br from-panel-2 to-panel relative overflow-hidden">
        <div class="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_30%_20%,#5d7cff,transparent_50%)]"></div>
        <div class="relative space-y-3">
          <span class="badge-accent">${c(e.name)}</span>
          <h1 class="text-xl lg:text-2xl font-bold">${a==="real"?"Real Trading Workspace":"Demo Trading Workspace"}</h1>
          <p class="text-muted text-sm max-w-lg">${c(e.tagline||"Professional multi-market trading platform")}</p>
        </div>
        <div class="relative mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${x("Available",y(s.available),s.currency)}
          ${x("Balance",y(s.balance),s.currency)}
          ${x("Mode",a==="real"?"Real":"Demo",a==="real"?"Live":"Practice")}
          ${x("Markets","6","Active types")}
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="card">
        <h2 class="text-base font-semibold mb-3">Quick Actions</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          ${m("Deposit","deposit","#/deposit")}
          ${m("Withdraw","withdraw","#/withdraw")}
          ${m("KYC","kyc","#/kyc")}
          ${m("Earn","earn","#/invest")}
          ${m("Support","support","#/support")}
          ${m("News","news","#/news")}
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
          ${H(a)}
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
    </div>`}function V(e){A(e)}async function A(e){try{const[s,a,t]=await Promise.all([v("/markets.php?scope=home&supported=1&lite=1&with_quotes=1",{timeout:7e3}),v("/trade/portfolio.php",{timeout:7e3}),v("/signals.php?bot=1&home=1&lang=en",{timeout:7e3}).catch(()=>null)]);if(s&&s.items){const n=s.items.slice(0,12);T(e,n),j(e,n)}a&&a.positions&&R(e,a.positions.slice(0,5)),t&&t.items&&t.items.length&&U(e,t.items)}catch{}}function U(e,s){const a=e.querySelector("#home-copy-section");a&&(a.innerHTML=`<div class="flex gap-3 overflow-x-auto pb-2 snap-x">${s.slice(0,6).map(t=>{const n=(t.direction||"BUY").toUpperCase(),o=t.symbol||t.market_symbol||"--";return`<div class="shrink-0 w-[280px] copy-card snap-start">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2 min-w-0">
          ${_({symbol:o,type:t.type||t.market_type},"market-logo")}
          <div class="min-w-0">
            <strong class="text-xs truncate block">${c(o)}</strong>
            <span class="text-[10px] text-muted truncate block">${c(t.bot_name||t.bot_name_en||t.timeframe||"Copy signal")}</span>
          </div>
        </div>
        <span class="badge-${n==="BUY"?"buy":"sell"}">${n}</span>
      </div>
      <div class="copy-card__quote py-2">
        <span class="status-chip ${Number(t.live_price||0)>0?"status-chip-live":"status-chip-locked"}">${Number(t.live_price||0)>0?"LIVE":"READY"}</span>
        <strong>${Number(t.live_price||0)>0?"$"+y(t.live_price,t.type==="forex"?5:2):"--"}</strong>
        <span class="${Number(t.live_change_pct||0)>=0?"text-buy":"text-sell"}">${w(t.live_change_pct||0)}</span>
      </div>
      <div class="grid grid-cols-3 gap-1 text-[10px] mt-2">
        <div><span class="text-muted">Entry</span><div class="font-mono">${k(t.entry||t.entry_price,t.type)}</div></div>
        <div><span class="text-muted">TP</span><div class="font-mono text-buy">${k(t.tp1||t.take_profit_1||t.take_profit,t.type)}</div></div>
        <div><span class="text-muted">SL</span><div class="font-mono text-sell">${k(t.sl||t.stop_loss,t.type)}</div></div>
      </div>
      ${B(t)?'<p class="text-[10px] text-muted mt-2">Awaiting desk levels</p>':""}
      <a href="#/invest" class="btn-primary btn-sm w-full mt-3">Open copy desk</a>
    </div>`}).join("")}</div>`)}function T(e,s){const a=e.querySelector("#home-markets");a&&(a.innerHTML=s.map(t=>`
    <button class="home-market-card" data-symbol="${$(t.symbol)}" data-type="${$(t.type||"crypto")}">
      ${_(t,"home-market-icon")}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <div class="font-semibold text-sm truncate">${c(t.symbol)}</div>
          ${z(t)}
        </div>
        <div class="text-[11px] text-muted truncate">${c(t.name||t.symbol)}</div>
        <div class="mini-spark" aria-hidden="true">${Q(t.symbol)}</div>
      </div>
      <div class="text-right">
        <div class="text-sm font-mono font-semibold" data-home-price>${Y(t.price||t.q_price,t.type)}</div>
        <div class="text-[11px] ${Number(t.change_pct||t.q_change||0)>=0?"text-green":"text-red"}" data-home-change>${w(t.change_pct||t.q_change||0)}</div>
        <div class="text-[9px] text-muted uppercase mt-1" data-home-source>${b(t)}</div>
      </div>
    </button>
  `).join(""),a.querySelectorAll("[data-symbol]").forEach(t=>{t.addEventListener("click",()=>q("trade",{symbol:t.dataset.symbol,type:t.dataset.type}))}))}async function j(e,s){const a=new Map;s.forEach(n=>{const o=String(n.symbol||"").toUpperCase(),r=n.type||"crypto";o&&(a.has(r)||a.set(r,[]),a.get(r).push(o))});const t=[];await Promise.all([...a.entries()].map(async([n,o])=>{const r=await v(`/quotes.php?symbols=${encodeURIComponent(o.join(","))}&type=${encodeURIComponent(n)}&visible=1&purpose=watchlist`,{timeout:6500}).catch(()=>null),l=new Set;r?.items?.length&&r.items.forEach(i=>{l.add(String(i.symbol||"").toUpperCase()),C(e,i,n)}),o.forEach(i=>{const d=M(e,i),p=d&&d.querySelector("[data-home-price]")?.textContent!=="--";(!l.has(i)||!p)&&t.push({symbol:i,type:n})})})),P(e,t)}async function P(e,s){const a=new Map;s.forEach(t=>{!t.symbol||!t.type||(a.has(t.type)||a.set(t.type,[]),a.get(t.type).push(t.symbol))});for(const[t,n]of a.entries()){const o=t==="crypto"?12:2,r=t==="crypto"?12:4,l=[...new Set(n)].slice(0,r);for(let i=0;i<l.length;i+=o){const d=l.slice(i,i+o),p=await v(`/quotes.php?symbols=${encodeURIComponent(d.join(","))}&type=${encodeURIComponent(t)}&fresh=1&purpose=home`,{timeout:6500}).catch(()=>null);p?.items?.length&&p.items.forEach(u=>C(e,u,t))}}}function C(e,s,a){const t=String(s.symbol||"").toUpperCase(),n=M(e,t);if(!n)return;const o=n.dataset.type||s.type||a,r=Number(s.price||s.q_price||0),l=Number(s.change_pct||s.q_change||0),i=n.querySelector("[data-home-price]"),d=n.querySelector("[data-home-change]"),p=n.querySelector("[data-home-source]");i&&r>0&&(i.textContent=f(r,o)),d&&(d.textContent=w(l),d.className=`text-[11px] ${l>=0?"text-green":"text-red"}`),p&&r>0&&(p.textContent=b(s));const u=n.querySelector("[data-quote-chip]");u&&r>0&&(u.className=`status-chip ${N(s)}`,u.textContent=b(s))}function M(e,s){return[...e.querySelectorAll("[data-symbol]")].find(a=>String(a.dataset.symbol||"").toUpperCase()===String(s||"").toUpperCase())}function _(e,s){const a=e.symbol||"--";return`<span class="${s}">
    <img src="${$(L(e,e.type||"crypto"))}" alt="${$(a)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';" />
    <b>${c(E(a))}</b>
  </span>`}function R(e,s){const a=e.querySelector("#home-positions");if(a){if(!s.length){a.innerHTML='<p class="text-muted text-sm text-center py-6">No open positions</p>';return}a.innerHTML=`<div class="grid gap-2 lg:grid-cols-2">${s.map(D).join("")}</div>`}}function D(e){const s=Number(e.pnl||e.unrealized_pnl||0),a=String(e.symbol||"").replace("@R@",""),t=e.asset_type||e.type||"crypto",n=Number(e.mark_price||e.current_price||e.price||0);return`<div class="position-card">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 min-w-0">
        ${_({symbol:a,type:t},"market-logo !h-8 !w-8")}
        <div class="min-w-0">
          <strong class="text-sm truncate block">${c(a)}</strong>
          <span class="text-[10px] text-muted">${c(e.market_type||e.order_type||"spot")} • ${c(e.side||"BUY")}</span>
        </div>
      </div>
      <div class="text-right">
        <div class="text-sm font-mono ${s>=0?"text-green":"text-red"}">${y(s)}</div>
        <div class="text-[10px] text-muted">PnL</div>
      </div>
    </div>
    <div class="position-metrics mt-3">
      ${h("Entry",f(e.entry_price||e.open_price,t))}
      ${h("Mark",n>0?f(n,t):"--")}
      ${h("Size",y(e.amount||e.size||e.units||0))}
      ${h("Lev",`${e.leverage||1}x`)}
    </div>
  </div>`}function h(e,s){return`<span><small>${e}</small><strong>${s}</strong></span>`}function x(e,s,a){return`<div class="p-3 rounded-lg bg-panel-2/60 border border-line/50">
    <div class="text-[10px] uppercase text-muted tracking-wide">${e}</div>
    <div class="text-base font-bold mt-1">${s}</div>
    <div class="text-[10px] text-muted">${a||""}</div>
  </div>`}function m(e,s,a){return`<a href="${a}" class="flex flex-col items-center gap-2 p-3 rounded-lg border border-line hover:border-accent/40 bg-panel-2/30 transition-colors">
    <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-accent/20 to-green/10 grid place-items-center text-accent">${S[s]||""}</span>
    <span class="text-xs font-medium">${e}</span>
  </a>`}function H(e){return e!=="real"?`<div class="relative min-h-[180px]">
      <div class="flex gap-4 overflow-x-auto pb-3 blur-[4px] opacity-50 pointer-events-none">
        ${Array(4).fill(0).map(()=>'<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>').join("")}
      </div>
      <div class="absolute inset-0 grid place-items-center">
        <div class="card-glass text-center p-6 max-w-sm">
          <span class="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-green grid place-items-center mx-auto mb-3">${S.lock}</span>
          <strong class="block">Real Account Only</strong>
          <p class="text-muted text-sm mt-1">Switch to Real and verify KYC to copy live signals.</p>
        </div>
      </div>
    </div>`:`<div class="flex gap-4 overflow-x-auto pb-3 snap-x" id="copy-scroller">
    ${Array(3).fill(0).map(()=>'<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>').join("")}
  </div>`}function I(){const e=g("wallet")||{};return g("mode")==="real"?e.real||{balance:0,available:0,currency:"USDT"}:e.demo||{balance:1e4,available:1e4,currency:"USDT_DEMO"}}function Y(e,s){const a=Number(e||0);return a>0?f(a,s):"--"}function b(e){const s=String(e.source||e.provider||"").toLowerCase(),a=String(e.timing_class||"").toLowerCase();return Number(e.price||e.q_price||0)<=0?"Unavailable":a==="stale"||e.is_stale?"Stale":e.delayed||s.includes("yahoo")?"Delayed":s.includes("binance")||s.includes("stream")||a==="live"?"Live":s?s.replace(/_/g," "):"Cached"}function N(e){const s=b(e).toLowerCase();return s==="live"?"status-chip-live":s==="unavailable"?"status-chip-locked":"status-chip-delayed"}function z(e){return`<span data-quote-chip class="status-chip ${N(e)}">${b(e)}</span>`}function Q(e){const s=String(e||"").split("").reduce((a,t)=>a+t.charCodeAt(0),0);return Array.from({length:12},(a,t)=>`<i style="height:${18+(s+t*13)%26}px"></i>`).join("")}function k(e,s){const a=Number(e||0);return a>0?f(a,s):"--"}function B(e){return!(Number(e.entry||e.entry_price||0)>0)||!(Number(e.tp1||e.take_profit_1||e.take_profit||0)>0)||!(Number(e.sl||e.stop_loss||0)>0)}export{V as mount,K as render};
