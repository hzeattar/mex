import{f as v,s as y,j as l,t as e,m as d,g as o,c as f,e as k,l as N,k as I,p as Y,h as E}from"./main-jB8bpRHy.js";let m=[];function tt(){const t=l("invest.tab")||localStorage.getItem("vp_earn_tab")||"copy",a=l("level")||{},n=Q();a.current,a.next;const s=l("mode");return`
    <div class="space-y-4 animate-fade-in earn-page">
      <div class="earn-balance-bar">
        <span class="text-[10px] text-muted uppercase tracking-wider">${e("balance.available","Available Balance")}</span>
        <strong class="text-lg font-mono">${d(n.available)} <small class="text-muted text-xs font-normal">${o(n.currency||"USDT")}</small></strong>
        <span class="earn-mode-chip ${s==="real"?"is-real":"is-demo"}">${s==="real"?e("mode.real","Real"):e("mode.demo","Demo")}</span>
      </div>

      <div class="segmented">
        <button class="${t==="copy"?"active":""}" data-earn-tab="copy">${e("earn.trading_bots","Trading Bots")}</button>
        <button class="${t==="contracts"?"active":""}" data-earn-tab="contracts">${e("earn.contracts","Contracts")}</button>
      </div>

      <div id="invest-content">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="skeleton h-48 rounded-lg"></div>
          <div class="skeleton h-48 rounded-lg"></div>
        </div>
      </div>
    </div>`}function et(t){C(t);const a=t.querySelector(".level-strip");if(a){const n=a.querySelector(".level-pill.is-current");n&&requestAnimationFrame(()=>{a.scrollTo({left:n.offsetLeft-8,behavior:"auto"})})}m.push(v(t,"[data-earn-tab]","click",(n,s)=>{y("invest.tab",s.dataset.earnTab),localStorage.setItem("vp_earn_tab",s.dataset.earnTab),w(t)})),m.push(v(t,"[data-copy-signal]","click",(n,s)=>F(s.dataset.copySignal,t))),m.push(v(t,"[data-cancel-copy]","click",(n,s)=>H(s.dataset.cancelCopy,t))),m.push(v(t,"[data-contract-subscribe]","click",(n,s)=>G(s.dataset.contractSubscribe,t))),m.push(v(t,"[data-switch-real]","click",()=>{localStorage.setItem("vp_mode","real"),y("mode","real"),location.reload()})),m.push(v(t,"[data-open-kyc]","click",()=>{location.hash="#/kyc"}))}function at(){m.forEach(t=>{try{t()}catch{}}),m=[]}async function C(t){try{const[a,n,s,i]=await Promise.all([f(`/signals.php?bot=1&home=1&lang=${encodeURIComponent(k())}`,{timeout:8e3}).catch(()=>({items:[]})),f(`/invest/contracts.php?lang=${encodeURIComponent(k())}`,{timeout:8e3}).catch(()=>({items:[]})),f(`/trading_bot/my.php?lang=${encodeURIComponent(k())}`,{timeout:8e3}).catch(()=>({items:[]})),f(`/invest/my.php?lang=${encodeURIComponent(k())}`,{timeout:8e3}).catch(()=>({items:[]}))]);y("invest.signals",a.items||[]),y("invest.contracts",n.items||[]),y("invest.copies",s.items||[]),y("invest.mine",{contracts:(i.items||[]).filter(c=>String(c.product_kind||"").toLowerCase()==="contract")}),w(t)}catch{w(t)}}function w(t){const a=t.querySelector("#invest-content");if(!a)return;const n=l("invest.tab")||localStorage.getItem("vp_earn_tab")||"copy",s=T(),i=n==="copy"?j():M();a.innerHTML=s?z(i,s):i,t.querySelectorAll("[data-earn-tab]").forEach(c=>{c.classList.toggle("active",c.dataset.earnTab===n)})}function j(){const t=l("invest.signals")||[],a=l("invest.copies")||[],n=a.filter(A),s=a.filter(i=>!A(i));return`
    <section class="desk-panel">
      <div class="panel-head">
        <div>
          <span class="badge-green">${e("bot.avalon_ai","Avalon AI")}</span>
          <h2>${e("bot.avalon_name","Avalon AI Trading Bot")}</h2>
          <p>${e("bot.avalon_copy","Real-only AI copy bots with admin-managed trade operations.")}</p>
        </div>
      </div>
      ${t.length?`<div class="copy-grid">${t.map(O).join("")}</div>`:h(e("bot.no_signals","No bot trades available yet."))}
    </section>
    <section class="desk-panel">
      <div class="panel-head">
        <div>
          <span class="badge-accent">${e("earn.your_desk","Your desk")}</span>
          <h2>${e("bot.my_avalon_copies","My Avalon copies")}</h2>
          <p>${e("bot.copies_separate_copy","Copied bot operations are kept here, separate from manual Trade activity.")}</p>
        </div>
      </div>
      <div class="copy-history-columns">
        <div>
          <div class="history-subtitle"><span>${e("trade.active","Active")}</span><b>${n.length}</b></div>
          ${n.length?`<div class="history-grid">${n.map(U).join("")}</div>`:h(e("bot.no_active_copies","No active copies."))}
        </div>
        <div>
          <div class="history-subtitle"><span>${e("trade.closed","Closed")}</span><b>${s.length}</b></div>
          ${s.length?`<div class="history-grid">${s.map(U).join("")}</div>`:h(e("bot.no_closed_copies","No closed copies yet."))}
        </div>
      </div>
    </section>`}function M(){const t=l("invest.contracts")||[],a=l("invest.mine.contracts")||[];return`
    <section class="desk-panel">
      <div class="panel-head">
        <div>
          <span class="badge-accent">${e("earn.contracts","Contracts")}</span>
          <h2>${e("earn.contracts_title","Perpetual and term contracts")}</h2>
          <p>${e("earn.contracts_copy","Level-gated contracts for approved Real wallets.")}</p>
        </div>
      </div>
      ${t.length?`<div class="contract-grid">${t.map(K).join("")}</div>`:h(e("earn.no_contracts","No contracts available yet."))}
    </section>
    <section class="desk-panel">
      <div class="panel-head">
        <div>
          <span class="badge-green">${e("earn.running","Running")}</span>
          <h2>${e("earn.my_contracts","My contracts")}</h2>
          <p>${e("earn.my_contracts_copy","Subscriptions funded from the Real wallet ledger.")}</p>
        </div>
      </div>
      ${a.length?`<div class="history-grid">${a.map(V).join("")}</div>`:h(e("earn.no_active_contracts","No active contracts yet."))}
    </section>`}function O(t){const a=t.symbol||t.market_symbol||"--",n=String(t.direction||"BUY").toUpperCase(),s=S(n),i=t.type||t.market_type||"crypto",c=Number(t.live_price||0),p=c>0?e("market.live","LIVE"):e("market.unavailable","UNAVAILABLE"),u=c>0?"status-chip-live":"status-chip-locked",_=c>0?`$${d(c,i==="forex"?5:2)}`:"--",g=c>0?Y(t.live_change_pct||0):"0.00%",B=Number(t.copy_min_amount||100),P=t.levels_source==="live_derived"?'<span class="status-chip status-chip-derived">Live derived levels</span>':"";return`<article class="copy-card">
    <div class="copy-card__top">
      <div class="flex items-center gap-3 min-w-0">
        <span class="avalon-bot-mark" aria-hidden="true">&#129302;</span>
        <div class="min-w-0">
          <h3>${o(t.bot_name||t.bot_name_en||`Avalon ${a} AI Bot`)}</h3>
          <p>${o(a)} - ${e("bot.ai_trade_operation","AI trade operation")}</p>
        </div>
      </div>
      ${R(s)}
    </div>
    <div class="copy-card__quote">
      <span class="status-chip ${u}">${p}</span>
      <strong>${_}</strong>
      <span class="${Number(t.live_change_pct||0)>=0?"text-buy":"text-sell"}">${g}</span>
    </div>
    <div class="signal-metrics">
      ${r(e("trade.entry","Entry"),$(t.entry??t.entry_price))}
      ${r(e("trade.stop_loss","Stop loss"),$(t.sl??t.stop_loss))}
      ${r(e("trade.take_profit","Take profit"),$(t.tp1??t.take_profit_1))}
      ${r(e("bot.confidence","Confidence"),`${Number(t.confidence||0)}%`)}
    </div>
    <p class="copy-brief">${o(t.bot_brief||t.note||e("bot.default_brief","Desk-managed setup with controlled entry, stop, and target."))}</p>
    <div class="copy-card__chips">
      <span>${e("common.min","Min")} $${d(B)}</span>
      <span>${Number(t.copy_lock_days||0)}${e("common.days_short","d")} ${e("bot.lock","lock")}</span>
      <span>${Number(t.copy_profit_share_pct||0)}% ${e("bot.share","share")}</span>
      <span>${Number(t.subscribers||0)} ${e("bot.followers","followers")}</span>
      ${P}
    </div>
    <button class="btn-primary w-full mt-4" data-copy-signal="${E(t.id)}">${e("bot.copy_on_real","Copy on Real")}</button>
  </article>`}function K(t){const a=t.eligible!==!1,n=Number(t.is_perpetual||0)===1?e("earn.perpetual","Perpetual"):`${Number(t.term_days||0)}${e("common.days_short","d")}`,s=Number(t.min_amount||0),i=a?e("earn.eligible","ELIGIBLE"):e("earn.level_locked","LEVEL LOCKED");return`<article class="contract-card ${a?"":"locked"}">
    <div class="copy-card__top">
      <div>
        <span class="badge-accent">${o(t.badge||t.risk||e("earn.contract","Contract"))}</span>
        <h3>${o(t.name||t.name_en||e("earn.contract","Contract"))}</h3>
      </div>
      <span class="status-chip ${a?"status-chip-live":"status-chip-locked"}">${i}</span>
    </div>
    <p class="copy-brief">${o(t.desc||t.description||t.details||e("earn.contract_default_copy","Level managed contract product."))}</p>
    <div class="signal-metrics">
      ${r(e("earn.roi","ROI"),`${Number(t.roi_percent||0)}%`)}
      ${r(e("earn.term","Term"),n)}
      ${r(e("earn.minimum","Minimum"),`$${d(s)}`)}
      ${r(e("earn.schedule","Schedule"),t.payout_schedule||e("earn.end","end"))}
    </div>
    <div class="copy-card__chips">
      <span>${o(t.required_level?.name||e("level.starter","Starter"))}</span>
      <span>${Number(t.early_exit_allowed||0)?e("earn.early_exit","Early exit"):e("earn.locked_term","Locked term")}</span>
      <span>${o(t.product_kind||e("earn.contract","contract"))}</span>
    </div>
    <button class="${a?"btn-primary":"btn-ghost"} w-full mt-4" ${a?`data-contract-subscribe="${E(t.id)}"`:"disabled"}>${a?e("earn.subscribe","Subscribe"):e("earn.level_locked_label","Level locked")}</button>
  </article>`}function L(t){const a=String(t||"active").toLowerCase();return{active:e("bot.status_active","Active"),armed:e("bot.status_armed","Armed"),copied:e("bot.status_copied","Copied"),open:e("bot.status_open","Open"),running:e("bot.status_running","Running"),pending:e("bot.status_pending","Pending"),closed:e("bot.status_closed","Closed"),canceled:e("bot.status_canceled","Canceled"),cancelled:e("bot.status_canceled","Canceled"),expired:e("bot.status_expired","Expired")}[a]||String(t||"").toUpperCase()}function U(t){const a=t.symbol||t.market_symbol||"--",n=L(t.status),s=A(t),i=Array.isArray(t.open_positions)?t.open_positions:[],c=Array.isArray(t.closed_positions)?t.closed_positions:[],p=Number(t.pnl_total||0);return`<article class="history-card">
    <div class="flex items-center gap-3">
      <span class="avalon-mini-mark" aria-hidden="true">&#129302;</span>
      <div class="min-w-0">
        <h3>${o(t.bot_name||t.bot_name_en||`Avalon ${a} AI Bot`)}</h3>
        <p>${o(a)} - ${o(t.status_group?L(t.status_group):e("bot.copy_subscription","copy subscription"))}</p>
      </div>
      <span class="status-chip">${o(n)}</span>
    </div>
    <div class="signal-metrics mt-3">
      ${r(e("bot.reserved","Reserved"),`$${d(t.reserved_amount||0)}`)}
      ${r(e("trade.open","Open"),String(t.open_count??i.length))}
      ${r(e("trade.closed","Closed"),String(t.closed_count??c.length))}
      ${r("PnL",`$${d(p)}`)}
    </div>
    <details class="copy-details">
      <summary>${e("bot.trade_history","Bot trade history")}</summary>
      <div class="copy-details-list">
        ${i.length?`<strong>${e("trade.active_trades","Active trades")}</strong>${i.map(q).join("")}`:""}
        ${c.length?`<strong>${e("trade.closed_trades","Closed trades")}</strong>${c.map(q).join("")}`:""}
        ${!i.length&&!c.length?`<p class="text-muted text-xs">${e("bot.no_child_trades","No child trades have been opened yet.")}</p>`:""}
      </div>
    </details>
    ${s?`<button class="btn-danger w-full mt-3" data-cancel-copy="${E(t.id)}">${e("bot.cancel_copy_market","Cancel copy at market")}</button>`:""}
  </article>`}function V(t){return`<article class="history-card">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h3>${o(t.plan_name||e("earn.contract","Contract"))}</h3>
        <p>${o(L(t.status))} &middot; ${Number(t.is_perpetual||0)?e("earn.perpetual","Perpetual"):e("earn.term","Term")}</p>
      </div>
      <span class="status-chip status-chip-live">${o(t.product_kind||e("earn.contract","contract"))}</span>
    </div>
    <div class="signal-metrics mt-3">
      ${r(e("deposit.amount","Amount"),`$${d(t.amount||0)}`)}
      ${r(e("earn.expected","Expected"),`$${d(t.expected_return||0)}`)}
      ${r(e("earn.paid","Paid"),`$${d(t.paid_total||0)}`)}
      ${r(e("earn.roi","ROI"),`${Number(t.cycle_roi_percent||0)}%`)}
    </div>
  </article>`}function F(t,a){const n=(l("invest.signals")||[]).find(c=>String(c.id)===String(t));if(!n)return;const s=T();if(s){D(s);return}const i=Number(n.copy_min_amount||100);x(`
    <form class="space-y-4" id="copy-form">
      <div>
        <span class="badge-green">${e("bot.avalon_ai","Avalon AI")}</span>
        <h2 class="text-lg font-bold mt-1">${o(n.bot_name||n.bot_name_en||`Avalon ${n.symbol||n.market_symbol||"AI"} Bot`)}</h2>
        <p class="text-xs text-muted">${o(n.bot_brief||n.note||e("bot.admin_managed_operation","AI bot operation managed from admin."))}</p>
      </div>
      <div class="signal-metrics">
        ${r(e("trade.entry","Entry"),$(n.entry??n.entry_price))}
        ${r("SL",$(n.sl??n.stop_loss))}
        ${r("TP",$(n.tp1??n.take_profit_1))}
        ${r(e("bot.share","Share"),`${Number(n.copy_profit_share_pct||0)}%`)}
      </div>
      <label class="block">
        <span class="text-xs text-muted">${e("bot.copy_amount_usdt","Copy amount (USDT)")}</span>
        <input class="input mt-1" name="amount" type="number" min="${i}" step="0.01" value="${i}" required />
      </label>
      <p class="dialog-note">${e("bot.copy_dialog_note","This uses your Real wallet and may reserve funds until the copy is closed or expires.")}</p>
      <p class="dialog-error hidden" id="copy-error"></p>
      <button class="btn-primary w-full" type="submit">${e("bot.confirm_copy","Confirm Copy")}</button>
    </form>
  `),document.querySelector("#copy-form")?.addEventListener("submit",async c=>{c.preventDefault();const p=c.currentTarget,u=p.querySelector("#copy-error"),_=Number(new FormData(p).get("amount")||0);try{await N("/trading_bot/copy.php",{signal_id:Number(t),amount:_,mode:"real"},{timeout:12e3}),b(),await C(a)}catch(g){u&&(u.textContent=g?.message||e("bot.copy_failed","Copy failed"),u.classList.remove("hidden"))}})}async function H(t,a){if(!(!t||!window.confirm(e("bot.cancel_confirm","Cancel this Avalon copy and close its open trades at the current market price?"))))try{await N("/trading_bot/cancel.php",{subscription_id:Number(t)},{timeout:15e3}),await C(a)}catch(s){x(`<div class="text-center space-y-3">
      <h2 class="text-lg font-bold">${e("bot.cancel_failed","Cancel failed")}</h2>
      <p class="text-sm text-muted">${o(s?.message||e("bot.cancel_failed_copy","Could not cancel this copy right now."))}</p>
      <button class="btn-primary btn-sm" type="button" data-dialog-close>${e("common.close","Close")}</button>
    </div>`)}}function G(t,a){const n=(l("invest.contracts")||[]).find(c=>String(c.id)===String(t));if(!n)return;const s=T();if(s){D(s);return}const i=Number(n.min_amount||0);x(`
    <form class="space-y-4" id="contract-form">
      <div>
        <span class="badge-accent">${e("earn.contract","Contract")}</span>
        <h2 class="text-lg font-bold mt-1">${o(n.name||n.name_en||e("earn.contract","Contract"))}</h2>
        <p class="text-xs text-muted">${o(n.desc||n.details||e("earn.contract_subscription_copy","Level-gated contract subscription."))}</p>
      </div>
      <div class="signal-metrics">
        ${r(e("earn.roi","ROI"),`${Number(n.roi_percent||0)}%`)}
        ${r(e("earn.term","Term"),Number(n.is_perpetual||0)?e("earn.perpetual","Perpetual"):`${Number(n.term_days||0)}${e("common.days_short","d")}`)}
        ${r(e("earn.minimum","Minimum"),`$${d(i)}`)}
        ${r(e("earn.schedule","Schedule"),n.payout_schedule||e("earn.end","end"))}
      </div>
      <label class="block">
        <span class="text-xs text-muted">${e("deposit.amount","Amount")} (USDT)</span>
        <input class="input mt-1" name="amount" type="number" min="${i}" step="0.01" value="${i}" required />
      </label>
      <p class="dialog-note">${e("earn.contract_dialog_note","Funds are debited through the ledger and the contract is managed internally.")}</p>
      <p class="dialog-error hidden" id="contract-error"></p>
      <button class="btn-primary w-full" type="submit">${e("earn.subscribe","Subscribe")}</button>
    </form>
  `),document.querySelector("#contract-form")?.addEventListener("submit",async c=>{c.preventDefault();const p=c.currentTarget,u=p.querySelector("#contract-error"),_=Number(new FormData(p).get("amount")||0);try{await N("/invest/subscribe.php",{plan_id:String(t),amount:_},{timeout:12e3,headers:{"Idempotency-Key":X("contract")}}),b(),await C(a)}catch(g){u&&(u.textContent=g?.message||e("earn.subscription_failed","Subscription failed"),u.classList.remove("hidden"))}})}function T(){return l("mode")!=="real"?{title:e("funding.real_required","Real account required"),body:e("earn.real_required_copy","Avalon copies and contracts are visible in Demo, but activation requires an approved Real account."),action:e("earn.switch_real","Switch to Real"),attr:"data-switch-real"}:J()?null:{title:e("earn.kyc_required","KYC approval required"),body:e("earn.kyc_required_copy","Submit and approve KYC before copying signals or subscribing to contracts."),action:e("earn.open_kyc","Open KYC"),attr:"data-open-kyc"}}function z(t,a){return`<div class="gate-wrap">
    <div class="gate-blur">${t}</div>
    <div class="gate-overlay">
      <div class="gate-card">
        <span class="gate-icon">${I.lock}</span>
        <strong>${o(a.title)}</strong>
        <p>${o(a.body)}</p>
        <button class="btn-primary btn-sm" ${a.attr}>${o(a.action)}</button>
      </div>
    </div>
  </div>`}function D(t){x(`<div class="text-center space-y-3">
    <span class="gate-icon mx-auto">${I.lock}</span>
    <h2 class="text-lg font-bold">${o(t.title)}</h2>
    <p class="text-sm text-muted">${o(t.body)}</p>
    <button class="btn-primary btn-sm" ${t.attr}>${o(t.action)}</button>
  </div>`),document.querySelector(`[${t.attr}]`)?.addEventListener("click",()=>{b(),t.attr==="data-switch-real"?(localStorage.setItem("vp_mode","real"),location.reload()):location.hash="#/kyc"})}function x(t){b();const a=document.createElement("div");a.className="dialog-backdrop",a.innerHTML=`<div class="dialog-card">
    <button class="dialog-close" aria-label="Close dialog">${I.close}</button>
    ${t}
  </div>`,document.body.appendChild(a),a.querySelector(".dialog-close")?.addEventListener("click",b),a.querySelector("[data-dialog-close]")?.addEventListener("click",b),a.addEventListener("click",n=>{n.target===a&&b()})}function b(){document.querySelector(".dialog-backdrop")?.remove()}function r(t,a){return`<div class="mini-metric"><span>${o(t)}</span><strong>${o(a??"--")}</strong></div>`}function h(t){return`<div class="empty-state">${o(t)}</div>`}function S(t){const a=String(t||"BUY").toUpperCase();return["BUY","SELL","NEUTRAL"].includes(a)?a:"BUY"}function R(t){const a=S(t);return`<span class="bot-direction-chip is-${a.toLowerCase()}">${o(W(a))}</span>`}function W(t){const a=S(t);return a==="SELL"?e("trade.sell","SELL"):a==="NEUTRAL"?e("bot.neutral","NEUTRAL"):e("trade.buy","BUY")}function A(t){const a=String(t?.status_group||t?.status||"").toLowerCase();return["active","armed","copied","open","running","pending"].some(n=>a.includes(n))}function q(t){const a=S(t.side||"BUY"),n=Number(t.pnl||t.pnl_usd||t.unrealized_pnl||0);return`<div class="copy-position-row">
    <span>${o(t.symbol||"--")}</span>
    ${R(a)}
    <b class="${n>=0?"text-buy":"text-sell"}">${d(n)}</b>
  </div>`}function $(t){const a=Number(t||0);return a>0?`$${d(a,a<10?4:2)}`:"--"}function J(){const t=String(l("kyc")?.status||"").toLowerCase();return["approved","verified","accepted"].includes(t)}function Q(){const t=l("wallet")||{};return l("mode")==="real"?t.real||{balance:0,available:0,currency:"USDT"}:t.demo||{balance:1e4,available:1e4,currency:"USDT_DEMO"}}function X(t){return globalThis.crypto?.randomUUID?`${t}:${globalThis.crypto.randomUUID()}`:`${t}:${Date.now()}:${Math.random().toString(16).slice(2)}`}export{at as cleanup,et as mount,tt as render};
