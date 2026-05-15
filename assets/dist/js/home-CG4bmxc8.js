import{g,e as c,m as v,a as f,i as S,b as $,p as _,n as N,c as b,t as q}from"./main-CRE-6vA0.js";import{m as E,a as A}from"./marketIcon-BqfrwX_4.js";function J(){const e=g("brand")||{},s=z(),a=g("mode");return`
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
          ${x("Available",v(s.available),s.currency)}
          ${x("Balance",v(s.balance),s.currency)}
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
          ${Y(a)}
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
    </div>`}function X(e){U(e)}async function U(e){try{const[s,a,t]=await Promise.all([f("/markets.php?scope=home&supported=1&lite=1&with_quotes=1",{timeout:7e3}),f("/trade/portfolio.php",{timeout:7e3}),f("/signals.php?bot=1&home=1&lang=en",{timeout:7e3}).catch(()=>null)]);if(s&&s.items){const n=s.items.slice(0,12);j(e,n);const i=n.filter(r=>Number(r.price||r.q_price||0)<=0);i.length&&P(e,i)}a&&a.positions&&D(e,a.positions.slice(0,5)),t&&t.items&&t.items.length&&T(e,t.items)}catch{}}function T(e,s){const a=e.querySelector("#home-copy-section");a&&(a.innerHTML=`<div class="flex gap-3 overflow-x-auto pb-2 snap-x">${s.slice(0,6).map(t=>{const n=(t.direction||"BUY").toUpperCase(),i=t.symbol||t.market_symbol||"--";return`<div class="shrink-0 w-[280px] copy-card snap-start">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2 min-w-0">
          ${w({symbol:i,type:t.type||t.market_type},"market-logo")}
          <div class="min-w-0">
            <strong class="text-xs truncate block">${c(i)}</strong>
            <span class="text-[10px] text-muted truncate block">${c(t.bot_name||t.bot_name_en||t.timeframe||"Copy signal")}</span>
          </div>
        </div>
        <span class="badge-${n==="BUY"?"buy":"sell"}">${n}</span>
      </div>
      <div class="copy-card__quote py-2">
        <span class="status-chip ${Number(t.live_price||0)>0?"status-chip-live":"status-chip-locked"}">${Number(t.live_price||0)>0?"LIVE":"READY"}</span>
        <strong>${Number(t.live_price||0)>0?"$"+v(t.live_price,t.type==="forex"?5:2):"--"}</strong>
        <span class="${Number(t.live_change_pct||0)>=0?"text-buy":"text-sell"}">${_(t.live_change_pct||0)}</span>
      </div>
      <div class="grid grid-cols-3 gap-1 text-[10px] mt-2">
        <div><span class="text-muted">Entry</span><div class="font-mono">${k(t.entry||t.entry_price,t.type)}</div></div>
        <div><span class="text-muted">TP</span><div class="font-mono text-buy">${k(t.tp1||t.take_profit_1||t.take_profit,t.type)}</div></div>
        <div><span class="text-muted">SL</span><div class="font-mono text-sell">${k(t.sl||t.stop_loss,t.type)}</div></div>
      </div>
      ${V(t)?'<p class="text-[10px] text-muted mt-2">Awaiting desk levels</p>':F(t)}
      <a href="#/invest" class="btn-primary btn-sm w-full mt-3">Open copy desk</a>
    </div>`}).join("")}</div>`)}function j(e,s){const a=e.querySelector("#home-markets");a&&(a.innerHTML=s.map(t=>`
    <button class="home-market-card" data-symbol="${$(t.symbol)}" data-type="${$(t.type||"crypto")}">
      ${w(t,"home-market-icon")}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <div class="font-semibold text-sm truncate">${c(t.symbol)}</div>
          ${B(t)}
        </div>
        <div class="text-[11px] text-muted truncate">${c(t.name||t.symbol)}</div>
        <div class="mini-spark" aria-hidden="true">${W(t.symbol)}</div>
      </div>
      <div class="text-right">
        <div class="text-sm font-mono font-semibold" data-home-price>${Q(t.price||t.q_price,t.type)}</div>
        <div class="text-[11px] ${Number(t.change_pct||t.q_change||0)>=0?"text-green":"text-red"}" data-home-change>${_(t.change_pct||t.q_change||0)}</div>
        <div class="text-[9px] text-muted uppercase mt-1" data-home-source>${h(t)}</div>
      </div>
    </button>
  `).join(""),a.querySelectorAll("[data-symbol]").forEach(t=>{t.addEventListener("click",()=>N("trade",{symbol:t.dataset.symbol,type:t.dataset.type}))}))}async function P(e,s){const a=new Map;s.forEach(n=>{const i=String(n.symbol||"").toUpperCase(),r=n.type||"crypto";i&&(a.has(r)||a.set(r,[]),a.get(r).push(i))});const t=[];await Promise.all([...a.entries()].map(async([n,i])=>{const r=await f(`/quotes.php?symbols=${encodeURIComponent(i.join(","))}&type=${encodeURIComponent(n)}&visible=1&purpose=watchlist`,{timeout:6500}).catch(()=>null),l=new Set;r?.items?.length&&r.items.forEach(o=>{l.add(String(o.symbol||"").toUpperCase()),C(e,o,n)}),i.forEach(o=>{const d=L(e,o),p=d&&d.querySelector("[data-home-price]")?.textContent!=="--";(!l.has(o)||!p)&&t.push({symbol:o,type:n})})})),R(e,t)}async function R(e,s){const a=new Map;s.forEach(t=>{!t.symbol||!t.type||(a.has(t.type)||a.set(t.type,[]),a.get(t.type).push(t.symbol))});for(const[t,n]of a.entries()){const i=t==="crypto"?12:2,r=t==="crypto"?12:4,l=[...new Set(n)].slice(0,r);for(let o=0;o<l.length;o+=i){const d=l.slice(o,o+i),p=await f(`/quotes.php?symbols=${encodeURIComponent(d.join(","))}&type=${encodeURIComponent(t)}&cache_only=1&purpose=watchlist`,{timeout:3500}).catch(()=>null);p?.items?.length&&p.items.forEach(y=>C(e,y,t))}}}function C(e,s,a){const t=String(s.symbol||"").toUpperCase(),n=L(e,t);if(!n)return;const i=n.dataset.type||s.type||a,r=Number(s.price||s.q_price||0),l=Number(s.change_pct||s.q_change||0),o=n.querySelector("[data-home-price]"),d=n.querySelector("[data-home-change]"),p=n.querySelector("[data-home-source]");o&&r>0&&(o.textContent=b(r,i)),d&&(d.textContent=_(l),d.className=`text-[11px] ${l>=0?"text-green":"text-red"}`),p&&r>0&&(p.textContent=h(s));const y=n.querySelector("[data-quote-chip]");y&&r>0&&(y.className=`status-chip ${M(s)}`,y.textContent=h(s))}function L(e,s){return[...e.querySelectorAll("[data-symbol]")].find(a=>String(a.dataset.symbol||"").toUpperCase()===String(s||"").toUpperCase())}function w(e,s){const a=e.symbol||"--";return`<span class="${s}">
    <img src="${$(E(e,e.type||"crypto"))}" alt="${$(a)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';" />
    <b>${c(A(a))}</b>
  </span>`}function D(e,s){const a=e.querySelector("#home-positions");if(a){if(!s.length){a.innerHTML='<p class="text-muted text-sm text-center py-6">No open positions</p>';return}a.innerHTML=`<div class="grid gap-2 lg:grid-cols-2">${s.map(H).join("")}</div>`}}function H(e){const s=Number(e.pnl||e.unrealized_pnl||0),a=String(e.symbol||"").replace("@R@",""),t=e.asset_type||e.type||"crypto",n=Number(e.mark_price||e.current_price||e.price||0);return`<div class="position-card">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 min-w-0">
        ${w({symbol:a,type:t},"market-logo !h-8 !w-8")}
        <div class="min-w-0">
          <strong class="text-sm truncate block">${c(a)}</strong>
          <span class="text-[10px] text-muted">${c(e.market_type||e.order_type||"spot")} / ${c(I(e))}</span>
        </div>
      </div>
      <div class="text-right">
        <div class="text-sm font-mono ${s>=0?"text-green":"text-red"}">${v(s)}</div>
        <div class="text-[10px] text-muted">PnL</div>
      </div>
    </div>
    <div class="position-metrics mt-3">
      ${u("Entry",b(e.entry_price||e.open_price,t))}
      ${u("Mark",n>0?b(n,t):"--")}
      ${u("Size",v(e.qty||e.amount||e.size||e.units||0))}
      ${u("Lev",`${e.leverage||1}x`)}
      ${u("Margin",v(e.margin_initial||e.margin||0))}
      ${u("ROE",_(e.roe_pct||e.roe||0))}
      ${u("Opened",O(e))}
    </div>
  </div>`}function u(e,s){return`<span><small>${e}</small><strong>${s}</strong></span>`}function I(e){return String(e.side||"buy").toUpperCase()==="SELL"?"SELL":"BUY"}function O(e){const s=e.created_at||e.opened_at||e.open_time||"";if(!s)return"--";const a=typeof s=="number"?s:/^\d+$/.test(String(s))?Number(s):Math.floor(Date.parse(s)/1e3);return Number.isFinite(a)&&a>0?q(a):"--"}function x(e,s,a){return`<div class="p-3 rounded-lg bg-panel-2/60 border border-line/50">
    <div class="text-[10px] uppercase text-muted tracking-wide">${e}</div>
    <div class="text-base font-bold mt-1">${s}</div>
    <div class="text-[10px] text-muted">${a||""}</div>
  </div>`}function m(e,s,a){return`<a href="${a}" class="flex flex-col items-center gap-2 p-3 rounded-lg border border-line hover:border-accent/40 bg-panel-2/30 transition-colors">
    <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-accent/20 to-green/10 grid place-items-center text-accent">${S[s]||""}</span>
    <span class="text-xs font-medium">${e}</span>
  </a>`}function Y(e){return e!=="real"?`<div class="relative min-h-[180px]">
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
  </div>`}function z(){const e=g("wallet")||{};return g("mode")==="real"?e.real||{balance:0,available:0,currency:"USDT"}:e.demo||{balance:1e4,available:1e4,currency:"USDT_DEMO"}}function Q(e,s){const a=Number(e||0);return a>0?b(a,s):"--"}function h(e){const s=String(e.source||e.provider||"").toLowerCase(),a=String(e.timing_class||"").toLowerCase();return Number(e.price||e.q_price||0)<=0?"Unavailable":a==="stale"||e.is_stale?"Stale":e.delayed||s.includes("yahoo")?"Delayed":s.includes("binance")||s.includes("stream")||a==="live"?"Live":s?s.replace(/_/g," "):"Cached"}function M(e){const s=h(e).toLowerCase();return s==="live"?"status-chip-live":s==="unavailable"?"status-chip-locked":"status-chip-delayed"}function B(e){return`<span data-quote-chip class="status-chip ${M(e)}">${h(e)}</span>`}function W(e){const s=String(e||"").split("").reduce((a,t)=>a+t.charCodeAt(0),0);return Array.from({length:12},(a,t)=>`<i style="height:${18+(s+t*13)%26}px"></i>`).join("")}function k(e,s){const a=Number(e||0);return a>0?b(a,s):"--"}function V(e){return!(Number(e.entry||e.entry_price||0)>0)||!(Number(e.tp1||e.take_profit_1||e.take_profit||0)>0)||!(Number(e.sl||e.stop_loss||0)>0)}function F(e){return e.levels_source==="live_derived"?'<p class="text-[10px] text-spread mt-2">Live-derived desk levels</p>':""}export{X as mount,J as render};
