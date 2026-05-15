import{g as y,i as g,a as m,e as i,m as n,d as f,c as p,b as $,h as v}from"./main-C5j3FsJC.js";function w(){return y("mode"),`
    <div class="space-y-6 animate-fade-in">
      <section class="card">
        <div class="flex items-center justify-between">
          <div>
            <span class="badge-accent">Portfolio</span>
            <h1 class="text-xl font-bold mt-1">Positions & Orders</h1>
            <p class="text-muted text-sm">Track open positions, pending orders, and realized PnL.</p>
          </div>
          <button class="btn-ghost btn-sm" id="refresh-portfolio">${g.refresh} Refresh</button>
        </div>
      </section>

      <!-- Summary Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3" id="portfolio-metrics">
        ${d()}${d()}${d()}${d()}
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
    </div>`}function k(t){x(t),t.querySelector("#refresh-portfolio")?.addEventListener("click",()=>x(t))}async function x(t){try{const[e,s]=await Promise.all([m("/trade/portfolio.php",{timeout:8e3}),m("/trade/orders.php",{timeout:8e3})]);e&&S(t,e),s&&P(t,s.items||s.orders||[])}catch(e){t.querySelector("#positions-table").innerHTML=`<p class="text-red text-sm text-center py-4">${i(e.message)}</p>`}}function S(t,e){const s=e.positions||[],o=Number(e.balance||e.equity||0),r=Number(e.open_pnl||e.unrealized_pnl||0),c=Number(e.equity||o+r),u=t.querySelector("#portfolio-metrics");u&&(u.innerHTML=`
      ${l("Equity",n(c),"Total value")}
      ${l("Open PnL",n(r),r>=0?"Profit":"Loss",r>=0?"text-green":"text-red")}
      ${l("Positions",String(s.length),"Open trades")}
      ${l("Balance",n(o),y("mode")==="real"?"USDT":"USDT_DEMO")}`);const h=t.querySelector("#pos-count");h&&(h.textContent=`${s.length} open`);const a=t.querySelector("#positions-table");if(a){if(!s.length){a.innerHTML='<p class="text-muted text-sm text-center py-8">No open positions. Start trading to see them here.</p>';return}a.innerHTML=`<table class="w-full text-sm">
    <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
      <th class="text-left py-2 px-2">Symbol</th><th class="text-left py-2">Side</th><th class="text-left py-2">Type</th><th class="text-right py-2">Entry</th><th class="text-right py-2">Mark</th><th class="text-right py-2">Size</th><th class="text-right py-2">Lev</th><th class="text-right py-2">Margin</th><th class="text-right py-2">PnL</th><th class="text-right py-2 px-2">Action</th>
    </tr></thead>
    <tbody>${s.map(_).join("")}</tbody>
  </table>`,f(a,"[data-close-pos]","click",(T,b)=>L(b.dataset.closePos,t))}}function _(t){const e=Number(t.pnl||t.unrealized_pnl||0),s=t.asset_type||t.type||"crypto",o=Number(t.mark_price||t.current_price||t.price||0),r=t.position_id||t.id||"",c=String(t.symbol||"").replace("@R@","");return`<tr class="border-b border-line/50 hover:bg-panel-2/30">
    <td class="py-2.5 px-2 font-semibold">${i(c)}</td>
    <td class="py-2.5"><span class="badge ${t.side==="BUY"?"badge-green":"badge-red"}">${i(t.side)}</span></td>
    <td class="py-2.5 text-xs text-muted">${i(t.market_type||t.order_type||"spot")}</td>
    <td class="py-2.5 text-right font-mono text-xs">${p(t.entry_price||t.open_price,s)}</td>
    <td class="py-2.5 text-right font-mono text-xs">${o>0?p(o,s):"--"}</td>
    <td class="py-2.5 text-right text-xs">${n(t.amount||t.size||t.units||0)}</td>
    <td class="py-2.5 text-right font-mono text-xs">${i(String(t.leverage||1))}x</td>
    <td class="py-2.5 text-right text-xs">${n(t.margin||t.initial_margin||t.used_margin||0)}</td>
    <td class="py-2.5 text-right font-mono ${e>=0?"text-green":"text-red"}">${n(e)}</td>
    <td class="py-2.5 text-right px-2">${r?`<button class="btn-ghost btn-sm text-red" data-close-pos="${$(r)}">Close</button>`:""}</td>
  </tr>`}function P(t,e){const s=t.querySelector("#orders-table"),o=t.querySelector("#orders-count");if(o&&(o.textContent=`${e.length}`),!!s){if(!e.length){s.innerHTML='<p class="text-muted text-sm text-center py-8">No pending orders.</p>';return}s.innerHTML=`<table class="w-full text-sm">
    <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
      <th class="text-left py-2">Symbol</th><th class="text-left py-2">Type</th><th class="text-right py-2">Price</th><th class="text-right py-2">Amount</th><th class="text-right py-2">Status</th>
    </tr></thead>
    <tbody>${e.map(r=>`<tr class="border-b border-line/50">
      <td class="py-2 font-semibold">${i(r.symbol)}</td>
      <td class="py-2 text-xs">${i(r.order_type||"LIMIT")} ${i(r.side)}</td>
      <td class="py-2 text-right font-mono text-xs">${p(r.price||r.limit_price)}</td>
      <td class="py-2 text-right">${n(r.amount)}</td>
      <td class="py-2 text-right"><span class="badge badge-accent">${i(r.status||"pending")}</span></td>
    </tr>`).join("")}</tbody>
  </table>`}}async function L(t,e){if(t)try{await v("/trade/close_position.php",{position_id:t}),x(e)}catch{}}function l(t,e,s,o=""){return`<div class="p-3 rounded-lg bg-panel-2/60 border border-line/50">
    <div class="text-[10px] uppercase text-muted tracking-wide">${t}</div>
    <div class="text-lg font-bold mt-1 ${o}">${e}</div>
    <div class="text-[10px] text-muted">${s}</div>
  </div>`}function d(){return'<div class="skeleton h-20 rounded-lg"></div>'}export{k as mount,w as render};
