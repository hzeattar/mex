import{j as x,l as H,u as Y,v as n,k as p,h as c,m as y,g as l,o as se,c as R,s as ve,n as re,x as $e,i as ke}from"./main-EAQdaZsU.js";const P=globalThis.__MEX_FUNDING_CACHE__||(globalThis.__MEX_FUNDING_CACHE__=new Map),Se=45e3,Ce="/assets/img/payment_methods/",xe=[{name:"Google Pay",file:"pm-google-pay.png"},{name:"Apple Pay",file:"pm-apple-pay.png"},{name:"SII",file:"pm-sii.png"},{name:"American Express",file:"pm-amex.png"},{name:"Mastercard",file:"pm-mastercard.png"},{name:"Visa",file:"pm-visa.png"},{name:"USDT",file:"pm-usdt-networks.png"},{name:"Bank transfer",file:"pm-bank-transfer.png"}];let M=[];const ae=[{key:"deposit",label:"funding.deposit",fallback:"Deposit",icon:p.deposit},{key:"withdraw",label:"funding.withdraw",fallback:"Withdraw",icon:p.withdraw},{key:"history",label:"funding.history",fallback:"History",icon:p.wallet}];function ut(e={}){const t=ge(e),s=x("wallet")||{},r=x("mode")==="real"?"real":"demo",i=!H(),a=t!=="history"&&(r!=="real"||i),o=r==="real"?s.real||{}:s.demo||{};return`
    <div class="funds-workspace animate-fade-in" data-active-funding-tab="${c(t)}">
      <section class="funds-hero-pro">
        <div>
          <span class="badge-accent">${n("funding.assets_desk","Assets desk")}</span>
          <h1>${n("nav.wallet","Funds")}</h1>
          <p>${n("funding.hero_copy","Deposit, withdraw and audit wallet movements from one fast workspace powered by admin payment categories.")}</p>
        </div>
        <div class="funds-balance-pro">
          <span>${r==="real"?n("balance.available","Available balance"):n("funding.demo_balance","Demo balance")}</span>
          <strong>${y(o.available||o.balance||0)}</strong>
          <small>${l(o.currency||(r==="real"?"USDT":"USDT_DEMO"))}</small>
        </div>
      </section>

      ${t==="deposit"?`<section class="funding-promo-banner" data-promo-banner>
        <span class="promo-coin-float">${p.coin}</span>
        <div class="promo-banner-content">
          <span class="promo-badge"><b>+10%</b> ${n("funding.bonus","Bonus")}</span>
          <span class="promo-text">${n("funding.bonus_crypto","Get 10% bonus on every crypto deposit")}</span>
        </div>
        <button type="button" data-dismiss-promo aria-label="Dismiss">${p.close}</button>
      </section>`:""}

      <section class="funds-tabs-pro" role="tablist" aria-label="Funding workspace tabs">
        ${ae.map(d=>`
          <button type="button" class="${d.key===t?"active":""}" data-funding-tab="${d.key}" role="tab" aria-selected="${d.key===t?"true":"false"}">
            <span>${d.icon||""}</span>${l(n(d.label,d.fallback))}
          </button>
        `).join("")}
      </section>

      ${a?`<section class="funding-mode-warning">
        <span class="gate-icon">${p.lock}</span>
        <div>
          <strong>${r!=="real"?n("funding.real_required","Real account required"):n("earn.kyc_required","KYC approval required")}</strong>
          <small>${n("funding.real_only_copy","Deposits and withdrawals are available for verified real accounts only.")}</small>
        </div>
        <button type="button" class="btn-primary btn-sm" data-switch-real>${n("earn.switch_real","Switch to Real")}</button>
      </section>`:""}

      ${t==="history"?De():a?Te(G(t)):G(t)}
    </div>`}function ct(e,t={}){const s=ge(t);qe(e,t);const r=o=>{const d=o.target.closest("[data-funding-tab]");if(d){o.preventDefault(),re("wallet",{action:d.dataset.fundingTab||"deposit"});return}if(o.target.closest("[data-switch-real]")){o.preventDefault(),$e("funding");return}if((x("mode")!=="real"||!H())&&s!=="history"&&o.target.closest("[data-funding-category], [data-method], [data-quick-amount], [data-copy-address], #funding-form, .funding-locked-shell")){o.preventDefault(),Y({body:n("gate.funding_body","Deposits and withdrawals are available for verified real accounts only.")});return}const u=o.target.closest("[data-funding-category]");if(u){e.__fundingCategory=u.dataset.fundingCategory||"",e.__fundingSelectedMethodId="",ie(e),oe(e),S(e);return}const m=o.target.closest("[data-method]");if(m){e.__fundingSelectedMethodId=m.dataset.method||"",S(e);return}if(o.target.closest("[data-dismiss-promo]")){o.preventDefault();const g=e.querySelector("[data-promo-banner]");g&&(g.style.display="none");return}const _=o.target.closest("[data-history-filter]");if(_){e.__fundingHistoryFilter=_.dataset.historyFilter||"all",le(e);return}const b=o.target.closest("[data-funding-history-toggle]");if(b){const g=b.closest("[data-funding-history-card]");if(g){const k=!g.classList.contains("is-expanded");g.classList.toggle("is-expanded",k),b.setAttribute("aria-expanded",k?"true":"false")}return}const $=o.target.closest("[data-copy-address]");if($){tt($);return}};e.addEventListener("click",r),M.push(()=>e.removeEventListener("click",r));const i=o=>{o.target.matches('input[name="amount"], [data-withdraw-field]')&&S(e)};e.addEventListener("input",i),M.push(()=>e.removeEventListener("input",i));const a=o=>{const d=o.target.closest('input[name="proof"]');if(!d)return;const u=e.querySelector("#proof-file-name"),m=d.files?.[0];u&&(u.textContent=m?`${m.name} - ${dt(m.size||0)}`:n("funding.upload_file_hint","Image or PDF up to 8MB"))};if(e.addEventListener("change",a),M.push(()=>e.removeEventListener("change",a)),e.querySelectorAll("[data-quick-amount]").forEach(o=>{o.addEventListener("click",()=>{const d=e.querySelector('input[name="amount"]');d&&(d.value=o.dataset.quickAmount||""),S(e)})}),s==="history"){Be(e);return}Le(e,s),e.querySelector("#funding-form")?.addEventListener("submit",o=>{if(x("mode")!=="real"||!H()){o.preventDefault(),Y({body:n("gate.funding_body","Deposits and withdrawals are available for verified real accounts only.")});return}We(o,e,s)})}function Te(e){return`<section class="funding-locked-shell blur-gate blur-active">
    <div class="blur-gate-content">${e}</div>
    <div class="blur-gate-overlay">
      <button type="button" class="gate-card funding-lock-card" data-switch-real>
        <span class="gate-icon">${p.lock}</span>
        <strong>${n("funding.real_only","Real account only")}</strong>
        <p>${n("funding.real_only_copy","Deposits and withdrawals are available for verified real accounts only.")}</p>
        <span class="btn-primary btn-sm">${n("earn.switch_real","Switch to Real")}</span>
      </button>
    </div>
  </section>`}function qe(e,t){const s=t&&t.stripe;if(!s)return;try{window.history.replaceState(null,"",window.location.pathname+"#/wallet")}catch{}const r=document.createElement("div");if(r.className="stripe-return-banner",e.prepend(r),s!=="success"){r.classList.add("is-cancel"),r.innerHTML=`<div><strong>${n("funding.payment_canceled","Card payment was canceled.")}</strong><small>${n("funding.payment_canceled_copy","You can start a new deposit whenever you are ready.")}</small></div>`;return}const i=Number(t.deposit||0);r.classList.add("is-pending"),r.innerHTML=`<span class="stripe-return-spin"></span><div><strong>${n("funding.verifying_payment","Verifying card payment...")}</strong></div>`,(async()=>{let a="";if(i>0)for(let o=0;o<4;o++){try{const d=await se("/deposits/stripe_sync.php",{deposit_id:i},{timeout:15e3});if(a=String(d?.status||""),a==="confirmed"||a==="failed")break}catch{}await new Promise(d=>setTimeout(d,2500))}if(a==="confirmed"){r.className="stripe-return-banner is-success",r.innerHTML=`<div><strong>${n("funding.deposit_confirmed","Payment confirmed. Funds credited to your wallet.")}</strong></div>`;try{const o=await R("/bootstrap.php");o&&o.wallet&&ve("wallet",o.wallet)}catch{}re("wallet",{action:"history"})}else a==="failed"?(r.className="stripe-return-banner is-cancel",r.innerHTML=`<div><strong>${n("funding.deposit_failed","Payment was not completed.")}</strong></div>`):(r.className="stripe-return-banner",r.innerHTML=`<div><strong>${n("funding.payment_processing","Payment is processing. Your balance will update shortly.")}</strong></div>`)})()}function pt(){document.querySelectorAll(".funds-workspace").forEach(e=>I(e)),M.forEach(e=>{try{e()}catch{}}),M=[]}function Me(){return`
    <div class="payment-logos-strip">
      <div class="payment-logos-row">
        ${xe.map(e=>`<span class="payment-logo" title="${c(e.name)}">${L(f(e.file),e.name,"payment-logo-img")}</span>`).join("")}
      </div>
      <p class="payment-logos-caption">${n("funding.payment_methods_secure","We support all payment methods securely and quickly")}</p>
    </div>`}function G(e){const t=e==="deposit";return`
    <section class="funding-flow-shell">
      ${Me()}
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
            ${[100,250,500,1e3,2500].map(s=>`<button type="button" class="quick-amount-chip" data-quick-amount="${s}">${y(s,0)}</button>`).join("")}
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
    </section>`}function De(){return`
    <section class="card funding-history-workspace">
      <div class="panel-headline-row">
        <div>
          <span class="badge-accent">${n("funding.history","History")}</span>
          <h2>${n("funding.history_title","Funding history")}</h2>
        </div>
        <div class="history-filter-rail">
          ${["all","deposit","withdraw","pending","completed","failed"].map((e,t)=>`
            <button type="button" class="${t===0?"active":""}" data-history-filter="${e}">${l(st(e))}</button>
          `).join("")}
        </div>
      </div>
      <div id="funding-history-all" class="funding-history-stack">
        <p class="text-muted text-sm text-center py-10">${n("funding.loading_history","Loading funding history...")}</p>
      </div>
    </section>`}async function E(e,t={},s=Se){const r=e,i=Date.now(),a=P.get(r);if(a&&i-a.time<s)return a.data;const o=await R(e,t);return P.set(r,{time:i,data:o}),o}async function Le(e,t){try{const s=x("mode")==="real"?"real":"both",r=await E(`/payment_methods/list.php?kind=${encodeURIComponent(t)}&scope=${s}&currency=*`,{timeout:9e3,retry:1},9e4),i=r?.items||[],a=Ie(r?.categories||[],i);e.__fundingKind=t,e.__fundingMethods=i,e.__fundingCategories=a,e.__fundingCategory=a[0]?.key||"",e.__fundingSelectedMethodId="",e.__fundingBonuses={},t==="deposit"&&await Promise.all(a.map(async o=>{try{const d=await R(`/wallet/bonuses.php?method_key=${encodeURIComponent(o.key)}`,{timeout:4e3});d?.ok&&d.bonus&&(e.__fundingBonuses[o.key]=d.bonus)}catch{}})),ie(e),oe(e),S(e)}catch{const r=e.querySelector("#funding-categories"),i=e.querySelector("#method-cards");r&&(r.innerHTML=`<div class="empty-state empty-state--compact">${n("funding.sections_unavailable","Payment sections are temporarily unavailable.")}</div>`),i&&(i.innerHTML="")}}function Ie(e,t){const s=new Set(t.map(T).filter(Boolean)),r=[];e.forEach(a=>{const o=D(a.key||a.key_slug||a.label);!o||!s.has(o)||r.push({key:o,label:a.label||C(o),hint:a.hint||ne(o),icon:a.image_url?L(a.image_url,a.label||C(o),"funding-category-logo"):j(o,a.icon)})}),s.forEach(a=>{r.some(o=>o.key===a)||r.push({key:a,label:C(a),hint:ne(a),icon:j(a)})});const i={card:1,bank:2,crypto:3,crypto_bot:4,manual:99};return r.sort((a,o)=>(i[a.key]||99)-(i[o.key]||99)),r}function ie(e){const t=e.querySelector("#funding-categories"),s=e.__fundingCategories||[],r=e.__fundingCategory||s[0]?.key||"";if(t){if(!s.length){t.innerHTML=`<div class="empty-state empty-state--compact">${n("funding.no_sections","No active funding sections are configured by admin.")}</div>`;return}t.innerHTML=s.map(i=>{const a=(e.__fundingKind||"")==="deposit",o=a?e.__fundingBonuses?.[i.key]:null,d=a?o||(i.key==="crypto"?{amount:10}:null):null,u=d?`
      <span class="bonus-card"><span>${n("funding.bonus","Bonus")}</span><b>+${Fe(d.amount||0)}%</b></span>
    `:"";return`
    <button type="button" class="${i.key===r?"active":""}" data-funding-category="${c(i.key)}">
      <i>${i.icon||p.wallet}</i>
      <strong>${l(i.label)}</strong>
      ${u}
    </button>`}).join("")}}function oe(e){const t=e.querySelector("#method-cards"),s=ue(e);if(e.__fundingKind||e.querySelector("#funding-form")?.dataset.kind,!!t){if(I(e),!s.length){t.innerHTML=`<div class="empty-state empty-state--compact">${n("funding.no_methods_section","No active methods under this section.")}</div>`,e.__fundingSelectedMethodId="",S(e);return}s.some(r=>v(r)===e.__fundingSelectedMethodId)||(e.__fundingSelectedMethodId=v(s[0])),t.innerHTML=s.map(r=>{const i=v(r);return`<button type="button" class="method-card ${i===e.__fundingSelectedMethodId?"active":""}" data-method="${c(i)}">
      <span class="method-card-top">
        <span class="method-icon">${Qe(r)}</span>
      </span>
      <strong>${l(r.title||r.name||r.code||n("funding.method","Method"))}</strong>
    
    </button>`}).join("")}}function S(e){const s=(e.__fundingKind||e.querySelector("#funding-form")?.dataset.kind||"deposit")==="deposit",r=ce(e),i=Number(e.querySelector('input[name="amount"]')?.value||0),a=e.querySelector("#funding-submit"),o=r?U(r):!1,d=e.querySelector('input[name="currency"]');if(d&&(d.value=r?.currency||"USDT"),e.querySelectorAll(".method-card").forEach(u=>u.classList.toggle("active",u.dataset.method===v(r||{}))),a&&r&&(a.disabled=!1,a.textContent=o?r.checkout_label||n("funding.continue_card_checkout","Continue to secure card checkout"):s?n("funding.confirm_transfer","Confirm transfer"):n("funding.submit_withdraw","Submit withdrawal request")),!r){X(e,null,i,!1,n("funding.choose_method_first","Choose an active method first.")),Z(e,null,!1),ee(e,null);return}s?(X(e,r,i,o,fe(r,i)),Z(e,r,o)):ee(e,r)}function X(e,t,s,r,i){const a=e.querySelector("#deposit-transfer-panel");if(!a)return;if(I(e),!t){a.className="deposit-transfer-panel is-muted",a.innerHTML=de(n("funding.choose_method","Choose a method"),n("funding.choose_method_copy","Select a funding method to display transfer instructions, QR code and destination details."));return}if(r){a.className="deposit-transfer-panel is-ready",a.innerHTML=`
      <div class="deposit-transfer-ready">
        <div class="deposit-transfer-title">
          <span>${p.wallet}</span>
          <div><strong>${n("funding.ready_card_checkout","Ready for card checkout")}</strong><small>${n("funding.ready_card_checkout_copy","Enter the amount and continue to Stripe Checkout. No receipt upload is required.")}</small></div>
        </div>
        ${J(t,!0)}
        <div class="secure-checkout-strip">
          <i>${p.wallet}</i>
          <div>
            <strong>${n("funding.secure_stripe","Secure Stripe Checkout")}</strong>
            <small>${n("funding.secure_stripe_copy","Card details are collected by Stripe. You return to MEX after payment confirmation.")}</small>
          </div>
        </div>
      </div>`;return}const o=!i&&s>0,d=Math.max(1,Number(t.expires_hours||24)),u=o?Xe(t,s,d):0;a.className=`deposit-transfer-panel is-ready${o?"":" is-preview"}`,a.innerHTML=`
    <div class="deposit-transfer-ready">
      <div class="deposit-transfer-title">
        <span>${p.deposit}</span>
        <div>
          <strong>${o?`${n("funding.transfer","Transfer")} ${y(s)} ${l(t.currency||"USDT")}`:l(t.title||t.name||t.code||n("funding.payment_method","Payment method"))}</strong>
          <small>${o?n("funding.use_exact_details","Use only the details shown here before the timer ends."):n("funding.scan_then_amount","Scan the QR or copy the destination first, then enter the exact amount below.")}</small>
        </div>
      </div>
      ${J(t,!1)}
      ${o?`<div class="deposit-timer" data-deposit-deadline="${u}">
        <div><span>${n("funding.payment_window","Payment window")}</span><strong id="deposit-countdown">--:--:--</strong></div>
        <small>${n("funding.expires","Expires")} ${ot(u)}</small>
      </div>`:""}
      ${Ne(t)}
      ${t.instructions?`<div class="transfer-instruction-card">
        <strong>${n("funding.transfer_instructions","Transfer instructions")}</strong>
        <p>${l(t.instructions)}</p>
      </div>`:""}
      ${Pe(t)}
    </div>`,o&&Je(e,u)}function J(e,t=!1){const s=e.max_amount?y(e.max_amount):n("funding.flexible","Flexible");return`<div class="funding-route-summary" aria-label="Selected funding route summary">
    ${N(n("funding.section","Section"),C(T(e)))}
    ${N(n("funding.currency","Currency"),e.currency||"USDT")}
    ${N(n("funding.limits","Limits"),`${y(e.min_amount||0)} - ${s}`)}
  </div>`}function N(e,t){return`<span class="funding-route-pill"><small>${l(e)}</small><b>${l(t)}</b></span>`}function Z(e,t,s){const r=e.querySelector("#deposit-proof-slot");if(!r)return;if(!t){r.dataset.methodId="",r.dataset.isStripe="",r.innerHTML="";return}const i=v(t),a=s?"1":"0";if(!(r.dataset.methodId===i&&r.dataset.isStripe===a&&r.innerHTML.trim()!=="")){if(r.dataset.methodId=i,r.dataset.isStripe=a,s){r.innerHTML=`<div class="deposit-proof-note">
      <span>${p.wallet}</span>
      <div><strong>${n("funding.no_receipt_needed","No receipt upload needed")}</strong><small>${n("funding.card_checkout_copy","Card payments continue through Stripe Checkout.")}</small></div>
    </div>`;return}r.innerHTML=`<label class="deposit-file-drop">
    <input type="file" name="proof" accept="image/*,.pdf">
    <span>${p.deposit}</span>
    <div><strong>${t.proof_required?n("funding.upload_transfer_proof","Upload transfer proof"):n("funding.upload_receipt_optional","Upload receipt if available")}</strong><small id="proof-file-name">${n("funding.upload_file_hint","Image or PDF up to 8MB")}</small></div>
  </label>`}}function ee(e,t){const s=e.querySelector("#withdraw-fields-panel");if(!s)return;if(!t){s.dataset.methodId="",s.innerHTML=`<p class="text-muted text-sm">${n("funding.select_withdraw_method_first","Select a withdrawal method first.")}</p>`;return}const r=v(t);if(s.dataset.methodId===r&&s.querySelector("[data-withdraw-field]"))return;s.dataset.methodId=r;const i=je(t.fields||[]);if(!i.length){s.innerHTML=`<label class="block">
      <span class="field-label">${n("funding.payout_destination","Payout destination")}</span>
      <textarea name="destination" data-withdraw-field class="input mt-1" rows="3" placeholder="${c(n("funding.payout_destination_placeholder","Wallet address, bank reference, IBAN, or payout details..."))}" required></textarea>
    </label>`;return}s.innerHTML=`<div class="withdraw-fields-grid">${i.map(Ae).join("")}</div>`}function Ae(e){const t=et(e.name||e.key||e.id||e.label||"destination"),s=e.label||e.title||q(t),r=e.placeholder||e.hint||"",i=e.required||e.is_required?"required":"",a=String(e.type||"text").toLowerCase(),o=Ze(e.options||e.values||[]);if(a==="textarea")return`<label class="block sm:col-span-2"><span class="field-label">${l(s)}</span><textarea name="${c(t)}" data-withdraw-field class="input mt-1" rows="3" placeholder="${c(r)}" ${i}></textarea></label>`;if(a==="select"&&o.length)return`<label class="block"><span class="field-label">${l(s)}</span><select name="${c(t)}" data-withdraw-field class="input mt-1" ${i}>${o.map(u=>`<option value="${c(u.value)}">${l(u.label)}</option>`).join("")}</select></label>`;const d=["email","number","tel","url"].includes(a)?a:"text";return`<label class="block"><span class="field-label">${l(s)}</span><input type="${d}" name="${c(t)}" data-withdraw-field class="input mt-1" placeholder="${c(r)}" ${i}></label>`}function de(e,t){return`<div class="deposit-transfer-empty"><span>${p.deposit}</span><strong>${l(e)}</strong><small>${l(t)}</small></div>`}function Fe(e){const t=Number(e||0);return Number.isFinite(t)?t.toFixed(t%1===0?0:1).replace(/\.0$/,""):"0"}function Ne(e){const t=He(e),s=String(e?.payment_address||"").trim();return!t&&!s?"":`<div class="transfer-qr-card transfer-qr-card--centered">
    <strong>${n("funding.scan_qr","Scan QR code")}</strong>
    <small>${n("funding.scan_qr_copy","Scan with your wallet or banking app, then use the wallet address below if you prefer to copy it manually.")}</small>
    ${t?`<img src="${c(t)}" alt="Payment QR">`:""}
    ${s?`<div class="transfer-qr-address">
      <span>${n("funding.wallet_address","Wallet address")}</span>
      <code>${l(s)}</code>
      <button type="button" data-copy-address="${c(s)}">${n("funding.copy_address","Copy address")}</button>
    </div>`:""}
  </div>`}function He(e){const t=String(e?.payment_qr_url||"").trim();if(t)return t;const s=String(e?.payment_address||"").trim();return s?`https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(s)}`:""}function Pe(e){if(U(e))return"";const t=String(e?.payment_address||"").trim(),s=Ee(e?.fields||{});return t||s.length?"":`<div class="funding-method-warning">${p.lock}<div><strong>${n("funding.route_unavailable","Funding route unavailable")}</strong><small>${n("funding.choose_another_method","Choose another method or try again shortly.")}</small></div></div>`}function Ee(e){const t=[];return Array.isArray(e)?e.forEach(s=>{if(!s)return;const r=s.label||s.name||s.key||"",i=s.value||s.default||s.text||"";r&&i&&t.push({label:r,value:i})}):e&&typeof e=="object"&&Object.entries(e).forEach(([s,r])=>{if(!(r==null||r===""))if(typeof r=="object"){const i=r.label||r.name||s,a=r.value||r.text||r.default||"";a&&t.push({label:i,value:a})}else t.push({label:at(s),value:r})}),t}function je(e){return Array.isArray(e)?e.filter(Boolean).map(t=>(t.value||t.default||t.text)&&!t.collect?null:t).filter(Boolean):!e||typeof e!="object"?[]:Object.entries(e).map(([t,s])=>s&&typeof s=="object"?(s.value||s.default||s.text)&&!s.collect?null:{name:t,...s}:null).filter(Boolean)}async function We(e,t,s){if(e.preventDefault(),t.__fundingSubmitting)return;const r=e.target,i=t.querySelector("#form-status"),a=t.querySelector("#funding-submit"),o=new FormData(r),d=ce(t),u=s==="deposit",m=Number(o.get("amount")||0),A=String(o.get("notes")||"").trim(),_=d?U(d):!1;try{if(x("mode")!=="real")return h(i,n("funding.switch_real_before_submit","Switch to Real before submitting live funding requests."),"error");if(!d)return h(i,n("funding.select_active_method_first","Select an active payment method first."),"error");const b=fe(d,m);if(b)return h(i,b,"error");const $=r.querySelector('input[name="proof"]')?.files?.[0]||null;if(u&&!_&&d.proof_required&&!$)return h(i,n("funding.upload_proof_before_confirm","Upload transfer proof before confirming."),"error");const g=Ye(t),k=g.destination||g.wallet_address||g.bank_account||g.iban||g.address||A;if(!u&&!String(k||"").trim())return h(i,n("funding.enter_payout_destination","Enter payout destination details."),"error");t.__fundingSubmitting=!0,a&&(a.disabled=!0,a.dataset.originalText=a.dataset.originalText||a.textContent||"",a.textContent=u?_?n("funding.opening_checkout","Opening checkout..."):n("funding.confirming","Confirming..."):n("funding.submitting","Submitting...")),h(i,_?n("funding.opening_secure_checkout","Opening secure checkout..."):u?n("funding.sending_transfer_confirmation","Sending transfer confirmation..."):n("funding.sending_payout_request","Sending payout request..."),"info");const K=d.code||d.method||d.id||"",z=d.currency||"USDT",_e=t.__fundingCategory||T(d),V=t.querySelector("[data-deposit-deadline]")?.dataset.depositDeadline||"",O={notes:A,category:_e,method_title:d.title||d.name||d.code||"",client_deadline_at:V?Math.floor(Number(V)/1e3):null,proof_attached:!!$,fields:g},be=_?"/deposits/stripe_checkout.php":u?"/deposits/create.php":"/withdrawals/create.php",we=u?{provider:d.provider||"",method:K,currency:z,amount:m,details:O}:{method:K,currency:z,amount:m,destination:k,details:{...O,destination:k}},w=await se(be,we,{timeout:_?18e3:14e3,headers:{"Idempotency-Key":nt(u?"dep":"wd")}});if(!w||w.ok===!1)return h(i,w?.error||n("common.request_failed","Request failed"),"error");if(_&&w.checkout_url){h(i,n("funding.redirecting_checkout","Redirecting to checkout..."),"success"),window.location.assign(w.checkout_url);return}if(u&&$){const Q=w.deposit?.id||w.id||w.deposit_id||null;if(Q){const F=new FormData;F.append("deposit_id",String(Q)),F.append("proof",$),await ke("/deposits/upload_proof.php",F,{timeout:18e3})}}h(i,u?n("funding.transfer_confirmation_received","Transfer confirmation received. Your deposit is now being processed."):n("funding.withdrawal_request_received","Withdrawal request received. You can track it from history."),"success"),Ge(t,u,m,d),P.delete(u?"/deposits/list.php":"/withdrawals/list.php")}catch(b){h(i,b.message||n("common.request_failed","Request failed"),"error")}finally{t.__fundingSubmitting=!1,a&&(a.disabled=!1,a.textContent=a.dataset.originalText||(u?n("funding.confirm_transfer","Confirm transfer"):n("funding.submit_withdraw","Submit withdrawal request")))}}async function Be(e){if(!e.querySelector("#funding-history-all"))return;const s=await Promise.allSettled([E("/deposits/list.php",{timeout:8e3,retry:1},2e4),E("/withdrawals/list.php",{timeout:8e3,retry:1},2e4)]);e.__fundingHistoryItems=[...s[0].status==="fulfilled"?(s[0].value?.items||[]).map(r=>te(r,"deposit")):[],...s[1].status==="fulfilled"?(s[1].value?.items||[]).map(r=>te(r,"withdraw")):[]].sort((r,i)=>i.sortTime-r.sortTime).slice(0,80),le(e)}function le(e){const t=e.querySelector("#funding-history-all");if(!t)return;const s=e.__fundingHistoryFilter||"all";e.querySelectorAll("[data-history-filter]").forEach(i=>i.classList.toggle("active",i.dataset.historyFilter===s));const r=(e.__fundingHistoryItems||[]).filter(i=>Ke(i,s));if(!r.length){t.innerHTML=`<div class="empty-state empty-state--compact">${n("funding.no_matching_history","No matching funding history yet.")}</div>`;return}t.innerHTML=`
    <div class="ledger-mobile-list md:hidden">${r.map(Re).join("")}</div>
    <div class="hidden md:block overflow-x-auto">
      <table class="funding-history-table">
        <thead><tr><th>${n("funding.type","Type")}</th><th>${n("funding.method","Method")}</th><th>${n("deposit.amount","Amount")}</th><th>${n("kyc.status","Status")}</th><th>${n("funding.date","Date")}</th></tr></thead>
        <tbody>${r.map(Ue).join("")}</tbody>
      </table>
    </div>`}function te(e,t){const s=Number(e.amount||0),r=e.created_at||e.updated_at||"",i=t==="ledger"?"posted":String(e.status||"pending").toLowerCase(),a=e.reference||e.ref||e.ref_id||e.txid||e.tx_hash||e.transaction_id||e.id||"",o=e.note||e.notes||e.memo||e.description||"";return{kind:t,amount:s,currency:e.currency||"USDT",status:i,method:rt(t==="ledger"?e.type||e.ref_type||"ledger":e.method_label||e.provider||e.method_code||e.method||"manual"),created:r,reference:String(a||""),note:String(o||""),sortTime:ye(r)}}function Re(e){const t=e.kind==="deposit"||e.kind==="ledger"&&e.amount>=0,s=[[n("funding.method","Method"),e.method],[n("funding.date","Date"),B(e.created)],[n("kyc.status","Status"),W(e.status)],e.reference?[n("funding.reference","Reference"),e.reference]:null,e.note?[n("funding.notes","Notes"),e.note]:null].filter(Boolean);return`<article class="funding-history-card funds-history-card ${t?"is-positive":"is-negative"}" data-funding-history-card>
    <div class="funding-history-main">
      <span class="history-kind ${t?"is-deposit":"is-withdraw"}">${e.kind==="withdraw"?p.withdraw:p.deposit}</span>
      <div><strong>${he(e.kind)}</strong><small>${l(e.method)} - ${l(B(e.created))}</small></div>
      <button type="button" class="funding-history-toggle" data-funding-history-toggle aria-expanded="false" aria-label="${c(n("common.details","Details"))}">${p.chevronDown}</button>
    </div>
    <div class="funds-history-amount"><strong>${t?"+":""}${y(e.amount)} ${l(e.currency)}</strong><span class="${me(e.status)}">${l(W(e.status))}</span></div>
    <div class="funding-history-details">
      ${s.map(([r,i])=>`<span><small>${l(r)}</small><b>${l(i)}</b></span>`).join("")}
    </div>
  </article>`}function Ue(e){const t=e.kind==="deposit"||e.kind==="ledger"&&e.amount>=0;return`<tr>
    <td>${l(he(e.kind))}</td>
    <td>${l(e.method)}</td>
    <td class="${t?"text-buy":"text-sell"}">${t?"+":""}${y(e.amount)} ${l(e.currency)}</td>
    <td><span class="${me(e.status)}">${l(W(e.status))}</span></td>
    <td>${l(B(e.created))}</td>
  </tr>`}function Ke(e,t){return t==="all"?!0:["deposit","withdraw"].includes(t)?e.kind===t:t==="pending"?["pending","requested","processing","review"].includes(e.status):t==="completed"?["approved","confirmed","completed","paid","posted"].includes(e.status):t==="failed"?["rejected","failed","cancelled","canceled"].includes(e.status):!0}function ue(e){const t=e.__fundingCategory||"";return(e.__fundingMethods||[]).filter(s=>T(s)===t)}function ce(e){const t=ue(e),s=e.__fundingSelectedMethodId||"";return t.find(r=>v(r)===s)||t[0]||null}function v(e){return String(e?.id??e?.code??"")}function T(e){const t=D(e?.category_key||"");if(t)return t;const s=D(e?.method_group||"");if(s)return s;const r=[e?.provider,e?.code,e?.title,e?.name].filter(Boolean).join(" ").toLowerCase();return/stripe|card|visa|master/.test(r)?"card":/bank|wire|iban|swift|ach|fedwire/.test(r)?"bank":/crypto|usdt|btc|eth|trc|erc|bep|wallet|blockchain/.test(r)?"crypto":/bot|telegram/.test(r)?"crypto_bot":"manual"}function f(e){return`${Ce}${e}`}function pe(e){const t=String(e||"").trim();if(!t)return"";const s=t.split(/[?#]/)[0].replace(/\\/g,"/").toLowerCase();return s.endsWith("/cat-card.svg")?f("pm-card-logos.png"):s.endsWith("/cat-bank.svg")?f("pm-bank-transfer.png"):s.endsWith("/cat-crypto.svg")?f("pm-usdt-networks.png"):s.endsWith("/card-visa.svg")?f("pm-visa.png"):s.endsWith("/card-mastercard.svg")?f("pm-mastercard.png"):s.endsWith("/card-stripe.svg")||s.endsWith("/stripe-card.svg")?f("pm-card-logos.png"):s.endsWith("/bank-transfer.svg")||s.endsWith("/bank-withdraw.svg")?f("pm-bank-transfer.png"):s.endsWith("/crypto-withdraw.svg")?f("pm-usdt-networks.png"):s.endsWith("/btc.svg")||s.endsWith("/eth.svg")?f("pm-usdt.png"):s.endsWith("/usdt-erc20.svg")?f("pm-usdt-erc20.png"):s.endsWith("/usdt-trc20.svg")?f("pm-usdt-networks.png"):t}function L(e,t="",s="payment-asset-img"){const r=pe(e);return r?`<img class="${c(s)}" src="${c(r)}" alt="${c(t)}" loading="lazy">`:""}function ze(e){const t=String(e||"").trim();return t?/^data:image\//i.test(t)||/^https?:\/\//i.test(t)||/^\/.+\.(svg|png|jpe?g|webp|gif)([?#].*)?$/i.test(t)||/\.(svg|png|jpe?g|webp|gif)([?#].*)?$/i.test(t):!1}function Ve(e){return[e?.provider,e?.code,e?.title,e?.name,e?.method_group,e?.category_key].filter(Boolean).join(" ").toLowerCase()}function Oe(e){const t=Ve(e);if(/visa/.test(t))return"pm-visa.png";if(/mastercard|master/.test(t))return"pm-mastercard.png";if(/amex|american express/.test(t))return"pm-amex.png";if(/apple\s*pay/.test(t))return"pm-apple-pay.png";if(/google\s*pay/.test(t))return"pm-google-pay.png";if(/withdraw/.test(t)&&/bank|wire|iban|swift/.test(t)||/bank|wire|iban|swift|ach|fedwire/.test(t))return"pm-bank-transfer.png";if(/stripe/.test(t)||/card|credit|debit/.test(t))return"pm-card-logos.png";if(/trc20/.test(t))return"pm-usdt-networks.png";if(/erc20/.test(t))return"pm-usdt-erc20.png";if(/btc|bitcoin/.test(t)||/eth|ethereum/.test(t))return"pm-usdt.png";if(/usdt|tether/.test(t)||/crypto_bot|bot|telegram/.test(t)||/crypto|wallet|blockchain/.test(t))return"pm-usdt-networks.png";const s=T(e);return s==="card"?"pm-card-logos.png":s==="bank"?"pm-bank-transfer.png":s==="crypto"?"pm-usdt-networks.png":""}function Qe(e){const t=e?.title||e?.name||e?.code||n("funding.payment_method","Payment method"),s=pe(e?.image_url);if(s)return`<img src="${c(s)}" alt="${c(t)}" style="height:28px;object-fit:contain;">`;const r=Oe(e);return r?`<img src="${c(f(r))}" alt="${c(t)}" style="height:28px;object-fit:contain;">`:j(T(e))}function j(e,t=""){const s=String(t||"").trim();if(ze(s))return L(s,C(e),"funding-category-logo");const r={card:"pm-card-logos.png",bank:"pm-bank-transfer.png",crypto:"pm-usdt-networks.png",crypto_bot:"pm-usdt-networks.png",cash:"pm-bank-transfer.png",manual:"pm-bank-transfer.png"};return r[e]?L(f(r[e]),C(e),"funding-category-logo"):s?`<b>${l(s)}</b>`:p.wallet}function C(e){return{bank:n("funding.bank_transfer","Bank transfer"),crypto:n("funding.crypto","Crypto"),card:n("funding.card_visa","Card / Visa"),cash:n("funding.cash_desk","Cash desk"),crypto_bot:n("funding.crypto_bot","Crypto bot"),manual:n("funding.manual","Manual")}[e]||q(e||"Manual")}function ne(e){return{bank:n("funding.bank_hint","Wire and bank details"),crypto:n("funding.crypto_hint","Wallet networks and QR"),card:n("funding.card_hint","Stripe hosted checkout"),cash:n("funding.cash_hint","Desk review"),crypto_bot:n("funding.crypto_bot_hint","Automated wallet route"),manual:n("funding.manual_hint","Configured instructions")}[e]||n("funding.configured_route","Configured route")}function U(e){const t=[e?.provider,e?.method_group,e?.category_key,e?.code,e?.title].filter(Boolean).join(" ").toLowerCase();return/stripe|card|visa|master/.test(t)}function fe(e,t){if(!Number.isFinite(t)||t<=0)return n("funding.enter_amount_continue","Enter the amount to continue.");const s=Number(e?.min_amount||0),r=Number(e?.max_amount||0);return s>0&&t<s?`${n("funding.minimum_for_method","Minimum for this method is")} ${y(s)} ${e.currency||"USDT"}.`:r>0&&t>r?`${n("funding.maximum_for_method","Maximum for this method is")} ${y(r)} ${e.currency||"USDT"}.`:""}function Ye(e){const t={};return e.querySelectorAll("[data-withdraw-field]").forEach(s=>{t[s.name]=s.value}),t}function Ge(e,t,s,r){const i=e.querySelector("#deposit-transfer-panel");!i||!t||(I(e),i.className="deposit-transfer-panel is-success",i.innerHTML=`<div class="funding-success-panel"><span>${p.deposit}</span><strong>${n("funding.transfer_confirmation_sent","Transfer confirmation sent")}</strong><small>${y(s)} ${l(r?.currency||"USDT")} ${n("funding.via","via")} ${l(r?.title||r?.code||n("funding.selected_method","selected method"))} ${n("funding.is_being_processed","is being processed.")}</small></div>`)}function h(e,t,s="info"){e&&(e.textContent=t,e.className=`text-xs text-center funding-form-status is-${s}`)}function Xe(e,t,s){const r=`mex_deposit_deadline_${v(e)}_${Number(t).toFixed(2)}`,i=Date.now();let a=Number(localStorage.getItem(r)||0);return(!a||a<=i)&&(a=i+s*60*60*1e3,localStorage.setItem(r,String(a))),a}function Je(e,t){const s=()=>{const r=e.querySelector("#deposit-countdown");if(!r)return;const i=Math.max(0,t-Date.now());r.textContent=it(i),e.querySelector(".deposit-timer")?.classList.toggle("is-expired",i<=0);const a=e.querySelector("#funding-submit");a&&i<=0&&(a.disabled=!0)};s(),e.__depositTimer=setInterval(s,1e3)}function I(e){e?.__depositTimer&&clearInterval(e.__depositTimer),e&&(e.__depositTimer=null)}function Ze(e){return Array.isArray(e)?e.map(t=>t&&typeof t=="object"?{value:String(t.value??t.key??t.label??""),label:String(t.label??t.name??t.value??"")}:{value:String(t),label:String(t)}).filter(t=>t.value!==""):[]}function D(e){return String(e||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")}function et(e){return D(e)||"destination"}function tt(e){navigator.clipboard?.writeText(e.dataset.copyAddress||"").then(()=>{e.textContent=n("common.copied","Copied"),setTimeout(()=>{e.textContent=n("common.copy","Copy")},1200)}).catch(()=>{})}function nt(e){const t=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;return`vp-${e}-${t}`}function ge(e={}){const t=String(e._path||""),s=String(e.action||e.tab||"").toLowerCase();return ae.some(r=>r.key===s)?s:t.includes("withdraw")?"withdraw":(t.includes("deposit"),"deposit")}function me(e){const t=String(e||"").toLowerCase();return["approved","confirmed","completed","paid","posted"].includes(t)?"badge-green":["pending","requested","processing","review"].includes(t)?"badge-accent":["rejected","failed","cancelled","canceled"].includes(t)?"badge-red":"badge"}function he(e){return e==="withdraw"?n("funding.withdrawal","Withdrawal"):e==="ledger"?n("funding.ledger_entry","Ledger entry"):n("funding.deposit_entry","Deposit")}function st(e){return{all:n("common.all","All"),deposit:n("funding.deposit","Deposit"),withdraw:n("funding.withdraw","Withdraw"),ledger:n("funding.ledger","Ledger"),pending:n("funding.pending","Pending"),completed:n("funding.completed","Completed"),failed:n("funding.failed","Failed")}[e]||q(e)}function W(e){const t=String(e||"").toLowerCase();return{approved:n("funding.status_approved","Approved"),confirmed:n("funding.status_confirmed","Confirmed"),completed:n("funding.status_completed","Completed"),paid:n("funding.status_paid","Paid"),posted:n("funding.status_posted","Posted"),pending:n("funding.status_pending","Pending"),requested:n("funding.status_requested","Requested"),processing:n("funding.status_processing","Processing"),review:n("funding.status_review","Under review"),rejected:n("funding.status_rejected","Rejected"),failed:n("funding.status_failed","Failed"),cancelled:n("funding.status_cancelled","Cancelled"),canceled:n("funding.status_cancelled","Cancelled"),"not submitted":n("funding.status_not_submitted","Not submitted")}[t]||q(t||"pending")}function rt(e){const t=D(e);return{trade_open:n("funding.ledger_trade_open","Trade open"),trade_close:n("funding.ledger_trade_close","Trade close"),trade_pnl:n("funding.ledger_trade_pnl","Trade PnL"),deposit_credit:n("funding.ledger_deposit_credit","Deposit credit"),withdrawal:n("funding.withdrawal","Withdrawal"),withdraw:n("funding.withdrawal","Withdrawal"),invest_payout:n("funding.ledger_invest_payout","Investment payout"),ledger:n("funding.ledger_entry","Ledger entry"),stripe:n("funding.card_visa","Card / Visa"),bank:n("funding.bank_transfer","Bank transfer"),crypto:n("funding.crypto","Crypto"),manual:n("funding.manual","Manual")}[t]||q(e)}function q(e){return String(e||"").replace(/[_-]/g," ").replace(/\b\w/g,t=>t.toUpperCase())}function at(e){return q(e)}function it(e){const t=Math.max(0,Math.floor(e/1e3)),s=Math.floor(t/3600),r=Math.floor(t%3600/60),i=t%60;return`${String(s).padStart(2,"0")}:${String(r).padStart(2,"0")}:${String(i).padStart(2,"0")}`}function ot(e){return new Date(Number(e)).toLocaleString("en-US",{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})}function dt(e){const t=Number(e||0);return t>=1024*1024?`${(t/1024/1024).toFixed(1)} MB`:t>=1024?`${Math.round(t/1024)} KB`:`${t} B`}function ye(e){const t=String(e||"").trim(),s=Number(t);if(Number.isFinite(s)&&s>0)return s>1e10?s:s*1e3;const r=Date.parse(t);return Number.isFinite(r)?r:0}function B(e){const t=ye(e);return t?new Date(t).toLocaleString("en-US",{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"}):"--"}export{pt as cleanup,ct as mount,ut as render};
