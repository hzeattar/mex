import{g as u,i as v,a as y,e as i,m as n,d as _,c,b as h,h as S}from"./main-CAksTdKi.js";function j(){return u("mode"),`
    <div class="space-y-6 animate-fade-in">
      <section class="card">
        <div class="flex items-center justify-between">
          <div>
            <span class="badge-accent">Portfolio</span>
            <h1 class="text-xl font-bold mt-1">Positions & Orders</h1>
            <p class="text-muted text-sm">Track open positions, pending orders, and realized PnL.</p>
          </div>
          <button class="btn-ghost btn-sm" id="refresh-portfolio">${v.refresh} Refresh</button>
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
    </div>`}function O(t){g(t),t.querySelector("#refresh-portfolio")?.addEventListener("click",()=>g(t))}async function g(t){try{const[e,s]=await Promise.all([y("/trade/portfolio.php",{timeout:8e3}),y("/trade/orders.php",{timeout:8e3})]);e&&L(t,e),s&&w(t,s.items||s.orders||[])}catch(e){t.querySelector("#positions-table").innerHTML=`<p class="text-red text-sm text-center py-4">${i(e.message)}</p>`}}function L(t,e){const s=e.positions||[],o=Number(e.balance||e.equity||0),r=Number(e.open_pnl||e.unrealized_pnl||0),l=Number(e.equity||o+r),a=t.querySelector("#portfolio-metrics");a&&(a.innerHTML=`
      ${m("Equity",n(l),"Total value")}
      ${m("Open PnL",n(r),r>=0?"Profit":"Loss",r>=0?"text-green":"text-red")}
      ${m("Positions",String(s.length),"Open trades")}
      ${m("Balance",n(o),u("mode")==="real"?"USDT":"USDT_DEMO")}`);const b=t.querySelector("#pos-count");b&&(b.textContent=`${s.length} open`);const p=t.querySelector("#positions-table");if(p){if(!s.length){p.innerHTML='<p class="text-muted text-sm text-center py-8">No open positions. Start trading to see them here.</p>';return}p.innerHTML=`
    <div class="portfolio-mobile-list md:hidden">
      ${s.map(k).join("")}
    </div>
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
          <th class="text-left py-2 px-2">Symbol</th><th class="text-left py-2">Side</th><th class="text-left py-2">Type</th><th class="text-right py-2">Entry</th><th class="text-right py-2">Mark</th><th class="text-right py-2">Size</th><th class="text-right py-2">Lev</th><th class="text-right py-2">Margin</th><th class="text-right py-2">PnL</th><th class="text-right py-2 px-2">Action</th>
        </tr></thead>
        <tbody>${s.map(P).join("")}</tbody>
      </table>
    </div>`,_(p,"[data-close-pos]","click",(q,$)=>T($.dataset.closePos,t))}}function f(t){const e=Number(t.pnl||t.unrealized_pnl||0),s=t.asset_type||t.type||"crypto",o=Number(t.mark_price||t.current_price||t.price||0),r=t.position_id||t.id||"",l=String(t.symbol||"").replace("@R@",""),a=String(t.side||"buy").toUpperCase()==="SELL"?"SELL":"BUY";return{pnl:e,type:s,mark:o,id:r,symbol:l,side:a}}function P(t){const{pnl:e,type:s,mark:o,id:r,symbol:l,side:a}=f(t);return`<tr class="border-b border-line/50 hover:bg-panel-2/30">
    <td class="py-2.5 px-2 font-semibold">${i(l)}</td>
    <td class="py-2.5"><span class="badge ${a==="BUY"?"badge-green":"badge-red"}">${i(a)}</span></td>
    <td class="py-2.5 text-xs text-muted">${i(t.market_type||t.order_type||"spot")}</td>
    <td class="py-2.5 text-right font-mono text-xs">${c(t.entry_price||t.open_price,s)}</td>
    <td class="py-2.5 text-right font-mono text-xs">${o>0?c(o,s):"--"}</td>
    <td class="py-2.5 text-right text-xs">${n(t.amount||t.size||t.units||0)}</td>
    <td class="py-2.5 text-right font-mono text-xs">${i(String(t.leverage||1))}x</td>
    <td class="py-2.5 text-right text-xs">${n(t.margin||t.initial_margin||t.used_margin||0)}</td>
    <td class="py-2.5 text-right font-mono ${e>=0?"text-green":"text-red"}">${n(e)}</td>
    <td class="py-2.5 text-right px-2">${r?`<button class="btn-ghost btn-sm text-red" data-close-pos="${h(r)}">Close</button>`:""}</td>
  </tr>`}function k(t){const{pnl:e,type:s,mark:o,id:r,symbol:l,side:a}=f(t);return`<article class="portfolio-position-card">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <strong>${i(l)}</strong>
          <span class="badge ${a==="BUY"?"badge-green":"badge-red"}">${i(a)}</span>
        </div>
        <small>${i(t.market_type||t.order_type||"spot")} - ${i(t.created_at||t.opened_at||"")}</small>
      </div>
      <div class="text-right">
        <span class="text-[10px] text-muted">Open PnL</span>
        <b class="${e>=0?"text-green":"text-red"}">${n(e)}</b>
      </div>
    </div>
    <div class="portfolio-position-metrics">
      ${d("Entry",c(t.entry_price||t.open_price,s))}
      ${d("Mark",o>0?c(o,s):"--")}
      ${d("Size",n(t.amount||t.size||t.units||0))}
      ${d("Lev",`${i(String(t.leverage||1))}x`)}
      ${d("Margin",n(t.margin||t.initial_margin||t.used_margin||0))}
      ${d("Mode",i(t.mode||u("mode")||"demo"))}
    </div>
    ${r?`<button class="btn-ghost btn-sm text-red w-full" data-close-pos="${h(r)}">Close position</button>`:""}
  </article>`}function w(t,e){const s=t.querySelector("#orders-table"),o=t.querySelector("#orders-count");if(o&&(o.textContent=`${e.length}`),!!s){if(!e.length){s.innerHTML='<p class="text-muted text-sm text-center py-8">No pending orders.</p>';return}s.innerHTML=`
    <div class="portfolio-mobile-list md:hidden">
      ${e.map(M).join("")}
    </div>
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
          <th class="text-left py-2">Symbol</th><th class="text-left py-2">Type</th><th class="text-right py-2">Price</th><th class="text-right py-2">Amount</th><th class="text-right py-2">Status</th>
        </tr></thead>
        <tbody>${e.map(r=>`<tr class="border-b border-line/50">
          <td class="py-2 font-semibold">${i(r.symbol)}</td>
          <td class="py-2 text-xs">${i(r.order_type||"LIMIT")} ${i(r.side)}</td>
          <td class="py-2 text-right font-mono text-xs">${c(r.price||r.limit_price)}</td>
          <td class="py-2 text-right">${n(r.amount)}</td>
          <td class="py-2 text-right"><span class="badge badge-accent">${i(r.status||"pending")}</span></td>
        </tr>`).join("")}</tbody>
      </table>
    </div>`}}function M(t){return`<article class="order-mobile-card">
    <div class="flex items-start justify-between gap-3">
      <div>
        <strong>${i(t.symbol||"--")}</strong>
        <small>${i(t.order_type||"LIMIT")} ${i(t.side||"")}</small>
      </div>
      <span class="badge badge-accent">${i(t.status||"pending")}</span>
    </div>
    <div class="portfolio-position-metrics">
      ${d("Price",c(t.price||t.limit_price))}
      ${d("Amount",n(t.amount))}
      ${d("Created",i(t.created_at||"--"))}
      ${d("Mode",i(t.mode||u("mode")||"demo"))}
    </div>
  </article>`}function d(t,e){return`<span><small>${i(t)}</small><strong>${e}</strong></span>`}async function T(t,e){if(t)try{await S("/trade/close_position.php",{position_id:t}),g(e)}catch{}}function m(t,e,s,o=""){return`<div class="p-3 rounded-lg bg-panel-2/60 border border-line/50">
    <div class="text-[10px] uppercase text-muted tracking-wide">${t}</div>
    <div class="text-lg font-bold mt-1 ${o}">${e}</div>
    <div class="text-[10px] text-muted">${s}</div>
  </div>`}function x(){return'<div class="skeleton h-20 rounded-lg"></div>'}export{O as mount,j as render};
