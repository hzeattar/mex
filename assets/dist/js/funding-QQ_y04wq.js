import{n as me,s as ge,i as g,j as c,g as u,m as p,f as i,k as he,h as ye,c as be}from"./main-DDPzbuB0.js";const A=globalThis.__MEX_FUNDING_CACHE__||(globalThis.__MEX_FUNDING_CACHE__=new Map),ve=45e3,G=[{key:"deposit",label:"Deposit",icon:c.deposit},{key:"withdraw",label:"Withdraw",icon:c.withdraw},{key:"history",label:"History",icon:c.wallet}];function Ge(e={}){const t=ie(e),s=g("wallet")||{};g("kyc");const n=g("level")||{},r=g("mode")==="real"?"real":"demo",a=r==="real"?s.real||{}:s.demo||{};return n.current,`
    <div class="funds-workspace animate-fade-in" data-active-funding-tab="${u(t)}">
      <section class="funds-hero-pro">
        <div>
          <span class="badge-accent">Assets desk</span>
          <h1>Funds</h1>
          <p>Deposit, withdraw and audit wallet movements from one fast workspace powered by admin payment categories.</p>
        </div>
        <div class="funds-balance-pro">
          <span>${r==="real"?"Available balance":"Demo balance"}</span>
          <strong>${p(a.available||a.balance||0)}</strong>
          <small>${i(a.currency||(r==="real"?"USDT":"USDT_DEMO"))}</small>
        </div>
      </section>

      <section class="funds-tabs-pro" role="tablist" aria-label="Funding workspace tabs">
        ${G.map(o=>`
          <button type="button" class="${o.key===t?"active":""}" data-funding-tab="${o.key}" role="tab" aria-selected="${o.key===t?"true":"false"}">
            <span>${o.icon||""}</span>${i(o.label)}
          </button>
        `).join("")}
      </section>

      ${r!=="real"&&t!=="history"?`<section class="funding-mode-warning">
        <span class="gate-icon">${c.lock}</span>
        <div>
          <strong>Real account required</strong>
          <small>Methods are visible for preview. Switch to Real before submitting a live funding request.</small>
        </div>
        <button type="button" class="btn-primary btn-sm" data-switch-real>Switch to Real</button>
      </section>`:""}

      ${t==="history"?$e():we(t)}
    </div>`}function Xe(e,t={}){const s=ie(t);if(e.addEventListener("click",n=>{const r=n.target.closest("[data-funding-tab]");if(r){n.preventDefault(),me("wallet",{action:r.dataset.fundingTab||"deposit"});return}const a=n.target.closest("[data-funding-category]");if(a){e.__fundingCategory=a.dataset.fundingCategory||"",e.__fundingSelectedMethodId="",X(e),Y(e),v(e);return}const o=n.target.closest("[data-method]");if(o){e.__fundingSelectedMethodId=o.dataset.method||"",v(e);return}const d=n.target.closest("[data-history-filter]");if(d){e.__fundingHistoryFilter=d.dataset.historyFilter||"all",te(e);return}const l=n.target.closest("[data-copy-address]");if(l){Pe(l);return}n.target.closest("[data-switch-real]")&&(localStorage.setItem("vp_mode","real"),ge("mode","real"),location.reload())}),e.addEventListener("input",n=>{n.target.matches('input[name="amount"], [data-withdraw-field]')&&v(e)}),e.addEventListener("change",n=>{const r=n.target.closest('input[name="proof"]');if(!r)return;const a=e.querySelector("#proof-file-name"),o=r.files?.[0];a&&(a.textContent=o?`${o.name} - ${Oe(o.size||0)}`:"Image or PDF up to 8MB")}),e.querySelectorAll("[data-quick-amount]").forEach(n=>{n.addEventListener("click",()=>{const r=e.querySelector('input[name="amount"]');r&&(r.value=n.dataset.quickAmount||""),v(e)})}),s==="history"){He(e);return}_e(e,s),ee(e,s),e.querySelector("#funding-form")?.addEventListener("submit",n=>Le(n,e,s))}function Ye(){document.querySelectorAll(".funds-workspace").forEach(e=>D(e))}function we(e){const t=e==="deposit";return`
    <section class="funding-flow-shell">
      <div class="funding-flow-main card ${t?"deposit-console-card":""}">
        <div class="panel-headline funding-panel-title">
          <span class="${t?"badge-green":"badge-accent"}">${t?"Deposit ticket":"Withdrawal ticket"}</span>
          <h2>${t?"Create deposit transfer":"Create withdrawal request"}</h2>
        </div>

        <form id="funding-form" data-kind="${e}" class="funding-form-pro" novalidate>
          <div class="funding-step-block">
            <span class="field-label">1. Select section</span>
            <div class="funding-category-rail" id="funding-categories">
              ${Array.from({length:3}).map(()=>'<div class="skeleton h-16 rounded-lg"></div>').join("")}
            </div>
          </div>

          <div class="funding-step-block">
            <span class="field-label">2. Select method</span>
            <div id="method-cards" class="method-grid method-grid-rail">
              ${Array.from({length:4}).map(()=>'<div class="skeleton h-20 rounded-lg"></div>').join("")}
            </div>
          </div>

          ${t?`<div id="deposit-transfer-panel" class="deposit-transfer-panel is-muted">
            ${J("Transfer details will appear here","Choose a method to unlock account details, QR code, wallet address and bank fields.")}
          </div>`:'<div id="withdraw-fields-panel" class="withdraw-fields-panel"></div>'}

          <div class="deposit-ticket-grid">
            <label class="block">
              <span class="field-label">${t?"3. Amount":"Amount"}</span>
              <input type="number" name="amount" class="input mt-1" value="${t?"":"50"}" min="1" step="any" placeholder="${t?"Enter exact amount after copying the transfer details":"50"}" required>
            </label>
            <label class="block">
              <span class="field-label">Currency</span>
              <input type="text" name="currency" class="input mt-1" value="USDT" readonly>
            </label>
          </div>

          ${t?`<div class="quick-amount-rail" aria-label="Quick amount">
            ${[100,250,500,1e3,2500].map(s=>`<button type="button" class="quick-amount-chip" data-quick-amount="${s}">${p(s,0)}</button>`).join("")}
          </div>
          <div id="deposit-proof-slot" class="deposit-proof-slot"></div>`:""}

          <label class="block deposit-note-field">
            <span class="field-label">${t?"Reference / notes":"Additional notes"}</span>
            <textarea name="notes" class="input mt-1" rows="2" placeholder="${t?"Sender name, transaction hash, or bank reference...":"Optional note for the operations desk..."}"></textarea>
          </label>

          <div class="funding-submit-zone">
            <button type="submit" class="${t?"btn-primary":"btn-sell"} w-full py-3" id="funding-submit">
              ${t?"Confirm transfer":"Submit withdrawal request"}
            </button>
            <p class="text-xs text-center funding-form-status" id="form-status"></p>
          </div>
        </form>
      </div>

      <aside class="funding-side-stack">
        <section class="card funding-sidebar-card funding-guide-card">
          <div class="panel-headline">
            <span class="badge-green">${t?"Secure checklist":"Payout checklist"}</span>
            <h2>${t?"Before you confirm":"Before you request"}</h2>
          </div>
          <div class="funding-checklist">
            ${x("Use the selected category and method only",!0)}
            ${x(t?"Send the exact amount shown":"Balance must cover payout amount",!0)}
            ${x(t?"Upload a clear receipt when required":"Provide payout destination",!0)}
            ${x("Real mode required",g("mode")==="real")}
          </div>
        </section>

        <section class="card funding-history-panel">
          <div class="panel-headline-row">
            <div>
              <span class="badge-accent">Activity</span>
              <h2>Recent ${t?"deposits":"withdrawals"}</h2>
            </div>
            <button type="button" class="btn-ghost btn-sm" data-funding-tab="history">All history</button>
          </div>
          <div id="funding-history" class="funding-history-list">
            <p class="text-muted text-sm text-center py-8">Loading...</p>
          </div>
        </section>
      </aside>
    </section>`}function $e(){return`
    <section class="card funding-history-workspace">
      <div class="panel-headline-row">
        <div>
          <span class="badge-accent">Ledger</span>
          <h2>Funding history</h2>
        </div>
        <div class="history-filter-rail">
          ${["all","deposit","withdraw","ledger","pending","completed","failed"].map((e,t)=>`
            <button type="button" class="${t===0?"active":""}" data-history-filter="${e}">${L(e)}</button>
          `).join("")}
        </div>
      </div>
      <div id="funding-history-all" class="funding-history-stack">
        <p class="text-muted text-sm text-center py-10">Loading funding history...</p>
      </div>
    </section>`}async function _(e,t={},s=ve){const n=e,r=Date.now(),a=A.get(n);if(a&&r-a.time<s)return a.data;const o=await be(e,t);return A.set(n,{time:r,data:o}),o}async function _e(e,t){try{const s=g("mode")==="real"?"real":"both",n=await _(`/payment_methods/list.php?kind=${encodeURIComponent(t)}&scope=${s}&currency=*`,{timeout:9e3,retry:1},9e4),r=n?.items||[],a=Se(n?.categories||[],r);e.__fundingKind=t,e.__fundingMethods=r,e.__fundingCategories=a,e.__fundingCategory=a[0]?.key||"",e.__fundingSelectedMethodId="",X(e),Y(e),v(e)}catch{const n=e.querySelector("#funding-categories"),r=e.querySelector("#method-cards");n&&(n.innerHTML='<div class="empty-state empty-state--compact">Payment sections are temporarily unavailable.</div>'),r&&(r.innerHTML="")}}function Se(e,t){const s=new Set(t.map(w).filter(Boolean)),n=[];return e.forEach(r=>{const a=M(r.key||r.key_slug||r.label);!a||!s.has(a)||n.push({key:a,label:r.label||T(a),hint:r.hint||V(a),icon:r.image_url?`<img src="${u(r.image_url)}" alt="">`:F(a,r.icon)})}),s.forEach(r=>{n.some(a=>a.key===r)||n.push({key:r,label:T(r),hint:V(r),icon:F(r)})}),n}function X(e){const t=e.querySelector("#funding-categories"),s=e.__fundingCategories||[],n=e.__fundingCategory||s[0]?.key||"";if(t){if(!s.length){t.innerHTML='<div class="empty-state empty-state--compact">No active funding sections are configured by admin.</div>';return}t.innerHTML=s.map(r=>`
    <button type="button" class="${r.key===n?"active":""}" data-funding-category="${u(r.key)}">
      <i>${r.icon||c.wallet}</i>
      <strong>${i(r.label)}</strong>
      <small>${i(r.hint||"")}</small>
    </button>
  `).join("")}}function Y(e){const t=e.querySelector("#method-cards"),s=se(e);if(t){if(D(e),!s.length){t.innerHTML='<div class="empty-state empty-state--compact">No active methods under this section.</div>',e.__fundingSelectedMethodId="",v(e);return}s.some(n=>h(n)===e.__fundingSelectedMethodId)||(e.__fundingSelectedMethodId=h(s[0])),t.innerHTML=s.map(n=>{const r=h(n);return`<button type="button" class="method-card ${r===e.__fundingSelectedMethodId?"active":""}" data-method="${u(r)}">
      <span class="method-icon">${Fe(n)}</span>
      <strong>${i(n.title||n.name||n.code||"Method")}</strong>
      <small>${i([T(w(n)),n.currency].filter(Boolean).join(" - "))}</small>
      <span class="method-card-badges">${Ce(n)}</span>
      <em>${p(n.min_amount||0)}${n.max_amount?` - ${p(n.max_amount)}`:"+"}</em>
    </button>`}).join("")}}function v(e){const s=(e.__fundingKind||e.querySelector("#funding-form")?.dataset.kind||"deposit")==="deposit",n=re(e),r=Number(e.querySelector('input[name="amount"]')?.value||0),a=e.querySelector("#funding-submit"),o=n?j(n):!1,d=e.querySelector('input[name="currency"]');if(d&&(d.value=n?.currency||"USDT"),e.querySelectorAll(".method-card").forEach(l=>l.classList.toggle("active",l.dataset.method===h(n||{}))),a&&n&&(a.disabled=!1,a.textContent=o?n.checkout_label||"Continue to secure card checkout":s?"Confirm transfer":"Submit withdrawal request"),!n){z(e,null,r,!1,"Choose an active method first."),K(e,null,!1),O(e,null);return}s?(z(e,n,r,o,ae(n,r)),K(e,n,o)):O(e,n)}function z(e,t,s,n,r){const a=e.querySelector("#deposit-transfer-panel");if(!a)return;if(D(e),!t){a.className="deposit-transfer-panel is-muted",a.innerHTML=J("Choose a method","Select a funding method to display transfer instructions, QR code and destination details.");return}if(n){a.className="deposit-transfer-panel is-ready",a.innerHTML=`
      <div class="deposit-transfer-ready">
        <div class="deposit-transfer-title">
          <span>${c.wallet}</span>
          <div><strong>Ready for card checkout</strong><small>Enter the amount and continue to Stripe Checkout. No receipt upload is required.</small></div>
        </div>
        ${Q(t,!0)}
        <div class="secure-checkout-strip">
          <i>${c.wallet}</i>
          <div>
            <strong>Secure Stripe Checkout</strong>
            <small>Card details are collected by Stripe. You return to MEX after payment confirmation.</small>
          </div>
        </div>
      </div>`;return}const o=!r&&s>0,d=Math.max(1,Number(t.expires_hours||24)),l=o?Re(t,s,d):0;a.className=`deposit-transfer-panel is-ready${o?"":" is-preview"}`,a.innerHTML=`
    <div class="deposit-transfer-ready">
      <div class="deposit-transfer-title">
        <span>${c.deposit}</span>
        <div>
          <strong>${o?`Transfer ${p(s)} ${i(t.currency||"USDT")}`:i(t.title||t.name||t.code||"Payment method")}</strong>
          <small>${o?"Use only the details shown here before the timer ends.":"Scan the QR or copy the destination first, then enter the exact amount below."}</small>
        </div>
      </div>
      ${Q(t,!1)}
      ${o?`<div class="deposit-timer" data-deposit-deadline="${l}">
        <div><span>Payment window</span><strong id="deposit-countdown">--:--:--</strong></div>
        <small>Expires ${Ke(l)}</small>
      </div>`:""}
      ${qe(t)}
      ${t.instructions?`<div class="transfer-instruction-card">
        <strong>Transfer instructions</strong>
        <p>${i(t.instructions)}</p>
      </div>`:""}
      <div class="transfer-target-grid">
        ${xe(t)}
      </div>
      ${Te(t)}
    </div>`,o&&Ue(e,l)}function Q(e,t=!1){const s=e.max_amount?p(e.max_amount):"Flexible",n=t?"Not needed":e.proof_required?"Receipt required":"Optional",r=t?"Checkout":`${Math.max(1,Number(e.expires_hours||24))}h`;return`<div class="funding-route-summary" aria-label="Selected funding route summary">
    ${$("Section",T(w(e)))}
    ${$("Currency",e.currency||"USDT")}
    ${$("Limits",`${p(e.min_amount||0)} - ${s}`)}
    ${$("Proof",n)}
    ${$("Window",r)}
  </div>`}function $(e,t){return`<span class="funding-route-pill"><small>${i(e)}</small><b>${i(t)}</b></span>`}function K(e,t,s){const n=e.querySelector("#deposit-proof-slot");if(!n)return;if(!t){n.dataset.methodId="",n.dataset.isStripe="",n.innerHTML="";return}const r=h(t),a=s?"1":"0";if(!(n.dataset.methodId===r&&n.dataset.isStripe===a&&n.innerHTML.trim()!=="")){if(n.dataset.methodId=r,n.dataset.isStripe=a,s){n.innerHTML=`<div class="deposit-proof-note">
      <span>${c.wallet}</span>
      <div><strong>No receipt upload needed</strong><small>Card payments continue through Stripe Checkout.</small></div>
    </div>`;return}n.innerHTML=`<label class="deposit-file-drop">
    <input type="file" name="proof" accept="image/*,.pdf">
    <span>${c.deposit}</span>
    <div><strong>${t.proof_required?"Upload transfer proof":"Upload receipt if available"}</strong><small id="proof-file-name">Image or PDF up to 8MB</small></div>
  </label>`}}function O(e,t){const s=e.querySelector("#withdraw-fields-panel");if(!s)return;if(!t){s.innerHTML='<p class="text-muted text-sm">Select a withdrawal method first.</p>';return}const n=De(t.fields||[]);if(!n.length){s.innerHTML=`<label class="block">
      <span class="field-label">Payout destination</span>
      <textarea name="destination" data-withdraw-field class="input mt-1" rows="3" placeholder="Wallet address, bank reference, IBAN, or payout details..." required></textarea>
    </label>`;return}s.innerHTML=`<div class="withdraw-fields-grid">${n.map(ke).join("")}</div>`}function ke(e){const t=Be(e.name||e.key||e.id||e.label||"destination"),s=e.label||e.title||L(t),n=e.placeholder||e.hint||"",r=e.required||e.is_required?"required":"",a=String(e.type||"text").toLowerCase(),o=Ee(e.options||e.values||[]);if(a==="textarea")return`<label class="block sm:col-span-2"><span class="field-label">${i(s)}</span><textarea name="${u(t)}" data-withdraw-field class="input mt-1" rows="3" placeholder="${u(n)}" ${r}></textarea></label>`;if(a==="select"&&o.length)return`<label class="block"><span class="field-label">${i(s)}</span><select name="${u(t)}" data-withdraw-field class="input mt-1" ${r}>${o.map(l=>`<option value="${u(l.value)}">${i(l.label)}</option>`).join("")}</select></label>`;const d=["email","number","tel","url"].includes(a)?a:"text";return`<label class="block"><span class="field-label">${i(s)}</span><input type="${d}" name="${u(t)}" data-withdraw-field class="input mt-1" placeholder="${u(n)}" ${r}></label>`}function J(e,t){return`<div class="deposit-transfer-empty"><span>${c.deposit}</span><strong>${i(e)}</strong><small>${i(t)}</small></div>`}function Ce(e){const t=[];return String(e?.image_url||"").trim()&&t.push("Logo"),Z(e)&&t.push("QR"),(String(e?.payment_address||"").trim()||N(e?.fields||{}).length)&&t.push("Details"),e?.proof_required&&t.push("Receipt"),t.length||t.push("Needs setup"),t.slice(0,4).map(s=>`<b>${i(s)}</b>`).join("")}function xe(e){const t=String(e?.payment_address||"").trim();return`
    <div class="transfer-target-card"><span>Method</span><strong>${i(e?.title||e?.name||e?.code||"Payment method")}</strong></div>
    ${Me(e,t?[t]:[])}
  `}function qe(e){const t=Z(e),s=String(e?.payment_address||"").trim();return!t&&!s?"":`<div class="transfer-qr-card transfer-qr-card--centered">
    <strong>Scan QR code</strong>
    <small>Scan with your wallet or banking app, then use the wallet address below if you prefer to copy it manually.</small>
    ${t?`<img src="${u(t)}" alt="Payment QR">`:""}
    ${s?`<div class="transfer-qr-address">
      <span>Wallet address</span>
      <code>${i(s)}</code>
      <button type="button" data-copy-address="${u(s)}">Copy address</button>
    </div>`:""}
  </div>`}function Z(e){const t=String(e?.payment_qr_url||"").trim();if(t)return t;const s=String(e?.payment_address||"").trim();return s?`https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(s)}`:""}function Te(e){if(j(e))return"";const t=String(e?.payment_address||"").trim(),s=N(e?.fields||{});return t||s.length?"":`<div class="funding-method-warning">${c.lock}<div><strong>Funding route unavailable</strong><small>Choose another method or try again shortly.</small></div></div>`}function Me(e,t=[]){const s=N(e?.fields||{}),n=new Set(t.map(r=>String(r||"").trim()).filter(Boolean));return s.filter(r=>!n.has(String(r.value||"").trim())).slice(0,8).map(r=>{const a=String(r.value);return`<div class="transfer-target-card ${a.length>26?"transfer-target-wide":""}"><span>${i(r.label)}</span><strong>${i(a)}</strong><button type="button" data-copy-address="${u(a)}">Copy</button></div>`}).join("")}function N(e){const t=[];return Array.isArray(e)?e.forEach(s=>{if(!s)return;const n=s.label||s.name||s.key||"",r=s.value||s.default||s.text||"";n&&r&&t.push({label:n,value:r})}):e&&typeof e=="object"&&Object.entries(e).forEach(([s,n])=>{if(!(n==null||n===""))if(typeof n=="object"){const r=n.label||n.name||s,a=n.value||n.text||n.default||"";a&&t.push({label:r,value:a})}else t.push({label:ze(s),value:n})}),t}function De(e){return Array.isArray(e)?e.filter(Boolean).map(t=>(t.value||t.default||t.text)&&!t.collect?null:t).filter(Boolean):!e||typeof e!="object"?[]:Object.entries(e).map(([t,s])=>s&&typeof s=="object"?(s.value||s.default||s.text)&&!s.collect?null:{name:t,...s}:null).filter(Boolean)}async function Le(e,t,s){if(e.preventDefault(),t.__fundingSubmitting)return;const n=e.target,r=t.querySelector("#form-status"),a=t.querySelector("#funding-submit"),o=new FormData(n),d=re(t),l=s==="deposit",S=Number(o.get("amount")||0),R=String(o.get("notes")||"").trim(),y=d?j(d):!1;try{if(g("mode")!=="real")return f(r,"Switch to Real before submitting live funding requests.","error");if(!d)return f(r,"Select an active payment method first.","error");const k=ae(d,S);if(k)return f(r,k,"error");const C=n.querySelector('input[name="proof"]')?.files?.[0]||null;if(l&&!y&&d.proof_required&&!C)return f(r,"Upload transfer proof before confirming.","error");const b=Ne(t),H=b.destination||b.wallet_address||b.bank_account||b.iban||b.address||R;if(!l&&!String(H||"").trim())return f(r,"Enter payout destination details.","error");t.__fundingSubmitting=!0,a&&(a.disabled=!0,a.dataset.originalText=a.dataset.originalText||a.textContent||"",a.textContent=l?y?"Opening checkout...":"Confirming...":"Submitting..."),f(r,y?"Opening secure checkout...":l?"Sending transfer confirmation...":"Sending payout request...","info");const U=d.code||d.method||d.id||"",E=d.currency||"USDT",ue=t.__fundingCategory||w(d),B=t.querySelector("[data-deposit-deadline]")?.dataset.depositDeadline||"",P={notes:R,category:ue,method_title:d.title||d.name||d.code||"",client_deadline_at:B?Math.floor(Number(B)/1e3):null,proof_attached:!!C,fields:b},pe=y?"/deposits/stripe_checkout.php":l?"/deposits/create.php":"/withdrawals/create.php",fe=l?{provider:d.provider||"",method:U,currency:E,amount:S,details:P}:{method:U,currency:E,amount:S,destination:H,details:{...P,destination:H}},m=await he(pe,fe,{timeout:y?18e3:14e3,headers:{"Idempotency-Key":We(l?"dep":"wd")}});if(!m||m.ok===!1)return f(r,m?.error||"Request failed","error");if(y&&m.checkout_url){f(r,"Redirecting to checkout...","success"),window.location.assign(m.checkout_url);return}if(l&&C){const W=m.deposit?.id||m.id||m.deposit_id||null;if(W){const I=new FormData;I.append("deposit_id",String(W)),I.append("proof",C),await ye("/deposits/upload_proof.php",I,{timeout:18e3})}}f(r,l?"Transfer confirmation received. Your deposit is now being processed.":"Withdrawal request received. You can track it from history.","success"),je(t,l,S,d),A.delete(l?"/deposits/list.php":"/withdrawals/list.php"),ee(t,s)}catch(k){f(r,k.message||"Request failed","error")}finally{t.__fundingSubmitting=!1,a&&(a.disabled=!1,a.textContent=a.dataset.originalText||(l?"Confirm transfer":"Submit withdrawal request"))}}async function ee(e,t){const s=e.querySelector("#funding-history");if(s)try{const a=((await _(t==="deposit"?"/deposits/list.php":"/withdrawals/list.php",{timeout:8e3,retry:1},25e3))?.items||[]).slice(0,10).map(o=>q(o,t));if(!a.length){s.innerHTML=`<div class="empty-state !m-0">No ${t} requests yet.</div>`;return}s.innerHTML=a.map(ne).join("")}catch{s.innerHTML='<p class="text-red text-sm text-center py-4">History unavailable.</p>'}}async function He(e){if(!e.querySelector("#funding-history-all"))return;const s=await Promise.allSettled([_("/deposits/list.php",{timeout:8e3,retry:1},2e4),_("/withdrawals/list.php",{timeout:8e3,retry:1},2e4),_("/wallet/ledger.php?per=50",{timeout:8e3,retry:1},2e4)]);e.__fundingHistoryItems=[...s[0].status==="fulfilled"?(s[0].value?.items||[]).map(n=>q(n,"deposit")):[],...s[1].status==="fulfilled"?(s[1].value?.items||[]).map(n=>q(n,"withdraw")):[],...s[2].status==="fulfilled"?(s[2].value?.items||[]).map(n=>q(n,"ledger")):[]].sort((n,r)=>r.sortTime-n.sortTime).slice(0,80),te(e)}function te(e){const t=e.querySelector("#funding-history-all");if(!t)return;const s=e.__fundingHistoryFilter||"all";e.querySelectorAll("[data-history-filter]").forEach(r=>r.classList.toggle("active",r.dataset.historyFilter===s));const n=(e.__fundingHistoryItems||[]).filter(r=>Ae(r,s));if(!n.length){t.innerHTML='<div class="empty-state empty-state--compact">No matching funding history yet.</div>';return}t.innerHTML=`
    <div class="ledger-mobile-list md:hidden">${n.map(ne).join("")}</div>
    <div class="hidden md:block overflow-x-auto">
      <table class="funding-history-table">
        <thead><tr><th>Type</th><th>Method</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>${n.map(Ie).join("")}</tbody>
      </table>
    </div>`}function q(e,t){const s=Number(e.amount||0),n=e.created_at||e.updated_at||"",r=t==="ledger"?"posted":String(e.status||"pending").toLowerCase();return{kind:t,amount:s,currency:e.currency||"USDT",status:r,method:t==="ledger"?e.type||e.ref_type||"ledger":e.method_label||e.provider||e.method_code||e.method||"manual",created:n,sortTime:le(n)}}function ne(e){const t=e.kind==="deposit"||e.kind==="ledger"&&e.amount>=0;return`<article class="funding-history-card funds-history-card ${t?"is-positive":"is-negative"}">
    <div class="funding-history-main">
      <span class="history-kind ${t?"is-deposit":"is-withdraw"}">${e.kind==="withdraw"?c.withdraw:c.deposit}</span>
      <div><strong>${de(e.kind)}</strong><small>${i(e.method)} - ${i(ce(e.created))}</small></div>
    </div>
    <div class="funds-history-amount"><strong>${t?"+":""}${p(e.amount)} ${i(e.currency)}</strong><span class="${oe(e.status)}">${i(e.status)}</span></div>
  </article>`}function Ie(e){const t=e.kind==="deposit"||e.kind==="ledger"&&e.amount>=0;return`<tr>
    <td>${i(de(e.kind))}</td>
    <td>${i(e.method)}</td>
    <td class="${t?"text-buy":"text-sell"}">${t?"+":""}${p(e.amount)} ${i(e.currency)}</td>
    <td><span class="${oe(e.status)}">${i(e.status)}</span></td>
    <td>${i(ce(e.created))}</td>
  </tr>`}function Ae(e,t){return t==="all"?!0:["deposit","withdraw","ledger"].includes(t)?e.kind===t:t==="pending"?["pending","requested","processing","review"].includes(e.status):t==="completed"?["approved","confirmed","completed","paid","posted"].includes(e.status):t==="failed"?["rejected","failed","cancelled","canceled"].includes(e.status):!0}function se(e){const t=e.__fundingCategory||"";return(e.__fundingMethods||[]).filter(s=>w(s)===t)}function re(e){const t=se(e),s=e.__fundingSelectedMethodId||"";return t.find(n=>h(n)===s)||t[0]||null}function h(e){return String(e?.id??e?.code??"")}function w(e){const t=M(e?.category_key||"");if(t)return t;const s=M(e?.method_group||"");if(s)return s;const n=[e?.provider,e?.code,e?.title,e?.name].filter(Boolean).join(" ").toLowerCase();return/stripe|card|visa|master/.test(n)?"card":/bank|wire|iban|swift|ach|fedwire/.test(n)?"bank":/crypto|usdt|btc|eth|trc|erc|bep|wallet|blockchain/.test(n)?"crypto":/bot|telegram/.test(n)?"crypto_bot":"manual"}function Fe(e){return String(e?.image_url||"").trim()?`<img src="${u(e.image_url)}" alt="">`:F(w(e))}function F(e,t=""){return t?`<b>${i(t)}</b>`:e==="card"?c.wallet:e==="bank"?c.wallet:e==="crypto"||e==="crypto_bot"?c.deposit:c.wallet}function T(e){return{bank:"Bank transfer",crypto:"Crypto",card:"Card / Visa",cash:"Cash desk",crypto_bot:"Crypto bot",manual:"Manual"}[e]||L(e||"Manual")}function V(e){return{bank:"Wire and bank details",crypto:"Wallet networks and QR",card:"Stripe hosted checkout",cash:"Desk review",crypto_bot:"Automated wallet route",manual:"Configured instructions"}[e]||"Configured route"}function j(e){const t=[e?.provider,e?.method_group,e?.category_key,e?.code,e?.title].filter(Boolean).join(" ").toLowerCase();return/stripe|card|visa|master/.test(t)}function ae(e,t){if(!Number.isFinite(t)||t<=0)return"Enter the amount to continue.";const s=Number(e?.min_amount||0),n=Number(e?.max_amount||0);return s>0&&t<s?`Minimum for this method is ${p(s)} ${e.currency||"USDT"}.`:n>0&&t>n?`Maximum for this method is ${p(n)} ${e.currency||"USDT"}.`:""}function Ne(e){const t={};return e.querySelectorAll("[data-withdraw-field]").forEach(s=>{t[s.name]=s.value}),t}function je(e,t,s,n){const r=e.querySelector("#deposit-transfer-panel");!r||!t||(D(e),r.className="deposit-transfer-panel is-success",r.innerHTML=`<div class="funding-success-panel"><span>${c.deposit}</span><strong>Transfer confirmation sent</strong><small>${p(s)} ${i(n?.currency||"USDT")} via ${i(n?.title||n?.code||"selected method")} is being processed.</small></div>`)}function f(e,t,s="info"){e&&(e.textContent=t,e.className=`text-xs text-center funding-form-status is-${s}`)}function Re(e,t,s){const n=`mex_deposit_deadline_${h(e)}_${Number(t).toFixed(2)}`,r=Date.now();let a=Number(localStorage.getItem(n)||0);return(!a||a<=r)&&(a=r+s*60*60*1e3,localStorage.setItem(n,String(a))),a}function Ue(e,t){const s=()=>{const n=e.querySelector("#deposit-countdown");if(!n)return;const r=Math.max(0,t-Date.now());n.textContent=Qe(r),e.querySelector(".deposit-timer")?.classList.toggle("is-expired",r<=0);const a=e.querySelector("#funding-submit");a&&r<=0&&(a.disabled=!0)};s(),e.__depositTimer=setInterval(s,1e3)}function D(e){e?.__depositTimer&&clearInterval(e.__depositTimer),e&&(e.__depositTimer=null)}function Ee(e){return Array.isArray(e)?e.map(t=>t&&typeof t=="object"?{value:String(t.value??t.key??t.label??""),label:String(t.label??t.name??t.value??"")}:{value:String(t),label:String(t)}).filter(t=>t.value!==""):[]}function M(e){return String(e||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")}function Be(e){return M(e)||"destination"}function Pe(e){navigator.clipboard?.writeText(e.dataset.copyAddress||"").then(()=>{e.textContent="Copied",setTimeout(()=>{e.textContent="Copy"},1200)}).catch(()=>{})}function We(e){const t=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;return`vp-${e}-${t}`}function ie(e={}){const t=String(e._path||""),s=String(e.action||e.tab||"").toLowerCase();return G.some(n=>n.key===s)?s:t.includes("withdraw")?"withdraw":(t.includes("deposit"),"deposit")}function x(e,t){return`<div class="funding-check-item ${t?"is-done":"is-pending"}"><i>${t?c.deposit:c.lock}</i><div><strong>${i(e)}</strong><small>${t?"Ready":"Required"}</small></div></div>`}function oe(e){const t=String(e||"").toLowerCase();return["approved","confirmed","completed","paid","posted"].includes(t)?"badge-green":["pending","requested","processing","review"].includes(t)?"badge-accent":["rejected","failed","cancelled","canceled"].includes(t)?"badge-red":"badge"}function de(e){return e==="withdraw"?"Withdrawal":e==="ledger"?"Ledger entry":"Deposit"}function L(e){return String(e||"").replace(/[_-]/g," ").replace(/\b\w/g,t=>t.toUpperCase())}function ze(e){return L(e)}function Qe(e){const t=Math.max(0,Math.floor(e/1e3)),s=Math.floor(t/3600),n=Math.floor(t%3600/60),r=t%60;return`${String(s).padStart(2,"0")}:${String(n).padStart(2,"0")}:${String(r).padStart(2,"0")}`}function Ke(e){return new Date(Number(e)).toLocaleString("en-US",{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})}function Oe(e){const t=Number(e||0);return t>=1024*1024?`${(t/1024/1024).toFixed(1)} MB`:t>=1024?`${Math.round(t/1024)} KB`:`${t} B`}function le(e){const t=String(e||"").trim(),s=Number(t);if(Number.isFinite(s)&&s>0)return s>1e10?s:s*1e3;const n=Date.parse(t);return Number.isFinite(n)?n:0}function ce(e){const t=le(e);return t?new Date(t).toLocaleString("en-US",{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"}):"--"}export{Ye as cleanup,Xe as mount,Ge as render};
