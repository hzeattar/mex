import{g as u,i as v,a as b,e as s,m as a,d as _,c,b as h,h as S}from"./main-C8Tpj3-j.js";function O(){const t=u("mode");return`
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
            <button class="btn-ghost btn-sm" id="refresh-portfolio">${v.refresh} Refresh</button>
          </div>
        </div>
      </section>

      <!-- Summary Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3" id="portfolio-metrics">
        ${x()}${x()}${x()}${x()}
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
    </div>`}function j(t){g(t),t.querySelector("#refresh-portfolio")?.addEventListener("click",()=>g(t))}async function g(t){try{const[e,i]=await Promise.all([b("/trade/portfolio.php",{timeout:8e3}),b("/trade/orders.php",{timeout:8e3})]);e&&w(t,e),i&&M(t,i.items||i.orders||[])}catch(e){t.querySelector("#positions-table").innerHTML=`<p class="text-red text-sm text-center py-4">${s(e.message)}</p>`}}function w(t,e){const i=e.positions||[],o=Number(e.balance||e.equity||0),r=Number(e.open_pnl||e.unrealized_pnl||0),l=Number(e.equity||o+r),d=t.querySelector("#portfolio-metrics");d&&(d.innerHTML=`
      ${m("Equity",a(l),"Total value")}
      ${m("Open PnL",a(r),r>=0?"Profit":"Loss",r>=0?"text-green":"text-red")}
      ${m("Positions",String(i.length),"Open trades")}
      ${m("Balance",a(o),u("mode")==="real"?"USDT":"USDT_DEMO")}`);const y=t.querySelector("#pos-count");y&&(y.textContent=`${i.length} open`);const p=t.querySelector("#positions-table");if(p){if(!i.length){p.innerHTML='<p class="text-muted text-sm text-center py-8">No open positions. Start trading to see them here.</p>';return}p.innerHTML=`
    <div class="portfolio-mobile-list md:hidden">
      ${i.map(k).join("")}
    </div>
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
          <th class="text-left py-2 px-2">Symbol</th><th class="text-left py-2">Side</th><th class="text-left py-2">Type</th><th class="text-right py-2">Entry</th><th class="text-right py-2">Mark</th><th class="text-right py-2">Size</th><th class="text-right py-2">Lev</th><th class="text-right py-2">Margin</th><th class="text-right py-2">PnL</th><th class="text-right py-2 px-2">Action</th>
        </tr></thead>
        <tbody>${i.map(L).join("")}</tbody>
      </table>
    </div>`,_(p,"[data-close-pos]","click",(q,$)=>T($.dataset.closePos,t))}}function f(t){const e=Number(t.pnl||t.unrealized_pnl||0),i=t.asset_type||t.type||"crypto",o=Number(t.mark_price||t.current_price||t.price||0),r=t.position_id||t.id||"",l=String(t.symbol||"").replace("@R@",""),d=String(t.side||"buy").toUpperCase()==="SELL"?"SELL":"BUY";return{pnl:e,type:i,mark:o,id:r,symbol:l,side:d}}function L(t){const{pnl:e,type:i,mark:o,id:r,symbol:l,side:d}=f(t);return`<tr class="border-b border-line/50 hover:bg-panel-2/30">
    <td class="py-2.5 px-2 font-semibold">${s(l)}</td>
    <td class="py-2.5"><span class="badge ${d==="BUY"?"badge-green":"badge-red"}">${s(d)}</span></td>
    <td class="py-2.5 text-xs text-muted">${s(t.market_type||t.order_type||"spot")}</td>
    <td class="py-2.5 text-right font-mono text-xs">${c(t.entry_price||t.open_price,i)}</td>
    <td class="py-2.5 text-right font-mono text-xs">${o>0?c(o,i):"--"}</td>
    <td class="py-2.5 text-right text-xs">${a(t.amount||t.size||t.units||0)}</td>
    <td class="py-2.5 text-right font-mono text-xs">${s(String(t.leverage||1))}x</td>
    <td class="py-2.5 text-right text-xs">${a(t.margin||t.initial_margin||t.used_margin||0)}</td>
    <td class="py-2.5 text-right font-mono ${e>=0?"text-green":"text-red"}">${a(e)}</td>
    <td class="py-2.5 text-right px-2">${r?`<button class="btn-ghost btn-sm text-red" data-close-pos="${h(r)}">Close</button>`:""}</td>
  </tr>`}function k(t){const{pnl:e,type:i,mark:o,id:r,symbol:l,side:d}=f(t);return`<article class="portfolio-position-card">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <strong>${s(l)}</strong>
          <span class="badge ${d==="BUY"?"badge-green":"badge-red"}">${s(d)}</span>
        </div>
        <small>${s(t.market_type||t.order_type||"spot")} - ${s(t.created_at||t.opened_at||"")}</small>
      </div>
      <div class="text-right">
        <span class="text-[10px] text-muted">Open PnL</span>
        <b class="${e>=0?"text-green":"text-red"}">${a(e)}</b>
      </div>
    </div>
    <div class="portfolio-position-metrics">
      ${n("Entry",c(t.entry_price||t.open_price,i))}
      ${n("Mark",o>0?c(o,i):"--")}
      ${n("Size",a(t.amount||t.size||t.units||0))}
      ${n("Lev",`${s(String(t.leverage||1))}x`)}
      ${n("Margin",a(t.margin||t.initial_margin||t.used_margin||0))}
      ${n("Mode",s(t.mode||u("mode")||"demo"))}
      ${n("Opened",s(t.created_at||t.opened_at||"--"))}
      ${n("Type",s(t.asset_type||t.type||"--"))}
    </div>
    ${r?`<button class="btn-ghost btn-sm text-red w-full" data-close-pos="${h(r)}">Close position</button>`:""}
  </article>`}function M(t,e){const i=t.querySelector("#orders-table"),o=t.querySelector("#orders-count");if(o&&(o.textContent=`${e.length}`),!!i){if(!e.length){i.innerHTML='<p class="text-muted text-sm text-center py-8">No pending orders.</p>';return}i.innerHTML=`
    <div class="portfolio-mobile-list md:hidden">
      ${e.map(P).join("")}
    </div>
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
          <th class="text-left py-2">Symbol</th><th class="text-left py-2">Type</th><th class="text-right py-2">Price</th><th class="text-right py-2">Amount</th><th class="text-right py-2">Status</th>
        </tr></thead>
        <tbody>${e.map(r=>`<tr class="border-b border-line/50">
          <td class="py-2 font-semibold">${s(r.symbol)}</td>
          <td class="py-2 text-xs">${s(r.order_type||"LIMIT")} ${s(r.side)}</td>
          <td class="py-2 text-right font-mono text-xs">${c(r.price||r.limit_price)}</td>
          <td class="py-2 text-right">${a(r.amount)}</td>
          <td class="py-2 text-right"><span class="badge badge-accent">${s(r.status||"pending")}</span></td>
        </tr>`).join("")}</tbody>
      </table>
    </div>`}}function P(t){return`<article class="order-mobile-card">
    <div class="flex items-start justify-between gap-3">
      <div>
        <strong>${s(t.symbol||"--")}</strong>
        <small>${s(t.order_type||"LIMIT")} ${s(t.side||"")}</small>
      </div>
      <span class="badge badge-accent">${s(t.status||"pending")}</span>
    </div>
    <div class="portfolio-position-metrics">
      ${n("Price",c(t.price||t.limit_price))}
      ${n("Amount",a(t.amount))}
      ${n("Created",s(t.created_at||"--"))}
      ${n("Mode",s(t.mode||u("mode")||"demo"))}
      ${n("Status",s(t.status||"pending"))}
      ${n("Side",s(t.side||"--"))}
    </div>
  </article>`}function n(t,e){return`<span><small>${s(t)}</small><strong>${e}</strong></span>`}async function T(t,e){if(t)try{await S("/trade/close_position.php",{position_id:t}),g(e)}catch{}}function m(t,e,i,o=""){return`<div class="p-3 rounded-lg bg-panel-2/60 border border-line/50">
    <div class="text-[10px] uppercase text-muted tracking-wide">${t}</div>
    <div class="text-lg font-bold mt-1 ${o}">${e}</div>
    <div class="text-[10px] text-muted">${i}</div>
  </div>`}function x(){return'<div class="skeleton h-20 rounded-lg"></div>'}export{j as mount,O as render};
