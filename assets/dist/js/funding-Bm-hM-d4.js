import{j as $,k as f,h as u,t as n,m as p,g as d,l as Z,c as ee,s as te,n as ne,i as be}from"./main-YSjZltEa.js";const A=globalThis.__MEX_FUNDING_CACHE__||(globalThis.__MEX_FUNDING_CACHE__=new Map),ve=45e3;let q=[];const ie=[{key:"deposit",label:"funding.deposit",fallback:"Deposit",icon:f.deposit},{key:"withdraw",label:"funding.withdraw",fallback:"Withdraw",icon:f.withdraw},{key:"history",label:"funding.history",fallback:"History",icon:f.wallet}];function et(e={}){const t=fe(e),r=$("wallet")||{};$("kyc");const i=$("level")||{},s=$("mode")==="real"?"real":"demo",a=s==="real"?r.real||{}:r.demo||{};return i.current,`
    <div class="funds-workspace animate-fade-in" data-active-funding-tab="${u(t)}">
      <section class="funds-hero-pro">
        <div>
          <span class="badge-accent">${n("funding.assets_desk","Assets desk")}</span>
          <h1>${n("nav.wallet","Funds")}</h1>
          <p>${n("funding.hero_copy","Deposit, withdraw and audit wallet movements from one fast workspace powered by admin payment categories.")}</p>
        </div>
        <div class="funds-balance-pro">
          <span>${s==="real"?n("balance.available","Available balance"):n("funding.demo_balance","Demo balance")}</span>
          <strong>${p(a.available||a.balance||0)}</strong>
          <small>${d(a.currency||(s==="real"?"USDT":"USDT_DEMO"))}</small>
        </div>
      </section>

      <section class="funds-tabs-pro" role="tablist" aria-label="Funding workspace tabs">
        ${ie.map(o=>`
          <button type="button" class="${o.key===t?"active":""}" data-funding-tab="${o.key}" role="tab" aria-selected="${o.key===t?"true":"false"}">
            <span>${o.icon||""}</span>${d(n(o.label,o.fallback))}
          </button>
        `).join("")}
      </section>

      ${s!=="real"&&t!=="history"?`<section class="funding-mode-warning">
        <span class="gate-icon">${f.lock}</span>
        <div>
          <strong>${n("funding.real_required","Real account required")}</strong>
          <small>${n("funding.real_required_copy","Methods are visible for preview. Switch to Real before submitting a live funding request.")}</small>
        </div>
        <button type="button" class="btn-primary btn-sm" data-switch-real>${n("earn.switch_real","Switch to Real")}</button>
      </section>`:""}

      ${t==="history"?ke():$e(t)}
    </div>`}function tt(e,t={}){const r=fe(t);we(e,t);const i=o=>{const l=o.target.closest("[data-funding-tab]");if(l){o.preventDefault(),ne("wallet",{action:l.dataset.fundingTab||"deposit"});return}const c=o.target.closest("[data-funding-category]");if(c){e.__fundingCategory=c.dataset.fundingCategory||"",e.__fundingSelectedMethodId="",re(e),se(e),k(e);return}const g=o.target.closest("[data-method]");if(g){e.__fundingSelectedMethodId=g.dataset.method||"",k(e);return}const M=o.target.closest("[data-history-filter]");if(M){e.__fundingHistoryFilter=M.dataset.historyFilter||"all",de(e);return}const h=o.target.closest("[data-funding-history-toggle]");if(h){const _=h.closest("[data-funding-history-card]");if(_){const y=!_.classList.contains("is-expanded");_.classList.toggle("is-expanded",y),h.setAttribute("aria-expanded",y?"true":"false")}return}const w=o.target.closest("[data-copy-address]");if(w){We(w);return}o.target.closest("[data-switch-real]")&&(localStorage.setItem("vp_mode","real"),te("mode","real"),location.reload())};e.addEventListener("click",i),q.push(()=>e.removeEventListener("click",i));const s=o=>{o.target.matches('input[name="amount"], [data-withdraw-field]')&&k(e)};e.addEventListener("input",s),q.push(()=>e.removeEventListener("input",s));const a=o=>{const l=o.target.closest('input[name="proof"]');if(!l)return;const c=e.querySelector("#proof-file-name"),g=l.files?.[0];c&&(c.textContent=g?`${g.name} - ${Je(g.size||0)}`:n("funding.upload_file_hint","Image or PDF up to 8MB"))};if(e.addEventListener("change",a),q.push(()=>e.removeEventListener("change",a)),e.querySelectorAll("[data-quick-amount]").forEach(o=>{o.addEventListener("click",()=>{const l=e.querySelector('input[name="amount"]');l&&(l.value=o.dataset.quickAmount||""),k(e)})}),r==="history"){Ie(e);return}Se(e,r),e.querySelector("#funding-form")?.addEventListener("submit",o=>Fe(o,e,r))}function we(e,t){const r=t&&t.stripe;if(!r)return;try{window.history.replaceState(null,"",window.location.pathname+"#/wallet")}catch{}const i=document.createElement("div");if(i.className="stripe-return-banner",e.prepend(i),r!=="success"){i.classList.add("is-cancel"),i.innerHTML=`<div><strong>${n("funding.payment_canceled","Card payment was canceled.")}</strong><small>${n("funding.payment_canceled_copy","You can start a new deposit whenever you are ready.")}</small></div>`;return}const s=Number(t.deposit||0);i.classList.add("is-pending"),i.innerHTML=`<span class="stripe-return-spin"></span><div><strong>${n("funding.verifying_payment","Verifying card payment...")}</strong></div>`,(async()=>{let a="";if(s>0)for(let o=0;o<4;o++){try{const l=await Z("/deposits/stripe_sync.php",{deposit_id:s},{timeout:15e3});if(a=String(l?.status||""),a==="confirmed"||a==="failed")break}catch{}await new Promise(l=>setTimeout(l,2500))}if(a==="confirmed"){i.className="stripe-return-banner is-success",i.innerHTML=`<div><strong>${n("funding.deposit_confirmed","Payment confirmed. Funds credited to your wallet.")}</strong></div>`;try{const o=await ee("/bootstrap.php");o&&o.wallet&&te("wallet",o.wallet)}catch{}ne("wallet",{action:"history"})}else a==="failed"?(i.className="stripe-return-banner is-cancel",i.innerHTML=`<div><strong>${n("funding.deposit_failed","Payment was not completed.")}</strong></div>`):(i.className="stripe-return-banner",i.innerHTML=`<div><strong>${n("funding.payment_processing","Payment is processing. Your balance will update shortly.")}</strong></div>`)})()}function nt(){document.querySelectorAll(".funds-workspace").forEach(e=>H(e)),q.forEach(e=>{try{e()}catch{}}),q=[]}function $e(e){const t=e==="deposit";return`
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
            ${ae(n("funding.transfer_details_waiting","Transfer details will appear here"),n("funding.transfer_details_waiting_copy","Choose a method to unlock account details, QR code, wallet address and bank fields."))}
          </div>`:'<div id="withdraw-fields-panel" class="withdraw-fields-panel"></div>'}

          <div class="deposit-ticket-grid">
            <label class="block">
              <span class="field-label">${t?n("funding.amount_step","3. Amount"):n("deposit.amount","Amount")}</span>
              <input type="number" name="amount" class="input mt-1" value="${t?"":"50"}" min="1" step="any" placeholder="${t?u(n("funding.amount_placeholder","Enter exact amount after copying the transfer details")):"50"}" required>
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
            <textarea name="notes" class="input mt-1" rows="2" placeholder="${t?u(n("funding.reference_placeholder","Sender name, transaction hash, or bank reference...")):u(n("funding.notes_placeholder","Optional note for the operations desk..."))}"></textarea>
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
    </section>`}function ke(){return`
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
    </section>`}async function B(e,t={},r=ve){const i=e,s=Date.now(),a=A.get(i);if(a&&s-a.time<r)return a.data;const o=await ee(e,t);return A.set(i,{time:s,data:o}),o}async function Se(e,t){try{const r=$("mode")==="real"?"real":"both",i=await B(`/payment_methods/list.php?kind=${encodeURIComponent(t)}&scope=${r}&currency=*`,{timeout:9e3,retry:1},9e4),s=i?.items||[],a=xe(i?.categories||[],s);e.__fundingKind=t,e.__fundingMethods=s,e.__fundingCategories=a,e.__fundingCategory=a[0]?.key||"",e.__fundingSelectedMethodId="",re(e),se(e),k(e)}catch{const i=e.querySelector("#funding-categories"),s=e.querySelector("#method-cards");i&&(i.innerHTML=`<div class="empty-state empty-state--compact">${n("funding.sections_unavailable","Payment sections are temporarily unavailable.")}</div>`),s&&(s.innerHTML="")}}function xe(e,t){const r=new Set(t.map(S).filter(Boolean)),i=[];return e.forEach(s=>{const a=T(s.key||s.key_slug||s.label);!a||!r.has(a)||i.push({key:a,label:s.label||D(a),hint:s.hint||J(a),icon:s.image_url?`<img src="${u(s.image_url)}" alt="">`:N(a,s.icon)})}),r.forEach(s=>{i.some(a=>a.key===s)||i.push({key:s,label:D(s),hint:J(s),icon:N(s)})}),i}function re(e){const t=e.querySelector("#funding-categories"),r=e.__fundingCategories||[],i=e.__fundingCategory||r[0]?.key||"";if(t){if(!r.length){t.innerHTML=`<div class="empty-state empty-state--compact">${n("funding.no_sections","No active funding sections are configured by admin.")}</div>`;return}t.innerHTML=r.map(s=>`
    <button type="button" class="${s.key===i?"active":""}" data-funding-category="${u(s.key)}">
      <i>${s.icon||f.wallet}</i>
      <strong>${d(s.label)}</strong>
      <small>${d(s.hint||"")}</small>
    </button>
  `).join("")}}function se(e){const t=e.querySelector("#method-cards"),r=le(e);if(t){if(H(e),!r.length){t.innerHTML=`<div class="empty-state empty-state--compact">${n("funding.no_methods_section","No active methods under this section.")}</div>`,e.__fundingSelectedMethodId="",k(e);return}r.some(i=>v(i)===e.__fundingSelectedMethodId)||(e.__fundingSelectedMethodId=v(r[0])),t.innerHTML=r.map(i=>{const s=v(i);return`<button type="button" class="method-card ${s===e.__fundingSelectedMethodId?"active":""}" data-method="${u(s)}">
      <span class="method-icon">${ze(i)}</span>
      <strong>${d(i.title||i.name||i.code||n("funding.method","Method"))}</strong>
      <small>${d([D(S(i)),i.currency].filter(Boolean).join(" - "))}</small>
      <span class="method-card-badges">${Ce(i)}</span>
      <em>${p(i.min_amount||0)}${i.max_amount?` - ${p(i.max_amount)}`:"+"}</em>
    </button>`}).join("")}}function k(e){const r=(e.__fundingKind||e.querySelector("#funding-form")?.dataset.kind||"deposit")==="deposit",i=ce(e),s=Number(e.querySelector('input[name="amount"]')?.value||0),a=e.querySelector("#funding-submit"),o=i?R(i):!1,l=e.querySelector('input[name="currency"]');if(l&&(l.value=i?.currency||"USDT"),e.querySelectorAll(".method-card").forEach(c=>c.classList.toggle("active",c.dataset.method===v(i||{}))),a&&i&&(a.disabled=!1,a.textContent=o?i.checkout_label||n("funding.continue_card_checkout","Continue to secure card checkout"):r?n("funding.confirm_transfer","Confirm transfer"):n("funding.submit_withdraw","Submit withdrawal request")),!i){K(e,null,s,!1,n("funding.choose_method_first","Choose an active method first.")),Y(e,null,!1),G(e,null);return}r?(K(e,i,s,o,ue(i,s)),Y(e,i,o)):G(e,i)}function K(e,t,r,i,s){const a=e.querySelector("#deposit-transfer-panel");if(!a)return;if(H(e),!t){a.className="deposit-transfer-panel is-muted",a.innerHTML=ae(n("funding.choose_method","Choose a method"),n("funding.choose_method_copy","Select a funding method to display transfer instructions, QR code and destination details."));return}if(i){a.className="deposit-transfer-panel is-ready",a.innerHTML=`
      <div class="deposit-transfer-ready">
        <div class="deposit-transfer-title">
          <span>${f.wallet}</span>
          <div><strong>${n("funding.ready_card_checkout","Ready for card checkout")}</strong><small>${n("funding.ready_card_checkout_copy","Enter the amount and continue to Stripe Checkout. No receipt upload is required.")}</small></div>
        </div>
        ${O(t,!0)}
        <div class="secure-checkout-strip">
          <i>${f.wallet}</i>
          <div>
            <strong>${n("funding.secure_stripe","Secure Stripe Checkout")}</strong>
            <small>${n("funding.secure_stripe_copy","Card details are collected by Stripe. You return to MEX after payment confirmation.")}</small>
          </div>
        </div>
      </div>`;return}const o=!s&&r>0,l=Math.max(1,Number(t.expires_hours||24)),c=o?Re(t,r,l):0;a.className=`deposit-transfer-panel is-ready${o?"":" is-preview"}`,a.innerHTML=`
    <div class="deposit-transfer-ready">
      <div class="deposit-transfer-title">
        <span>${f.deposit}</span>
        <div>
          <strong>${o?`${n("funding.transfer","Transfer")} ${p(r)} ${d(t.currency||"USDT")}`:d(t.title||t.name||t.code||n("funding.payment_method","Payment method"))}</strong>
          <small>${o?n("funding.use_exact_details","Use only the details shown here before the timer ends."):n("funding.scan_then_amount","Scan the QR or copy the destination first, then enter the exact amount below.")}</small>
        </div>
      </div>
      ${O(t,!1)}
      ${o?`<div class="deposit-timer" data-deposit-deadline="${c}">
        <div><span>${n("funding.payment_window","Payment window")}</span><strong id="deposit-countdown">--:--:--</strong></div>
        <small>${n("funding.expires","Expires")} ${Xe(c)}</small>
      </div>`:""}
      ${Te(t)}
      ${t.instructions?`<div class="transfer-instruction-card">
        <strong>${n("funding.transfer_instructions","Transfer instructions")}</strong>
        <p>${d(t.instructions)}</p>
      </div>`:""}
      <div class="transfer-target-grid">
        ${qe(t)}
      </div>
      ${Le(t)}
    </div>`,o&&Ue(e,c)}function O(e,t=!1){const r=e.max_amount?p(e.max_amount):n("funding.flexible","Flexible"),i=t?n("funding.not_needed","Not needed"):e.proof_required?n("funding.receipt_required","Receipt required"):n("funding.optional","Optional"),s=t?n("funding.checkout","Checkout"):`${Math.max(1,Number(e.expires_hours||24))}h`;return`<div class="funding-route-summary" aria-label="Selected funding route summary">
    ${C(n("funding.section","Section"),D(S(e)))}
    ${C(n("funding.currency","Currency"),e.currency||"USDT")}
    ${C(n("funding.limits","Limits"),`${p(e.min_amount||0)} - ${r}`)}
    ${C(n("funding.proof","Proof"),i)}
    ${C(n("funding.window","Window"),s)}
  </div>`}function C(e,t){return`<span class="funding-route-pill"><small>${d(e)}</small><b>${d(t)}</b></span>`}function Y(e,t,r){const i=e.querySelector("#deposit-proof-slot");if(!i)return;if(!t){i.dataset.methodId="",i.dataset.isStripe="",i.innerHTML="";return}const s=v(t),a=r?"1":"0";if(!(i.dataset.methodId===s&&i.dataset.isStripe===a&&i.innerHTML.trim()!=="")){if(i.dataset.methodId=s,i.dataset.isStripe=a,r){i.innerHTML=`<div class="deposit-proof-note">
      <span>${f.wallet}</span>
      <div><strong>${n("funding.no_receipt_needed","No receipt upload needed")}</strong><small>${n("funding.card_checkout_copy","Card payments continue through Stripe Checkout.")}</small></div>
    </div>`;return}i.innerHTML=`<label class="deposit-file-drop">
    <input type="file" name="proof" accept="image/*,.pdf">
    <span>${f.deposit}</span>
    <div><strong>${t.proof_required?n("funding.upload_transfer_proof","Upload transfer proof"):n("funding.upload_receipt_optional","Upload receipt if available")}</strong><small id="proof-file-name">${n("funding.upload_file_hint","Image or PDF up to 8MB")}</small></div>
  </label>`}}function G(e,t){const r=e.querySelector("#withdraw-fields-panel");if(!r)return;if(!t){r.dataset.methodId="",r.innerHTML=`<p class="text-muted text-sm">${n("funding.select_withdraw_method_first","Select a withdrawal method first.")}</p>`;return}const i=v(t);if(r.dataset.methodId===i&&r.querySelector("[data-withdraw-field]"))return;r.dataset.methodId=i;const s=He(t.fields||[]);if(!s.length){r.innerHTML=`<label class="block">
      <span class="field-label">${n("funding.payout_destination","Payout destination")}</span>
      <textarea name="destination" data-withdraw-field class="input mt-1" rows="3" placeholder="${u(n("funding.payout_destination_placeholder","Wallet address, bank reference, IBAN, or payout details..."))}" required></textarea>
    </label>`;return}r.innerHTML=`<div class="withdraw-fields-grid">${s.map(Me).join("")}</div>`}function Me(e){const t=Ve(e.name||e.key||e.id||e.label||"destination"),r=e.label||e.title||x(t),i=e.placeholder||e.hint||"",s=e.required||e.is_required?"required":"",a=String(e.type||"text").toLowerCase(),o=Pe(e.options||e.values||[]);if(a==="textarea")return`<label class="block sm:col-span-2"><span class="field-label">${d(r)}</span><textarea name="${u(t)}" data-withdraw-field class="input mt-1" rows="3" placeholder="${u(i)}" ${s}></textarea></label>`;if(a==="select"&&o.length)return`<label class="block"><span class="field-label">${d(r)}</span><select name="${u(t)}" data-withdraw-field class="input mt-1" ${s}>${o.map(c=>`<option value="${u(c.value)}">${d(c.label)}</option>`).join("")}</select></label>`;const l=["email","number","tel","url"].includes(a)?a:"text";return`<label class="block"><span class="field-label">${d(r)}</span><input type="${l}" name="${u(t)}" data-withdraw-field class="input mt-1" placeholder="${u(i)}" ${s}></label>`}function ae(e,t){return`<div class="deposit-transfer-empty"><span>${f.deposit}</span><strong>${d(e)}</strong><small>${d(t)}</small></div>`}function Ce(e){const t=[];return String(e?.image_url||"").trim()&&t.push(n("funding.badge_logo","Logo")),oe(e)&&t.push(n("funding.badge_qr","QR")),(String(e?.payment_address||"").trim()||E(e?.fields||{}).length)&&t.push(n("funding.badge_details","Details")),e?.proof_required&&t.push(n("funding.badge_receipt","Receipt")),t.length||t.push(n("funding.needs_setup","Needs setup")),t.slice(0,4).map(r=>`<b>${d(r)}</b>`).join("")}function qe(e){const t=String(e?.payment_address||"").trim();return`
    <div class="transfer-target-card"><span>${n("funding.method","Method")}</span><strong>${d(e?.title||e?.name||e?.code||n("funding.payment_method","Payment method"))}</strong></div>
    ${De(e,t?[t]:[])}
  `}function Te(e){const t=oe(e),r=String(e?.payment_address||"").trim();return!t&&!r?"":`<div class="transfer-qr-card transfer-qr-card--centered">
    <strong>${n("funding.scan_qr","Scan QR code")}</strong>
    <small>${n("funding.scan_qr_copy","Scan with your wallet or banking app, then use the wallet address below if you prefer to copy it manually.")}</small>
    ${t?`<img src="${u(t)}" alt="Payment QR">`:""}
    ${r?`<div class="transfer-qr-address">
      <span>${n("funding.wallet_address","Wallet address")}</span>
      <code>${d(r)}</code>
      <button type="button" data-copy-address="${u(r)}">${n("funding.copy_address","Copy address")}</button>
    </div>`:""}
  </div>`}function oe(e){const t=String(e?.payment_qr_url||"").trim();if(t)return t;const r=String(e?.payment_address||"").trim();return r?`https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(r)}`:""}function Le(e){if(R(e))return"";const t=String(e?.payment_address||"").trim(),r=E(e?.fields||{});return t||r.length?"":`<div class="funding-method-warning">${f.lock}<div><strong>${n("funding.route_unavailable","Funding route unavailable")}</strong><small>${n("funding.choose_another_method","Choose another method or try again shortly.")}</small></div></div>`}function De(e,t=[]){const r=E(e?.fields||{}),i=new Set(t.map(s=>String(s||"").trim()).filter(Boolean));return r.filter(s=>!i.has(String(s.value||"").trim())).slice(0,8).map(s=>{const a=String(s.value);return`<div class="transfer-target-card ${a.length>26?"transfer-target-wide":""}"><span>${d(s.label)}</span><strong>${d(a)}</strong><button type="button" data-copy-address="${u(a)}">${n("common.copy","Copy")}</button></div>`}).join("")}function E(e){const t=[];return Array.isArray(e)?e.forEach(r=>{if(!r)return;const i=r.label||r.name||r.key||"",s=r.value||r.default||r.text||"";i&&s&&t.push({label:i,value:s})}):e&&typeof e=="object"&&Object.entries(e).forEach(([r,i])=>{if(!(i==null||i===""))if(typeof i=="object"){const s=i.label||i.name||r,a=i.value||i.text||i.default||"";a&&t.push({label:s,value:a})}else t.push({label:Ye(r),value:i})}),t}function He(e){return Array.isArray(e)?e.filter(Boolean).map(t=>(t.value||t.default||t.text)&&!t.collect?null:t).filter(Boolean):!e||typeof e!="object"?[]:Object.entries(e).map(([t,r])=>r&&typeof r=="object"?(r.value||r.default||r.text)&&!r.collect?null:{name:t,...r}:null).filter(Boolean)}async function Fe(e,t,r){if(e.preventDefault(),t.__fundingSubmitting)return;const i=e.target,s=t.querySelector("#form-status"),a=t.querySelector("#funding-submit"),o=new FormData(i),l=ce(t),c=r==="deposit",g=Number(o.get("amount")||0),M=String(o.get("notes")||"").trim(),h=l?R(l):!1;try{if($("mode")!=="real")return m(s,n("funding.switch_real_before_submit","Switch to Real before submitting live funding requests."),"error");if(!l)return m(s,n("funding.select_active_method_first","Select an active payment method first."),"error");const w=ue(l,g);if(w)return m(s,w,"error");const _=i.querySelector('input[name="proof"]')?.files?.[0]||null;if(c&&!h&&l.proof_required&&!_)return m(s,n("funding.upload_proof_before_confirm","Upload transfer proof before confirming."),"error");const y=je(t),F=y.destination||y.wallet_address||y.bank_account||y.iban||y.address||M;if(!c&&!String(F||"").trim())return m(s,n("funding.enter_payout_destination","Enter payout destination details."),"error");t.__fundingSubmitting=!0,a&&(a.disabled=!0,a.dataset.originalText=a.dataset.originalText||a.textContent||"",a.textContent=c?h?n("funding.opening_checkout","Opening checkout..."):n("funding.confirming","Confirming..."):n("funding.submitting","Submitting...")),m(s,h?n("funding.opening_secure_checkout","Opening secure checkout..."):c?n("funding.sending_transfer_confirmation","Sending transfer confirmation..."):n("funding.sending_payout_request","Sending payout request..."),"info");const U=l.code||l.method||l.id||"",P=l.currency||"USDT",me=t.__fundingCategory||S(l),V=t.querySelector("[data-deposit-deadline]")?.dataset.depositDeadline||"",W={notes:M,category:me,method_title:l.title||l.name||l.code||"",client_deadline_at:V?Math.floor(Number(V)/1e3):null,proof_attached:!!_,fields:y},ye=h?"/deposits/stripe_checkout.php":c?"/deposits/create.php":"/withdrawals/create.php",_e=c?{provider:l.provider||"",method:U,currency:P,amount:g,details:W}:{method:U,currency:P,amount:g,destination:F,details:{...W,destination:F}},b=await Z(ye,_e,{timeout:h?18e3:14e3,headers:{"Idempotency-Key":Qe(c?"dep":"wd")}});if(!b||b.ok===!1)return m(s,b?.error||n("common.request_failed","Request failed"),"error");if(h&&b.checkout_url){m(s,n("funding.redirecting_checkout","Redirecting to checkout..."),"success"),window.location.assign(b.checkout_url);return}if(c&&_){const Q=b.deposit?.id||b.id||b.deposit_id||null;if(Q){const I=new FormData;I.append("deposit_id",String(Q)),I.append("proof",_),await be("/deposits/upload_proof.php",I,{timeout:18e3})}}m(s,c?n("funding.transfer_confirmation_received","Transfer confirmation received. Your deposit is now being processed."):n("funding.withdrawal_request_received","Withdrawal request received. You can track it from history."),"success"),Ee(t,c,g,l),A.delete(c?"/deposits/list.php":"/withdrawals/list.php")}catch(w){m(s,w.message||n("common.request_failed","Request failed"),"error")}finally{t.__fundingSubmitting=!1,a&&(a.disabled=!1,a.textContent=a.dataset.originalText||(c?n("funding.confirm_transfer","Confirm transfer"):n("funding.submit_withdraw","Submit withdrawal request")))}}async function Ie(e){if(!e.querySelector("#funding-history-all"))return;const r=await Promise.allSettled([B("/deposits/list.php",{timeout:8e3,retry:1},2e4),B("/withdrawals/list.php",{timeout:8e3,retry:1},2e4)]);e.__fundingHistoryItems=[...r[0].status==="fulfilled"?(r[0].value?.items||[]).map(i=>X(i,"deposit")):[],...r[1].status==="fulfilled"?(r[1].value?.items||[]).map(i=>X(i,"withdraw")):[]].sort((i,s)=>s.sortTime-i.sortTime).slice(0,80),de(e)}function de(e){const t=e.querySelector("#funding-history-all");if(!t)return;const r=e.__fundingHistoryFilter||"all";e.querySelectorAll("[data-history-filter]").forEach(s=>s.classList.toggle("active",s.dataset.historyFilter===r));const i=(e.__fundingHistoryItems||[]).filter(s=>Ne(s,r));if(!i.length){t.innerHTML=`<div class="empty-state empty-state--compact">${n("funding.no_matching_history","No matching funding history yet.")}</div>`;return}t.innerHTML=`
    <div class="ledger-mobile-list md:hidden">${i.map(Ae).join("")}</div>
    <div class="hidden md:block overflow-x-auto">
      <table class="funding-history-table">
        <thead><tr><th>${n("funding.type","Type")}</th><th>${n("funding.method","Method")}</th><th>${n("deposit.amount","Amount")}</th><th>${n("kyc.status","Status")}</th><th>${n("funding.date","Date")}</th></tr></thead>
        <tbody>${i.map(Be).join("")}</tbody>
      </table>
    </div>`}function X(e,t){const r=Number(e.amount||0),i=e.created_at||e.updated_at||"",s=t==="ledger"?"posted":String(e.status||"pending").toLowerCase(),a=e.reference||e.ref||e.ref_id||e.txid||e.tx_hash||e.transaction_id||e.id||"",o=e.note||e.notes||e.memo||e.description||"";return{kind:t,amount:r,currency:e.currency||"USDT",status:s,method:Oe(t==="ledger"?e.type||e.ref_type||"ledger":e.method_label||e.provider||e.method_code||e.method||"manual"),created:i,reference:String(a||""),note:String(o||""),sortTime:he(i)}}function Ae(e){const t=e.kind==="deposit"||e.kind==="ledger"&&e.amount>=0,r=[[n("funding.method","Method"),e.method],[n("funding.date","Date"),j(e.created)],[n("kyc.status","Status"),z(e.status)],e.reference?[n("funding.reference","Reference"),e.reference]:null,e.note?[n("funding.notes","Notes"),e.note]:null].filter(Boolean);return`<article class="funding-history-card funds-history-card ${t?"is-positive":"is-negative"}" data-funding-history-card>
    <div class="funding-history-main">
      <span class="history-kind ${t?"is-deposit":"is-withdraw"}">${e.kind==="withdraw"?f.withdraw:f.deposit}</span>
      <div><strong>${ge(e.kind)}</strong><small>${d(e.method)} - ${d(j(e.created))}</small></div>
      <button type="button" class="funding-history-toggle" data-funding-history-toggle aria-expanded="false" aria-label="${u(n("common.details","Details"))}">${f.chevronDown}</button>
    </div>
    <div class="funds-history-amount"><strong>${t?"+":""}${p(e.amount)} ${d(e.currency)}</strong><span class="${pe(e.status)}">${d(z(e.status))}</span></div>
    <div class="funding-history-details">
      ${r.map(([i,s])=>`<span><small>${d(i)}</small><b>${d(s)}</b></span>`).join("")}
    </div>
  </article>`}function Be(e){const t=e.kind==="deposit"||e.kind==="ledger"&&e.amount>=0;return`<tr>
    <td>${d(ge(e.kind))}</td>
    <td>${d(e.method)}</td>
    <td class="${t?"text-buy":"text-sell"}">${t?"+":""}${p(e.amount)} ${d(e.currency)}</td>
    <td><span class="${pe(e.status)}">${d(z(e.status))}</span></td>
    <td>${d(j(e.created))}</td>
  </tr>`}function Ne(e,t){return t==="all"?!0:["deposit","withdraw"].includes(t)?e.kind===t:t==="pending"?["pending","requested","processing","review"].includes(e.status):t==="completed"?["approved","confirmed","completed","paid","posted"].includes(e.status):t==="failed"?["rejected","failed","cancelled","canceled"].includes(e.status):!0}function le(e){const t=e.__fundingCategory||"";return(e.__fundingMethods||[]).filter(r=>S(r)===t)}function ce(e){const t=le(e),r=e.__fundingSelectedMethodId||"";return t.find(i=>v(i)===r)||t[0]||null}function v(e){return String(e?.id??e?.code??"")}function S(e){const t=T(e?.category_key||"");if(t)return t;const r=T(e?.method_group||"");if(r)return r;const i=[e?.provider,e?.code,e?.title,e?.name].filter(Boolean).join(" ").toLowerCase();return/stripe|card|visa|master/.test(i)?"card":/bank|wire|iban|swift|ach|fedwire/.test(i)?"bank":/crypto|usdt|btc|eth|trc|erc|bep|wallet|blockchain/.test(i)?"crypto":/bot|telegram/.test(i)?"crypto_bot":"manual"}function ze(e){if(String(e?.image_url||"").trim())return`<img src="${u(e.image_url)}" alt="" style="width:32px;height:32px;object-fit:contain;border-radius:6px;">`;const t=[e?.provider,e?.code,e?.title,e?.name].filter(Boolean).join(" ").toLowerCase();return/visa/.test(t)?'<svg viewBox="0 0 38 24" width="36" height="24" fill="none"><rect width="38" height="24" rx="4" fill="#1A1F71"/><path d="M15.5 16.5h-2.3l1.43-8.9h2.3L15.5 16.5zm-4.85-8.9L8.6 13.3l-.28-1.4-.82-4.14s-.1-.66-.95-.66H3.08l-.04.16s1.45.3 2.13.94c.6.56.81 1.43.81 1.43l1.45 7.07h2.42l3.7-8.9H10.65zM33.8 16.5h2.14L34.07 7.6H32.2c-.72 0-.9.56-.9.56L27.8 16.5h2.43l.48-1.33h2.97l.12 1.33zm-2.59-3.2l1.23-3.37.69 3.37h-1.92zm-3.34-3.86l.33-1.93S27.3 7 26.1 7c-1.3 0-4.5.58-4.5 3.4 0 2.65 3.7 2.68 3.7 4.07 0 1.4-3.33 1.15-4.42.27l-.35 2.04s.96.47 2.44.47c1.48 0 4.76-.77 4.76-3.52 0-2.68-3.73-2.93-3.73-4.07 0-1.13 2.61-1 3.87-.42z" fill="white"/></svg>':/mastercard|master/.test(t)?'<svg viewBox="0 0 38 24" width="36" height="24"><rect width="38" height="24" rx="4" fill="#252525"/><circle cx="15" cy="12" r="7" fill="#EB001B"/><circle cx="23" cy="12" r="7" fill="#F79E1B"/><path d="M19 6.8a7 7 0 0 1 0 10.4A7 7 0 0 1 19 6.8z" fill="#FF5F00"/></svg>':/stripe|card/.test(t)?'<svg viewBox="0 0 38 24" width="36" height="24"><rect width="38" height="24" rx="4" fill="#635bff"/><path d="M17.6 10.3c0-.7.6-1 1.5-1 1.3 0 3 .4 4.2 1.1V7.1A11.2 11.2 0 0 0 19 6.5c-3.4 0-5.6 1.8-5.6 4.7 0 4.6 6.3 3.8 6.3 5.8 0 .8-.7 1.1-1.7 1.1-1.4 0-3.3-.6-4.7-1.4v3.3c1.6.7 3.2 1 4.7 1 3.5 0 5.9-1.7 5.9-4.8-.1-4.9-6.3-4-6.3-5.9z" fill="white"/></svg>':/btc|bitcoin/.test(t)?'<svg viewBox="0 0 38 24" width="36" height="24"><rect width="38" height="24" rx="4" fill="#F7931A"/><path d="M21.8 11.9c.4-.3.7-.8.6-1.5-.2-1.6-1.8-2-3.2-2h-3.5l-.9 6h3.7c1.5 0 3-.7 3.3-2.5.1-.8-.1-1.5-.5-1.9l.5-.1zm-4.6-1.8h1.6c.5 0 1 .1 1.1.6.1.5-.4.8-.9.8h-1.5l.3-1.4zm1.9 3.8h-1.7l.3-1.6h1.6c.5 0 1.1.1 1.1.7.1.6-.5.9-1.3.9z" fill="white"/></svg>':/eth|ethereum/.test(t)?'<svg viewBox="0 0 38 24" width="36" height="24"><rect width="38" height="24" rx="4" fill="#627EEA"/><path d="M19 7.5V13l4 1.8L19 7.5z" fill="white" opacity="0.6"/><path d="M19 7.5l-4 6.3 4-1.8V7.5z" fill="white"/><path d="M19 16.5v-1.9l4-2.3-4 4.2z" fill="white" opacity="0.6"/><path d="M19 16.5l-4-4.2 4 2.3v1.9z" fill="white"/></svg>':/usdt|tether/.test(t)?'<svg viewBox="0 0 38 24" width="36" height="24"><rect width="38" height="24" rx="4" fill="#26A17B"/><path d="M20.5 12.1c-.1 0-.6.1-1.5.1s-1.4 0-1.5-.1v-.8h3v.8zm0-2.1h-3V9h-2v1H13v1.2h1.5c.1.4.1.8 0 1.2v.2c-.1.6-.1 1.3.1 1.9.3.7 1 1 2.4 1s2-.3 2.4-1c.2-.6.2-1.3.1-1.9v-.2c0-.4 0-.8-.1-1.2H22V9h-1.5z" fill="white"/></svg>':/bank|wire|iban|swift/.test(t)?'<svg viewBox="0 0 38 24" width="36" height="24"><rect width="38" height="24" rx="4" fill="#1e3a5f"/><path d="M9 17h20v1.5H9zm2-6.5h2.5v6H11zm4 0H17v6h-2zm4 0h2.5v6H19zm4 0h2.5v6H23zM19 6l10 3.5H9L19 6z" fill="white" opacity="0.9"/></svg>':/crypto_bot|bot|telegram/.test(t)?'<svg viewBox="0 0 38 24" width="36" height="24"><rect width="38" height="24" rx="4" fill="#229ED9"/><path d="M8 12.5l2.5 1.5L16 9l-8 3.5zm3.5 2.5l.5 3.5 2.5-2.5-3-1zm4.5-2l4.5-7-9.5 5.5 5 1.5z" fill="white"/></svg>':N(S(e))}function N(e,t=""){return t?`<b>${d(t)}</b>`:e==="card"?'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M7 15h2M15 15h2"/></svg>':e==="bank"?'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M3 10h18M5 10V6M8 10V6M11 10V6M14 10V6M17 10V6M19 10V6M12 3 3 6h18L12 3z"/></svg>':e==="crypto"?'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 8h4a2 2 0 1 1 0 4H9V8zm0 4h5a2 2 0 1 1 0 4H9v-4z"/><path d="M12 6v2M12 16v2"/></svg>':e==="crypto_bot"?'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="11" rx="2"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/><circle cx="9" cy="14" r="1.5" fill="currentColor"/><circle cx="15" cy="14" r="1.5" fill="currentColor"/></svg>':f.wallet}function D(e){return{bank:n("funding.bank_transfer","Bank transfer"),crypto:n("funding.crypto","Crypto"),card:n("funding.card_visa","Card / Visa"),cash:n("funding.cash_desk","Cash desk"),crypto_bot:n("funding.crypto_bot","Crypto bot"),manual:n("funding.manual","Manual")}[e]||x(e||"Manual")}function J(e){return{bank:n("funding.bank_hint","Wire and bank details"),crypto:n("funding.crypto_hint","Wallet networks and QR"),card:n("funding.card_hint","Stripe hosted checkout"),cash:n("funding.cash_hint","Desk review"),crypto_bot:n("funding.crypto_bot_hint","Automated wallet route"),manual:n("funding.manual_hint","Configured instructions")}[e]||n("funding.configured_route","Configured route")}function R(e){const t=[e?.provider,e?.method_group,e?.category_key,e?.code,e?.title].filter(Boolean).join(" ").toLowerCase();return/stripe|card|visa|master/.test(t)}function ue(e,t){if(!Number.isFinite(t)||t<=0)return n("funding.enter_amount_continue","Enter the amount to continue.");const r=Number(e?.min_amount||0),i=Number(e?.max_amount||0);return r>0&&t<r?`${n("funding.minimum_for_method","Minimum for this method is")} ${p(r)} ${e.currency||"USDT"}.`:i>0&&t>i?`${n("funding.maximum_for_method","Maximum for this method is")} ${p(i)} ${e.currency||"USDT"}.`:""}function je(e){const t={};return e.querySelectorAll("[data-withdraw-field]").forEach(r=>{t[r.name]=r.value}),t}function Ee(e,t,r,i){const s=e.querySelector("#deposit-transfer-panel");!s||!t||(H(e),s.className="deposit-transfer-panel is-success",s.innerHTML=`<div class="funding-success-panel"><span>${f.deposit}</span><strong>${n("funding.transfer_confirmation_sent","Transfer confirmation sent")}</strong><small>${p(r)} ${d(i?.currency||"USDT")} ${n("funding.via","via")} ${d(i?.title||i?.code||n("funding.selected_method","selected method"))} ${n("funding.is_being_processed","is being processed.")}</small></div>`)}function m(e,t,r="info"){e&&(e.textContent=t,e.className=`text-xs text-center funding-form-status is-${r}`)}function Re(e,t,r){const i=`mex_deposit_deadline_${v(e)}_${Number(t).toFixed(2)}`,s=Date.now();let a=Number(localStorage.getItem(i)||0);return(!a||a<=s)&&(a=s+r*60*60*1e3,localStorage.setItem(i,String(a))),a}function Ue(e,t){const r=()=>{const i=e.querySelector("#deposit-countdown");if(!i)return;const s=Math.max(0,t-Date.now());i.textContent=Ge(s),e.querySelector(".deposit-timer")?.classList.toggle("is-expired",s<=0);const a=e.querySelector("#funding-submit");a&&s<=0&&(a.disabled=!0)};r(),e.__depositTimer=setInterval(r,1e3)}function H(e){e?.__depositTimer&&clearInterval(e.__depositTimer),e&&(e.__depositTimer=null)}function Pe(e){return Array.isArray(e)?e.map(t=>t&&typeof t=="object"?{value:String(t.value??t.key??t.label??""),label:String(t.label??t.name??t.value??"")}:{value:String(t),label:String(t)}).filter(t=>t.value!==""):[]}function T(e){return String(e||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")}function Ve(e){return T(e)||"destination"}function We(e){navigator.clipboard?.writeText(e.dataset.copyAddress||"").then(()=>{e.textContent=n("common.copied","Copied"),setTimeout(()=>{e.textContent=n("common.copy","Copy")},1200)}).catch(()=>{})}function Qe(e){const t=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;return`vp-${e}-${t}`}function fe(e={}){const t=String(e._path||""),r=String(e.action||e.tab||"").toLowerCase();return ie.some(i=>i.key===r)?r:t.includes("withdraw")?"withdraw":(t.includes("deposit"),"deposit")}function L(e,t){return`<div class="funding-check-item ${t?"is-done":"is-pending"}"><i>${t?f.deposit:f.lock}</i><div><strong>${d(e)}</strong><small>${t?n("funding.ready","Ready"):n("funding.required","Required")}</small></div></div>`}function pe(e){const t=String(e||"").toLowerCase();return["approved","confirmed","completed","paid","posted"].includes(t)?"badge-green":["pending","requested","processing","review"].includes(t)?"badge-accent":["rejected","failed","cancelled","canceled"].includes(t)?"badge-red":"badge"}function ge(e){return e==="withdraw"?n("funding.withdrawal","Withdrawal"):e==="ledger"?n("funding.ledger_entry","Ledger entry"):n("funding.deposit_entry","Deposit")}function Ke(e){return{all:n("common.all","All"),deposit:n("funding.deposit","Deposit"),withdraw:n("funding.withdraw","Withdraw"),ledger:n("funding.ledger","Ledger"),pending:n("funding.pending","Pending"),completed:n("funding.completed","Completed"),failed:n("funding.failed","Failed")}[e]||x(e)}function z(e){const t=String(e||"").toLowerCase();return{approved:n("funding.status_approved","Approved"),confirmed:n("funding.status_confirmed","Confirmed"),completed:n("funding.status_completed","Completed"),paid:n("funding.status_paid","Paid"),posted:n("funding.status_posted","Posted"),pending:n("funding.status_pending","Pending"),requested:n("funding.status_requested","Requested"),processing:n("funding.status_processing","Processing"),review:n("funding.status_review","Under review"),rejected:n("funding.status_rejected","Rejected"),failed:n("funding.status_failed","Failed"),cancelled:n("funding.status_cancelled","Cancelled"),canceled:n("funding.status_cancelled","Cancelled"),"not submitted":n("funding.status_not_submitted","Not submitted")}[t]||x(t||"pending")}function Oe(e){const t=T(e);return{trade_open:n("funding.ledger_trade_open","Trade open"),trade_close:n("funding.ledger_trade_close","Trade close"),trade_pnl:n("funding.ledger_trade_pnl","Trade PnL"),deposit_credit:n("funding.ledger_deposit_credit","Deposit credit"),withdrawal:n("funding.withdrawal","Withdrawal"),withdraw:n("funding.withdrawal","Withdrawal"),invest_payout:n("funding.ledger_invest_payout","Investment payout"),ledger:n("funding.ledger_entry","Ledger entry"),stripe:n("funding.card_visa","Card / Visa"),bank:n("funding.bank_transfer","Bank transfer"),crypto:n("funding.crypto","Crypto"),manual:n("funding.manual","Manual")}[t]||x(e)}function x(e){return String(e||"").replace(/[_-]/g," ").replace(/\b\w/g,t=>t.toUpperCase())}function Ye(e){return x(e)}function Ge(e){const t=Math.max(0,Math.floor(e/1e3)),r=Math.floor(t/3600),i=Math.floor(t%3600/60),s=t%60;return`${String(r).padStart(2,"0")}:${String(i).padStart(2,"0")}:${String(s).padStart(2,"0")}`}function Xe(e){return new Date(Number(e)).toLocaleString("en-US",{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})}function Je(e){const t=Number(e||0);return t>=1024*1024?`${(t/1024/1024).toFixed(1)} MB`:t>=1024?`${Math.round(t/1024)} KB`:`${t} B`}function he(e){const t=String(e||"").trim(),r=Number(t);if(Number.isFinite(r)&&r>0)return r>1e10?r:r*1e3;const i=Date.parse(t);return Number.isFinite(i)?i:0}function j(e){const t=he(e);return t?new Date(t).toLocaleString("en-US",{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"}):"--"}export{nt as cleanup,tt as mount,et as render};
