import{j as x,l as H,u as Y,v as n,k as f,h as c,m,g as l,o as se,c as B,s as ke,n as ae,x as Se,i as Ce}from"./main-u5kaUqZB.js";const E=globalThis.__MEX_FUNDING_CACHE__||(globalThis.__MEX_FUNDING_CACHE__=new Map),Te=45e3,xe="/assets/img/payment_methods/",qe=[{name:"Visa",file:"pm-visa.svg"},{name:"Mastercard",file:"pm-mastercard.svg"},{name:"American Express",file:"pm-amex.svg"},{name:"Stripe",file:"pm-stripe.svg"},{name:"Apple Pay",file:"pm-apple-pay.svg"},{name:"Google Pay",file:"pm-google-pay.svg"},{name:"USDT",file:"pm-usdt-networks.svg"},{name:"Bank transfer",file:"pm-bank-transfer.svg"}];let M=[];const re=[{key:"deposit",label:"funding.deposit",fallback:"Deposit",icon:f.deposit},{key:"withdraw",label:"funding.withdraw",fallback:"Withdraw",icon:f.withdraw},{key:"history",label:"funding.history",fallback:"History",icon:f.wallet}];function ft(e={}){const t=he(e),s=x("wallet")||{},a=x("mode")==="real"?"real":"demo",r=!H(),i=t!=="history"&&(a!=="real"||r),o=a==="real"?s.real||{}:s.demo||{};return`
    <div class="funds-workspace animate-fade-in" data-active-funding-tab="${c(t)}">
      <section class="funds-hero-pro">
        <div>
          <span class="badge-accent">${n("funding.assets_desk","Assets desk")}</span>
          <h1>${n("nav.wallet","Funds")}</h1>
          <p>${n("funding.hero_copy","Deposit, withdraw and audit wallet movements from one fast workspace powered by admin payment categories.")}</p>
        </div>
        <div class="funds-balance-pro">
          <span>${a==="real"?n("balance.available","Available balance"):n("funding.demo_balance","Demo balance")}</span>
          <strong>${m(o.available||o.balance||0)}</strong>
          <small>${l(o.currency||(a==="real"?"USDT":"USDT_DEMO"))}</small>
        </div>
      </section>

      ${t==="deposit"?`<section class="funding-promo-banner" data-promo-banner>
        <span class="promo-coin-float">${f.coin}</span>
        <div class="promo-banner-content">
          <span class="promo-badge"><b>+10%</b> ${n("funding.bonus","Bonus")}</span>
          <span class="promo-text">${n("funding.bonus_crypto","Get 10% bonus on every crypto deposit")}</span>
        </div>
        <button type="button" data-dismiss-promo aria-label="Dismiss">${f.close}</button>
      </section>`:""}

      <section class="funds-tabs-pro" role="tablist" aria-label="Funding workspace tabs">
        ${re.map(d=>`
          <button type="button" class="${d.key===t?"active":""}" data-funding-tab="${d.key}" role="tab" aria-selected="${d.key===t?"true":"false"}">
            <span>${d.icon||""}</span>${l(n(d.label,d.fallback))}
          </button>
        `).join("")}
      </section>

      ${i?`<section class="funding-mode-warning">
        <span class="gate-icon">${f.lock}</span>
        <div>
          <strong>${a!=="real"?n("funding.real_required","Real account required"):n("earn.kyc_required","KYC approval required")}</strong>
          <small>${n("funding.real_only_copy","Deposits and withdrawals are available for verified real accounts only.")}</small>
        </div>
        <button type="button" class="btn-primary btn-sm" data-switch-real>${n("earn.switch_real","Switch to Real")}</button>
      </section>`:""}

      ${t==="history"?Ie():i?De(G(t)):G(t)}
    </div>`}function pt(e,t={}){const s=he(t);Me(e,t);const a=o=>{const d=o.target.closest("[data-funding-tab]");if(d){o.preventDefault(),ae("wallet",{action:d.dataset.fundingTab||"deposit"});return}if(o.target.closest("[data-switch-real]")){o.preventDefault(),Se("funding");return}if((x("mode")!=="real"||!H())&&s!=="history"&&o.target.closest("[data-funding-category], [data-method], [data-quick-amount], [data-copy-address], #funding-form, .funding-locked-shell")){o.preventDefault(),Y({body:n("gate.funding_body","Deposits and withdrawals are available for verified real accounts only.")});return}const u=o.target.closest("[data-funding-category]");if(u){e.__fundingCategory=u.dataset.fundingCategory||"",e.__fundingSelectedMethodId="",ie(e),oe(e),C(e);return}const h=o.target.closest("[data-method]");if(h){e.__fundingSelectedMethodId=h.dataset.method||"",C(e);return}if(o.target.closest("[data-dismiss-promo]")){o.preventDefault();const g=e.querySelector("[data-promo-banner]");g&&(g.style.display="none");return}const b=o.target.closest("[data-history-filter]");if(b){e.__fundingHistoryFilter=b.dataset.historyFilter||"all",ue(e);return}const _=o.target.closest("[data-funding-history-toggle]");if(_){const g=_.closest("[data-funding-history-card]");if(g){const S=!g.classList.contains("is-expanded");g.classList.toggle("is-expanded",S),_.setAttribute("aria-expanded",S?"true":"false")}return}const $=o.target.closest("[data-copy-address]");if($){st($);return}};e.addEventListener("click",a),M.push(()=>e.removeEventListener("click",a));const r=o=>{o.target.matches('input[name="amount"], [data-withdraw-field]')&&C(e)};e.addEventListener("input",r),M.push(()=>e.removeEventListener("input",r));const i=o=>{const d=o.target.closest('input[name="proof"]');if(!d)return;const u=e.querySelector("#proof-file-name"),h=d.files?.[0];u&&(u.textContent=h?`${h.name} - ${ut(h.size||0)}`:n("funding.upload_file_hint","Image or PDF up to 8MB"))};if(e.addEventListener("change",i),M.push(()=>e.removeEventListener("change",i)),e.querySelectorAll("[data-quick-amount]").forEach(o=>{o.addEventListener("click",()=>{const d=e.querySelector('input[name="amount"]');d&&(d.value=o.dataset.quickAmount||""),C(e)})}),s==="history"){We(e);return}Ae(e,s),e.querySelector("#funding-form")?.addEventListener("submit",o=>{if(x("mode")!=="real"||!H()){o.preventDefault(),Y({body:n("gate.funding_body","Deposits and withdrawals are available for verified real accounts only.")});return}Be(o,e,s)})}function De(e){return`<section class="funding-locked-shell blur-gate blur-active">
    <div class="blur-gate-content">${e}</div>
    <div class="blur-gate-overlay">
      <button type="button" class="gate-card funding-lock-card" data-switch-real>
        <span class="gate-icon">${f.lock}</span>
        <strong>${n("funding.real_only","Real account only")}</strong>
        <p>${n("funding.real_only_copy","Deposits and withdrawals are available for verified real accounts only.")}</p>
        <span class="btn-primary btn-sm">${n("earn.switch_real","Switch to Real")}</span>
      </button>
    </div>
  </section>`}function Me(e,t){const s=t&&t.stripe;if(!s)return;try{window.history.replaceState(null,"",window.location.pathname+"#/wallet")}catch{}const a=document.createElement("div");if(a.className="stripe-return-banner",e.prepend(a),s!=="success"){a.classList.add("is-cancel"),a.innerHTML=`<div><strong>${n("funding.payment_canceled","Card payment was canceled.")}</strong><small>${n("funding.payment_canceled_copy","You can start a new deposit whenever you are ready.")}</small></div>`;return}const r=Number(t.deposit||0);a.classList.add("is-pending"),a.innerHTML=`<span class="stripe-return-spin"></span><div><strong>${n("funding.verifying_payment","Verifying card payment...")}</strong></div>`,(async()=>{let i="";if(r>0)for(let o=0;o<4;o++){try{const d=await se("/deposits/stripe_sync.php",{deposit_id:r},{timeout:15e3});if(i=String(d?.status||""),i==="confirmed"||i==="failed")break}catch{}await new Promise(d=>setTimeout(d,2500))}if(i==="confirmed"){a.className="stripe-return-banner is-success",a.innerHTML=`<div><strong>${n("funding.deposit_confirmed","Payment confirmed. Funds credited to your wallet.")}</strong></div>`;try{const o=await B("/bootstrap.php");o&&o.wallet&&ke("wallet",o.wallet)}catch{}ae("wallet",{action:"history"})}else i==="failed"?(a.className="stripe-return-banner is-cancel",a.innerHTML=`<div><strong>${n("funding.deposit_failed","Payment was not completed.")}</strong></div>`):(a.className="stripe-return-banner",a.innerHTML=`<div><strong>${n("funding.payment_processing","Payment is processing. Your balance will update shortly.")}</strong></div>`)})()}function gt(){document.querySelectorAll(".funds-workspace").forEach(e=>I(e)),M.forEach(e=>{try{e()}catch{}}),M=[]}function Le(){return`
    <div class="payment-logos-strip">
      <div class="payment-logos-row">
        ${qe.map(e=>`<span class="payment-logo" title="${c(e.name)}">${k(p(e.file),e.name,"payment-logo-img")}</span>`).join("")}
      </div>
      <p class="payment-logos-caption">${n("funding.payment_methods_secure","We support all payment methods securely and quickly")}</p>
    </div>`}function G(e){const t=e==="deposit";return`
    <section class="funding-flow-shell">
      ${Le()}
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
            ${de(n("funding.transfer_details_waiting","Transfer details will appear here"),n("funding.transfer_details_waiting_copy","Choose a method to unlock account details, QR code, wallet address and bank fields."))}
          </div>`:'<div id="withdraw-fields-panel" class="withdraw-fields-panel"></div>'}

          <div class="deposit-ticket-grid">
            <label class="block">
              <span class="field-label">${t?n("funding.amount_step","3. Amount"):n("deposit.amount","Amount")}</span>
              <input type="number" name="amount" class="input mt-1" value="${t?"":"50"}" min="1" step="any" placeholder="${t?c(n("funding.amount_placeholder","Enter exact amount after copying the transfer details")):"50"}" required>
            </label>
            <label class="block">
              <span class="field-label">${n("funding.currency","Currency")}</span>
              <input type="text" name="currency" class="input mt-1" value="USDT" readonly>
            </label>
          </div>

          ${t?`<div class="quick-amount-rail" aria-label="Quick amount">
            ${[100,250,500,1e3,2500].map(s=>`<button type="button" class="quick-amount-chip" data-quick-amount="${s}">${m(s,0)}</button>`).join("")}
          </div>
          <div id="deposit-proof-slot" class="deposit-proof-slot"></div>`:""}

          <label class="block deposit-note-field">
            <span class="field-label">${t?n("funding.reference_notes","Reference / notes"):n("funding.additional_notes","Additional notes")}</span>
            <textarea name="notes" class="input mt-1" rows="2" placeholder="${t?c(n("funding.reference_placeholder","Sender name, transaction hash, or bank reference...")):c(n("funding.notes_placeholder","Optional note for the operations desk..."))}"></textarea>
          </label>

          <div class="funding-submit-zone">
            <button type="submit" class="${t?"btn-primary":"btn-sell"} w-full py-3" id="funding-submit">
              ${t?n("funding.confirm_transfer","Confirm transfer"):n("funding.submit_withdraw","Submit withdrawal request")}
            </button>
            <p class="text-xs text-center funding-form-status" id="form-status"></p>
          </div>
        </form>
      </div>
    </section>`}function Ie(){return`
    <section class="card funding-history-workspace">
      <div class="panel-headline-row">
        <div>
          <span class="badge-accent">${n("funding.history","History")}</span>
          <h2>${n("funding.history_title","Funding history")}</h2>
        </div>
        <div class="history-filter-rail">
          ${["all","deposit","withdraw","pending","completed","failed"].map((e,t)=>`
            <button type="button" class="${t===0?"active":""}" data-history-filter="${e}">${l(rt(e))}</button>
          `).join("")}
        </div>
      </div>
      <div id="funding-history-all" class="funding-history-stack">
        <p class="text-muted text-sm text-center py-10">${n("funding.loading_history","Loading funding history...")}</p>
      </div>
    </section>`}async function P(e,t={},s=Te){const a=e,r=Date.now(),i=E.get(a);if(i&&r-i.time<s)return i.data;const o=await B(e,t);return E.set(a,{time:r,data:o}),o}async function Ae(e,t){try{const s=x("mode")==="real"?"real":"both",a=await P(`/payment_methods/list.php?kind=${encodeURIComponent(t)}&scope=${s}&currency=*`,{timeout:9e3,retry:1},9e4),r=a?.items||[],i=Fe(a?.categories||[],r);e.__fundingKind=t,e.__fundingMethods=r,e.__fundingCategories=i,e.__fundingCategory=i[0]?.key||"",e.__fundingSelectedMethodId="",e.__fundingBonuses={},t==="deposit"&&await Promise.all(i.map(async o=>{try{const d=await B(`/wallet/bonuses.php?method_key=${encodeURIComponent(o.key)}`,{timeout:4e3});d?.ok&&d.bonus&&(e.__fundingBonuses[o.key]=d.bonus)}catch{}})),ie(e),oe(e),C(e)}catch{const a=e.querySelector("#funding-categories"),r=e.querySelector("#method-cards");a&&(a.innerHTML=`<div class="empty-state empty-state--compact">${n("funding.sections_unavailable","Payment sections are temporarily unavailable.")}</div>`),r&&(r.innerHTML="")}}function Fe(e,t){const s=new Set(t.map(q).filter(Boolean)),a=[];e.forEach(i=>{const o=L(i.key||i.key_slug||i.label);!o||!s.has(o)||a.push({key:o,label:i.label||T(o),hint:i.hint||ne(o),icon:i.image_url?k(i.image_url,i.label||T(o),"funding-category-logo"):R(o,i.icon)})}),s.forEach(i=>{a.some(o=>o.key===i)||a.push({key:i,label:T(i),hint:ne(i),icon:R(i)})});const r={card:1,bank:2,crypto:3,crypto_bot:4,manual:99};return a.sort((i,o)=>(r[i.key]||99)-(r[o.key]||99)),a}function ie(e){const t=e.querySelector("#funding-categories"),s=e.__fundingCategories||[],a=e.__fundingCategory||s[0]?.key||"";if(t){if(!s.length){t.innerHTML=`<div class="empty-state empty-state--compact">${n("funding.no_sections","No active funding sections are configured by admin.")}</div>`;return}t.innerHTML=s.map(r=>{const i=(e.__fundingKind||"")==="deposit",o=i?e.__fundingBonuses?.[r.key]:null,d=i?o||(r.key==="crypto"?{amount:10}:null):null,u=d?`
      <span class="bonus-card"><span>${n("funding.bonus","Bonus")}</span><b>+${Ee(d.amount||0)}%</b></span>
    `:"";return`
    <button type="button" class="${r.key===a?"active":""}" data-funding-category="${c(r.key)}">
      <i>${r.icon||f.wallet}</i>
      <strong>${l(r.label)}</strong>
      ${u}
    </button>`}).join("")}}function oe(e){const t=e.querySelector("#method-cards"),s=ce(e),a=(e.__fundingKind||e.querySelector("#funding-form")?.dataset.kind||"deposit")==="deposit";if(t){if(I(e),!s.length){t.innerHTML=`<div class="empty-state empty-state--compact">${n("funding.no_methods_section","No active methods under this section.")}</div>`,e.__fundingSelectedMethodId="",C(e);return}s.some(r=>w(r)===e.__fundingSelectedMethodId)||(e.__fundingSelectedMethodId=w(s[0])),t.innerHTML=s.map(r=>{const i=w(r);return`<button type="button" class="method-card ${i===e.__fundingSelectedMethodId?"active":""}" data-method="${c(i)}">
      <span class="method-card-top">
        <span class="method-icon">${Ye(r)}</span>
        ${Ge(r)}
      </span>
      <strong>${l(r.title||r.name||r.code||n("funding.method","Method"))}</strong>
      <span class="method-card-badges">${He(r,a)}</span>
      <em>${m(r.min_amount||0)}${r.max_amount?` - ${m(r.max_amount)}`:"+"}</em>
    </button>`}).join("")}}function C(e){const s=(e.__fundingKind||e.querySelector("#funding-form")?.dataset.kind||"deposit")==="deposit",a=fe(e),r=Number(e.querySelector('input[name="amount"]')?.value||0),i=e.querySelector("#funding-submit"),o=a?W(a):!1,d=e.querySelector('input[name="currency"]');if(d&&(d.value=a?.currency||"USDT"),e.querySelectorAll(".method-card").forEach(u=>u.classList.toggle("active",u.dataset.method===w(a||{}))),i&&a&&(i.disabled=!1,i.textContent=o?a.checkout_label||n("funding.continue_card_checkout","Continue to secure card checkout"):s?n("funding.confirm_transfer","Confirm transfer"):n("funding.submit_withdraw","Submit withdrawal request")),!a){X(e,null,r,!1,n("funding.choose_method_first","Choose an active method first.")),Z(e,null,!1),ee(e,null);return}s?(X(e,a,r,o,me(a,r)),Z(e,a,o)):ee(e,a)}function X(e,t,s,a,r){const i=e.querySelector("#deposit-transfer-panel");if(!i)return;if(I(e),!t){i.className="deposit-transfer-panel is-muted",i.innerHTML=de(n("funding.choose_method","Choose a method"),n("funding.choose_method_copy","Select a funding method to display transfer instructions, QR code and destination details."));return}if(a){i.className="deposit-transfer-panel is-ready",i.innerHTML=`
      <div class="deposit-transfer-ready">
        <div class="deposit-transfer-title">
          <span>${f.wallet}</span>
          <div><strong>${n("funding.ready_card_checkout","Ready for card checkout")}</strong><small>${n("funding.ready_card_checkout_copy","Enter the amount and continue to Stripe Checkout. No receipt upload is required.")}</small></div>
        </div>
        ${J(t,!0)}
        <div class="secure-checkout-strip">
          <i>${f.wallet}</i>
          <div>
            <strong>${n("funding.secure_stripe","Secure Stripe Checkout")}</strong>
            <small>${n("funding.secure_stripe_copy","Card details are collected by Stripe. You return to MEX after payment confirmation.")}</small>
          </div>
        </div>
      </div>`;return}const o=!r&&s>0,d=Math.max(1,Number(t.expires_hours||24)),u=o?Ze(t,s,d):0;i.className=`deposit-transfer-panel is-ready${o?"":" is-preview"}`,i.innerHTML=`
    <div class="deposit-transfer-ready">
      <div class="deposit-transfer-title">
        <span>${f.deposit}</span>
        <div>
          <strong>${o?`${n("funding.transfer","Transfer")} ${m(s)} ${l(t.currency||"USDT")}`:l(t.title||t.name||t.code||n("funding.payment_method","Payment method"))}</strong>
          <small>${o?n("funding.use_exact_details","Use only the details shown here before the timer ends."):n("funding.scan_then_amount","Scan the QR or copy the destination first, then enter the exact amount below.")}</small>
        </div>
      </div>
      ${J(t,!1)}
      ${o?`<div class="deposit-timer" data-deposit-deadline="${u}">
        <div><span>${n("funding.payment_window","Payment window")}</span><strong id="deposit-countdown">--:--:--</strong></div>
        <small>${n("funding.expires","Expires")} ${lt(u)}</small>
      </div>`:""}
      ${Pe(t)}
      ${t.instructions?`<div class="transfer-instruction-card">
        <strong>${n("funding.transfer_instructions","Transfer instructions")}</strong>
        <p>${l(t.instructions)}</p>
      </div>`:""}
      ${Re(t)}
    </div>`,o&&et(e,u)}function J(e,t=!1){const s=e.max_amount?m(e.max_amount):n("funding.flexible","Flexible");return`<div class="funding-route-summary" aria-label="Selected funding route summary">
    ${N(n("funding.section","Section"),T(q(e)))}
    ${N(n("funding.currency","Currency"),e.currency||"USDT")}
    ${N(n("funding.limits","Limits"),`${m(e.min_amount||0)} - ${s}`)}
  </div>`}function N(e,t){return`<span class="funding-route-pill"><small>${l(e)}</small><b>${l(t)}</b></span>`}function Z(e,t,s){const a=e.querySelector("#deposit-proof-slot");if(!a)return;if(!t){a.dataset.methodId="",a.dataset.isStripe="",a.innerHTML="";return}const r=w(t),i=s?"1":"0";if(!(a.dataset.methodId===r&&a.dataset.isStripe===i&&a.innerHTML.trim()!=="")){if(a.dataset.methodId=r,a.dataset.isStripe=i,s){a.innerHTML=`<div class="deposit-proof-note">
      <span>${f.wallet}</span>
      <div><strong>${n("funding.no_receipt_needed","No receipt upload needed")}</strong><small>${n("funding.card_checkout_copy","Card payments continue through Stripe Checkout.")}</small></div>
    </div>`;return}a.innerHTML=`<label class="deposit-file-drop">
    <input type="file" name="proof" accept="image/*,.pdf">
    <span>${f.deposit}</span>
    <div><strong>${t.proof_required?n("funding.upload_transfer_proof","Upload transfer proof"):n("funding.upload_receipt_optional","Upload receipt if available")}</strong><small id="proof-file-name">${n("funding.upload_file_hint","Image or PDF up to 8MB")}</small></div>
  </label>`}}function ee(e,t){const s=e.querySelector("#withdraw-fields-panel");if(!s)return;if(!t){s.dataset.methodId="",s.innerHTML=`<p class="text-muted text-sm">${n("funding.select_withdraw_method_first","Select a withdrawal method first.")}</p>`;return}const a=w(t);if(s.dataset.methodId===a&&s.querySelector("[data-withdraw-field]"))return;s.dataset.methodId=a;const r=Ue(t.fields||[]);if(!r.length){s.innerHTML=`<label class="block">
      <span class="field-label">${n("funding.payout_destination","Payout destination")}</span>
      <textarea name="destination" data-withdraw-field class="input mt-1" rows="3" placeholder="${c(n("funding.payout_destination_placeholder","Wallet address, bank reference, IBAN, or payout details..."))}" required></textarea>
    </label>`;return}s.innerHTML=`<div class="withdraw-fields-grid">${r.map(Ne).join("")}</div>`}function Ne(e){const t=nt(e.name||e.key||e.id||e.label||"destination"),s=e.label||e.title||D(t),a=e.placeholder||e.hint||"",r=e.required||e.is_required?"required":"",i=String(e.type||"text").toLowerCase(),o=tt(e.options||e.values||[]);if(i==="textarea")return`<label class="block sm:col-span-2"><span class="field-label">${l(s)}</span><textarea name="${c(t)}" data-withdraw-field class="input mt-1" rows="3" placeholder="${c(a)}" ${r}></textarea></label>`;if(i==="select"&&o.length)return`<label class="block"><span class="field-label">${l(s)}</span><select name="${c(t)}" data-withdraw-field class="input mt-1" ${r}>${o.map(u=>`<option value="${c(u.value)}">${l(u.label)}</option>`).join("")}</select></label>`;const d=["email","number","tel","url"].includes(i)?i:"text";return`<label class="block"><span class="field-label">${l(s)}</span><input type="${d}" name="${c(t)}" data-withdraw-field class="input mt-1" placeholder="${c(a)}" ${r}></label>`}function de(e,t){return`<div class="deposit-transfer-empty"><span>${f.deposit}</span><strong>${l(e)}</strong><small>${l(t)}</small></div>`}function He(e,t=!0){const s=[];return t&&(e?.bonus_amount||e?.bonus_type)&&s.push({label:n("funding.badge_bonus","Bonus"),type:"bonus"}),le(e)&&s.push({label:n("funding.badge_qr","QR"),type:"qr"}),e?.proof_required&&s.push({label:n("funding.badge_receipt","Receipt"),type:"receipt"}),s.slice(0,3).map(a=>`<b class="${a.type==="bonus"?"is-bonus":""}">${l(a.label)}</b>`).join("")}function Ee(e){const t=Number(e||0);return Number.isFinite(t)?t.toFixed(t%1===0?0:1).replace(/\.0$/,""):"0"}function Pe(e){const t=le(e),s=String(e?.payment_address||"").trim();return!t&&!s?"":`<div class="transfer-qr-card transfer-qr-card--centered">
    <strong>${n("funding.scan_qr","Scan QR code")}</strong>
    <small>${n("funding.scan_qr_copy","Scan with your wallet or banking app, then use the wallet address below if you prefer to copy it manually.")}</small>
    ${t?`<img src="${c(t)}" alt="Payment QR">`:""}
    ${s?`<div class="transfer-qr-address">
      <span>${n("funding.wallet_address","Wallet address")}</span>
      <code>${l(s)}</code>
      <button type="button" data-copy-address="${c(s)}">${n("funding.copy_address","Copy address")}</button>
    </div>`:""}
  </div>`}function le(e){const t=String(e?.payment_qr_url||"").trim();if(t)return t;const s=String(e?.payment_address||"").trim();return s?`https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(s)}`:""}function Re(e){if(W(e))return"";const t=String(e?.payment_address||"").trim(),s=je(e?.fields||{});return t||s.length?"":`<div class="funding-method-warning">${f.lock}<div><strong>${n("funding.route_unavailable","Funding route unavailable")}</strong><small>${n("funding.choose_another_method","Choose another method or try again shortly.")}</small></div></div>`}function je(e){const t=[];return Array.isArray(e)?e.forEach(s=>{if(!s)return;const a=s.label||s.name||s.key||"",r=s.value||s.default||s.text||"";a&&r&&t.push({label:a,value:r})}):e&&typeof e=="object"&&Object.entries(e).forEach(([s,a])=>{if(!(a==null||a===""))if(typeof a=="object"){const r=a.label||a.name||s,i=a.value||a.text||a.default||"";i&&t.push({label:r,value:i})}else t.push({label:ot(s),value:a})}),t}function Ue(e){return Array.isArray(e)?e.filter(Boolean).map(t=>(t.value||t.default||t.text)&&!t.collect?null:t).filter(Boolean):!e||typeof e!="object"?[]:Object.entries(e).map(([t,s])=>s&&typeof s=="object"?(s.value||s.default||s.text)&&!s.collect?null:{name:t,...s}:null).filter(Boolean)}async function Be(e,t,s){if(e.preventDefault(),t.__fundingSubmitting)return;const a=e.target,r=t.querySelector("#form-status"),i=t.querySelector("#funding-submit"),o=new FormData(a),d=fe(t),u=s==="deposit",h=Number(o.get("amount")||0),A=String(o.get("notes")||"").trim(),b=d?W(d):!1;try{if(x("mode")!=="real")return y(r,n("funding.switch_real_before_submit","Switch to Real before submitting live funding requests."),"error");if(!d)return y(r,n("funding.select_active_method_first","Select an active payment method first."),"error");const _=me(d,h);if(_)return y(r,_,"error");const $=a.querySelector('input[name="proof"]')?.files?.[0]||null;if(u&&!b&&d.proof_required&&!$)return y(r,n("funding.upload_proof_before_confirm","Upload transfer proof before confirming."),"error");const g=Xe(t),S=g.destination||g.wallet_address||g.bank_account||g.iban||g.address||A;if(!u&&!String(S||"").trim())return y(r,n("funding.enter_payout_destination","Enter payout destination details."),"error");t.__fundingSubmitting=!0,i&&(i.disabled=!0,i.dataset.originalText=i.dataset.originalText||i.textContent||"",i.textContent=u?b?n("funding.opening_checkout","Opening checkout..."):n("funding.confirming","Confirming..."):n("funding.submitting","Submitting...")),y(r,b?n("funding.opening_secure_checkout","Opening secure checkout..."):u?n("funding.sending_transfer_confirmation","Sending transfer confirmation..."):n("funding.sending_payout_request","Sending payout request..."),"info");const K=d.code||d.method||d.id||"",z=d.currency||"USDT",ve=t.__fundingCategory||q(d),V=t.querySelector("[data-deposit-deadline]")?.dataset.depositDeadline||"",Q={notes:A,category:ve,method_title:d.title||d.name||d.code||"",client_deadline_at:V?Math.floor(Number(V)/1e3):null,proof_attached:!!$,fields:g},we=b?"/deposits/stripe_checkout.php":u?"/deposits/create.php":"/withdrawals/create.php",$e=u?{provider:d.provider||"",method:K,currency:z,amount:h,details:Q}:{method:K,currency:z,amount:h,destination:S,details:{...Q,destination:S}},v=await se(we,$e,{timeout:b?18e3:14e3,headers:{"Idempotency-Key":at(u?"dep":"wd")}});if(!v||v.ok===!1)return y(r,v?.error||n("common.request_failed","Request failed"),"error");if(b&&v.checkout_url){y(r,n("funding.redirecting_checkout","Redirecting to checkout..."),"success"),window.location.assign(v.checkout_url);return}if(u&&$){const O=v.deposit?.id||v.id||v.deposit_id||null;if(O){const F=new FormData;F.append("deposit_id",String(O)),F.append("proof",$),await Ce("/deposits/upload_proof.php",F,{timeout:18e3})}}y(r,u?n("funding.transfer_confirmation_received","Transfer confirmation received. Your deposit is now being processed."):n("funding.withdrawal_request_received","Withdrawal request received. You can track it from history."),"success"),Je(t,u,h,d),E.delete(u?"/deposits/list.php":"/withdrawals/list.php")}catch(_){y(r,_.message||n("common.request_failed","Request failed"),"error")}finally{t.__fundingSubmitting=!1,i&&(i.disabled=!1,i.textContent=i.dataset.originalText||(u?n("funding.confirm_transfer","Confirm transfer"):n("funding.submit_withdraw","Submit withdrawal request")))}}async function We(e){if(!e.querySelector("#funding-history-all"))return;const s=await Promise.allSettled([P("/deposits/list.php",{timeout:8e3,retry:1},2e4),P("/withdrawals/list.php",{timeout:8e3,retry:1},2e4)]);e.__fundingHistoryItems=[...s[0].status==="fulfilled"?(s[0].value?.items||[]).map(a=>te(a,"deposit")):[],...s[1].status==="fulfilled"?(s[1].value?.items||[]).map(a=>te(a,"withdraw")):[]].sort((a,r)=>r.sortTime-a.sortTime).slice(0,80),ue(e)}function ue(e){const t=e.querySelector("#funding-history-all");if(!t)return;const s=e.__fundingHistoryFilter||"all";e.querySelectorAll("[data-history-filter]").forEach(r=>r.classList.toggle("active",r.dataset.historyFilter===s));const a=(e.__fundingHistoryItems||[]).filter(r=>Ve(r,s));if(!a.length){t.innerHTML=`<div class="empty-state empty-state--compact">${n("funding.no_matching_history","No matching funding history yet.")}</div>`;return}t.innerHTML=`
    <div class="ledger-mobile-list md:hidden">${a.map(Ke).join("")}</div>
    <div class="hidden md:block overflow-x-auto">
      <table class="funding-history-table">
        <thead><tr><th>${n("funding.type","Type")}</th><th>${n("funding.method","Method")}</th><th>${n("deposit.amount","Amount")}</th><th>${n("kyc.status","Status")}</th><th>${n("funding.date","Date")}</th></tr></thead>
        <tbody>${a.map(ze).join("")}</tbody>
      </table>
    </div>`}function te(e,t){const s=Number(e.amount||0),a=e.created_at||e.updated_at||"",r=t==="ledger"?"posted":String(e.status||"pending").toLowerCase(),i=e.reference||e.ref||e.ref_id||e.txid||e.tx_hash||e.transaction_id||e.id||"",o=e.note||e.notes||e.memo||e.description||"";return{kind:t,amount:s,currency:e.currency||"USDT",status:r,method:it(t==="ledger"?e.type||e.ref_type||"ledger":e.method_label||e.provider||e.method_code||e.method||"manual"),created:a,reference:String(i||""),note:String(o||""),sortTime:_e(a)}}function Ke(e){const t=e.kind==="deposit"||e.kind==="ledger"&&e.amount>=0,s=[[n("funding.method","Method"),e.method],[n("funding.date","Date"),U(e.created)],[n("kyc.status","Status"),j(e.status)],e.reference?[n("funding.reference","Reference"),e.reference]:null,e.note?[n("funding.notes","Notes"),e.note]:null].filter(Boolean);return`<article class="funding-history-card funds-history-card ${t?"is-positive":"is-negative"}" data-funding-history-card>
    <div class="funding-history-main">
      <span class="history-kind ${t?"is-deposit":"is-withdraw"}">${e.kind==="withdraw"?f.withdraw:f.deposit}</span>
      <div><strong>${be(e.kind)}</strong><small>${l(e.method)} - ${l(U(e.created))}</small></div>
      <button type="button" class="funding-history-toggle" data-funding-history-toggle aria-expanded="false" aria-label="${c(n("common.details","Details"))}">${f.chevronDown}</button>
    </div>
    <div class="funds-history-amount"><strong>${t?"+":""}${m(e.amount)} ${l(e.currency)}</strong><span class="${ye(e.status)}">${l(j(e.status))}</span></div>
    <div class="funding-history-details">
      ${s.map(([a,r])=>`<span><small>${l(a)}</small><b>${l(r)}</b></span>`).join("")}
    </div>
  </article>`}function ze(e){const t=e.kind==="deposit"||e.kind==="ledger"&&e.amount>=0;return`<tr>
    <td>${l(be(e.kind))}</td>
    <td>${l(e.method)}</td>
    <td class="${t?"text-buy":"text-sell"}">${t?"+":""}${m(e.amount)} ${l(e.currency)}</td>
    <td><span class="${ye(e.status)}">${l(j(e.status))}</span></td>
    <td>${l(U(e.created))}</td>
  </tr>`}function Ve(e,t){return t==="all"?!0:["deposit","withdraw"].includes(t)?e.kind===t:t==="pending"?["pending","requested","processing","review"].includes(e.status):t==="completed"?["approved","confirmed","completed","paid","posted"].includes(e.status):t==="failed"?["rejected","failed","cancelled","canceled"].includes(e.status):!0}function ce(e){const t=e.__fundingCategory||"";return(e.__fundingMethods||[]).filter(s=>q(s)===t)}function fe(e){const t=ce(e),s=e.__fundingSelectedMethodId||"";return t.find(a=>w(a)===s)||t[0]||null}function w(e){return String(e?.id??e?.code??"")}function q(e){const t=L(e?.category_key||"");if(t)return t;const s=L(e?.method_group||"");if(s)return s;const a=[e?.provider,e?.code,e?.title,e?.name].filter(Boolean).join(" ").toLowerCase();return/stripe|card|visa|master/.test(a)?"card":/bank|wire|iban|swift|ach|fedwire/.test(a)?"bank":/crypto|usdt|btc|eth|trc|erc|bep|wallet|blockchain/.test(a)?"crypto":/bot|telegram/.test(a)?"crypto_bot":"manual"}function p(e){return`${xe}${e}`}function pe(e){const t=String(e||"").trim();if(!t)return"";const s=t.split(/[?#]/)[0].replace(/\\/g,"/").toLowerCase();return s.endsWith("/cat-card.svg")?p("pm-card-logos.svg"):s.endsWith("/cat-bank.svg")?p("pm-bank-transfer.svg"):s.endsWith("/cat-crypto.svg")?p("pm-usdt-networks.svg"):s.endsWith("/card-visa.svg")?p("pm-visa.svg"):s.endsWith("/card-mastercard.svg")?p("pm-mastercard.svg"):s.endsWith("/card-stripe.svg")||s.endsWith("/stripe-card.svg")?p("pm-card-logos.svg"):s.endsWith("/bank-transfer.svg")||s.endsWith("/bank-withdraw.svg")?p("pm-bank-transfer.svg"):s.endsWith("/crypto-withdraw.svg")?p("pm-usdt-networks.svg"):t}function k(e,t="",s="payment-asset-img"){const a=pe(e);return a?`<img class="${c(s)}" src="${c(a)}" alt="${c(t)}" loading="lazy">`:""}function Qe(e){const t=String(e||"").trim();return t?/^data:image\//i.test(t)||/^https?:\/\//i.test(t)||/^\/.+\.(svg|png|jpe?g|webp|gif)([?#].*)?$/i.test(t)||/\.(svg|png|jpe?g|webp|gif)([?#].*)?$/i.test(t):!1}function ge(e){return[e?.provider,e?.code,e?.title,e?.name,e?.method_group,e?.category_key].filter(Boolean).join(" ").toLowerCase()}function Oe(e){const t=ge(e);if(/visa/.test(t))return"pm-visa.svg";if(/mastercard|master/.test(t))return"pm-mastercard.svg";if(/amex|american express/.test(t))return"pm-amex.svg";if(/apple\s*pay/.test(t))return"pm-apple-pay.svg";if(/google\s*pay/.test(t))return"pm-google-pay.svg";if(/withdraw/.test(t)&&/bank|wire|iban|swift/.test(t)||/bank|wire|iban|swift|ach|fedwire/.test(t))return"pm-bank-transfer.svg";if(/stripe/.test(t))return"pm-stripe.svg";if(/card|credit|debit/.test(t))return"pm-card-logos.svg";if(/trc20/.test(t)||/erc20/.test(t))return"pm-usdt-networks.svg";if(/btc|bitcoin/.test(t))return"btc.svg";if(/eth|ethereum/.test(t))return"eth.svg";if(/usdt|tether/.test(t))return"pm-usdt-networks.svg";if(/crypto_bot|bot|telegram/.test(t))return"cat-crypto.svg";if(/crypto|wallet|blockchain/.test(t))return"pm-usdt-networks.svg";const s=q(e);return s==="card"?"pm-card-logos.svg":s==="bank"?"pm-bank-transfer.svg":s==="crypto"?"pm-usdt-networks.svg":""}function Ye(e){const t=e?.title||e?.name||e?.code||n("funding.payment_method","Payment method"),s=pe(e?.image_url);if(s)return k(s,t,"payment-method-logo");const a=Oe(e);return a?k(p(a),t,"payment-method-logo"):R(q(e))}function Ge(e){const t=ge(e);let s=[];return/stripe|card|visa|mastercard|master|amex|credit|debit/.test(t)?s=[{name:"Visa",file:"pm-visa.svg"},{name:"Mastercard",file:"pm-mastercard.svg"},{name:"Stripe",file:"pm-stripe.svg"}]:/bank|wire|iban|swift|ach|fedwire/.test(t)?s=[]:/crypto|wallet|usdt|tether|trc20|erc20|btc|bitcoin|eth|ethereum/.test(t)&&(/trc20/.test(t)?s=[{name:"USDT TRC20",file:"usdt-trc20.svg"}]:/erc20/.test(t)?s=[{name:"USDT ERC20",file:"usdt-erc20.svg"}]:s=[{name:"USDT TRC20",file:"usdt-trc20.svg"},{name:"USDT ERC20",file:"usdt-erc20.svg"}]),s.length?`<span class="method-brand-strip">${s.map(a=>k(p(a.file),a.name,"method-brand-logo")).join("")}</span>`:""}function R(e,t=""){const s=String(t||"").trim();if(Qe(s))return k(s,T(e),"funding-category-logo");const a={card:"pm-card-logos.svg",bank:"pm-bank-transfer.svg",crypto:"pm-usdt-networks.svg",crypto_bot:"pm-usdt-networks.svg",cash:"pm-bank-transfer.svg",manual:"pm-bank-transfer.svg"};return a[e]?k(p(a[e]),T(e),"funding-category-logo"):s?`<b>${l(s)}</b>`:f.wallet}function T(e){return{bank:n("funding.bank_transfer","Bank transfer"),crypto:n("funding.crypto","Crypto"),card:n("funding.card_visa","Card / Visa"),cash:n("funding.cash_desk","Cash desk"),crypto_bot:n("funding.crypto_bot","Crypto bot"),manual:n("funding.manual","Manual")}[e]||D(e||"Manual")}function ne(e){return{bank:n("funding.bank_hint","Wire and bank details"),crypto:n("funding.crypto_hint","Wallet networks and QR"),card:n("funding.card_hint","Stripe hosted checkout"),cash:n("funding.cash_hint","Desk review"),crypto_bot:n("funding.crypto_bot_hint","Automated wallet route"),manual:n("funding.manual_hint","Configured instructions")}[e]||n("funding.configured_route","Configured route")}function W(e){const t=[e?.provider,e?.method_group,e?.category_key,e?.code,e?.title].filter(Boolean).join(" ").toLowerCase();return/stripe|card|visa|master/.test(t)}function me(e,t){if(!Number.isFinite(t)||t<=0)return n("funding.enter_amount_continue","Enter the amount to continue.");const s=Number(e?.min_amount||0),a=Number(e?.max_amount||0);return s>0&&t<s?`${n("funding.minimum_for_method","Minimum for this method is")} ${m(s)} ${e.currency||"USDT"}.`:a>0&&t>a?`${n("funding.maximum_for_method","Maximum for this method is")} ${m(a)} ${e.currency||"USDT"}.`:""}function Xe(e){const t={};return e.querySelectorAll("[data-withdraw-field]").forEach(s=>{t[s.name]=s.value}),t}function Je(e,t,s,a){const r=e.querySelector("#deposit-transfer-panel");!r||!t||(I(e),r.className="deposit-transfer-panel is-success",r.innerHTML=`<div class="funding-success-panel"><span>${f.deposit}</span><strong>${n("funding.transfer_confirmation_sent","Transfer confirmation sent")}</strong><small>${m(s)} ${l(a?.currency||"USDT")} ${n("funding.via","via")} ${l(a?.title||a?.code||n("funding.selected_method","selected method"))} ${n("funding.is_being_processed","is being processed.")}</small></div>`)}function y(e,t,s="info"){e&&(e.textContent=t,e.className=`text-xs text-center funding-form-status is-${s}`)}function Ze(e,t,s){const a=`mex_deposit_deadline_${w(e)}_${Number(t).toFixed(2)}`,r=Date.now();let i=Number(localStorage.getItem(a)||0);return(!i||i<=r)&&(i=r+s*60*60*1e3,localStorage.setItem(a,String(i))),i}function et(e,t){const s=()=>{const a=e.querySelector("#deposit-countdown");if(!a)return;const r=Math.max(0,t-Date.now());a.textContent=dt(r),e.querySelector(".deposit-timer")?.classList.toggle("is-expired",r<=0);const i=e.querySelector("#funding-submit");i&&r<=0&&(i.disabled=!0)};s(),e.__depositTimer=setInterval(s,1e3)}function I(e){e?.__depositTimer&&clearInterval(e.__depositTimer),e&&(e.__depositTimer=null)}function tt(e){return Array.isArray(e)?e.map(t=>t&&typeof t=="object"?{value:String(t.value??t.key??t.label??""),label:String(t.label??t.name??t.value??"")}:{value:String(t),label:String(t)}).filter(t=>t.value!==""):[]}function L(e){return String(e||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")}function nt(e){return L(e)||"destination"}function st(e){navigator.clipboard?.writeText(e.dataset.copyAddress||"").then(()=>{e.textContent=n("common.copied","Copied"),setTimeout(()=>{e.textContent=n("common.copy","Copy")},1200)}).catch(()=>{})}function at(e){const t=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;return`vp-${e}-${t}`}function he(e={}){const t=String(e._path||""),s=String(e.action||e.tab||"").toLowerCase();return re.some(a=>a.key===s)?s:t.includes("withdraw")?"withdraw":(t.includes("deposit"),"deposit")}function ye(e){const t=String(e||"").toLowerCase();return["approved","confirmed","completed","paid","posted"].includes(t)?"badge-green":["pending","requested","processing","review"].includes(t)?"badge-accent":["rejected","failed","cancelled","canceled"].includes(t)?"badge-red":"badge"}function be(e){return e==="withdraw"?n("funding.withdrawal","Withdrawal"):e==="ledger"?n("funding.ledger_entry","Ledger entry"):n("funding.deposit_entry","Deposit")}function rt(e){return{all:n("common.all","All"),deposit:n("funding.deposit","Deposit"),withdraw:n("funding.withdraw","Withdraw"),ledger:n("funding.ledger","Ledger"),pending:n("funding.pending","Pending"),completed:n("funding.completed","Completed"),failed:n("funding.failed","Failed")}[e]||D(e)}function j(e){const t=String(e||"").toLowerCase();return{approved:n("funding.status_approved","Approved"),confirmed:n("funding.status_confirmed","Confirmed"),completed:n("funding.status_completed","Completed"),paid:n("funding.status_paid","Paid"),posted:n("funding.status_posted","Posted"),pending:n("funding.status_pending","Pending"),requested:n("funding.status_requested","Requested"),processing:n("funding.status_processing","Processing"),review:n("funding.status_review","Under review"),rejected:n("funding.status_rejected","Rejected"),failed:n("funding.status_failed","Failed"),cancelled:n("funding.status_cancelled","Cancelled"),canceled:n("funding.status_cancelled","Cancelled"),"not submitted":n("funding.status_not_submitted","Not submitted")}[t]||D(t||"pending")}function it(e){const t=L(e);return{trade_open:n("funding.ledger_trade_open","Trade open"),trade_close:n("funding.ledger_trade_close","Trade close"),trade_pnl:n("funding.ledger_trade_pnl","Trade PnL"),deposit_credit:n("funding.ledger_deposit_credit","Deposit credit"),withdrawal:n("funding.withdrawal","Withdrawal"),withdraw:n("funding.withdrawal","Withdrawal"),invest_payout:n("funding.ledger_invest_payout","Investment payout"),ledger:n("funding.ledger_entry","Ledger entry"),stripe:n("funding.card_visa","Card / Visa"),bank:n("funding.bank_transfer","Bank transfer"),crypto:n("funding.crypto","Crypto"),manual:n("funding.manual","Manual")}[t]||D(e)}function D(e){return String(e||"").replace(/[_-]/g," ").replace(/\b\w/g,t=>t.toUpperCase())}function ot(e){return D(e)}function dt(e){const t=Math.max(0,Math.floor(e/1e3)),s=Math.floor(t/3600),a=Math.floor(t%3600/60),r=t%60;return`${String(s).padStart(2,"0")}:${String(a).padStart(2,"0")}:${String(r).padStart(2,"0")}`}function lt(e){return new Date(Number(e)).toLocaleString("en-US",{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})}function ut(e){const t=Number(e||0);return t>=1024*1024?`${(t/1024/1024).toFixed(1)} MB`:t>=1024?`${Math.round(t/1024)} KB`:`${t} B`}function _e(e){const t=String(e||"").trim(),s=Number(t);if(Number.isFinite(s)&&s>0)return s>1e10?s:s*1e3;const a=Date.parse(t);return Number.isFinite(a)?a:0}function U(e){const t=_e(e);return t?new Date(t).toLocaleString("en-US",{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"}):"--"}export{gt as cleanup,pt as mount,ft as render};
