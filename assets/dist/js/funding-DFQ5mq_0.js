import{j as $,k as c,h as f,t as n,m as p,g as d,l as Z,c as ee,s as te,n as ne,i as be}from"./main-KRyrOb0b.js";const H=globalThis.__MEX_FUNDING_CACHE__||(globalThis.__MEX_FUNDING_CACHE__=new Map),we=45e3;let T=[];const ie=[{key:"deposit",label:"funding.deposit",fallback:"Deposit",icon:c.deposit},{key:"withdraw",label:"funding.withdraw",fallback:"Withdraw",icon:c.withdraw},{key:"history",label:"funding.history",fallback:"History",icon:c.wallet}];function et(e={}){const t=fe(e),r=$("wallet")||{};$("kyc");const i=$("level")||{},a=$("mode")==="real"?"real":"demo",s=a==="real"?r.real||{}:r.demo||{};return i.current,`
    <div class="funds-workspace animate-fade-in" data-active-funding-tab="${f(t)}">
      <section class="funds-hero-pro">
        <div>
          <span class="badge-accent">${n("funding.assets_desk","Assets desk")}</span>
          <h1>${n("nav.wallet","Funds")}</h1>
          <p>${n("funding.hero_copy","Deposit, withdraw and audit wallet movements from one fast workspace powered by admin payment categories.")}</p>
        </div>
        <div class="funds-balance-pro">
          <span>${a==="real"?n("balance.available","Available balance"):n("funding.demo_balance","Demo balance")}</span>
          <strong>${p(s.available||s.balance||0)}</strong>
          <small>${d(s.currency||(a==="real"?"USDT":"USDT_DEMO"))}</small>
        </div>
      </section>

      <section class="funds-tabs-pro" role="tablist" aria-label="Funding workspace tabs">
        ${ie.map(o=>`
          <button type="button" class="${o.key===t?"active":""}" data-funding-tab="${o.key}" role="tab" aria-selected="${o.key===t?"true":"false"}">
            <span>${o.icon||""}</span>${d(n(o.label,o.fallback))}
          </button>
        `).join("")}
      </section>

      ${a!=="real"&&t!=="history"?`<section class="funding-mode-warning">
        <span class="gate-icon">${c.lock}</span>
        <div>
          <strong>${n("funding.real_required","Real account required")}</strong>
          <small>${n("funding.real_required_copy","Methods are visible for preview. Switch to Real before submitting a live funding request.")}</small>
        </div>
        <button type="button" class="btn-primary btn-sm" data-switch-real>${n("earn.switch_real","Switch to Real")}</button>
      </section>`:""}

      ${t==="history"?Se():$e(t)}
    </div>`}function tt(e,t={}){const r=fe(t);ve(e,t);const i=o=>{const l=o.target.closest("[data-funding-tab]");if(l){o.preventDefault(),ne("wallet",{action:l.dataset.fundingTab||"deposit"});return}const u=o.target.closest("[data-funding-category]");if(u){e.__fundingCategory=u.dataset.fundingCategory||"",e.__fundingSelectedMethodId="",re(e),ae(e),S(e);return}const g=o.target.closest("[data-method]");if(g){e.__fundingSelectedMethodId=g.dataset.method||"",S(e);return}const C=o.target.closest("[data-history-filter]");if(C){e.__fundingHistoryFilter=C.dataset.historyFilter||"all",de(e);return}const m=o.target.closest("[data-funding-history-toggle]");if(m){const _=m.closest("[data-funding-history-card]");if(_){const y=!_.classList.contains("is-expanded");_.classList.toggle("is-expanded",y),m.setAttribute("aria-expanded",y?"true":"false")}return}const v=o.target.closest("[data-copy-address]");if(v){Qe(v);return}o.target.closest("[data-switch-real]")&&(localStorage.setItem("vp_mode","real"),te("mode","real"),location.reload())};e.addEventListener("click",i),T.push(()=>e.removeEventListener("click",i));const a=o=>{o.target.matches('input[name="amount"], [data-withdraw-field]')&&S(e)};e.addEventListener("input",a),T.push(()=>e.removeEventListener("input",a));const s=o=>{const l=o.target.closest('input[name="proof"]');if(!l)return;const u=e.querySelector("#proof-file-name"),g=l.files?.[0];u&&(u.textContent=g?`${g.name} - ${Je(g.size||0)}`:n("funding.upload_file_hint","Image or PDF up to 8MB"))};if(e.addEventListener("change",s),T.push(()=>e.removeEventListener("change",s)),e.querySelectorAll("[data-quick-amount]").forEach(o=>{o.addEventListener("click",()=>{const l=e.querySelector('input[name="amount"]');l&&(l.value=o.dataset.quickAmount||""),S(e)})}),r==="history"){Ne(e);return}ke(e,r),e.querySelector("#funding-form")?.addEventListener("submit",o=>Fe(o,e,r))}function ve(e,t){const r=t&&t.stripe;if(!r)return;try{window.history.replaceState(null,"",window.location.pathname+"#/wallet")}catch{}const i=document.createElement("div");if(i.className="stripe-return-banner",e.prepend(i),r!=="success"){i.classList.add("is-cancel"),i.innerHTML=`<div><strong>${n("funding.payment_canceled","Card payment was canceled.")}</strong><small>${n("funding.payment_canceled_copy","You can start a new deposit whenever you are ready.")}</small></div>`;return}const a=Number(t.deposit||0);i.classList.add("is-pending"),i.innerHTML=`<span class="stripe-return-spin"></span><div><strong>${n("funding.verifying_payment","Verifying card payment...")}</strong></div>`,(async()=>{let s="";if(a>0)for(let o=0;o<4;o++){try{const l=await Z("/deposits/stripe_sync.php",{deposit_id:a},{timeout:15e3});if(s=String(l?.status||""),s==="confirmed"||s==="failed")break}catch{}await new Promise(l=>setTimeout(l,2500))}if(s==="confirmed"){i.className="stripe-return-banner is-success",i.innerHTML=`<div><strong>${n("funding.deposit_confirmed","Payment confirmed. Funds credited to your wallet.")}</strong></div>`;try{const o=await ee("/bootstrap.php");o&&o.wallet&&te("wallet",o.wallet)}catch{}ne("wallet",{action:"history"})}else s==="failed"?(i.className="stripe-return-banner is-cancel",i.innerHTML=`<div><strong>${n("funding.deposit_failed","Payment was not completed.")}</strong></div>`):(i.className="stripe-return-banner",i.innerHTML=`<div><strong>${n("funding.payment_processing","Payment is processing. Your balance will update shortly.")}</strong></div>`)})()}function nt(){document.querySelectorAll(".funds-workspace").forEach(e=>I(e)),T.forEach(e=>{try{e()}catch{}}),T=[]}function $e(e){const t=e==="deposit";return`
    <section class="funding-flow-shell">
      <div class="funding-flow-main card ${t?"deposit-console-card":""}">
        <div class="panel-headline funding-panel-title">
          <span class="${t?"badge-green":"badge-accent"}">${t?n("funding.deposit_ticket","Deposit ticket"):n("funding.withdraw_ticket","Withdrawal ticket")}</span>
          <h2>${t?n("funding.create_deposit","Create deposit transfer"):n("funding.create_withdraw","Create withdrawal request")}</h2>
        </div>

        <form id="funding-form" data-kind="${e}" class="funding-form-pro" novalidate>
          <div class="funding-step-block">
            <span class="field-label">${n("funding.select_section","1. Select section")}</span>
            <div class="funding-category-rail" id="funding-categories">
              ${Array.from({length:3}).map(()=>'<div class="skeleton h-16 rounded-lg"></div>').join("")}
            </div>
          </div>

          <div class="funding-step-block">
            <span class="field-label">${n("funding.select_method_step","2. Select method")}</span>
            <div id="method-cards" class="method-grid method-grid-rail">
              ${Array.from({length:4}).map(()=>'<div class="skeleton h-20 rounded-lg"></div>').join("")}
            </div>
          </div>

          ${t?`<div id="deposit-transfer-panel" class="deposit-transfer-panel is-muted">
            ${se(n("funding.transfer_details_waiting","Transfer details will appear here"),n("funding.transfer_details_waiting_copy","Choose a method to unlock account details, QR code, wallet address and bank fields."))}
          </div>`:'<div id="withdraw-fields-panel" class="withdraw-fields-panel"></div>'}

          <div class="deposit-ticket-grid">
            <label class="block">
              <span class="field-label">${t?n("funding.amount_step","3. Amount"):n("deposit.amount","Amount")}</span>
              <input type="number" name="amount" class="input mt-1" value="${t?"":"50"}" min="1" step="any" placeholder="${t?f(n("funding.amount_placeholder","Enter exact amount after copying the transfer details")):"50"}" required>
            </label>
            <label class="block">
              <span class="field-label">${n("funding.currency","Currency")}</span>
              <input type="text" name="currency" class="input mt-1" value="USDT" readonly>
            </label>
          </div>

          ${t?`<div class="quick-amount-rail" aria-label="Quick amount">
            ${[100,250,500,1e3,2500].map(r=>`<button type="button" class="quick-amount-chip" data-quick-amount="${r}">${p(r,0)}</button>`).join("")}
          </div>
          <div id="deposit-proof-slot" class="deposit-proof-slot"></div>`:""}

          <label class="block deposit-note-field">
            <span class="field-label">${t?n("funding.reference_notes","Reference / notes"):n("funding.additional_notes","Additional notes")}</span>
            <textarea name="notes" class="input mt-1" rows="2" placeholder="${t?f(n("funding.reference_placeholder","Sender name, transaction hash, or bank reference...")):f(n("funding.notes_placeholder","Optional note for the operations desk..."))}"></textarea>
          </label>

          <div class="funding-submit-zone">
            <button type="submit" class="${t?"btn-primary":"btn-sell"} w-full py-3" id="funding-submit">
              ${t?n("funding.confirm_transfer","Confirm transfer"):n("funding.submit_withdraw","Submit withdrawal request")}
            </button>
            <p class="text-xs text-center funding-form-status" id="form-status"></p>
          </div>
        </form>
      </div>

      <aside class="funding-side-stack">
        <section class="card funding-sidebar-card funding-guide-card">
          <div class="panel-headline">
            <span class="badge-green">${t?n("funding.secure_checklist","Secure checklist"):n("funding.payout_checklist","Payout checklist")}</span>
            <h2>${t?n("funding.before_confirm","Before you confirm"):n("funding.before_request","Before you request")}</h2>
          </div>
          <div class="funding-checklist">
            ${L(n("funding.check_method_only","Use the selected category and method only"),!0)}
            ${L(t?n("funding.check_exact_amount","Send the exact amount shown"):n("funding.check_balance_cover","Balance must cover payout amount"),!0)}
            ${L(t?n("funding.check_receipt","Upload a clear receipt when required"):n("funding.check_destination","Provide payout destination"),!0)}
            ${L(n("funding.check_real_required","Real mode required"),$("mode")==="real")}
          </div>
        </section>
      </aside>
    </section>`}function Se(){return`
    <section class="card funding-history-workspace">
      <div class="panel-headline-row">
        <div>
          <span class="badge-accent">${n("funding.history","History")}</span>
          <h2>${n("funding.history_title","Funding history")}</h2>
        </div>
        <div class="history-filter-rail">
          ${["all","deposit","withdraw","pending","completed","failed"].map((e,t)=>`
            <button type="button" class="${t===0?"active":""}" data-history-filter="${e}">${d(Ke(e))}</button>
          `).join("")}
        </div>
      </div>
      <div id="funding-history-all" class="funding-history-stack">
        <p class="text-muted text-sm text-center py-10">${n("funding.loading_history","Loading funding history...")}</p>
      </div>
    </section>`}async function A(e,t={},r=we){const i=e,a=Date.now(),s=H.get(i);if(s&&a-s.time<r)return s.data;const o=await ee(e,t);return H.set(i,{time:a,data:o}),o}async function ke(e,t){try{const r=$("mode")==="real"?"real":"both",i=await A(`/payment_methods/list.php?kind=${encodeURIComponent(t)}&scope=${r}&currency=*`,{timeout:9e3,retry:1},9e4),a=i?.items||[],s=qe(i?.categories||[],a);e.__fundingKind=t,e.__fundingMethods=a,e.__fundingCategories=s,e.__fundingCategory=s[0]?.key||"",e.__fundingSelectedMethodId="",re(e),ae(e),S(e)}catch{const i=e.querySelector("#funding-categories"),a=e.querySelector("#method-cards");i&&(i.innerHTML=`<div class="empty-state empty-state--compact">${n("funding.sections_unavailable","Payment sections are temporarily unavailable.")}</div>`),a&&(a.innerHTML="")}}function qe(e,t){const r=new Set(t.map(k).filter(Boolean)),i=[];return e.forEach(a=>{const s=M(a.key||a.key_slug||a.label);!s||!r.has(s)||i.push({key:s,label:a.label||D(s),hint:a.hint||J(s),icon:a.image_url?`<img src="${f(a.image_url)}" alt="">`:E(s,a.icon)})}),r.forEach(a=>{i.some(s=>s.key===a)||i.push({key:a,label:D(a),hint:J(a),icon:E(a)})}),i}function re(e){const t=e.querySelector("#funding-categories"),r=e.__fundingCategories||[],i=e.__fundingCategory||r[0]?.key||"";if(t){if(!r.length){t.innerHTML=`<div class="empty-state empty-state--compact">${n("funding.no_sections","No active funding sections are configured by admin.")}</div>`;return}t.innerHTML=r.map(a=>`
    <button type="button" class="${a.key===i?"active":""}" data-funding-category="${f(a.key)}">
      <i>${a.icon||c.wallet}</i>
      <strong>${d(a.label)}</strong>
      <small>${d(a.hint||"")}</small>
    </button>
  `).join("")}}function ae(e){const t=e.querySelector("#method-cards"),r=le(e);if(t){if(I(e),!r.length){t.innerHTML=`<div class="empty-state empty-state--compact">${n("funding.no_methods_section","No active methods under this section.")}</div>`,e.__fundingSelectedMethodId="",S(e);return}r.some(i=>w(i)===e.__fundingSelectedMethodId)||(e.__fundingSelectedMethodId=w(r[0])),t.innerHTML=r.map(i=>{const a=w(i);return`<button type="button" class="method-card ${a===e.__fundingSelectedMethodId?"active":""}" data-method="${f(a)}">
      <span class="method-icon">${je(i)}</span>
      <strong>${d(i.title||i.name||i.code||n("funding.method","Method"))}</strong>
      <small>${d([D(k(i)),i.currency].filter(Boolean).join(" - "))}</small>
      <span class="method-card-badges">${xe(i)}</span>
      <em>${p(i.min_amount||0)}${i.max_amount?` - ${p(i.max_amount)}`:"+"}</em>
    </button>`}).join("")}}function S(e){const r=(e.__fundingKind||e.querySelector("#funding-form")?.dataset.kind||"deposit")==="deposit",i=ue(e),a=Number(e.querySelector('input[name="amount"]')?.value||0),s=e.querySelector("#funding-submit"),o=i?P(i):!1,l=e.querySelector('input[name="currency"]');if(l&&(l.value=i?.currency||"USDT"),e.querySelectorAll(".method-card").forEach(u=>u.classList.toggle("active",u.dataset.method===w(i||{}))),s&&i&&(s.disabled=!1,s.textContent=o?i.checkout_label||n("funding.continue_card_checkout","Continue to secure card checkout"):r?n("funding.confirm_transfer","Confirm transfer"):n("funding.submit_withdraw","Submit withdrawal request")),!i){K(e,null,a,!1,n("funding.choose_method_first","Choose an active method first.")),Y(e,null,!1),G(e,null);return}r?(K(e,i,a,o,ce(i,a)),Y(e,i,o)):G(e,i)}function K(e,t,r,i,a){const s=e.querySelector("#deposit-transfer-panel");if(!s)return;if(I(e),!t){s.className="deposit-transfer-panel is-muted",s.innerHTML=se(n("funding.choose_method","Choose a method"),n("funding.choose_method_copy","Select a funding method to display transfer instructions, QR code and destination details."));return}if(i){s.className="deposit-transfer-panel is-ready",s.innerHTML=`
      <div class="deposit-transfer-ready">
        <div class="deposit-transfer-title">
          <span>${c.wallet}</span>
          <div><strong>${n("funding.ready_card_checkout","Ready for card checkout")}</strong><small>${n("funding.ready_card_checkout_copy","Enter the amount and continue to Stripe Checkout. No receipt upload is required.")}</small></div>
        </div>
        ${O(t,!0)}
        <div class="secure-checkout-strip">
          <i>${c.wallet}</i>
          <div>
            <strong>${n("funding.secure_stripe","Secure Stripe Checkout")}</strong>
            <small>${n("funding.secure_stripe_copy","Card details are collected by Stripe. You return to MEX after payment confirmation.")}</small>
          </div>
        </div>
      </div>`;return}const o=!a&&r>0,l=Math.max(1,Number(t.expires_hours||24)),u=o?Pe(t,r,l):0;s.className=`deposit-transfer-panel is-ready${o?"":" is-preview"}`,s.innerHTML=`
    <div class="deposit-transfer-ready">
      <div class="deposit-transfer-title">
        <span>${c.deposit}</span>
        <div>
          <strong>${o?`${n("funding.transfer","Transfer")} ${p(r)} ${d(t.currency||"USDT")}`:d(t.title||t.name||t.code||n("funding.payment_method","Payment method"))}</strong>
          <small>${o?n("funding.use_exact_details","Use only the details shown here before the timer ends."):n("funding.scan_then_amount","Scan the QR or copy the destination first, then enter the exact amount below.")}</small>
        </div>
      </div>
      ${O(t,!1)}
      ${o?`<div class="deposit-timer" data-deposit-deadline="${u}">
        <div><span>${n("funding.payment_window","Payment window")}</span><strong id="deposit-countdown">--:--:--</strong></div>
        <small>${n("funding.expires","Expires")} ${Xe(u)}</small>
      </div>`:""}
      ${Me(t)}
      ${t.instructions?`<div class="transfer-instruction-card">
        <strong>${n("funding.transfer_instructions","Transfer instructions")}</strong>
        <p>${d(t.instructions)}</p>
      </div>`:""}
      <div class="transfer-target-grid">
        ${Te(t)}
      </div>
      ${Le(t)}
    </div>`,o&&Be(e,u)}function O(e,t=!1){const r=e.max_amount?p(e.max_amount):n("funding.flexible","Flexible"),i=t?n("funding.not_needed","Not needed"):e.proof_required?n("funding.receipt_required","Receipt required"):n("funding.optional","Optional"),a=t?n("funding.checkout","Checkout"):`${Math.max(1,Number(e.expires_hours||24))}h`;return`<div class="funding-route-summary" aria-label="Selected funding route summary">
    ${x(n("funding.section","Section"),D(k(e)))}
    ${x(n("funding.currency","Currency"),e.currency||"USDT")}
    ${x(n("funding.limits","Limits"),`${p(e.min_amount||0)} - ${r}`)}
    ${x(n("funding.proof","Proof"),i)}
    ${x(n("funding.window","Window"),a)}
  </div>`}function x(e,t){return`<span class="funding-route-pill"><small>${d(e)}</small><b>${d(t)}</b></span>`}function Y(e,t,r){const i=e.querySelector("#deposit-proof-slot");if(!i)return;if(!t){i.dataset.methodId="",i.dataset.isStripe="",i.innerHTML="";return}const a=w(t),s=r?"1":"0";if(!(i.dataset.methodId===a&&i.dataset.isStripe===s&&i.innerHTML.trim()!=="")){if(i.dataset.methodId=a,i.dataset.isStripe=s,r){i.innerHTML=`<div class="deposit-proof-note">
      <span>${c.wallet}</span>
      <div><strong>${n("funding.no_receipt_needed","No receipt upload needed")}</strong><small>${n("funding.card_checkout_copy","Card payments continue through Stripe Checkout.")}</small></div>
    </div>`;return}i.innerHTML=`<label class="deposit-file-drop">
    <input type="file" name="proof" accept="image/*,.pdf">
    <span>${c.deposit}</span>
    <div><strong>${t.proof_required?n("funding.upload_transfer_proof","Upload transfer proof"):n("funding.upload_receipt_optional","Upload receipt if available")}</strong><small id="proof-file-name">${n("funding.upload_file_hint","Image or PDF up to 8MB")}</small></div>
  </label>`}}function G(e,t){const r=e.querySelector("#withdraw-fields-panel");if(!r)return;if(!t){r.dataset.methodId="",r.innerHTML=`<p class="text-muted text-sm">${n("funding.select_withdraw_method_first","Select a withdrawal method first.")}</p>`;return}const i=w(t);if(r.dataset.methodId===i&&r.querySelector("[data-withdraw-field]"))return;r.dataset.methodId=i;const a=Ie(t.fields||[]);if(!a.length){r.innerHTML=`<label class="block">
      <span class="field-label">${n("funding.payout_destination","Payout destination")}</span>
      <textarea name="destination" data-withdraw-field class="input mt-1" rows="3" placeholder="${f(n("funding.payout_destination_placeholder","Wallet address, bank reference, IBAN, or payout details..."))}" required></textarea>
    </label>`;return}r.innerHTML=`<div class="withdraw-fields-grid">${a.map(Ce).join("")}</div>`}function Ce(e){const t=ze(e.name||e.key||e.id||e.label||"destination"),r=e.label||e.title||q(t),i=e.placeholder||e.hint||"",a=e.required||e.is_required?"required":"",s=String(e.type||"text").toLowerCase(),o=We(e.options||e.values||[]);if(s==="textarea")return`<label class="block sm:col-span-2"><span class="field-label">${d(r)}</span><textarea name="${f(t)}" data-withdraw-field class="input mt-1" rows="3" placeholder="${f(i)}" ${a}></textarea></label>`;if(s==="select"&&o.length)return`<label class="block"><span class="field-label">${d(r)}</span><select name="${f(t)}" data-withdraw-field class="input mt-1" ${a}>${o.map(u=>`<option value="${f(u.value)}">${d(u.label)}</option>`).join("")}</select></label>`;const l=["email","number","tel","url"].includes(s)?s:"text";return`<label class="block"><span class="field-label">${d(r)}</span><input type="${l}" name="${f(t)}" data-withdraw-field class="input mt-1" placeholder="${f(i)}" ${a}></label>`}function se(e,t){return`<div class="deposit-transfer-empty"><span>${c.deposit}</span><strong>${d(e)}</strong><small>${d(t)}</small></div>`}function xe(e){const t=[];return String(e?.image_url||"").trim()&&t.push(n("funding.badge_logo","Logo")),oe(e)&&t.push(n("funding.badge_qr","QR")),(String(e?.payment_address||"").trim()||U(e?.fields||{}).length)&&t.push(n("funding.badge_details","Details")),e?.proof_required&&t.push(n("funding.badge_receipt","Receipt")),t.length||t.push(n("funding.needs_setup","Needs setup")),t.slice(0,4).map(r=>`<b>${d(r)}</b>`).join("")}function Te(e){const t=String(e?.payment_address||"").trim();return`
    <div class="transfer-target-card"><span>${n("funding.method","Method")}</span><strong>${d(e?.title||e?.name||e?.code||n("funding.payment_method","Payment method"))}</strong></div>
    ${De(e,t?[t]:[])}
  `}function Me(e){const t=oe(e),r=String(e?.payment_address||"").trim();return!t&&!r?"":`<div class="transfer-qr-card transfer-qr-card--centered">
    <strong>${n("funding.scan_qr","Scan QR code")}</strong>
    <small>${n("funding.scan_qr_copy","Scan with your wallet or banking app, then use the wallet address below if you prefer to copy it manually.")}</small>
    ${t?`<img src="${f(t)}" alt="Payment QR">`:""}
    ${r?`<div class="transfer-qr-address">
      <span>${n("funding.wallet_address","Wallet address")}</span>
      <code>${d(r)}</code>
      <button type="button" data-copy-address="${f(r)}">${n("funding.copy_address","Copy address")}</button>
    </div>`:""}
  </div>`}function oe(e){const t=String(e?.payment_qr_url||"").trim();if(t)return t;const r=String(e?.payment_address||"").trim();return r?`https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(r)}`:""}function Le(e){if(P(e))return"";const t=String(e?.payment_address||"").trim(),r=U(e?.fields||{});return t||r.length?"":`<div class="funding-method-warning">${c.lock}<div><strong>${n("funding.route_unavailable","Funding route unavailable")}</strong><small>${n("funding.choose_another_method","Choose another method or try again shortly.")}</small></div></div>`}function De(e,t=[]){const r=U(e?.fields||{}),i=new Set(t.map(a=>String(a||"").trim()).filter(Boolean));return r.filter(a=>!i.has(String(a.value||"").trim())).slice(0,8).map(a=>{const s=String(a.value);return`<div class="transfer-target-card ${s.length>26?"transfer-target-wide":""}"><span>${d(a.label)}</span><strong>${d(s)}</strong><button type="button" data-copy-address="${f(s)}">${n("common.copy","Copy")}</button></div>`}).join("")}function U(e){const t=[];return Array.isArray(e)?e.forEach(r=>{if(!r)return;const i=r.label||r.name||r.key||"",a=r.value||r.default||r.text||"";i&&a&&t.push({label:i,value:a})}):e&&typeof e=="object"&&Object.entries(e).forEach(([r,i])=>{if(!(i==null||i===""))if(typeof i=="object"){const a=i.label||i.name||r,s=i.value||i.text||i.default||"";s&&t.push({label:a,value:s})}else t.push({label:Ye(r),value:i})}),t}function Ie(e){return Array.isArray(e)?e.filter(Boolean).map(t=>(t.value||t.default||t.text)&&!t.collect?null:t).filter(Boolean):!e||typeof e!="object"?[]:Object.entries(e).map(([t,r])=>r&&typeof r=="object"?(r.value||r.default||r.text)&&!r.collect?null:{name:t,...r}:null).filter(Boolean)}async function Fe(e,t,r){if(e.preventDefault(),t.__fundingSubmitting)return;const i=e.target,a=t.querySelector("#form-status"),s=t.querySelector("#funding-submit"),o=new FormData(i),l=ue(t),u=r==="deposit",g=Number(o.get("amount")||0),C=String(o.get("notes")||"").trim(),m=l?P(l):!1;try{if($("mode")!=="real")return h(a,n("funding.switch_real_before_submit","Switch to Real before submitting live funding requests."),"error");if(!l)return h(a,n("funding.select_active_method_first","Select an active payment method first."),"error");const v=ce(l,g);if(v)return h(a,v,"error");const _=i.querySelector('input[name="proof"]')?.files?.[0]||null;if(u&&!m&&l.proof_required&&!_)return h(a,n("funding.upload_proof_before_confirm","Upload transfer proof before confirming."),"error");const y=Re(t),F=y.destination||y.wallet_address||y.bank_account||y.iban||y.address||C;if(!u&&!String(F||"").trim())return h(a,n("funding.enter_payout_destination","Enter payout destination details."),"error");t.__fundingSubmitting=!0,s&&(s.disabled=!0,s.dataset.originalText=s.dataset.originalText||s.textContent||"",s.textContent=u?m?n("funding.opening_checkout","Opening checkout..."):n("funding.confirming","Confirming..."):n("funding.submitting","Submitting...")),h(a,m?n("funding.opening_secure_checkout","Opening secure checkout..."):u?n("funding.sending_transfer_confirmation","Sending transfer confirmation..."):n("funding.sending_payout_request","Sending payout request..."),"info");const B=l.code||l.method||l.id||"",W=l.currency||"USDT",he=t.__fundingCategory||k(l),z=t.querySelector("[data-deposit-deadline]")?.dataset.depositDeadline||"",Q={notes:C,category:he,method_title:l.title||l.name||l.code||"",client_deadline_at:z?Math.floor(Number(z)/1e3):null,proof_attached:!!_,fields:y},ye=m?"/deposits/stripe_checkout.php":u?"/deposits/create.php":"/withdrawals/create.php",_e=u?{provider:l.provider||"",method:B,currency:W,amount:g,details:Q}:{method:B,currency:W,amount:g,destination:F,details:{...Q,destination:F}},b=await Z(ye,_e,{timeout:m?18e3:14e3,headers:{"Idempotency-Key":Ve(u?"dep":"wd")}});if(!b||b.ok===!1)return h(a,b?.error||n("common.request_failed","Request failed"),"error");if(m&&b.checkout_url){h(a,n("funding.redirecting_checkout","Redirecting to checkout..."),"success"),window.location.assign(b.checkout_url);return}if(u&&_){const V=b.deposit?.id||b.id||b.deposit_id||null;if(V){const N=new FormData;N.append("deposit_id",String(V)),N.append("proof",_),await be("/deposits/upload_proof.php",N,{timeout:18e3})}}h(a,u?n("funding.transfer_confirmation_received","Transfer confirmation received. Your deposit is now being processed."):n("funding.withdrawal_request_received","Withdrawal request received. You can track it from history."),"success"),Ue(t,u,g,l),H.delete(u?"/deposits/list.php":"/withdrawals/list.php")}catch(v){h(a,v.message||n("common.request_failed","Request failed"),"error")}finally{t.__fundingSubmitting=!1,s&&(s.disabled=!1,s.textContent=s.dataset.originalText||(u?n("funding.confirm_transfer","Confirm transfer"):n("funding.submit_withdraw","Submit withdrawal request")))}}async function Ne(e){if(!e.querySelector("#funding-history-all"))return;const r=await Promise.allSettled([A("/deposits/list.php",{timeout:8e3,retry:1},2e4),A("/withdrawals/list.php",{timeout:8e3,retry:1},2e4)]);e.__fundingHistoryItems=[...r[0].status==="fulfilled"?(r[0].value?.items||[]).map(i=>X(i,"deposit")):[],...r[1].status==="fulfilled"?(r[1].value?.items||[]).map(i=>X(i,"withdraw")):[]].sort((i,a)=>a.sortTime-i.sortTime).slice(0,80),de(e)}function de(e){const t=e.querySelector("#funding-history-all");if(!t)return;const r=e.__fundingHistoryFilter||"all";e.querySelectorAll("[data-history-filter]").forEach(a=>a.classList.toggle("active",a.dataset.historyFilter===r));const i=(e.__fundingHistoryItems||[]).filter(a=>Ee(a,r));if(!i.length){t.innerHTML=`<div class="empty-state empty-state--compact">${n("funding.no_matching_history","No matching funding history yet.")}</div>`;return}t.innerHTML=`
    <div class="ledger-mobile-list md:hidden">${i.map(He).join("")}</div>
    <div class="hidden md:block overflow-x-auto">
      <table class="funding-history-table">
        <thead><tr><th>${n("funding.type","Type")}</th><th>${n("funding.method","Method")}</th><th>${n("deposit.amount","Amount")}</th><th>${n("kyc.status","Status")}</th><th>${n("funding.date","Date")}</th></tr></thead>
        <tbody>${i.map(Ae).join("")}</tbody>
      </table>
    </div>`}function X(e,t){const r=Number(e.amount||0),i=e.created_at||e.updated_at||"",a=t==="ledger"?"posted":String(e.status||"pending").toLowerCase(),s=e.reference||e.ref||e.ref_id||e.txid||e.tx_hash||e.transaction_id||e.id||"",o=e.note||e.notes||e.memo||e.description||"";return{kind:t,amount:r,currency:e.currency||"USDT",status:a,method:Oe(t==="ledger"?e.type||e.ref_type||"ledger":e.method_label||e.provider||e.method_code||e.method||"manual"),created:i,reference:String(s||""),note:String(o||""),sortTime:me(i)}}function He(e){const t=e.kind==="deposit"||e.kind==="ledger"&&e.amount>=0,r=[[n("funding.method","Method"),e.method],[n("funding.date","Date"),R(e.created)],[n("kyc.status","Status"),j(e.status)],e.reference?[n("funding.reference","Reference"),e.reference]:null,e.note?[n("funding.notes","Notes"),e.note]:null].filter(Boolean);return`<article class="funding-history-card funds-history-card ${t?"is-positive":"is-negative"}" data-funding-history-card>
    <div class="funding-history-main">
      <span class="history-kind ${t?"is-deposit":"is-withdraw"}">${e.kind==="withdraw"?c.withdraw:c.deposit}</span>
      <div><strong>${ge(e.kind)}</strong><small>${d(e.method)} - ${d(R(e.created))}</small></div>
      <button type="button" class="funding-history-toggle" data-funding-history-toggle aria-expanded="false" aria-label="${f(n("common.details","Details"))}">${c.chevronDown}</button>
    </div>
    <div class="funds-history-amount"><strong>${t?"+":""}${p(e.amount)} ${d(e.currency)}</strong><span class="${pe(e.status)}">${d(j(e.status))}</span></div>
    <div class="funding-history-details">
      ${r.map(([i,a])=>`<span><small>${d(i)}</small><b>${d(a)}</b></span>`).join("")}
    </div>
  </article>`}function Ae(e){const t=e.kind==="deposit"||e.kind==="ledger"&&e.amount>=0;return`<tr>
    <td>${d(ge(e.kind))}</td>
    <td>${d(e.method)}</td>
    <td class="${t?"text-buy":"text-sell"}">${t?"+":""}${p(e.amount)} ${d(e.currency)}</td>
    <td><span class="${pe(e.status)}">${d(j(e.status))}</span></td>
    <td>${d(R(e.created))}</td>
  </tr>`}function Ee(e,t){return t==="all"?!0:["deposit","withdraw"].includes(t)?e.kind===t:t==="pending"?["pending","requested","processing","review"].includes(e.status):t==="completed"?["approved","confirmed","completed","paid","posted"].includes(e.status):t==="failed"?["rejected","failed","cancelled","canceled"].includes(e.status):!0}function le(e){const t=e.__fundingCategory||"";return(e.__fundingMethods||[]).filter(r=>k(r)===t)}function ue(e){const t=le(e),r=e.__fundingSelectedMethodId||"";return t.find(i=>w(i)===r)||t[0]||null}function w(e){return String(e?.id??e?.code??"")}function k(e){const t=M(e?.category_key||"");if(t)return t;const r=M(e?.method_group||"");if(r)return r;const i=[e?.provider,e?.code,e?.title,e?.name].filter(Boolean).join(" ").toLowerCase();return/stripe|card|visa|master/.test(i)?"card":/bank|wire|iban|swift|ach|fedwire/.test(i)?"bank":/crypto|usdt|btc|eth|trc|erc|bep|wallet|blockchain/.test(i)?"crypto":/bot|telegram/.test(i)?"crypto_bot":"manual"}function je(e){return String(e?.image_url||"").trim()?`<img src="${f(e.image_url)}" alt="">`:E(k(e))}function E(e,t=""){return t?`<b>${d(t)}</b>`:e==="card"?c.wallet:e==="bank"?c.wallet:e==="crypto"||e==="crypto_bot"?c.deposit:c.wallet}function D(e){return{bank:n("funding.bank_transfer","Bank transfer"),crypto:n("funding.crypto","Crypto"),card:n("funding.card_visa","Card / Visa"),cash:n("funding.cash_desk","Cash desk"),crypto_bot:n("funding.crypto_bot","Crypto bot"),manual:n("funding.manual","Manual")}[e]||q(e||"Manual")}function J(e){return{bank:n("funding.bank_hint","Wire and bank details"),crypto:n("funding.crypto_hint","Wallet networks and QR"),card:n("funding.card_hint","Stripe hosted checkout"),cash:n("funding.cash_hint","Desk review"),crypto_bot:n("funding.crypto_bot_hint","Automated wallet route"),manual:n("funding.manual_hint","Configured instructions")}[e]||n("funding.configured_route","Configured route")}function P(e){const t=[e?.provider,e?.method_group,e?.category_key,e?.code,e?.title].filter(Boolean).join(" ").toLowerCase();return/stripe|card|visa|master/.test(t)}function ce(e,t){if(!Number.isFinite(t)||t<=0)return n("funding.enter_amount_continue","Enter the amount to continue.");const r=Number(e?.min_amount||0),i=Number(e?.max_amount||0);return r>0&&t<r?`${n("funding.minimum_for_method","Minimum for this method is")} ${p(r)} ${e.currency||"USDT"}.`:i>0&&t>i?`${n("funding.maximum_for_method","Maximum for this method is")} ${p(i)} ${e.currency||"USDT"}.`:""}function Re(e){const t={};return e.querySelectorAll("[data-withdraw-field]").forEach(r=>{t[r.name]=r.value}),t}function Ue(e,t,r,i){const a=e.querySelector("#deposit-transfer-panel");!a||!t||(I(e),a.className="deposit-transfer-panel is-success",a.innerHTML=`<div class="funding-success-panel"><span>${c.deposit}</span><strong>${n("funding.transfer_confirmation_sent","Transfer confirmation sent")}</strong><small>${p(r)} ${d(i?.currency||"USDT")} ${n("funding.via","via")} ${d(i?.title||i?.code||n("funding.selected_method","selected method"))} ${n("funding.is_being_processed","is being processed.")}</small></div>`)}function h(e,t,r="info"){e&&(e.textContent=t,e.className=`text-xs text-center funding-form-status is-${r}`)}function Pe(e,t,r){const i=`mex_deposit_deadline_${w(e)}_${Number(t).toFixed(2)}`,a=Date.now();let s=Number(localStorage.getItem(i)||0);return(!s||s<=a)&&(s=a+r*60*60*1e3,localStorage.setItem(i,String(s))),s}function Be(e,t){const r=()=>{const i=e.querySelector("#deposit-countdown");if(!i)return;const a=Math.max(0,t-Date.now());i.textContent=Ge(a),e.querySelector(".deposit-timer")?.classList.toggle("is-expired",a<=0);const s=e.querySelector("#funding-submit");s&&a<=0&&(s.disabled=!0)};r(),e.__depositTimer=setInterval(r,1e3)}function I(e){e?.__depositTimer&&clearInterval(e.__depositTimer),e&&(e.__depositTimer=null)}function We(e){return Array.isArray(e)?e.map(t=>t&&typeof t=="object"?{value:String(t.value??t.key??t.label??""),label:String(t.label??t.name??t.value??"")}:{value:String(t),label:String(t)}).filter(t=>t.value!==""):[]}function M(e){return String(e||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")}function ze(e){return M(e)||"destination"}function Qe(e){navigator.clipboard?.writeText(e.dataset.copyAddress||"").then(()=>{e.textContent=n("common.copied","Copied"),setTimeout(()=>{e.textContent=n("common.copy","Copy")},1200)}).catch(()=>{})}function Ve(e){const t=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;return`vp-${e}-${t}`}function fe(e={}){const t=String(e._path||""),r=String(e.action||e.tab||"").toLowerCase();return ie.some(i=>i.key===r)?r:t.includes("withdraw")?"withdraw":(t.includes("deposit"),"deposit")}function L(e,t){return`<div class="funding-check-item ${t?"is-done":"is-pending"}"><i>${t?c.deposit:c.lock}</i><div><strong>${d(e)}</strong><small>${t?n("funding.ready","Ready"):n("funding.required","Required")}</small></div></div>`}function pe(e){const t=String(e||"").toLowerCase();return["approved","confirmed","completed","paid","posted"].includes(t)?"badge-green":["pending","requested","processing","review"].includes(t)?"badge-accent":["rejected","failed","cancelled","canceled"].includes(t)?"badge-red":"badge"}function ge(e){return e==="withdraw"?n("funding.withdrawal","Withdrawal"):e==="ledger"?n("funding.ledger_entry","Ledger entry"):n("funding.deposit_entry","Deposit")}function Ke(e){return{all:n("common.all","All"),deposit:n("funding.deposit","Deposit"),withdraw:n("funding.withdraw","Withdraw"),ledger:n("funding.ledger","Ledger"),pending:n("funding.pending","Pending"),completed:n("funding.completed","Completed"),failed:n("funding.failed","Failed")}[e]||q(e)}function j(e){const t=String(e||"").toLowerCase();return{approved:n("funding.status_approved","Approved"),confirmed:n("funding.status_confirmed","Confirmed"),completed:n("funding.status_completed","Completed"),paid:n("funding.status_paid","Paid"),posted:n("funding.status_posted","Posted"),pending:n("funding.status_pending","Pending"),requested:n("funding.status_requested","Requested"),processing:n("funding.status_processing","Processing"),review:n("funding.status_review","Under review"),rejected:n("funding.status_rejected","Rejected"),failed:n("funding.status_failed","Failed"),cancelled:n("funding.status_cancelled","Cancelled"),canceled:n("funding.status_cancelled","Cancelled"),"not submitted":n("funding.status_not_submitted","Not submitted")}[t]||q(t||"pending")}function Oe(e){const t=M(e);return{trade_open:n("funding.ledger_trade_open","Trade open"),trade_close:n("funding.ledger_trade_close","Trade close"),trade_pnl:n("funding.ledger_trade_pnl","Trade PnL"),deposit_credit:n("funding.ledger_deposit_credit","Deposit credit"),withdrawal:n("funding.withdrawal","Withdrawal"),withdraw:n("funding.withdrawal","Withdrawal"),invest_payout:n("funding.ledger_invest_payout","Investment payout"),ledger:n("funding.ledger_entry","Ledger entry"),stripe:n("funding.card_visa","Card / Visa"),bank:n("funding.bank_transfer","Bank transfer"),crypto:n("funding.crypto","Crypto"),manual:n("funding.manual","Manual")}[t]||q(e)}function q(e){return String(e||"").replace(/[_-]/g," ").replace(/\b\w/g,t=>t.toUpperCase())}function Ye(e){return q(e)}function Ge(e){const t=Math.max(0,Math.floor(e/1e3)),r=Math.floor(t/3600),i=Math.floor(t%3600/60),a=t%60;return`${String(r).padStart(2,"0")}:${String(i).padStart(2,"0")}:${String(a).padStart(2,"0")}`}function Xe(e){return new Date(Number(e)).toLocaleString("en-US",{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})}function Je(e){const t=Number(e||0);return t>=1024*1024?`${(t/1024/1024).toFixed(1)} MB`:t>=1024?`${Math.round(t/1024)} KB`:`${t} B`}function me(e){const t=String(e||"").trim(),r=Number(t);if(Number.isFinite(r)&&r>0)return r>1e10?r:r*1e3;const i=Date.parse(t);return Number.isFinite(i)?i:0}function R(e){const t=me(e);return t?new Date(t).toLocaleString("en-US",{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"}):"--"}export{nt as cleanup,tt as mount,et as render};
