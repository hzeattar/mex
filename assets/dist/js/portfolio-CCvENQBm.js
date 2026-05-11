import{g as m,i as f,a as u,e as n,m as i,d as g,p as h,h as $}from"./main-C96G9szY.js";function w(){return m("mode"),`
    <div class="space-y-6 animate-fade-in">
      <section class="card">
        <div class="flex items-center justify-between">
          <div>
            <span class="badge-accent">Portfolio</span>
            <h1 class="text-xl font-bold mt-1">Positions & Orders</h1>
            <p class="text-muted text-sm">Track open positions, pending orders, and realized PnL.</p>
          </div>
          <button class="btn-ghost btn-sm" id="refresh-portfolio">${f.refresh} Refresh</button>
        </div>
      </section>

      <!-- Summary Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3" id="portfolio-metrics">
        ${a()}${a()}${a()}${a()}
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
    </div>`}function _(t){c(t),t.querySelector("#refresh-portfolio")?.addEventListener("click",()=>c(t))}async function c(t){try{const[e,s]=await Promise.all([u("/trade/portfolio.php",{timeout:8e3}),u("/trade/orders.php",{timeout:8e3})]);e&&v(t,e),s&&P(t,s.items||s.orders||[])}catch(e){t.querySelector("#positions-table").innerHTML=`<p class="text-red text-sm text-center py-4">${n(e.message)}</p>`}}function v(t,e){const s=e.positions||[],r=Number(e.balance||e.equity||0),o=Number(e.open_pnl||e.unrealized_pnl||0),b=Number(e.equity||r+o),p=t.querySelector("#portfolio-metrics");p&&(p.innerHTML=`
      ${d("Equity",i(b),"Total value")}
      ${d("Open PnL",i(o),o>=0?"Profit":"Loss",o>=0?"text-green":"text-red")}
      ${d("Positions",String(s.length),"Open trades")}
      ${d("Balance",i(r),m("mode")==="real"?"USDT":"USDT_DEMO")}`);const x=t.querySelector("#pos-count");x&&(x.textContent=`${s.length} open`);const l=t.querySelector("#positions-table");if(l){if(!s.length){l.innerHTML='<p class="text-muted text-sm text-center py-8">No open positions. Start trading to see them here.</p>';return}l.innerHTML=`<table class="w-full text-sm">
    <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
      <th class="text-left py-2 px-2">Symbol</th><th class="text-left py-2">Side</th><th class="text-right py-2">Entry</th><th class="text-right py-2">Size</th><th class="text-right py-2">PnL</th><th class="text-right py-2 px-2">Action</th>
    </tr></thead>
    <tbody>${s.map(S).join("")}</tbody>
  </table>`,g(l,"[data-close-pos]","click",(T,y)=>L(y.dataset.closePos,t))}}function S(t){const e=Number(t.pnl||t.unrealized_pnl||0);return`<tr class="border-b border-line/50 hover:bg-panel-2/30">
    <td class="py-2.5 px-2 font-semibold">${n(t.symbol)}</td>
    <td class="py-2.5"><span class="badge ${t.side==="BUY"?"badge-green":"badge-red"}">${n(t.side)}</span></td>
    <td class="py-2.5 text-right font-mono text-xs">${h(t.entry_price||t.open_price,t.type)}</td>
    <td class="py-2.5 text-right text-xs">${i(t.amount||t.size||0)}</td>
    <td class="py-2.5 text-right font-mono ${e>=0?"text-green":"text-red"}">${i(e)}</td>
    <td class="py-2.5 text-right px-2"><button class="btn-ghost btn-sm text-red" data-close-pos="${t.id||""}">Close</button></td>
  </tr>`}function P(t,e){const s=t.querySelector("#orders-table"),r=t.querySelector("#orders-count");if(r&&(r.textContent=`${e.length}`),!!s){if(!e.length){s.innerHTML='<p class="text-muted text-sm text-center py-8">No pending orders.</p>';return}s.innerHTML=`<table class="w-full text-sm">
    <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
      <th class="text-left py-2">Symbol</th><th class="text-left py-2">Type</th><th class="text-right py-2">Price</th><th class="text-right py-2">Amount</th><th class="text-right py-2">Status</th>
    </tr></thead>
    <tbody>${e.map(o=>`<tr class="border-b border-line/50">
      <td class="py-2 font-semibold">${n(o.symbol)}</td>
      <td class="py-2 text-xs">${n(o.order_type||"LIMIT")} ${n(o.side)}</td>
      <td class="py-2 text-right font-mono text-xs">${h(o.price||o.limit_price)}</td>
      <td class="py-2 text-right">${i(o.amount)}</td>
      <td class="py-2 text-right"><span class="badge badge-accent">${n(o.status||"pending")}</span></td>
    </tr>`).join("")}</tbody>
  </table>`}}async function L(t,e){if(t)try{await $("/trade/close_position.php",{position_id:t}),c(e)}catch{}}function d(t,e,s,r=""){return`<div class="p-3 rounded-lg bg-panel-2/60 border border-line/50">
    <div class="text-[10px] uppercase text-muted tracking-wide">${t}</div>
    <div class="text-lg font-bold mt-1 ${r}">${e}</div>
    <div class="text-[10px] text-muted">${s}</div>
  </div>`}function a(){return'<div class="skeleton h-20 rounded-lg"></div>'}export{_ as mount,w as render};
