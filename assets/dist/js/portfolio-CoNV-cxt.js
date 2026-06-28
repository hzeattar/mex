import{j as T,k as b,v as s,c as k,g as a,m as d,f as M,q as p,r as v,h as N,o as z}from"./main-BHuIHsFg.js";function I(){const e=T("mode");return`
    <div class="portfolio-page-pro animate-fade-in">
      <section class="portfolio-hero portfolio-pro-hero">
        <div class="portfolio-hero-content">
          <div>
            <span class="badge-accent">Portfolio</span>
            <h1>${s("trade.positions_history_title","Positions & History")}</h1>
            <p>${s("trade.positions_history_desc","Monitor live exposure, close trades, and review closed positions.")}</p>
          </div>
          <div class="portfolio-hero-actions">
            <span class="status-chip ${e==="real"?"status-chip-live":"status-chip-derived"}">${e==="real"?s("workspace.real","Real workspace"):s("workspace.demo","Demo workspace")}</span>
            <button class="btn-ghost btn-sm" id="refresh-portfolio">${b.refresh} ${s("trade.refresh","Refresh")}</button>
          </div>
        </div>
      </section>

      <section class="portfolio-metric-grid" id="portfolio-metrics">
        ${L()}${L()}${L()}${L()}
      </section>

      <div class="portfolio-workspace-grid">
      <section class="portfolio-pro-panel portfolio-positions-panel">
        <div class="portfolio-panel-head">
          <div><span>${s("trade.exposure","Exposure")}</span><h2>${s("trade.open_positions","Open Positions")}</h2></div>
          <span class="badge-green" id="pos-count">0 ${s("trade.open","open")}</span>
        </div>
        <div class="portfolio-table-shell" id="positions-table">
          <p class="text-muted text-sm text-center py-8">${s("trade.loading_positions","Loading positions...")}</p>
        </div>
      </section>

      <section class="portfolio-pro-panel portfolio-orders-panel">
        <div class="portfolio-panel-head">
          <div><span>${s("trade.execution","Execution")}</span><h2>${s("trade.pending_orders","Pending Orders")}</h2></div>
          <span class="text-xs text-muted" id="orders-count">0</span>
        </div>
        <div class="portfolio-table-shell" id="orders-table">
          <p class="text-muted text-sm text-center py-8">${s("trade.loading_orders","Loading orders...")}</p>
        </div>
      </section>
      </div>

      <section class="portfolio-pro-panel" style="margin-top:24px">
        <div class="portfolio-panel-head">
          <div><span>${s("trade.history","History")}</span><h2>${s("trade.closed_positions","Closed Positions")}</h2></div>
          <span class="text-xs text-muted" id="closed-count">0</span>
        </div>
        <div class="portfolio-table-shell" id="closed-table">
          <p class="text-muted text-sm text-center py-8">${s("trade.loading_history","Loading history...")}</p>
        </div>
      </section>
    </div>`}function D(e){w(e),e.querySelector("#refresh-portfolio")?.addEventListener("click",()=>w(e))}async function w(e){try{const o=T("mode"),[t,n]=await Promise.all([k(`/trade/portfolio.php?fast=1&mode=${o}`,{timeout:0,retry:1,cacheTtl:8e3}),k(`/trade/orders.php?mode=${o}&limit=100`,{timeout:0,retry:1,cacheTtl:8e3})]);if(t&&E(e,t),n){const l=n.items||n.orders||[],r=l.filter(c=>/^(pending|open)$/i.test(c.status||"")),m=l.filter(c=>/^(closed|filled|cancelled)$/i.test(c.status||""));R(e,r),H(e,m)}}catch(o){e.querySelector("#positions-table").innerHTML=`<p class="text-red text-sm text-center py-4">${a(o.message)}</p>`}}function E(e,o){const t=o.positions||[],n=Number(o.balance||o.equity||0),l=Number(o.open_pnl||o.unrealized_pnl||0),r=Number(o.equity||n+l),m=Number(o.margin_used||o.margin||0),c=Number(o.free_margin||n-m),x=e.querySelector("#portfolio-metrics");x&&(x.innerHTML=`
      ${_(s("trade.equity","Equity"),d(r),s("trade.equity_sub","Balance + open PnL"),b.wallet)}
      ${_(s("trade.open_pnl","Open PnL"),`${l>=0?"+":""}${d(l)}`,s("trade.unrealized_pnl","Unrealized PnL"),b.earn,l>=0?"is-positive":"is-negative")}
      ${_(s("trade.margin_used","Margin Used"),d(m),s("trade.margin_collateral","Locked as collateral"),b.trade)}
      ${_(s("trade.free_margin","Free Margin"),d(Math.max(0,c)),s("trade.available_trade","Available to trade"),b.deposit)}
    `);const u=e.querySelector("#pos-count");u&&(u.textContent=`${t.length} ${s("trade.open","open")}`);const y=e.querySelector("#positions-table");if(y){if(!t.length){y.innerHTML=`<p class="text-muted text-sm text-center py-8">${s("trade.no_open_positions","No open positions. Start trading to see them here.")}</p>`;return}y.innerHTML=`
    <div class="portfolio-mobile-list md:hidden">
      ${t.map((h,$)=>U(h,$)).join("")}
    </div>
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
          <th class="text-left py-2 px-2">${s("common.symbol","Symbol")}</th><th class="text-left py-2">${s("common.side","Side")}</th><th class="text-left py-2">${s("common.type","Type")}</th><th class="text-right py-2">${s("common.entry","Entry")}</th><th class="text-right py-2">${s("common.mark","Mark")}</th><th class="text-right py-2">${s("common.size","Size")}</th><th class="text-right py-2">${s("common.lev","Lev")}</th><th class="text-right py-2">${s("common.margin","Margin")}</th><th class="text-right py-2">${s("common.pnl","PnL")}</th><th class="text-right py-2 px-2">${s("common.action","Action")}</th>
        </tr></thead>
        <tbody>${t.map(B).join("")}</tbody>
      </table>
    </div>`,M(y,"[data-close-pos]","click",(h,$)=>j($.dataset.closePos,e,$)),q(y)}}function P(e){const o=Number(e.pnl||e.unrealized_pnl||0),t=e.asset_type||e.type||"crypto",n=Number(e.mark_price||e.current_price||e.price||0),l=e.position_id||e.id||"",r=String(e.symbol||"").replace("@R@",""),m=String(e.side||"buy").toUpperCase()==="SELL"?"SELL":"BUY",c=Number(e.entry_price||e.open_price||0),x=Number(e.qty||e.amount||e.size||e.units||0),u=Number(e.margin_initial||e.margin||e.initial_margin||e.used_margin||0),y=Number(e.leverage||1),h=e.opened_at_label||e.created_at||e.opened_at||e.updated_at||"",$=e.tp_price!=null?Number(e.tp_price):null,f=e.sl_price!=null?Number(e.sl_price):null,g=e.liquidation_price!=null?Number(e.liquidation_price):null,S=Number(e.roe_pct||(u>0?o/u*100:0)),C=e.source||"";return{pnl:o,type:t,mark:n,id:l,symbol:r,side:m,entry:c,size:x,margin:u,leverage:y,opened:h,tp:$,sl:f,liq:g,roe:S,source:C}}function B(e){const o=P(e);return`<tr class="border-b border-line/50 hover:bg-panel-2/30">
    <td class="py-2.5 px-2 font-semibold">${a(o.symbol)}</td>
    <td class="py-2.5"><span class="badge ${o.side==="BUY"?"badge-green":"badge-red"}">${a(o.side)}</span></td>
    <td class="py-2.5 text-xs text-muted">${a(e.market_type||e.order_type||"spot")}</td>
    <td class="py-2.5 text-right font-mono text-xs">${o.entry>0?p(o.entry,o.type):"--"}</td>
    <td class="py-2.5 text-right font-mono text-xs">${o.mark>0?p(o.mark,o.type):"--"}</td>
    <td class="py-2.5 text-right text-xs">${v(o.size)}</td>
    <td class="py-2.5 text-right font-mono text-xs">${a(String(o.leverage||1))}x</td>
    <td class="py-2.5 text-right text-xs">${d(o.margin)}</td>
    <td class="py-2.5 text-right font-mono ${o.pnl>=0?"text-buy":"text-sell"}">${d(o.pnl)}</td>
    <td class="py-2.5 text-right px-2">${o.id?`<button class="btn-ghost btn-sm text-red" data-close-pos="${N(o.id)}">${s("trade.close","Close")||"Close"}</button>`:""}</td>
  </tr>`}function U(e,o){const t=P(e),n=s,l=t.pnl>=0?"+":"",r=t.pnl>=0?"pos-exp-pnl-up":"pos-exp-pnl-down",m=t.side==="BUY"?"pos-exp-side-buy":"pos-exp-side-sell",c=t.tp!=null&&t.tp>0,x=t.sl!=null&&t.sl>0;return`
  <article class="pos-exp-card" data-card-idx="${o}">
    <div class="pos-exp-summary" data-toggle-expand>
      <div class="pos-exp-info">
        <div class="pos-exp-row1">
          <strong class="pos-exp-symbol">${a(t.symbol)}</strong>
          <span class="pos-exp-side ${m}">${a(t.side)}</span>
          ${t.source==="trading_bot"?'<span class="pos-exp-bot">BOT</span>':""}
          <span class="pos-exp-lev">${t.leverage}x</span>
        </div>
        <div class="pos-exp-row2">
          <span>${n("common.entry","Entry")} ${t.entry>0?p(t.entry,t.type):"--"}</span>
          <span class="pos-exp-dot">&#183;</span>
          <span>${n("common.mark","Mark")} ${t.mark>0?p(t.mark,t.type):"--"}</span>
          <span class="pos-exp-dot">&#183;</span>
          <span>${v(t.size)}</span>
          ${c?`<span class="pos-exp-dot">&#183;</span><span class="pos-exp-safety" title="TP: ${p(t.tp,t.type)}">TP</span>`:""}
          ${x?`<span class="pos-exp-dot">&#183;</span><span class="pos-exp-safety" title="SL: ${p(t.sl,t.type)}">SL</span>`:""}
        </div>
      </div>
      <div class="pos-exp-right">
        <div class="pos-exp-pnl ${r}">${l}${d(t.pnl)}</div>
        <div class="pos-exp-roe ${r}">${t.roe>=0?"+":""}${t.roe.toFixed(1)}%</div>
        <svg class="pos-exp-arrow" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/></svg>
      </div>
    </div>
    <div class="pos-exp-detail">
      <div class="pos-exp-detail-grid">
        ${i(n("common.entry","Entry Price"),t.entry>0?p(t.entry,t.type):"--")}
        ${i(n("common.mark","Mark Price"),t.mark>0?p(t.mark,t.type):"--")}
        ${i(n("common.size","Size / Qty"),v(t.size))}
        ${i(n("common.lev","Leverage"),t.leverage+"x")}
        ${i(n("common.margin","Margin"),d(t.margin))}
        ${i(n("common.roe","ROE"),(t.roe>=0?"+":"")+t.roe.toFixed(2)+"%")}
        ${i(n("common.tp","Take Profit"),c?p(t.tp,t.type):"--")}
        ${i(n("common.sl","Stop Loss"),x?p(t.sl,t.type):"--")}
        ${i(n("common.liquidation","Liquidation"),t.liq!=null&&t.liq>0?p(t.liq,t.type):"--")}
        ${i(n("common.opened","Opened"),a(String(t.opened||"--")))}
        ${i(n("common.type","Type"),a(t.type))}
        ${i(n("common.source","Source"),t.source==="trading_bot"?"Trading Bot":"Manual")}
      </div>
      ${t.id?`<button class="pos-exp-close-btn" data-close-pos="${N(t.id)}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg>
        ${n("trade.close","Close Position")}
      </button>`:""}
    </div>
  </article>`}function i(e,o){return`<div class="pos-exp-cell"><small>${a(e)}</small><strong>${o}</strong></div>`}function R(e,o){const t=e.querySelector("#orders-table"),n=e.querySelector("#orders-count");if(n&&(n.textContent=`${o.length}`),!!t){if(!o.length){t.innerHTML=`<p class="text-muted text-sm text-center py-8">${s("trade.no_pending_orders","No pending orders.")}</p>`;return}t.innerHTML=`
    <div class="portfolio-mobile-list md:hidden">
      ${o.map((l,r)=>Y(l,r)).join("")}
    </div>
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
          <th class="text-left py-2">${s("common.symbol","Symbol")}</th><th class="text-left py-2">${s("common.type","Type")}</th><th class="text-right py-2">${s("common.price","Price")}</th><th class="text-right py-2">${s("common.amount","Amount")}</th><th class="text-right py-2">${s("common.status","Status")}</th>
        </tr></thead>
        <tbody>${o.map(l=>`<tr class="border-b border-line/50">
          <td class="py-2 font-semibold">${a(l.symbol)}</td>
          <td class="py-2 text-xs">${a(l.order_type||"LIMIT")} ${a(l.side)}</td>
          <td class="py-2 text-right font-mono text-xs">${p(l.price||l.limit_price)}</td>
          <td class="py-2 text-right">${d(l.amount)}</td>
          <td class="py-2 text-right"><span class="badge badge-accent">${a(l.status||"pending")}</span></td>
        </tr>`).join("")}</tbody>
      </table>
    </div>`,q(t)}}function H(e,o){const t=e.querySelector("#closed-table"),n=e.querySelector("#closed-count");if(n&&(n.textContent=`${o.length}`),!!t){if(!o.length){t.innerHTML=`<p class="text-muted text-sm text-center py-8">${s("trade.no_closed_positions","No closed positions yet.")}</p>`;return}t.innerHTML=`
    <div class="portfolio-mobile-list md:hidden">
      ${o.map((l,r)=>F(l,r)).join("")}
    </div>
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
          <th class="text-left py-2">${s("common.symbol","Symbol")}</th><th class="text-left py-2">${s("common.side","Side")}</th><th class="text-right py-2">${s("common.fill","Fill")}</th><th class="text-right py-2">${s("common.qty","Qty")}</th><th class="text-right py-2">${s("common.pnl","PnL")}</th><th class="text-right py-2">${s("common.fee","Fee")}</th><th class="text-left py-2">${s("common.reason","Reason")}</th><th class="text-left py-2">${s("common.closed","Closed")}</th>
        </tr></thead>
        <tbody>${o.map(O).join("")}</tbody>
      </table>
    </div>`,q(t)}}function O(e){const o=String(e.symbol||"").replace("@R@",""),t=String(e.side||"buy").toUpperCase()==="SELL"?"SELL":"BUY",n=Number(e.pnl_usd||0),l=Number(e.fill_price||e.limit_price||e.price||0),r=Number(e.qty||e.amount||0),m=Number(e.fee_paid||0),c=e.asset_type||e.type||"crypto";return`<tr class="border-b border-line/50 hover:bg-panel-2/30">
    <td class="py-2 font-semibold">${a(o)}</td>
    <td class="py-2"><span class="badge ${t==="BUY"?"badge-green":"badge-red"}">${a(t)}</span></td>
    <td class="py-2 text-right font-mono text-xs">${l>0?p(l,c):"--"}</td>
    <td class="py-2 text-right text-xs">${v(r)}</td>
    <td class="py-2 text-right font-mono ${n>=0?"text-buy":"text-sell"}">${d(n)}</td>
    <td class="py-2 text-right text-xs">${d(m)}</td>
    <td class="py-2 text-xs text-muted">${a(e.close_reason||e.status||"--")}</td>
    <td class="py-2 text-xs text-muted">${a(e.closed_at||"--")}</td>
  </tr>`}function F(e,o){const t=String(e.symbol||"").replace("@R@",""),n=String(e.side||"buy").toUpperCase()==="SELL"?"SELL":"BUY",l=Number(e.pnl_usd||0),r=Number(e.fill_price||e.limit_price||e.price||0),m=Number(e.qty||e.amount||0),c=Number(e.leverage||1),x=String(e.status||"closed"),u=String(e.close_reason||""),y=String(e.created_at||"--"),h=String(e.closed_at||"--"),$=Number(e.fee_paid||0),f=e.asset_type||e.type||"crypto",g=l>=0?"+":"",S=l>=0?"pos-exp-pnl-up":"pos-exp-pnl-down",C=n==="BUY"?"pos-exp-side-buy":"pos-exp-side-sell";return`
  <article class="pos-exp-card pos-exp-card-closed" data-card-idx="${o}">
    <div class="pos-exp-summary" data-toggle-expand>
      <div class="pos-exp-info">
        <div class="pos-exp-row1">
          <strong class="pos-exp-symbol">${a(t)}</strong>
          <span class="pos-exp-side ${C}">${a(n)}</span>
          <span class="pos-exp-status">${a(x)}</span>
          <span class="pos-exp-lev">${c}x</span>
        </div>
        <div class="pos-exp-row2">
          <span>${s("common.fill","Fill")} ${r>0?p(r,f):"--"}</span>
          <span class="pos-exp-dot">&#183;</span>
          <span>${v(m)}</span>
          <span class="pos-exp-dot">&#183;</span>
          <span>${a(u||x)}</span>
        </div>
      </div>
      <div class="pos-exp-right">
        <div class="pos-exp-pnl ${S}">${g}${d(l)}</div>
        <svg class="pos-exp-arrow" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/></svg>
      </div>
    </div>
    <div class="pos-exp-detail">
      <div class="pos-exp-detail-grid">
        ${i(s("common.fill","Fill Price"),r>0?p(r,f):"--")}
        ${i(s("common.qty","Size / Qty"),v(m))}
        ${i(s("common.lev","Leverage"),c+"x")}
        ${i(s("common.pnl","Realized PnL"),g+d(l))}
        ${i(s("common.fee","Fee"),d($))}
        ${i(s("common.status","Status"),a(x))}
        ${i(s("common.reason","Close Reason"),a(u||"--"))}
        ${i(s("common.opened","Opened"),a(y))}
        ${i(s("common.closed","Closed"),a(h))}
        ${i(s("common.type","Type"),a(f))}
        ${i(s("common.order_type","Order Type"),a(e.order_type||"--"))}
        ${i(s("common.side","Side"),a(n))}
      </div>
    </div>
  </article>`}function Y(e,o){return`<article class="pos-exp-card" data-card-idx="${o}">
    <div class="pos-exp-summary" data-toggle-expand>
      <div class="pos-exp-info">
        <div class="pos-exp-row1">
          <strong class="pos-exp-symbol">${a(e.symbol||"--")}</strong>
          <span class="pos-exp-side ${e.side==="BUY"?"pos-exp-side-buy":"pos-exp-side-sell"}">${a(e.side||"")}</span>
          <span class="pos-exp-status">${a(e.order_type||"LIMIT")}</span>
        </div>
        <div class="pos-exp-row2">
          <span>${s("common.price","Price")} ${p(e.price||e.limit_price)}</span>
          <span class="pos-exp-dot">&#183;</span>
          <span>${d(e.amount)}</span>
        </div>
      </div>
      <div class="pos-exp-right">
        <span class="pos-exp-pending-badge">${a(e.status||"pending")}</span>
        <svg class="pos-exp-arrow" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/></svg>
      </div>
    </div>
    <div class="pos-exp-detail">
      <div class="pos-exp-detail-grid">
        ${i(s("common.symbol","Symbol"),a(e.symbol||"--"))}
        ${i(s("common.side","Side"),a(e.side||"--"))}
        ${i(s("common.type","Type"),a(e.order_type||"LIMIT"))}
        ${i(s("common.price","Price"),p(e.price||e.limit_price))}
        ${i(s("common.amount","Amount"),d(e.amount))}
        ${i(s("common.status","Status"),a(e.status||"pending"))}
        ${i(s("common.created","Created"),a(e.created_at||"--"))}
      </div>
    </div>
  </article>`}function q(e){e.querySelectorAll("[data-toggle-expand]").forEach(o=>{o.style.cursor="pointer",o.addEventListener("click",()=>{const t=o.closest(".pos-exp-card");if(!t)return;t.classList.toggle("is-expanded");const n=t.querySelector(".pos-exp-arrow");n&&(n.style.transform=t.classList.contains("is-expanded")?"rotate(180deg)":"")})})}async function j(e,o,t=null){if(!e)return;if(!t?.__confirmClose){if(t){const l=t.textContent;t.__confirmClose=!0,t.textContent=(s("trade.close","Close")||"Close")+"?",t.classList.add("btn-danger"),setTimeout(()=>{t.__confirmClose&&(t.__confirmClose=!1,t.textContent=l,t.classList.remove("btn-danger"))},4e3)}return}t.__confirmClose=!1;const n=t?.textContent||"";t&&(t.disabled=!0,t.classList.remove("btn-danger"),t.textContent=s("trade.closing","Closing..."));try{await z("/trade/close_position.php",{position_id:e}),await w(o)}catch(l){t&&(t.disabled=!1,t.textContent=l?.message||s("trade.could_not_close","Could not close"),setTimeout(()=>{t&&(t.textContent=n||s("trade.close","Close"))},3e3))}}function _(e,o,t,n,l=""){return`<article class="portfolio-metric ${l}">
    <div class="metric-icon">${n}</div>
    <span>${a(e)}</span>
    <strong>${a(o)}</strong>
    <small>${a(t)}</small>
  </article>`}function L(){return'<div class="skeleton h-24 rounded-lg"></div>'}export{D as mount,I as render};
