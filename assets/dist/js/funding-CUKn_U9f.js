import{j as S,k as f,h as u,t as n,m as g,g as l,l as X,c as J,s as Z,n as ee,i as _e}from"./main-Ds-sCeOB.js";const A=globalThis.__MEX_FUNDING_CACHE__||(globalThis.__MEX_FUNDING_CACHE__=new Map),be=45e3;let C=[];const te=[{key:"deposit",label:"funding.deposit",fallback:"Deposit",icon:f.deposit},{key:"withdraw",label:"funding.withdraw",fallback:"Withdraw",icon:f.withdraw},{key:"history",label:"funding.history",fallback:"History",icon:f.wallet}];function Xe(e={}){const t=ue(e),r=S("wallet")||{};S("kyc");const i=S("level")||{},s=S("mode")==="real"?"real":"demo",a=s==="real"?r.real||{}:r.demo||{};return i.current,`
    <div class="funds-workspace animate-fade-in" data-active-funding-tab="${u(t)}">
      <section class="funds-hero-pro">
        <div>
          <span class="badge-accent">${n("funding.assets_desk","Assets desk")}</span>
          <h1>${n("nav.wallet","Funds")}</h1>
          <p>${n("funding.hero_copy","Deposit, withdraw and audit wallet movements from one fast workspace powered by admin payment categories.")}</p>
        </div>
        <div class="funds-balance-pro">
          <span>${s==="real"?n("balance.available","Available balance"):n("funding.demo_balance","Demo balance")}</span>
          <strong>${g(a.available||a.balance||0)}</strong>
          <small>${l(a.currency||(s==="real"?"USDT":"USDT_DEMO"))}</small>
        </div>
      </section>

      <section class="funding-promo-banner" data-promo-banner>
        <div class="promo-banner-content">
          <span class="promo-badge">+10%</span>
          <span class="promo-text">${n("funding.bonus_crypto","Get 10% bonus on every crypto deposit")}</span>
          <button type="button" data-dismiss-promo aria-label="Dismiss">${f.close}</button>
        </div>
      </section>

      <section class="funds-tabs-pro" role="tablist" aria-label="Funding workspace tabs">
        ${te.map(o=>`
          <button type="button" class="${o.key===t?"active":""}" data-funding-tab="${o.key}" role="tab" aria-selected="${o.key===t?"true":"false"}">
            <span>${o.icon||""}</span>${l(n(o.label,o.fallback))}
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

      ${t==="history"?$e():ve(t)}
    </div>`}function Je(e,t={}){const r=ue(t);we(e,t);const i=o=>{const d=o.target.closest("[data-funding-tab]");if(d){o.preventDefault(),ee("wallet",{action:d.dataset.fundingTab||"deposit"});return}const c=o.target.closest("[data-funding-category]");if(c){e.__fundingCategory=c.dataset.fundingCategory||"",e.__fundingSelectedMethodId="",ne(e),ie(e),k(e);return}const h=o.target.closest("[data-method]");if(h){e.__fundingSelectedMethodId=h.dataset.method||"",k(e);return}if(o.target.closest("[data-dismiss-promo]")){o.preventDefault();const p=e.querySelector("[data-promo-banner]");p&&(p.style.display="none");return}const y=o.target.closest("[data-history-filter]");if(y){e.__fundingHistoryFilter=y.dataset.historyFilter||"all",oe(e);return}const _=o.target.closest("[data-funding-history-toggle]");if(_){const p=_.closest("[data-funding-history-card]");if(p){const $=!p.classList.contains("is-expanded");p.classList.toggle("is-expanded",$),_.setAttribute("aria-expanded",$?"true":"false")}return}const v=o.target.closest("[data-copy-address]");if(v){Pe(v);return}o.target.closest("[data-switch-real]")&&(localStorage.setItem("vp_mode","real"),Z("mode","real"),location.reload())};e.addEventListener("click",i),C.push(()=>e.removeEventListener("click",i));const s=o=>{o.target.matches('input[name="amount"], [data-withdraw-field]')&&k(e)};e.addEventListener("input",s),C.push(()=>e.removeEventListener("input",s));const a=o=>{const d=o.target.closest('input[name="proof"]');if(!d)return;const c=e.querySelector("#proof-file-name"),h=d.files?.[0];c&&(c.textContent=h?`${h.name} - ${Ye(h.size||0)}`:n("funding.upload_file_hint","Image or PDF up to 8MB"))};if(e.addEventListener("change",a),C.push(()=>e.removeEventListener("change",a)),e.querySelectorAll("[data-quick-amount]").forEach(o=>{o.addEventListener("click",()=>{const d=e.querySelector('input[name="amount"]');d&&(d.value=o.dataset.quickAmount||""),k(e)})}),r==="history"){De(e);return}Se(e,r),e.querySelector("#funding-form")?.addEventListener("submit",o=>Le(o,e,r))}function we(e,t){const r=t&&t.stripe;if(!r)return;try{window.history.replaceState(null,"",window.location.pathname+"#/wallet")}catch{}const i=document.createElement("div");if(i.className="stripe-return-banner",e.prepend(i),r!=="success"){i.classList.add("is-cancel"),i.innerHTML=`<div><strong>${n("funding.payment_canceled","Card payment was canceled.")}</strong><small>${n("funding.payment_canceled_copy","You can start a new deposit whenever you are ready.")}</small></div>`;return}const s=Number(t.deposit||0);i.classList.add("is-pending"),i.innerHTML=`<span class="stripe-return-spin"></span><div><strong>${n("funding.verifying_payment","Verifying card payment...")}</strong></div>`,(async()=>{let a="";if(s>0)for(let o=0;o<4;o++){try{const d=await X("/deposits/stripe_sync.php",{deposit_id:s},{timeout:15e3});if(a=String(d?.status||""),a==="confirmed"||a==="failed")break}catch{}await new Promise(d=>setTimeout(d,2500))}if(a==="confirmed"){i.className="stripe-return-banner is-success",i.innerHTML=`<div><strong>${n("funding.deposit_confirmed","Payment confirmed. Funds credited to your wallet.")}</strong></div>`;try{const o=await J("/bootstrap.php");o&&o.wallet&&Z("wallet",o.wallet)}catch{}ee("wallet",{action:"history"})}else a==="failed"?(i.className="stripe-return-banner is-cancel",i.innerHTML=`<div><strong>${n("funding.deposit_failed","Payment was not completed.")}</strong></div>`):(i.className="stripe-return-banner",i.innerHTML=`<div><strong>${n("funding.payment_processing","Payment is processing. Your balance will update shortly.")}</strong></div>`)})()}function Ze(){document.querySelectorAll(".funds-workspace").forEach(e=>L(e)),C.forEach(e=>{try{e()}catch{}}),C=[]}function ve(e){const t=e==="deposit";return`
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
            ${re(n("funding.transfer_details_waiting","Transfer details will appear here"),n("funding.transfer_details_waiting_copy","Choose a method to unlock account details, QR code, wallet address and bank fields."))}
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
            ${[100,250,500,1e3,2500].map(r=>`<button type="button" class="quick-amount-chip" data-quick-amount="${r}">${g(r,0)}</button>`).join("")}
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
    </section>`}function $e(){return`
    <section class="card funding-history-workspace">
      <div class="panel-headline-row">
        <div>
          <span class="badge-accent">${n("funding.history","History")}</span>
          <h2>${n("funding.history_title","Funding history")}</h2>
        </div>
        <div class="history-filter-rail">
          ${["all","deposit","withdraw","pending","completed","failed"].map((e,t)=>`
            <button type="button" class="${t===0?"active":""}" data-history-filter="${e}">${l(Ve(e))}</button>
          `).join("")}
        </div>
      </div>
      <div id="funding-history-all" class="funding-history-stack">
        <p class="text-muted text-sm text-center py-10">${n("funding.loading_history","Loading funding history...")}</p>
      </div>
    </section>`}async function I(e,t={},r=be){const i=e,s=Date.now(),a=A.get(i);if(a&&s-a.time<r)return a.data;const o=await J(e,t);return A.set(i,{time:s,data:o}),o}async function Se(e,t){try{const r=S("mode")==="real"?"real":"both",i=await I(`/payment_methods/list.php?kind=${encodeURIComponent(t)}&scope=${r}&currency=*`,{timeout:9e3,retry:1},9e4),s=i?.items||[],a=ke(i?.categories||[],s);e.__fundingKind=t,e.__fundingMethods=s,e.__fundingCategories=a,e.__fundingCategory=a[0]?.key||"",e.__fundingSelectedMethodId="",ne(e),ie(e),k(e)}catch{const i=e.querySelector("#funding-categories"),s=e.querySelector("#method-cards");i&&(i.innerHTML=`<div class="empty-state empty-state--compact">${n("funding.sections_unavailable","Payment sections are temporarily unavailable.")}</div>`),s&&(s.innerHTML="")}}function ke(e,t){const r=new Set(t.map(x).filter(Boolean)),i=[];e.forEach(a=>{const o=q(a.key||a.key_slug||a.label);!o||!r.has(o)||i.push({key:o,label:a.label||T(o),hint:a.hint||G(o),icon:a.image_url?`<img src="${u(a.image_url)}" alt="">`:N(o,a.icon)})}),r.forEach(a=>{i.some(o=>o.key===a)||i.push({key:a,label:T(a),hint:G(a),icon:N(a)})});const s={card:1,bank:2,crypto:3,crypto_bot:4,manual:99};return i.sort((a,o)=>(s[a.key]||99)-(s[o.key]||99)),i}function ne(e){const t=e.querySelector("#funding-categories"),r=e.__fundingCategories||[],i=e.__fundingCategory||r[0]?.key||"";if(t){if(!r.length){t.innerHTML=`<div class="empty-state empty-state--compact">${n("funding.no_sections","No active funding sections are configured by admin.")}</div>`;return}t.innerHTML=r.map(s=>`
    <button type="button" class="${s.key===i?"active":""}" data-funding-category="${u(s.key)}">
      <i>${s.icon||f.wallet}</i>
      <strong>${l(s.label)}</strong>
      <small>${l(s.hint||"")}</small>
    </button>
  `).join("")}}function ie(e){const t=e.querySelector("#method-cards"),r=de(e);if(t){if(L(e),!r.length){t.innerHTML=`<div class="empty-state empty-state--compact">${n("funding.no_methods_section","No active methods under this section.")}</div>`,e.__fundingSelectedMethodId="",k(e);return}r.some(i=>w(i)===e.__fundingSelectedMethodId)||(e.__fundingSelectedMethodId=w(r[0])),t.innerHTML=r.map(i=>{const s=w(i);return`<button type="button" class="method-card ${s===e.__fundingSelectedMethodId?"active":""}" data-method="${u(s)}">
      <span class="method-icon">${Ie(i)}</span>
      <strong>${l(i.title||i.name||i.code||n("funding.method","Method"))}</strong>
      <small>${l([T(x(i)),i.currency].filter(Boolean).join(" - "))}</small>
      <span class="method-card-badges">${Me(i)}</span>
      <em>${g(i.min_amount||0)}${i.max_amount?` - ${g(i.max_amount)}`:"+"}</em>
    </button>`}).join("")}}function k(e){const r=(e.__fundingKind||e.querySelector("#funding-form")?.dataset.kind||"deposit")==="deposit",i=le(e),s=Number(e.querySelector('input[name="amount"]')?.value||0),a=e.querySelector("#funding-submit"),o=i?E(i):!1,d=e.querySelector('input[name="currency"]');if(d&&(d.value=i?.currency||"USDT"),e.querySelectorAll(".method-card").forEach(c=>c.classList.toggle("active",c.dataset.method===w(i||{}))),a&&i&&(a.disabled=!1,a.textContent=o?i.checkout_label||n("funding.continue_card_checkout","Continue to secure card checkout"):r?n("funding.confirm_transfer","Confirm transfer"):n("funding.submit_withdraw","Submit withdrawal request")),!i){W(e,null,s,!1,n("funding.choose_method_first","Choose an active method first.")),K(e,null,!1),O(e,null);return}r?(W(e,i,s,o,ce(i,s)),K(e,i,o)):O(e,i)}function W(e,t,r,i,s){const a=e.querySelector("#deposit-transfer-panel");if(!a)return;if(L(e),!t){a.className="deposit-transfer-panel is-muted",a.innerHTML=re(n("funding.choose_method","Choose a method"),n("funding.choose_method_copy","Select a funding method to display transfer instructions, QR code and destination details."));return}if(i){a.className="deposit-transfer-panel is-ready",a.innerHTML=`
      <div class="deposit-transfer-ready">
        <div class="deposit-transfer-title">
          <span>${f.wallet}</span>
          <div><strong>${n("funding.ready_card_checkout","Ready for card checkout")}</strong><small>${n("funding.ready_card_checkout_copy","Enter the amount and continue to Stripe Checkout. No receipt upload is required.")}</small></div>
        </div>
        ${Q(t,!0)}
        <div class="secure-checkout-strip">
          <i>${f.wallet}</i>
          <div>
            <strong>${n("funding.secure_stripe","Secure Stripe Checkout")}</strong>
            <small>${n("funding.secure_stripe_copy","Card details are collected by Stripe. You return to MEX after payment confirmation.")}</small>
          </div>
        </div>
      </div>`;return}const o=!s&&r>0,d=Math.max(1,Number(t.expires_hours||24)),c=o?Be(t,r,d):0;a.className=`deposit-transfer-panel is-ready${o?"":" is-preview"}`,a.innerHTML=`
    <div class="deposit-transfer-ready">
      <div class="deposit-transfer-title">
        <span>${f.deposit}</span>
        <div>
          <strong>${o?`${n("funding.transfer","Transfer")} ${g(r)} ${l(t.currency||"USDT")}`:l(t.title||t.name||t.code||n("funding.payment_method","Payment method"))}</strong>
          <small>${o?n("funding.use_exact_details","Use only the details shown here before the timer ends."):n("funding.scan_then_amount","Scan the QR or copy the destination first, then enter the exact amount below.")}</small>
        </div>
      </div>
      ${Q(t,!1)}
      ${o?`<div class="deposit-timer" data-deposit-deadline="${c}">
        <div><span>${n("funding.payment_window","Payment window")}</span><strong id="deposit-countdown">--:--:--</strong></div>
        <small>${n("funding.expires","Expires")} ${Oe(c)}</small>
      </div>`:""}
      ${Ce(t)}
      ${t.instructions?`<div class="transfer-instruction-card">
        <strong>${n("funding.transfer_instructions","Transfer instructions")}</strong>
        <p>${l(t.instructions)}</p>
      </div>`:""}
      ${qe(t)}
    </div>`,o&&Ee(e,c)}function Q(e,t=!1){const r=e.max_amount?g(e.max_amount):n("funding.flexible","Flexible");return`<div class="funding-route-summary" aria-label="Selected funding route summary">
    ${F(n("funding.section","Section"),T(x(e)))}
    ${F(n("funding.currency","Currency"),e.currency||"USDT")}
    ${F(n("funding.limits","Limits"),`${g(e.min_amount||0)} - ${r}`)}
  </div>`}function F(e,t){return`<span class="funding-route-pill"><small>${l(e)}</small><b>${l(t)}</b></span>`}function K(e,t,r){const i=e.querySelector("#deposit-proof-slot");if(!i)return;if(!t){i.dataset.methodId="",i.dataset.isStripe="",i.innerHTML="";return}const s=w(t),a=r?"1":"0";if(!(i.dataset.methodId===s&&i.dataset.isStripe===a&&i.innerHTML.trim()!=="")){if(i.dataset.methodId=s,i.dataset.isStripe=a,r){i.innerHTML=`<div class="deposit-proof-note">
      <span>${f.wallet}</span>
      <div><strong>${n("funding.no_receipt_needed","No receipt upload needed")}</strong><small>${n("funding.card_checkout_copy","Card payments continue through Stripe Checkout.")}</small></div>
    </div>`;return}i.innerHTML=`<label class="deposit-file-drop">
    <input type="file" name="proof" accept="image/*,.pdf">
    <span>${f.deposit}</span>
    <div><strong>${t.proof_required?n("funding.upload_transfer_proof","Upload transfer proof"):n("funding.upload_receipt_optional","Upload receipt if available")}</strong><small id="proof-file-name">${n("funding.upload_file_hint","Image or PDF up to 8MB")}</small></div>
  </label>`}}function O(e,t){const r=e.querySelector("#withdraw-fields-panel");if(!r)return;if(!t){r.dataset.methodId="",r.innerHTML=`<p class="text-muted text-sm">${n("funding.select_withdraw_method_first","Select a withdrawal method first.")}</p>`;return}const i=w(t);if(r.dataset.methodId===i&&r.querySelector("[data-withdraw-field]"))return;r.dataset.methodId=i;const s=Te(t.fields||[]);if(!s.length){r.innerHTML=`<label class="block">
      <span class="field-label">${n("funding.payout_destination","Payout destination")}</span>
      <textarea name="destination" data-withdraw-field class="input mt-1" rows="3" placeholder="${u(n("funding.payout_destination_placeholder","Wallet address, bank reference, IBAN, or payout details..."))}" required></textarea>
    </label>`;return}r.innerHTML=`<div class="withdraw-fields-grid">${s.map(xe).join("")}</div>`}function xe(e){const t=Ue(e.name||e.key||e.id||e.label||"destination"),r=e.label||e.title||M(t),i=e.placeholder||e.hint||"",s=e.required||e.is_required?"required":"",a=String(e.type||"text").toLowerCase(),o=je(e.options||e.values||[]);if(a==="textarea")return`<label class="block sm:col-span-2"><span class="field-label">${l(r)}</span><textarea name="${u(t)}" data-withdraw-field class="input mt-1" rows="3" placeholder="${u(i)}" ${s}></textarea></label>`;if(a==="select"&&o.length)return`<label class="block"><span class="field-label">${l(r)}</span><select name="${u(t)}" data-withdraw-field class="input mt-1" ${s}>${o.map(c=>`<option value="${u(c.value)}">${l(c.label)}</option>`).join("")}</select></label>`;const d=["email","number","tel","url"].includes(a)?a:"text";return`<label class="block"><span class="field-label">${l(r)}</span><input type="${d}" name="${u(t)}" data-withdraw-field class="input mt-1" placeholder="${u(i)}" ${s}></label>`}function re(e,t){return`<div class="deposit-transfer-empty"><span>${f.deposit}</span><strong>${l(e)}</strong><small>${l(t)}</small></div>`}function Me(e){const t=[];return String(e?.image_url||"").trim()&&t.push(n("funding.badge_logo","Logo")),se(e)&&t.push(n("funding.badge_qr","QR")),(String(e?.payment_address||"").trim()||ae(e?.fields||{}).length)&&t.push(n("funding.badge_details","Details")),e?.proof_required&&t.push(n("funding.badge_receipt","Receipt")),t.length||t.push(n("funding.needs_setup","Needs setup")),t.slice(0,4).map(r=>`<b>${l(r)}</b>`).join("")}function Ce(e){const t=se(e),r=String(e?.payment_address||"").trim();return!t&&!r?"":`<div class="transfer-qr-card transfer-qr-card--centered">
    <strong>${n("funding.scan_qr","Scan QR code")}</strong>
    <small>${n("funding.scan_qr_copy","Scan with your wallet or banking app, then use the wallet address below if you prefer to copy it manually.")}</small>
    ${t?`<img src="${u(t)}" alt="Payment QR">`:""}
    ${r?`<div class="transfer-qr-address">
      <span>${n("funding.wallet_address","Wallet address")}</span>
      <code>${l(r)}</code>
      <button type="button" data-copy-address="${u(r)}">${n("funding.copy_address","Copy address")}</button>
    </div>`:""}
  </div>`}function se(e){const t=String(e?.payment_qr_url||"").trim();if(t)return t;const r=String(e?.payment_address||"").trim();return r?`https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(r)}`:""}function qe(e){if(E(e))return"";const t=String(e?.payment_address||"").trim(),r=ae(e?.fields||{});return t||r.length?"":`<div class="funding-method-warning">${f.lock}<div><strong>${n("funding.route_unavailable","Funding route unavailable")}</strong><small>${n("funding.choose_another_method","Choose another method or try again shortly.")}</small></div></div>`}function ae(e){const t=[];return Array.isArray(e)?e.forEach(r=>{if(!r)return;const i=r.label||r.name||r.key||"",s=r.value||r.default||r.text||"";i&&s&&t.push({label:i,value:s})}):e&&typeof e=="object"&&Object.entries(e).forEach(([r,i])=>{if(!(i==null||i===""))if(typeof i=="object"){const s=i.label||i.name||r,a=i.value||i.text||i.default||"";a&&t.push({label:s,value:a})}else t.push({label:Qe(r),value:i})}),t}function Te(e){return Array.isArray(e)?e.filter(Boolean).map(t=>(t.value||t.default||t.text)&&!t.collect?null:t).filter(Boolean):!e||typeof e!="object"?[]:Object.entries(e).map(([t,r])=>r&&typeof r=="object"?(r.value||r.default||r.text)&&!r.collect?null:{name:t,...r}:null).filter(Boolean)}async function Le(e,t,r){if(e.preventDefault(),t.__fundingSubmitting)return;const i=e.target,s=t.querySelector("#form-status"),a=t.querySelector("#funding-submit"),o=new FormData(i),d=le(t),c=r==="deposit",h=Number(o.get("amount")||0),D=String(o.get("notes")||"").trim(),y=d?E(d):!1;try{if(S("mode")!=="real")return m(s,n("funding.switch_real_before_submit","Switch to Real before submitting live funding requests."),"error");if(!d)return m(s,n("funding.select_active_method_first","Select an active payment method first."),"error");const _=ce(d,h);if(_)return m(s,_,"error");const v=i.querySelector('input[name="proof"]')?.files?.[0]||null;if(c&&!y&&d.proof_required&&!v)return m(s,n("funding.upload_proof_before_confirm","Upload transfer proof before confirming."),"error");const p=Ne(t),$=p.destination||p.wallet_address||p.bank_account||p.iban||p.address||D;if(!c&&!String($||"").trim())return m(s,n("funding.enter_payout_destination","Enter payout destination details."),"error");t.__fundingSubmitting=!0,a&&(a.disabled=!0,a.dataset.originalText=a.dataset.originalText||a.textContent||"",a.textContent=c?y?n("funding.opening_checkout","Opening checkout..."):n("funding.confirming","Confirming..."):n("funding.submitting","Submitting...")),m(s,y?n("funding.opening_secure_checkout","Opening secure checkout..."):c?n("funding.sending_transfer_confirmation","Sending transfer confirmation..."):n("funding.sending_payout_request","Sending payout request..."),"info");const j=d.code||d.method||d.id||"",U=d.currency||"USDT",he=t.__fundingCategory||x(d),P=t.querySelector("[data-deposit-deadline]")?.dataset.depositDeadline||"",R={notes:D,category:he,method_title:d.title||d.name||d.code||"",client_deadline_at:P?Math.floor(Number(P)/1e3):null,proof_attached:!!v,fields:p},me=y?"/deposits/stripe_checkout.php":c?"/deposits/create.php":"/withdrawals/create.php",ye=c?{provider:d.provider||"",method:j,currency:U,amount:h,details:R}:{method:j,currency:U,amount:h,destination:$,details:{...R,destination:$}},b=await X(me,ye,{timeout:y?18e3:14e3,headers:{"Idempotency-Key":Re(c?"dep":"wd")}});if(!b||b.ok===!1)return m(s,b?.error||n("common.request_failed","Request failed"),"error");if(y&&b.checkout_url){m(s,n("funding.redirecting_checkout","Redirecting to checkout..."),"success"),window.location.assign(b.checkout_url);return}if(c&&v){const V=b.deposit?.id||b.id||b.deposit_id||null;if(V){const H=new FormData;H.append("deposit_id",String(V)),H.append("proof",v),await _e("/deposits/upload_proof.php",H,{timeout:18e3})}}m(s,c?n("funding.transfer_confirmation_received","Transfer confirmation received. Your deposit is now being processed."):n("funding.withdrawal_request_received","Withdrawal request received. You can track it from history."),"success"),ze(t,c,h,d),A.delete(c?"/deposits/list.php":"/withdrawals/list.php")}catch(_){m(s,_.message||n("common.request_failed","Request failed"),"error")}finally{t.__fundingSubmitting=!1,a&&(a.disabled=!1,a.textContent=a.dataset.originalText||(c?n("funding.confirm_transfer","Confirm transfer"):n("funding.submit_withdraw","Submit withdrawal request")))}}async function De(e){if(!e.querySelector("#funding-history-all"))return;const r=await Promise.allSettled([I("/deposits/list.php",{timeout:8e3,retry:1},2e4),I("/withdrawals/list.php",{timeout:8e3,retry:1},2e4)]);e.__fundingHistoryItems=[...r[0].status==="fulfilled"?(r[0].value?.items||[]).map(i=>Y(i,"deposit")):[],...r[1].status==="fulfilled"?(r[1].value?.items||[]).map(i=>Y(i,"withdraw")):[]].sort((i,s)=>s.sortTime-i.sortTime).slice(0,80),oe(e)}function oe(e){const t=e.querySelector("#funding-history-all");if(!t)return;const r=e.__fundingHistoryFilter||"all";e.querySelectorAll("[data-history-filter]").forEach(s=>s.classList.toggle("active",s.dataset.historyFilter===r));const i=(e.__fundingHistoryItems||[]).filter(s=>Ae(s,r));if(!i.length){t.innerHTML=`<div class="empty-state empty-state--compact">${n("funding.no_matching_history","No matching funding history yet.")}</div>`;return}t.innerHTML=`
    <div class="ledger-mobile-list md:hidden">${i.map(He).join("")}</div>
    <div class="hidden md:block overflow-x-auto">
      <table class="funding-history-table">
        <thead><tr><th>${n("funding.type","Type")}</th><th>${n("funding.method","Method")}</th><th>${n("deposit.amount","Amount")}</th><th>${n("kyc.status","Status")}</th><th>${n("funding.date","Date")}</th></tr></thead>
        <tbody>${i.map(Fe).join("")}</tbody>
      </table>
    </div>`}function Y(e,t){const r=Number(e.amount||0),i=e.created_at||e.updated_at||"",s=t==="ledger"?"posted":String(e.status||"pending").toLowerCase(),a=e.reference||e.ref||e.ref_id||e.txid||e.tx_hash||e.transaction_id||e.id||"",o=e.note||e.notes||e.memo||e.description||"";return{kind:t,amount:r,currency:e.currency||"USDT",status:s,method:We(t==="ledger"?e.type||e.ref_type||"ledger":e.method_label||e.provider||e.method_code||e.method||"manual"),created:i,reference:String(a||""),note:String(o||""),sortTime:ge(i)}}function He(e){const t=e.kind==="deposit"||e.kind==="ledger"&&e.amount>=0,r=[[n("funding.method","Method"),e.method],[n("funding.date","Date"),B(e.created)],[n("kyc.status","Status"),z(e.status)],e.reference?[n("funding.reference","Reference"),e.reference]:null,e.note?[n("funding.notes","Notes"),e.note]:null].filter(Boolean);return`<article class="funding-history-card funds-history-card ${t?"is-positive":"is-negative"}" data-funding-history-card>
    <div class="funding-history-main">
      <span class="history-kind ${t?"is-deposit":"is-withdraw"}">${e.kind==="withdraw"?f.withdraw:f.deposit}</span>
      <div><strong>${pe(e.kind)}</strong><small>${l(e.method)} - ${l(B(e.created))}</small></div>
      <button type="button" class="funding-history-toggle" data-funding-history-toggle aria-expanded="false" aria-label="${u(n("common.details","Details"))}">${f.chevronDown}</button>
    </div>
    <div class="funds-history-amount"><strong>${t?"+":""}${g(e.amount)} ${l(e.currency)}</strong><span class="${fe(e.status)}">${l(z(e.status))}</span></div>
    <div class="funding-history-details">
      ${r.map(([i,s])=>`<span><small>${l(i)}</small><b>${l(s)}</b></span>`).join("")}
    </div>
  </article>`}function Fe(e){const t=e.kind==="deposit"||e.kind==="ledger"&&e.amount>=0;return`<tr>
    <td>${l(pe(e.kind))}</td>
    <td>${l(e.method)}</td>
    <td class="${t?"text-buy":"text-sell"}">${t?"+":""}${g(e.amount)} ${l(e.currency)}</td>
    <td><span class="${fe(e.status)}">${l(z(e.status))}</span></td>
    <td>${l(B(e.created))}</td>
  </tr>`}function Ae(e,t){return t==="all"?!0:["deposit","withdraw"].includes(t)?e.kind===t:t==="pending"?["pending","requested","processing","review"].includes(e.status):t==="completed"?["approved","confirmed","completed","paid","posted"].includes(e.status):t==="failed"?["rejected","failed","cancelled","canceled"].includes(e.status):!0}function de(e){const t=e.__fundingCategory||"";return(e.__fundingMethods||[]).filter(r=>x(r)===t)}function le(e){const t=de(e),r=e.__fundingSelectedMethodId||"";return t.find(i=>w(i)===r)||t[0]||null}function w(e){return String(e?.id??e?.code??"")}function x(e){const t=q(e?.category_key||"");if(t)return t;const r=q(e?.method_group||"");if(r)return r;const i=[e?.provider,e?.code,e?.title,e?.name].filter(Boolean).join(" ").toLowerCase();return/stripe|card|visa|master/.test(i)?"card":/bank|wire|iban|swift|ach|fedwire/.test(i)?"bank":/crypto|usdt|btc|eth|trc|erc|bep|wallet|blockchain/.test(i)?"crypto":/bot|telegram/.test(i)?"crypto_bot":"manual"}function Ie(e){if(String(e?.image_url||"").trim())return`<img src="${u(e.image_url)}" alt="" style="width:32px;height:32px;object-fit:contain;border-radius:6px;">`;const t=[e?.provider,e?.code,e?.title,e?.name].filter(Boolean).join(" ").toLowerCase();return/visa/.test(t)?'<svg viewBox="0 0 38 24" width="36" height="24" fill="none"><rect width="38" height="24" rx="4" fill="#1A1F71"/><path d="M15.5 16.5h-2.3l1.43-8.9h2.3L15.5 16.5zm-4.85-8.9L8.6 13.3l-.28-1.4-.82-4.14s-.1-.66-.95-.66H3.08l-.04.16s1.45.3 2.13.94c.6.56.81 1.43.81 1.43l1.45 7.07h2.42l3.7-8.9H10.65zM33.8 16.5h2.14L34.07 7.6H32.2c-.72 0-.9.56-.9.56L27.8 16.5h2.43l.48-1.33h2.97l.12 1.33zm-2.59-3.2l1.23-3.37.69 3.37h-1.92zm-3.34-3.86l.33-1.93S27.3 7 26.1 7c-1.3 0-4.5.58-4.5 3.4 0 2.65 3.7 2.68 3.7 4.07 0 1.4-3.33 1.15-4.42.27l-.35 2.04s.96.47 2.44.47c1.48 0 4.76-.77 4.76-3.52 0-2.68-3.73-2.93-3.73-4.07 0-1.13 2.61-1 3.87-.42z" fill="white"/></svg>':/mastercard|master/.test(t)?'<svg viewBox="0 0 38 24" width="36" height="24"><rect width="38" height="24" rx="4" fill="#252525"/><circle cx="15" cy="12" r="7" fill="#EB001B"/><circle cx="23" cy="12" r="7" fill="#F79E1B"/><path d="M19 6.8a7 7 0 0 1 0 10.4A7 7 0 0 1 19 6.8z" fill="#FF5F00"/></svg>':/stripe|card/.test(t)?'<svg viewBox="0 0 38 24" width="36" height="24"><rect width="38" height="24" rx="4" fill="#635bff"/><path d="M17.6 10.3c0-.7.6-1 1.5-1 1.3 0 3 .4 4.2 1.1V7.1A11.2 11.2 0 0 0 19 6.5c-3.4 0-5.6 1.8-5.6 4.7 0 4.6 6.3 3.8 6.3 5.8 0 .8-.7 1.1-1.7 1.1-1.4 0-3.3-.6-4.7-1.4v3.3c1.6.7 3.2 1 4.7 1 3.5 0 5.9-1.7 5.9-4.8-.1-4.9-6.3-4-6.3-5.9z" fill="white"/></svg>':/btc|bitcoin/.test(t)?'<svg viewBox="0 0 38 24" width="36" height="24"><rect width="38" height="24" rx="4" fill="#F7931A"/><path d="M21.8 11.9c.4-.3.7-.8.6-1.5-.2-1.6-1.8-2-3.2-2h-3.5l-.9 6h3.7c1.5 0 3-.7 3.3-2.5.1-.8-.1-1.5-.5-1.9l.5-.1zm-4.6-1.8h1.6c.5 0 1 .1 1.1.6.1.5-.4.8-.9.8h-1.5l.3-1.4zm1.9 3.8h-1.7l.3-1.6h1.6c.5 0 1.1.1 1.1.7.1.6-.5.9-1.3.9z" fill="white"/></svg>':/eth|ethereum/.test(t)?'<svg viewBox="0 0 38 24" width="36" height="24"><rect width="38" height="24" rx="4" fill="#627EEA"/><path d="M19 7.5V13l4 1.8L19 7.5z" fill="white" opacity="0.6"/><path d="M19 7.5l-4 6.3 4-1.8V7.5z" fill="white"/><path d="M19 16.5v-1.9l4-2.3-4 4.2z" fill="white" opacity="0.6"/><path d="M19 16.5l-4-4.2 4 2.3v1.9z" fill="white"/></svg>':/usdt|tether/.test(t)?'<svg viewBox="0 0 38 24" width="36" height="24"><rect width="38" height="24" rx="4" fill="#26A17B"/><path d="M20.5 12.1c-.1 0-.6.1-1.5.1s-1.4 0-1.5-.1v-.8h3v.8zm0-2.1h-3V9h-2v1H13v1.2h1.5c.1.4.1.8 0 1.2v.2c-.1.6-.1 1.3.1 1.9.3.7 1 1 2.4 1s2-.3 2.4-1c.2-.6.2-1.3.1-1.9v-.2c0-.4 0-.8-.1-1.2H22V9h-1.5z" fill="white"/></svg>':/bank|wire|iban|swift/.test(t)?'<svg viewBox="0 0 38 24" width="36" height="24"><rect width="38" height="24" rx="4" fill="#1e3a5f"/><path d="M9 17h20v1.5H9zm2-6.5h2.5v6H11zm4 0H17v6h-2zm4 0h2.5v6H19zm4 0h2.5v6H23zM19 6l10 3.5H9L19 6z" fill="white" opacity="0.9"/></svg>':/crypto_bot|bot|telegram/.test(t)?'<svg viewBox="0 0 38 24" width="36" height="24"><rect width="38" height="24" rx="4" fill="#229ED9"/><path d="M8 12.5l2.5 1.5L16 9l-8 3.5zm3.5 2.5l.5 3.5 2.5-2.5-3-1zm4.5-2l4.5-7-9.5 5.5 5 1.5z" fill="white"/></svg>':N(x(e))}function N(e,t=""){return t?`<b>${l(t)}</b>`:e==="card"?'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M7 15h2M15 15h2"/></svg>':e==="bank"?'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M3 10h18M5 10V6M8 10V6M11 10V6M14 10V6M17 10V6M19 10V6M12 3 3 6h18L12 3z"/></svg>':e==="crypto"?'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 8h4a2 2 0 1 1 0 4H9V8zm0 4h5a2 2 0 1 1 0 4H9v-4z"/><path d="M12 6v2M12 16v2"/></svg>':e==="crypto_bot"?'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="11" rx="2"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/><circle cx="9" cy="14" r="1.5" fill="currentColor"/><circle cx="15" cy="14" r="1.5" fill="currentColor"/></svg>':f.wallet}function T(e){return{bank:n("funding.bank_transfer","Bank transfer"),crypto:n("funding.crypto","Crypto"),card:n("funding.card_visa","Card / Visa"),cash:n("funding.cash_desk","Cash desk"),crypto_bot:n("funding.crypto_bot","Crypto bot"),manual:n("funding.manual","Manual")}[e]||M(e||"Manual")}function G(e){return{bank:n("funding.bank_hint","Wire and bank details"),crypto:n("funding.crypto_hint","Wallet networks and QR"),card:n("funding.card_hint","Stripe hosted checkout"),cash:n("funding.cash_hint","Desk review"),crypto_bot:n("funding.crypto_bot_hint","Automated wallet route"),manual:n("funding.manual_hint","Configured instructions")}[e]||n("funding.configured_route","Configured route")}function E(e){const t=[e?.provider,e?.method_group,e?.category_key,e?.code,e?.title].filter(Boolean).join(" ").toLowerCase();return/stripe|card|visa|master/.test(t)}function ce(e,t){if(!Number.isFinite(t)||t<=0)return n("funding.enter_amount_continue","Enter the amount to continue.");const r=Number(e?.min_amount||0),i=Number(e?.max_amount||0);return r>0&&t<r?`${n("funding.minimum_for_method","Minimum for this method is")} ${g(r)} ${e.currency||"USDT"}.`:i>0&&t>i?`${n("funding.maximum_for_method","Maximum for this method is")} ${g(i)} ${e.currency||"USDT"}.`:""}function Ne(e){const t={};return e.querySelectorAll("[data-withdraw-field]").forEach(r=>{t[r.name]=r.value}),t}function ze(e,t,r,i){const s=e.querySelector("#deposit-transfer-panel");!s||!t||(L(e),s.className="deposit-transfer-panel is-success",s.innerHTML=`<div class="funding-success-panel"><span>${f.deposit}</span><strong>${n("funding.transfer_confirmation_sent","Transfer confirmation sent")}</strong><small>${g(r)} ${l(i?.currency||"USDT")} ${n("funding.via","via")} ${l(i?.title||i?.code||n("funding.selected_method","selected method"))} ${n("funding.is_being_processed","is being processed.")}</small></div>`)}function m(e,t,r="info"){e&&(e.textContent=t,e.className=`text-xs text-center funding-form-status is-${r}`)}function Be(e,t,r){const i=`mex_deposit_deadline_${w(e)}_${Number(t).toFixed(2)}`,s=Date.now();let a=Number(localStorage.getItem(i)||0);return(!a||a<=s)&&(a=s+r*60*60*1e3,localStorage.setItem(i,String(a))),a}function Ee(e,t){const r=()=>{const i=e.querySelector("#deposit-countdown");if(!i)return;const s=Math.max(0,t-Date.now());i.textContent=Ke(s),e.querySelector(".deposit-timer")?.classList.toggle("is-expired",s<=0);const a=e.querySelector("#funding-submit");a&&s<=0&&(a.disabled=!0)};r(),e.__depositTimer=setInterval(r,1e3)}function L(e){e?.__depositTimer&&clearInterval(e.__depositTimer),e&&(e.__depositTimer=null)}function je(e){return Array.isArray(e)?e.map(t=>t&&typeof t=="object"?{value:String(t.value??t.key??t.label??""),label:String(t.label??t.name??t.value??"")}:{value:String(t),label:String(t)}).filter(t=>t.value!==""):[]}function q(e){return String(e||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")}function Ue(e){return q(e)||"destination"}function Pe(e){navigator.clipboard?.writeText(e.dataset.copyAddress||"").then(()=>{e.textContent=n("common.copied","Copied"),setTimeout(()=>{e.textContent=n("common.copy","Copy")},1200)}).catch(()=>{})}function Re(e){const t=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;return`vp-${e}-${t}`}function ue(e={}){const t=String(e._path||""),r=String(e.action||e.tab||"").toLowerCase();return te.some(i=>i.key===r)?r:t.includes("withdraw")?"withdraw":(t.includes("deposit"),"deposit")}function fe(e){const t=String(e||"").toLowerCase();return["approved","confirmed","completed","paid","posted"].includes(t)?"badge-green":["pending","requested","processing","review"].includes(t)?"badge-accent":["rejected","failed","cancelled","canceled"].includes(t)?"badge-red":"badge"}function pe(e){return e==="withdraw"?n("funding.withdrawal","Withdrawal"):e==="ledger"?n("funding.ledger_entry","Ledger entry"):n("funding.deposit_entry","Deposit")}function Ve(e){return{all:n("common.all","All"),deposit:n("funding.deposit","Deposit"),withdraw:n("funding.withdraw","Withdraw"),ledger:n("funding.ledger","Ledger"),pending:n("funding.pending","Pending"),completed:n("funding.completed","Completed"),failed:n("funding.failed","Failed")}[e]||M(e)}function z(e){const t=String(e||"").toLowerCase();return{approved:n("funding.status_approved","Approved"),confirmed:n("funding.status_confirmed","Confirmed"),completed:n("funding.status_completed","Completed"),paid:n("funding.status_paid","Paid"),posted:n("funding.status_posted","Posted"),pending:n("funding.status_pending","Pending"),requested:n("funding.status_requested","Requested"),processing:n("funding.status_processing","Processing"),review:n("funding.status_review","Under review"),rejected:n("funding.status_rejected","Rejected"),failed:n("funding.status_failed","Failed"),cancelled:n("funding.status_cancelled","Cancelled"),canceled:n("funding.status_cancelled","Cancelled"),"not submitted":n("funding.status_not_submitted","Not submitted")}[t]||M(t||"pending")}function We(e){const t=q(e);return{trade_open:n("funding.ledger_trade_open","Trade open"),trade_close:n("funding.ledger_trade_close","Trade close"),trade_pnl:n("funding.ledger_trade_pnl","Trade PnL"),deposit_credit:n("funding.ledger_deposit_credit","Deposit credit"),withdrawal:n("funding.withdrawal","Withdrawal"),withdraw:n("funding.withdrawal","Withdrawal"),invest_payout:n("funding.ledger_invest_payout","Investment payout"),ledger:n("funding.ledger_entry","Ledger entry"),stripe:n("funding.card_visa","Card / Visa"),bank:n("funding.bank_transfer","Bank transfer"),crypto:n("funding.crypto","Crypto"),manual:n("funding.manual","Manual")}[t]||M(e)}function M(e){return String(e||"").replace(/[_-]/g," ").replace(/\b\w/g,t=>t.toUpperCase())}function Qe(e){return M(e)}function Ke(e){const t=Math.max(0,Math.floor(e/1e3)),r=Math.floor(t/3600),i=Math.floor(t%3600/60),s=t%60;return`${String(r).padStart(2,"0")}:${String(i).padStart(2,"0")}:${String(s).padStart(2,"0")}`}function Oe(e){return new Date(Number(e)).toLocaleString("en-US",{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})}function Ye(e){const t=Number(e||0);return t>=1024*1024?`${(t/1024/1024).toFixed(1)} MB`:t>=1024?`${Math.round(t/1024)} KB`:`${t} B`}function ge(e){const t=String(e||"").trim(),r=Number(t);if(Number.isFinite(r)&&r>0)return r>1e10?r:r*1e3;const i=Date.parse(t);return Number.isFinite(i)?i:0}function B(e){const t=ge(e);return t?new Date(t).toLocaleString("en-US",{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"}):"--"}export{Ze as cleanup,Je as mount,Xe as render};
