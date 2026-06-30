import{f as b,s as g,x as D,j as l,v as e,m as p,g as o,c as f,e as k,o as I,k as x,h as C,p as Y}from"./main-Bbtg199v.js";let m=[];function et(){const t=l("invest.tab")||localStorage.getItem("vp_earn_tab")||"copy",a=l("level")||{},n=X();a.current,a.next;const s=l("mode");return`
    <div class="space-y-4 animate-fade-in earn-page">
      <div class="earn-balance-bar">
        <span class="text-[10px] text-muted uppercase tracking-wider">${e("balance.available","Available Balance")}</span>
        <strong class="text-lg font-mono">${p(n.available)} <small class="text-muted text-xs font-normal">${o(n.currency||"USDT")}</small></strong>
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
    </div>`}function at(t){S(t);const a=t.querySelector(".level-strip");if(a){const n=a.querySelector(".level-pill.is-current");n&&requestAnimationFrame(()=>{a.scrollTo({left:n.offsetLeft-8,behavior:"auto"})})}m.push(b(t,"[data-earn-tab]","click",(n,s)=>{g("invest.tab",s.dataset.earnTab),localStorage.setItem("vp_earn_tab",s.dataset.earnTab),A(t)})),m.push(b(t,"[data-copy-signal]","click",(n,s)=>H(s.dataset.copySignal,t))),m.push(b(t,"[data-cancel-copy]","click",(n,s)=>G(s.dataset.cancelCopy,t))),m.push(b(t,"[data-contract-subscribe]","click",(n,s)=>z(s.dataset.contractSubscribe,t))),m.push(b(t,"[data-switch-real]","click",()=>{D("earn")})),m.push(b(t,"[data-open-kyc]","click",()=>{location.hash="#/kyc"})),m.push(b(t,"[data-dismiss-earn-gate]","click",(n,s)=>{n.preventDefault(),s.closest(".gate-overlay")?.classList.add("is-dismissed")}))}function nt(){m.forEach(t=>{try{t()}catch{}}),m=[]}async function S(t){try{const[a,n,s,i]=await Promise.all([f(`/signals.php?bot=1&home=1&lang=${encodeURIComponent(k())}`,{timeout:8e3}).catch(()=>({items:[]})),f(`/invest/contracts.php?lang=${encodeURIComponent(k())}`,{timeout:8e3}).catch(()=>({items:[]})),f(`/trading_bot/my.php?lang=${encodeURIComponent(k())}`,{timeout:8e3}).catch(()=>({items:[]})),f(`/invest/my.php?lang=${encodeURIComponent(k())}`,{timeout:8e3}).catch(()=>({items:[]}))]);g("invest.signals",a.items||[]),g("invest.contracts",n.items||[]),g("invest.copies",s.items||[]),g("invest.mine",{contracts:(i.items||[]).filter(c=>String(c.product_kind||"").toLowerCase()==="contract")}),A(t)}catch{A(t)}}function A(t){const a=t.querySelector("#invest-content");if(!a)return;const n=l("invest.tab")||localStorage.getItem("vp_earn_tab")||"copy",s=E(),i=n==="copy"?j():O();a.innerHTML=s?W(i,s,n):i,s&&n==="contracts"&&requestAnimationFrame(()=>{const c=document.querySelector("#view"),d=Math.max(0,a.offsetTop-12);c&&c.scrollTop>d&&c.scrollTo({top:d,behavior:"auto"})}),t.querySelectorAll("[data-earn-tab]").forEach(c=>{c.classList.toggle("active",c.dataset.earnTab===n)})}function j(){const t=l("invest.signals")||[],a=l("invest.copies")||[],n=a.filter(T),s=a.filter(i=>!T(i));return`
    <section class="desk-panel">
      <div class="panel-head">
        <div>
          <span class="badge-green">${e("bot.avalon_ai","Avalon AI")}</span>
          <h2>${e("bot.avalon_name","Avalon AI Trading Bot")}</h2>
          <p>${e("bot.avalon_copy","Real-only AI copy bots with admin-managed trade operations.")}</p>
        </div>
      </div>
      ${t.length?`<div class="copy-grid">${t.map(K).join("")}</div>`:h(e("bot.no_signals","No bot trades available yet."))}
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
          ${n.length?`<div class="history-grid">${n.map(q).join("")}</div>`:h(e("bot.no_active_copies","No active copies."))}
        </div>
        <div>
          <div class="history-subtitle"><span>${e("trade.closed","Closed")}</span><b>${s.length}</b></div>
          ${s.length?`<div class="history-grid">${s.map(q).join("")}</div>`:h(e("bot.no_closed_copies","No closed copies yet."))}
        </div>
      </div>
    </section>`}function O(){const t=l("invest.contracts")||[],a=l("invest.mine.contracts")||[];return`
    <section class="desk-panel">
      <div class="panel-head">
        <div>
          <span class="badge-accent">${e("earn.contracts","Contracts")}</span>
          <h2>${e("earn.contracts_title","Perpetual and term contracts")}</h2>
          <p>${e("earn.contracts_copy","Level-gated contracts for approved Real wallets.")}</p>
        </div>
      </div>
      ${t.length?`<div class="contract-grid">${t.map(V).join("")}</div>`:h(e("earn.no_contracts","No contracts available yet."))}
    </section>
    <section class="desk-panel">
      <div class="panel-head">
        <div>
          <span class="badge-green">${e("earn.running","Running")}</span>
          <h2>${e("earn.my_contracts","My contracts")}</h2>
          <p>${e("earn.my_contracts_copy","Subscriptions funded from the Real wallet ledger.")}</p>
        </div>
      </div>
      ${a.length?`<div class="history-grid">${a.map(F).join("")}</div>`:h(e("earn.no_active_contracts","No active contracts yet."))}
    </section>`}function K(t){const a=t.symbol||t.market_symbol||"--",n=String(t.direction||"BUY").toUpperCase(),s=L(n),i=t.type||t.market_type||"crypto",c=Number(t.live_price||0),d=c>0?e("market.live","LIVE"):e("market.unavailable","UNAVAILABLE"),u=c>0?"status-chip-live":"status-chip-locked",$=c>0?`$${p(c,i==="forex"?5:2)}`:"--",_=c>0?Y(t.live_change_pct||0):"0.00%",P=Number(t.copy_min_amount||100),M=t.levels_source==="live_derived"?'<span class="status-chip status-chip-derived">Live derived levels</span>':"";return`<article class="copy-card">
    <div class="copy-card__top">
      <div class="flex items-center gap-3 min-w-0">
        <span class="avalon-bot-mark" aria-hidden="true">&#129302;</span>
        <div class="min-w-0">
          <h3>${o(t.bot_name||t.bot_name_en||`Avalon ${a} AI Bot`)}</h3>
          <p>${o(a)} - ${e("bot.ai_trade_operation","AI trade operation")}</p>
        </div>
      </div>
      ${B(s)}
    </div>
    <div class="copy-card__quote">
      <span class="status-chip ${u}">${d}</span>
      <strong>${$}</strong>
      <span class="${Number(t.live_change_pct||0)>=0?"text-buy":"text-sell"}">${_}</span>
    </div>
    <div class="signal-metrics">
      ${r(e("trade.entry","Entry"),y(t.entry??t.entry_price))}
      ${r(e("trade.stop_loss","Stop loss"),y(t.sl??t.stop_loss))}
      ${r(e("trade.take_profit","Take profit"),y(t.tp1??t.take_profit_1))}
      ${r(e("bot.confidence","Confidence"),`${Number(t.confidence||0)}%`)}
    </div>
    <p class="copy-brief">${o(t.bot_brief||t.note||e("bot.default_brief","Desk-managed setup with controlled entry, stop, and target."))}</p>
    <div class="copy-card__chips">
      <span>${e("common.min","Min")} $${p(P)}</span>
      <span>${Number(t.copy_lock_days||0)}${e("common.days_short","d")} ${e("bot.lock","lock")}</span>
      <span>${Number(t.copy_profit_share_pct||0)}% ${e("bot.share","share")}</span>
      <span>${Number(t.subscribers||0)} ${e("bot.followers","followers")}</span>
      ${M}
    </div>
    <button class="btn-primary w-full mt-4" data-copy-signal="${C(t.id)}">${e("bot.copy_on_real","Copy on Real")}</button>
  </article>`}function V(t){const a=t.eligible!==!1,n=Number(t.is_perpetual||0)===1?e("earn.perpetual","Perpetual"):`${Number(t.term_days||0)}${e("common.days_short","d")}`,s=Number(t.min_amount||0),i=a?e("earn.eligible","ELIGIBLE"):e("earn.level_locked","LEVEL LOCKED");return`<article class="contract-card ${a?"":"locked"}">
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
      ${r(e("earn.minimum","Minimum"),`$${p(s)}`)}
      ${r(e("earn.schedule","Schedule"),t.payout_schedule||e("earn.end","end"))}
    </div>
    <div class="copy-card__chips">
      <span>${o(t.required_level?.name||e("level.starter","Starter"))}</span>
      <span>${Number(t.early_exit_allowed||0)?e("earn.early_exit","Early exit"):e("earn.locked_term","Locked term")}</span>
      <span>${o(t.product_kind||e("earn.contract","contract"))}</span>
    </div>
    <button class="${a?"btn-primary":"btn-ghost"} w-full mt-4" ${a?`data-contract-subscribe="${C(t.id)}"`:"disabled"}>${a?e("earn.subscribe","Subscribe"):e("earn.level_locked_label","Level locked")}</button>
  </article>`}function N(t){const a=String(t||"active").toLowerCase();return{active:e("bot.status_active","Active"),armed:e("bot.status_armed","Armed"),copied:e("bot.status_copied","Copied"),open:e("bot.status_open","Open"),running:e("bot.status_running","Running"),pending:e("bot.status_pending","Pending"),closed:e("bot.status_closed","Closed"),canceled:e("bot.status_canceled","Canceled"),cancelled:e("bot.status_canceled","Canceled"),expired:e("bot.status_expired","Expired")}[a]||String(t||"").toUpperCase()}function q(t){const a=t.symbol||t.market_symbol||"--",n=N(t.status),s=T(t),i=Array.isArray(t.open_positions)?t.open_positions:[],c=Array.isArray(t.closed_positions)?t.closed_positions:[],d=Number(t.pnl_total||0);return`<article class="history-card">
    <div class="flex items-center gap-3">
      <span class="avalon-mini-mark" aria-hidden="true">&#129302;</span>
      <div class="min-w-0">
        <h3>${o(t.bot_name||t.bot_name_en||`Avalon ${a} AI Bot`)}</h3>
        <p>${o(a)} - ${o(t.status_group?N(t.status_group):e("bot.copy_subscription","copy subscription"))}</p>
      </div>
      <span class="status-chip">${o(n)}</span>
    </div>
    <div class="signal-metrics mt-3">
      ${r(e("bot.reserved","Reserved"),`$${p(t.reserved_amount||0)}`)}
      ${r(e("trade.open","Open"),String(t.open_count??i.length))}
      ${r(e("trade.closed","Closed"),String(t.closed_count??c.length))}
      ${r("PnL",`$${p(d)}`)}
    </div>
    <details class="copy-details">
      <summary>${e("bot.trade_history","Bot trade history")}</summary>
      <div class="copy-details-list">
        ${i.length?`<strong>${e("trade.active_trades","Active trades")}</strong>${i.map(U).join("")}`:""}
        ${c.length?`<strong>${e("trade.closed_trades","Closed trades")}</strong>${c.map(U).join("")}`:""}
        ${!i.length&&!c.length?`<p class="text-muted text-xs">${e("bot.no_child_trades","No child trades have been opened yet.")}</p>`:""}
      </div>
    </details>
    ${s?`<button class="btn-danger w-full mt-3" data-cancel-copy="${C(t.id)}">${e("bot.cancel_copy_market","Cancel copy at market")}</button>`:""}
  </article>`}function F(t){return`<article class="history-card">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h3>${o(t.plan_name||e("earn.contract","Contract"))}</h3>
        <p>${o(N(t.status))} &middot; ${Number(t.is_perpetual||0)?e("earn.perpetual","Perpetual"):e("earn.term","Term")}</p>
      </div>
      <span class="status-chip status-chip-live">${o(t.product_kind||e("earn.contract","contract"))}</span>
    </div>
    <div class="signal-metrics mt-3">
      ${r(e("deposit.amount","Amount"),`$${p(t.amount||0)}`)}
      ${r(e("earn.expected","Expected"),`$${p(t.expected_return||0)}`)}
      ${r(e("earn.paid","Paid"),`$${p(t.paid_total||0)}`)}
      ${r(e("earn.roi","ROI"),`${Number(t.cycle_roi_percent||0)}%`)}
    </div>
  </article>`}function H(t,a){const n=(l("invest.signals")||[]).find(c=>String(c.id)===String(t));if(!n)return;const s=E();if(s){R(s);return}const i=Number(n.copy_min_amount||100);w(`
    <form class="space-y-4" id="copy-form">
      <div>
        <span class="badge-green">${e("bot.avalon_ai","Avalon AI")}</span>
        <h2 class="text-lg font-bold mt-1">${o(n.bot_name||n.bot_name_en||`Avalon ${n.symbol||n.market_symbol||"AI"} Bot`)}</h2>
        <p class="text-xs text-muted">${o(n.bot_brief||n.note||e("bot.admin_managed_operation","AI bot operation managed from admin."))}</p>
      </div>
      <div class="signal-metrics">
        ${r(e("trade.entry","Entry"),y(n.entry??n.entry_price))}
        ${r("SL",y(n.sl??n.stop_loss))}
        ${r("TP",y(n.tp1??n.take_profit_1))}
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
  `),document.querySelector("#copy-form")?.addEventListener("submit",async c=>{c.preventDefault();const d=c.currentTarget,u=d.querySelector("#copy-error"),$=Number(new FormData(d).get("amount")||0);try{await I("/trading_bot/copy.php",{signal_id:Number(t),amount:$,mode:"real"},{timeout:12e3}),v(),await S(a)}catch(_){u&&(u.textContent=_?.message||e("bot.copy_failed","Copy failed"),u.classList.remove("hidden"))}})}async function G(t,a){if(!(!t||!window.confirm(e("bot.cancel_confirm","Cancel this Avalon copy and close its open trades at the current market price?"))))try{await I("/trading_bot/cancel.php",{subscription_id:Number(t)},{timeout:15e3}),await S(a)}catch(s){w(`<div class="text-center space-y-3">
      <h2 class="text-lg font-bold">${e("bot.cancel_failed","Cancel failed")}</h2>
      <p class="text-sm text-muted">${o(s?.message||e("bot.cancel_failed_copy","Could not cancel this copy right now."))}</p>
      <button class="btn-primary btn-sm" type="button" data-dialog-close>${e("common.close","Close")}</button>
    </div>`)}}function z(t,a){const n=(l("invest.contracts")||[]).find(c=>String(c.id)===String(t));if(!n)return;const s=E();if(s){R(s);return}const i=Number(n.min_amount||0);w(`
    <form class="space-y-4" id="contract-form">
      <div>
        <span class="badge-accent">${e("earn.contract","Contract")}</span>
        <h2 class="text-lg font-bold mt-1">${o(n.name||n.name_en||e("earn.contract","Contract"))}</h2>
        <p class="text-xs text-muted">${o(n.desc||n.details||e("earn.contract_subscription_copy","Level-gated contract subscription."))}</p>
      </div>
      <div class="signal-metrics">
        ${r(e("earn.roi","ROI"),`${Number(n.roi_percent||0)}%`)}
        ${r(e("earn.term","Term"),Number(n.is_perpetual||0)?e("earn.perpetual","Perpetual"):`${Number(n.term_days||0)}${e("common.days_short","d")}`)}
        ${r(e("earn.minimum","Minimum"),`$${p(i)}`)}
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
  `),document.querySelector("#contract-form")?.addEventListener("submit",async c=>{c.preventDefault();const d=c.currentTarget,u=d.querySelector("#contract-error"),$=Number(new FormData(d).get("amount")||0);try{await I("/invest/subscribe.php",{plan_id:String(t),amount:$},{timeout:12e3,headers:{"Idempotency-Key":Z("contract")}}),v(),await S(a)}catch(_){u&&(u.textContent=_?.message||e("earn.subscription_failed","Subscription failed"),u.classList.remove("hidden"))}})}function E(){return l("mode")!=="real"?{title:e("funding.real_required","Real account required"),body:e("earn.real_required_copy","Avalon copies and contracts are visible in Demo, but activation requires an approved Real account."),action:e("earn.switch_real","Switch to Real"),attr:"data-switch-real"}:Q()?null:{title:e("earn.kyc_required","KYC approval required"),body:e("earn.kyc_required_copy","Submit and approve KYC before copying signals or subscribing to contracts."),action:e("earn.open_kyc","Open KYC"),attr:"data-open-kyc"}}function W(t,a,n=""){return`<div class="gate-wrap ${n==="contracts"?"gate-wrap-contracts":""}">
    <div class="gate-blur">${t}</div>
    <div class="gate-overlay gate-overlay-viewport">
      <div class="gate-card">
        <button class="gate-card-close" type="button" aria-label="${C(e("common.close","Close"))}" data-dismiss-earn-gate>${x.close}</button>
        <span class="gate-icon">${x.lock}</span>
        <strong>${o(a.title)}</strong>
        <p>${o(a.body)}</p>
        <button class="btn-primary btn-sm" ${a.attr}>${o(a.action)}</button>
      </div>
    </div>
  </div>`}function R(t){w(`<div class="text-center space-y-3">
    <span class="gate-icon mx-auto">${x.lock}</span>
    <h2 class="text-lg font-bold">${o(t.title)}</h2>
    <p class="text-sm text-muted">${o(t.body)}</p>
    <button class="btn-primary btn-sm" ${t.attr}>${o(t.action)}</button>
  </div>`),document.querySelector(`[${t.attr}]`)?.addEventListener("click",()=>{v(),t.attr==="data-switch-real"?D("earn"):location.hash="#/kyc"})}function w(t){v();const a=document.createElement("div");a.className="dialog-backdrop",a.innerHTML=`<div class="dialog-card">
    <button class="dialog-close" aria-label="Close dialog">${x.close}</button>
    ${t}
  </div>`,document.body.appendChild(a),a.querySelector(".dialog-close")?.addEventListener("click",v),a.querySelector("[data-dialog-close]")?.addEventListener("click",v),a.addEventListener("click",n=>{n.target===a&&v()})}function v(){document.querySelector(".dialog-backdrop")?.remove()}function r(t,a){return`<div class="mini-metric"><span>${o(t)}</span><strong>${o(a??"--")}</strong></div>`}function h(t){return`<div class="empty-state">${o(t)}</div>`}function L(t){const a=String(t||"BUY").toUpperCase();return["BUY","SELL","NEUTRAL"].includes(a)?a:"BUY"}function B(t){const a=L(t);return`<span class="bot-direction-chip is-${a.toLowerCase()}">${o(J(a))}</span>`}function J(t){const a=L(t);return a==="SELL"?e("trade.sell","SELL"):a==="NEUTRAL"?e("bot.neutral","NEUTRAL"):e("trade.buy","BUY")}function T(t){const a=String(t?.status_group||t?.status||"").toLowerCase();return["active","armed","copied","open","running","pending"].some(n=>a.includes(n))}function U(t){const a=L(t.side||"BUY"),n=Number(t.pnl||t.pnl_usd||t.unrealized_pnl||0);return`<div class="copy-position-row">
    <span>${o(t.symbol||"--")}</span>
    ${B(a)}
    <b class="${n>=0?"text-buy":"text-sell"}">${p(n)}</b>
  </div>`}function y(t){const a=Number(t||0);return a>0?`$${p(a,a<10?4:2)}`:"--"}function Q(){const t=String(l("kyc")?.status||"").toLowerCase();return["approved","verified","accepted"].includes(t)}function X(){const t=l("wallet")||{};return l("mode")==="real"?t.real||{balance:0,available:0,currency:"USDT"}:t.demo||{balance:1e4,available:1e4,currency:"USDT_DEMO"}}function Z(t){return globalThis.crypto?.randomUUID?`${t}:${globalThis.crypto.randomUUID()}`:`${t}:${Date.now()}:${Math.random().toString(16).slice(2)}`}export{nt as cleanup,at as mount,et as render};
