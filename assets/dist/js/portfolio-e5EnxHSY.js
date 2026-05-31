import{h as f,i as b,b as $,e as s,m as n,d as w,k as u,f as _,j as M}from"./main-CgotEs2f.js";function C(){const t=f("mode");return`
    <div class="space-y-6 animate-fade-in">
      <section class="card portfolio-hero">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span class="badge-accent">Portfolio</span>
            <h1 class="text-xl font-bold mt-1">Positions & Orders</h1>
            <p class="text-muted text-sm">Monitor live exposure, review order history, and manage open trades with a mobile-friendly activity ledger.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="status-chip ${t==="real"?"status-chip-live":"status-chip-derived"}">${t==="real"?"Real workspace":"Demo workspace"}</span>
            <button class="btn-ghost btn-sm" id="refresh-portfolio">${b.refresh} Refresh</button>
          </div>
        </div>
      </section>

      <!-- Summary Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3" id="portfolio-metrics">
        ${h()}${h()}${h()}${h()}
      </div>

      <!-- Positions -->
      <section class="card">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold">Open Positions</h2>
          <span class="badge-green" id="pos-count">0 open</span>
        </div>
        <div class="overflow-x-auto" id="positions-table">
          <p class="text-muted text-sm text-center py-8">Loading positions...</p>
        </div>
      </section>

      <!-- Orders -->
      <section class="card">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold">Pending Orders</h2>
          <span class="text-xs text-muted" id="orders-count">0</span>
        </div>
        <div class="overflow-x-auto" id="orders-table">
          <p class="text-muted text-sm text-center py-8">Loading orders...</p>
        </div>
      </section>
    </div>`}function z(t){v(t),t.querySelector("#refresh-portfolio")?.addEventListener("click",()=>v(t))}async function v(t){try{const[e,r]=await Promise.all([$("/trade/portfolio.php",{timeout:8e3}),$("/trade/orders.php",{timeout:8e3})]);e&&(k(t,e),positionTable(t,e.positions||[])),r&&q(t,r.items||r.orders||[])}catch(e){t.querySelector("#positions-table").innerHTML=`<p class="text-red text-sm text-center py-4">${s(e.message)}</p>`}}function k(t,e){const r=e.positions||[],o=Number(e.balance||e.equity||0),i=Number(e.open_pnl||e.unrealized_pnl||0),m=Number(e.equity||o+i),l=Number(e.margin_used||e.margin||0),c=Number(e.free_margin||o-l),p=t.querySelector("#portfolio-metrics");p&&(p.innerHTML=`
      <div class="portfolio-metric is-${i>=0?"positive":"negative"}">
        <div class="metric-icon">${b.wallet}</div>
        <span>Total Equity</span>
        <strong>${n(m)}</strong>
        <small>Balance + open PnL</small>
      </div>
      <div class="portfolio-metric is-${i>=0?"positive":"negative"}">
        <div class="metric-icon">${b.earn}</div>
        <span>Open PnL</span>
        <strong class="${i>=0?"text-buy":"text-sell"}">${i>=0?"+":""}${n(i)}</strong>
        <small>Unrealized profit/loss</small>
      </div>
      <div class="portfolio-metric">
        <div class="metric-icon">${b.trade}</div>
        <span>Margin Used</span>
        <strong>${n(l)}</strong>
        <small>Locked as collateral</small>
      </div>
      <div class="portfolio-metric">
        <div class="metric-icon">${b.deposit}</div>
        <span>Free Margin</span>
        <strong>${n(Math.max(0,c))}</strong>
        <small>Available to trade</small>
      </div>
    `,p.innerHTML=`
      ${y("Equity",n(m),"Total value")}
      ${y("Open PnL",n(i),i>=0?"Profit":"Loss",i>=0?"text-green":"text-red")}
      ${y("Positions",String(r.length),"Open trades")}
      ${y("Balance",n(o),f("mode")==="real"?"USDT":"USDT_DEMO")}`);const g=t.querySelector("#pos-count");g&&(g.textContent=`${r.length} open`);const d=t.querySelector("#positions-table");if(d){if(!r.length){d.innerHTML='<p class="text-muted text-sm text-center py-8">No open positions. Start trading to see them here.</p>';return}d.innerHTML=`
    <div class="portfolio-mobile-list md:hidden">
      ${r.map(T).join("")}
    </div>
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
          <th class="text-left py-2 px-2">Symbol</th><th class="text-left py-2">Side</th><th class="text-left py-2">Type</th><th class="text-right py-2">Entry</th><th class="text-right py-2">Mark</th><th class="text-right py-2">Size</th><th class="text-right py-2">Lev</th><th class="text-right py-2">Margin</th><th class="text-right py-2">PnL</th><th class="text-right py-2 px-2">Action</th>
        </tr></thead>
        <tbody>${r.map(P).join("")}</tbody>
      </table>
    </div>`,w(d,"[data-close-pos]","click",(x,L)=>O(L.dataset.closePos,t))}}function S(t){const e=Number(t.pnl||t.unrealized_pnl||0),r=t.asset_type||t.type||"crypto",o=Number(t.mark_price||t.current_price||t.price||0),i=t.position_id||t.id||"",m=String(t.symbol||"").replace("@R@",""),l=String(t.side||"buy").toUpperCase()==="SELL"?"SELL":"BUY",c=Number(t.entry_price||t.open_price||0),p=Number(t.qty||t.amount||t.size||t.units||0),g=Number(t.margin_initial||t.margin||t.initial_margin||t.used_margin||0),d=Number(t.leverage||1),x=t.opened_at_label||t.created_at||t.opened_at||t.updated_at||"";return{pnl:e,type:r,mark:o,id:i,symbol:m,side:l,entry:c,size:p,margin:g,leverage:d,opened:x}}function P(t){const{pnl:e,type:r,mark:o,id:i,symbol:m,side:l,entry:c,size:p,margin:g,leverage:d}=S(t);return`<tr class="border-b border-line/50 hover:bg-panel-2/30">
    <td class="py-2.5 px-2 font-semibold">${s(m)}</td>
    <td class="py-2.5"><span class="badge ${l==="BUY"?"badge-green":"badge-red"}">${s(l)}</span></td>
    <td class="py-2.5 text-xs text-muted">${s(t.market_type||t.order_type||"spot")}</td>
    <td class="py-2.5 text-right font-mono text-xs">${c>0?u(c,r):"--"}</td>
    <td class="py-2.5 text-right font-mono text-xs">${o>0?u(o,r):"--"}</td>
    <td class="py-2.5 text-right text-xs">${n(p)}</td>
    <td class="py-2.5 text-right font-mono text-xs">${s(String(d||1))}x</td>
    <td class="py-2.5 text-right text-xs">${n(g)}</td>
    <td class="py-2.5 text-right font-mono ${e>=0?"text-green":"text-red"}">${n(e)}</td>
    <td class="py-2.5 text-right px-2">${i?`<button class="btn-ghost btn-sm text-red" data-close-pos="${_(i)}">Close</button>`:""}</td>
  </tr>`}function T(t){const{pnl:e,type:r,mark:o,id:i,symbol:m,side:l,entry:c,size:p,margin:g,leverage:d,opened:x}=S(t);return`<article class="portfolio-position-card">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <strong>${s(m)}</strong>
          <span class="badge ${l==="BUY"?"badge-green":"badge-red"}">${s(l)}</span>
        </div>
        <small>${s(t.market_type||t.order_type||"spot")} - ${s(x||"")}</small>
      </div>
      <div class="text-right">
        <span class="text-[10px] text-muted">Open PnL</span>
        <b class="${e>=0?"text-green":"text-red"}">${n(e)}</b>
      </div>
    </div>
    <div class="portfolio-position-metrics">
      ${a("Entry",c>0?u(c,r):"--")}
      ${a("Mark",o>0?u(o,r):"--")}
      ${a("Size",n(p))}
      ${a("Lev",`${s(String(d||1))}x`)}
      ${a("Margin",n(g))}
      ${a("Mode",s(t.mode||f("mode")||"demo"))}
      ${a("Opened",s(x||"--"))}
      ${a("Type",s(t.asset_type||t.type||"--"))}
    </div>
    ${i?`<button class="btn-ghost btn-sm text-red w-full" data-close-pos="${_(i)}">Close position</button>`:""}
  </article>`}function q(t,e){const r=t.querySelector("#orders-table"),o=t.querySelector("#orders-count");if(o&&(o.textContent=`${e.length}`),!!r){if(!e.length){r.innerHTML='<p class="text-muted text-sm text-center py-8">No pending orders.</p>';return}r.innerHTML=`
    <div class="portfolio-mobile-list md:hidden">
      ${e.map(N).join("")}
    </div>
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
          <th class="text-left py-2">Symbol</th><th class="text-left py-2">Type</th><th class="text-right py-2">Price</th><th class="text-right py-2">Amount</th><th class="text-right py-2">Status</th>
        </tr></thead>
        <tbody>${e.map(i=>`<tr class="border-b border-line/50">
          <td class="py-2 font-semibold">${s(i.symbol)}</td>
          <td class="py-2 text-xs">${s(i.order_type||"LIMIT")} ${s(i.side)}</td>
          <td class="py-2 text-right font-mono text-xs">${u(i.price||i.limit_price)}</td>
          <td class="py-2 text-right">${n(i.amount)}</td>
          <td class="py-2 text-right"><span class="badge badge-accent">${s(i.status||"pending")}</span></td>
        </tr>`).join("")}</tbody>
      </table>
    </div>`}}function N(t){return`<article class="order-mobile-card">
    <div class="flex items-start justify-between gap-3">
      <div>
        <strong>${s(t.symbol||"--")}</strong>
        <small>${s(t.order_type||"LIMIT")} ${s(t.side||"")}</small>
      </div>
      <span class="badge badge-accent">${s(t.status||"pending")}</span>
    </div>
    <div class="portfolio-position-metrics">
      ${a("Price",u(t.price||t.limit_price))}
      ${a("Amount",n(t.amount))}
      ${a("Created",s(t.created_at||"--"))}
      ${a("Mode",s(t.mode||f("mode")||"demo"))}
      ${a("Status",s(t.status||"pending"))}
      ${a("Side",s(t.side||"--"))}
    </div>
  </article>`}function a(t,e){return`<span><small>${s(t)}</small><strong>${e}</strong></span>`}async function O(t,e){if(t)try{await M("/trade/close_position.php",{position_id:t}),v(e)}catch{}}function y(t,e,r,o=""){return`<div class="p-3 rounded-lg bg-panel-2/60 border border-line/50">
    <div class="text-[10px] uppercase text-muted tracking-wide">${t}</div>
    <div class="text-lg font-bold mt-1 ${o}">${e}</div>
    <div class="text-[10px] text-muted">${r}</div>
  </div>`}function h(){return'<div class="skeleton h-20 rounded-lg"></div>'}export{z as mount,C as render};
