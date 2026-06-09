import{i as g,j as f,c as _,f as o,m as d,e as M,l as h,q as S,g as L,t as w,k as C}from"./main-CrCNAud6.js";function O(){const t=g("mode");return`
    <div class="portfolio-page-pro animate-fade-in">
      <section class="portfolio-hero portfolio-pro-hero">
        <div class="portfolio-hero-content">
          <div>
            <span class="badge-accent">Portfolio</span>
            <h1>Positions & Orders</h1>
            <p>Monitor live exposure, margin usage, pending orders, and close trades from a cleaner asset desk.</p>
          </div>
          <div class="portfolio-hero-actions">
            <span class="status-chip ${t==="real"?"status-chip-live":"status-chip-derived"}">${t==="real"?"Real workspace":"Demo workspace"}</span>
            <button class="btn-ghost btn-sm" id="refresh-portfolio">${f.refresh} Refresh</button>
          </div>
        </div>
      </section>

      <section class="portfolio-metric-grid" id="portfolio-metrics">
        ${b()}${b()}${b()}${b()}
      </section>

      <div class="portfolio-workspace-grid">
      <section class="portfolio-pro-panel portfolio-positions-panel">
        <div class="portfolio-panel-head">
          <div>
            <span>Exposure</span>
            <h2>Open Positions</h2>
          </div>
          <span class="badge-green" id="pos-count">0 open</span>
        </div>
        <div class="portfolio-table-shell" id="positions-table">
          <p class="text-muted text-sm text-center py-8">Loading positions...</p>
        </div>
      </section>

      <section class="portfolio-pro-panel portfolio-orders-panel">
        <div class="portfolio-panel-head">
          <div>
            <span>Execution</span>
            <h2>Pending Orders</h2>
          </div>
          <span class="text-xs text-muted" id="orders-count">0</span>
        </div>
        <div class="portfolio-table-shell" id="orders-table">
          <p class="text-muted text-sm text-center py-8">Loading orders...</p>
        </div>
      </section>
      </div>
    </div>`}function A(t){$(t),t.querySelector("#refresh-portfolio")?.addEventListener("click",()=>$(t))}async function $(t){try{const e=g("mode"),[s,r]=await Promise.all([_(`/trade/portfolio.php?fast=1&mode=${e}`,{timeout:0,retry:1,cacheTtl:5e3}),_(`/trade/orders.php?mode=${e}`,{timeout:0,retry:1,cacheTtl:5e3})]);s&&P(t,s),r&&N(t,r.items||r.orders||[])}catch(e){t.querySelector("#positions-table").innerHTML=`<p class="text-red text-sm text-center py-4">${o(e.message)}</p>`}}function P(t,e){const s=e.positions||[],r=Number(e.balance||e.equity||0),i=Number(e.open_pnl||e.unrealized_pnl||0),u=Number(e.equity||r+i),a=Number(e.margin_used||e.margin||0),c=Number(e.free_margin||r-a),p=t.querySelector("#portfolio-metrics");p&&(p.innerHTML=`
      ${y("Equity",d(u),"Balance + open PnL",f.wallet)}
      ${y("Open PnL",`${i>=0?"+":""}${d(i)}`,"Unrealized profit/loss",f.earn,i>=0?"is-positive":"is-negative")}
      ${y("Margin Used",d(a),"Locked as collateral",f.trade)}
      ${y("Free Margin",d(Math.max(0,c)),"Available to trade",f.deposit)}
    `);const m=t.querySelector("#pos-count");m&&(m.textContent=`${s.length} open`);const l=t.querySelector("#positions-table");if(l){if(!s.length){l.innerHTML='<p class="text-muted text-sm text-center py-8">No open positions. Start trading to see them here.</p>';return}l.innerHTML=`
    <div class="portfolio-mobile-list md:hidden">
      ${s.map(T).join("")}
    </div>
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
          <th class="text-left py-2 px-2">Symbol</th><th class="text-left py-2">Side</th><th class="text-left py-2">Type</th><th class="text-right py-2">Entry</th><th class="text-right py-2">Mark</th><th class="text-right py-2">Size</th><th class="text-right py-2">Lev</th><th class="text-right py-2">Margin</th><th class="text-right py-2">PnL</th><th class="text-right py-2 px-2">Action</th>
        </tr></thead>
        <tbody>${s.map(q).join("")}</tbody>
      </table>
    </div>`,M(l,"[data-close-pos]","click",(x,v)=>E(v.dataset.closePos,t,v))}}function k(t){const e=Number(t.pnl||t.unrealized_pnl||0),s=t.asset_type||t.type||"crypto",r=Number(t.mark_price||t.current_price||t.price||0),i=t.position_id||t.id||"",u=String(t.symbol||"").replace("@R@",""),a=String(t.side||"buy").toUpperCase()==="SELL"?"SELL":"BUY",c=Number(t.entry_price||t.open_price||0),p=Number(t.qty||t.amount||t.size||t.units||0),m=Number(t.margin_initial||t.margin||t.initial_margin||t.used_margin||0),l=Number(t.leverage||1),x=t.opened_at_label||t.created_at||t.opened_at||t.updated_at||"";return{pnl:e,type:s,mark:r,id:i,symbol:u,side:a,entry:c,size:p,margin:m,leverage:l,opened:x}}function q(t){const{pnl:e,type:s,mark:r,id:i,symbol:u,side:a,entry:c,size:p,margin:m,leverage:l}=k(t);return`<tr class="border-b border-line/50 hover:bg-panel-2/30">
    <td class="py-2.5 px-2 font-semibold">${o(u)}</td>
    <td class="py-2.5"><span class="badge ${a==="BUY"?"badge-green":"badge-red"}">${o(a)}</span></td>
    <td class="py-2.5 text-xs text-muted">${o(t.market_type||t.order_type||"spot")}</td>
    <td class="py-2.5 text-right font-mono text-xs">${c>0?h(c,s):"--"}</td>
    <td class="py-2.5 text-right font-mono text-xs">${r>0?h(r,s):"--"}</td>
    <td class="py-2.5 text-right text-xs">${S(p)}</td>
    <td class="py-2.5 text-right font-mono text-xs">${o(String(l||1))}x</td>
    <td class="py-2.5 text-right text-xs">${d(m)}</td>
    <td class="py-2.5 text-right font-mono ${e>=0?"text-buy":"text-sell"}">${d(e)}</td>
    <td class="py-2.5 text-right px-2">${i?`<button class="btn-ghost btn-sm text-red" data-close-pos="${L(i)}">Close</button>`:""}</td>
  </tr>`}function T(t){const{pnl:e,type:s,mark:r,id:i,symbol:u,side:a,entry:c,size:p,margin:m,leverage:l,opened:x}=k(t);return`<article class="portfolio-position-card">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <strong>${o(u)}</strong>
          <span class="badge ${a==="BUY"?"badge-green":"badge-red"}">${o(a)}</span>
        </div>
        <small>${o(t.market_type||t.order_type||"spot")} - ${o(x||"")}</small>
      </div>
      <div class="text-right">
        <span class="text-[10px] text-muted">Open PnL</span>
        <b class="${e>=0?"text-buy":"text-sell"}">${d(e)}</b>
      </div>
    </div>
    <div class="portfolio-position-metrics">
      ${n("Entry",c>0?h(c,s):"--")}
      ${n("Mark",r>0?h(r,s):"--")}
      ${n("Size",S(p))}
      ${n("Lev",`${o(String(l||1))}x`)}
      ${n("Margin",d(m))}
      ${n("Mode",o(t.mode||g("mode")||"demo"))}
      ${n("Opened",o(x||"--"))}
      ${n("Type",o(t.asset_type||t.type||"--"))}
    </div>
    ${i?`<button class="btn-ghost btn-sm text-red w-full" data-close-pos="${L(i)}">Close position</button>`:""}
  </article>`}function N(t,e){const s=t.querySelector("#orders-table"),r=t.querySelector("#orders-count");if(r&&(r.textContent=`${e.length}`),!!s){if(!e.length){s.innerHTML='<p class="text-muted text-sm text-center py-8">No pending orders.</p>';return}s.innerHTML=`
    <div class="portfolio-mobile-list md:hidden">
      ${e.map(z).join("")}
    </div>
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
          <th class="text-left py-2">Symbol</th><th class="text-left py-2">Type</th><th class="text-right py-2">Price</th><th class="text-right py-2">Amount</th><th class="text-right py-2">Status</th>
        </tr></thead>
        <tbody>${e.map(i=>`<tr class="border-b border-line/50">
          <td class="py-2 font-semibold">${o(i.symbol)}</td>
          <td class="py-2 text-xs">${o(i.order_type||"LIMIT")} ${o(i.side)}</td>
          <td class="py-2 text-right font-mono text-xs">${h(i.price||i.limit_price)}</td>
          <td class="py-2 text-right">${d(i.amount)}</td>
          <td class="py-2 text-right"><span class="badge badge-accent">${o(i.status||"pending")}</span></td>
        </tr>`).join("")}</tbody>
      </table>
    </div>`}}function z(t){return`<article class="order-mobile-card">
    <div class="flex items-start justify-between gap-3">
      <div>
        <strong>${o(t.symbol||"--")}</strong>
        <small>${o(t.order_type||"LIMIT")} ${o(t.side||"")}</small>
      </div>
      <span class="badge badge-accent">${o(t.status||"pending")}</span>
    </div>
    <div class="portfolio-position-metrics">
      ${n("Price",h(t.price||t.limit_price))}
      ${n("Amount",d(t.amount))}
      ${n("Created",o(t.created_at||"--"))}
      ${n("Mode",o(t.mode||g("mode")||"demo"))}
      ${n("Status",o(t.status||"pending"))}
      ${n("Side",o(t.side||"--"))}
    </div>
  </article>`}function n(t,e){return`<span><small>${o(t)}</small><strong>${e}</strong></span>`}async function E(t,e,s=null){if(!t||!confirm(w("portfolio.close_confirm","Close this position now?")))return;const r=s?.textContent||"";s&&(s.disabled=!0,s.textContent="Closing...");try{await C("/trade/close_position.php",{position_id:t}),await $(e)}catch(i){s&&(s.disabled=!1,s.textContent=r||"Close position"),alert(i?.message||"Close position failed")}}function y(t,e,s,r,i=""){return`<article class="portfolio-metric ${i}">
    <div class="metric-icon">${r}</div>
    <span>${o(t)}</span>
    <strong>${o(e)}</strong>
    <small>${o(s)}</small>
  </article>`}function b(){return'<div class="skeleton h-24 rounded-lg"></div>'}export{A as mount,O as render};
