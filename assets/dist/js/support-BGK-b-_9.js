import{t,l as y,e as S,j as _,k as L,h as m,g as n,c as $,u as w}from"./main-BjF5hH3U.js";const T=["general","deposit","withdrawal","trading","account","complaint"];function h(a){return{general:t("support.reason.general","General question"),deposit:t("support.reason.deposit","Deposit issue"),withdrawal:t("support.reason.withdrawal","Withdrawal issue"),trading:t("support.reason.trading","Trading issue"),account:t("support.reason.account","Account / KYC"),complaint:t("support.reason.complaint","Complaint")}[a]||a}function v(a){const r=String(a||"").toLowerCase();return{open:t("support.status.open","Open"),pending:t("support.status.pending","Pending"),answered:t("support.status.answered","Answered"),resolved:t("support.status.resolved","Resolved"),closed:t("support.status.closed","Closed")}[r]||r}function q(a){const r=String(a||"").toLowerCase();return r==="resolved"||r==="closed"?"is-closed":r==="answered"?"is-answered":"is-open"}function j(){const a=_("brand")||{},r=_("support")||{},e=a.whatsapp_support_url||r.whatsapp_url||"",o=/^https?:\/\//i.test(String(e));return`
    <div class="support-whatsapp-page animate-fade-in">
      <section class="card support-whatsapp-card">
        <span class="support-whatsapp-logo">${L.whatsapp}</span>
        <div>
          <span class="badge-green">${t("support.badge","Support")}</span>
          <h1>${t("support.whatsapp_desk","WhatsApp desk")}</h1>
          <p>${o?t("support.whatsapp_desc","Open a direct support chat for funding, KYC, and trading help."):t("support.whatsapp_not_configured","WhatsApp support is not configured yet.")}</p>
        </div>
        ${o?`<a class="btn-primary" href="${m(e)}" target="_blank" rel="noopener">${t("support.open_whatsapp","Open WhatsApp")}</a>`:`<button class="btn-ghost" disabled>${n(t("support.setup_required","Setup required"))}</button>`}
      </section>

      <section class="card support-ticket-card">
        <div class="support-ticket-head">
          <h2>${t("support.new_ticket","Submit a complaint or request")}</h2>
          <p>${t("support.new_ticket_desc","Our team replies inside the platform. Track every ticket below.")}</p>
        </div>
        <form class="support-ticket-form" data-ticket-form>
          <label class="support-field">
            <span>${t("support.field.reason","Topic")}</span>
            <select name="reason_code" class="input">
              ${T.map(s=>`<option value="${s}">${n(h(s))}</option>`).join("")}
            </select>
          </label>
          <label class="support-field">
            <span>${t("support.field.subject","Subject")}</span>
            <input name="subject" class="input" maxlength="190" placeholder="${m(t("support.field.subject_ph","Short summary (optional)"))}" />
          </label>
          <label class="support-field">
            <span>${t("support.field.message","Message")}</span>
            <textarea name="message" class="input" rows="4" maxlength="4000" required placeholder="${m(t("support.field.message_ph","Describe your issue in detail..."))}"></textarea>
          </label>
          <div class="support-form-foot">
            <span class="text-xs support-form-status" data-ticket-status></span>
            <button type="submit" class="btn-primary">${t("support.submit_ticket","Submit ticket")}</button>
          </div>
        </form>
      </section>

      <section class="card support-list-card">
        <div class="support-ticket-head">
          <h2>${t("support.my_tickets","My tickets")}</h2>
        </div>
        <div data-ticket-list>
          <p class="text-xs text-slate-400">${t("common.loading","Loading...")}</p>
        </div>
      </section>

      <section class="card support-detail-card" data-ticket-detail hidden></section>
    </div>`}function i(a,r,e="info"){a&&(a.textContent=r,a.className=`text-xs support-form-status is-${e}`)}async function g(a){const r=a.querySelector("[data-ticket-list]");if(!r)return;let e=null;try{e=await $("/support/list.php")}catch{}if(!e||e.ok===!1){r.innerHTML=`<p class="text-xs text-red-400">${n(e?.error||t("common.request_failed","Request failed"))}</p>`;return}const o=Array.isArray(e.items)?e.items:[];if(!o.length){r.innerHTML=`<p class="text-xs text-slate-400">${t("support.no_tickets","No tickets yet. Your requests will appear here.")}</p>`;return}r.innerHTML=o.map(s=>`
    <button type="button" class="support-ticket-row" data-ticket-id="${Number(s.id)}">
      <div class="support-ticket-row-main">
        <strong>#${Number(s.id)} · ${n(s.subject||h(s.reason_code))}</strong>
        <small>${n(s.last_message_preview||"")}</small>
      </div>
      <div class="support-ticket-row-meta">
        <span class="support-status-pill ${q(s.status)}">${n(v(s.status))}</span>
        ${s.has_unread?`<span class="support-unread-dot">${Number(s.unread_count)||""}</span>`:""}
        <small>${s.last_message_created_at?n(w(Number(s.last_message_created_at))):""}</small>
      </div>
    </button>`).join(""),r.querySelectorAll("[data-ticket-id]").forEach(s=>{s.addEventListener("click",()=>b(a,Number(s.dataset.ticketId)))})}async function b(a,r){const e=a.querySelector("[data-ticket-detail]");if(!e||!r)return;e.hidden=!1,e.innerHTML=`<p class="text-xs text-slate-400">${t("common.loading","Loading...")}</p>`;let o=null;try{o=await $(`/support/get.php?id=${r}`)}catch{}if(!o||o.ok===!1){e.innerHTML=`<p class="text-xs text-red-400">${n(o?.error||t("common.request_failed","Request failed"))}</p>`;return}const s=o.ticket||{},c=Array.isArray(o.messages)?o.messages:[];e.innerHTML=`
    <div class="support-ticket-head support-detail-head">
      <div>
        <h2>#${Number(s.id)} · ${n(s.subject||h(s.reason_code))}</h2>
        <span class="support-status-pill ${q(s.status)}">${n(v(s.status))}</span>
      </div>
      <button type="button" class="btn-ghost support-detail-close" data-ticket-close>${t("common.close","Close")}</button>
    </div>
    <div class="support-thread">
      ${c.map(p=>`
        <div class="support-msg ${p.sender==="user"?"is-user":"is-admin"}">
          <small>${p.sender==="user"?t("support.you","You"):t("support.team","Support team")} · ${n(w(Number(p.created_at)))}</small>
          <p>${n(p.content)}</p>
        </div>`).join("")}
    </div>
    <form class="support-reply-form" data-reply-form>
      <textarea name="message" class="input" rows="2" maxlength="4000" required placeholder="${m(t("support.reply_ph","Write a reply..."))}"></textarea>
      <div class="support-form-foot">
        <span class="text-xs support-form-status" data-reply-status></span>
        <button type="submit" class="btn-primary">${t("support.send_reply","Send reply")}</button>
      </div>
    </form>`;const u=e.querySelector(".support-thread");u&&(u.scrollTop=u.scrollHeight),e.querySelector("[data-ticket-close]")?.addEventListener("click",()=>{e.hidden=!0,e.innerHTML="",g(a)}),e.querySelector("[data-reply-form]")?.addEventListener("submit",async p=>{p.preventDefault();const f=p.currentTarget,l=e.querySelector("[data-reply-status]"),k=String(new FormData(f).get("message")||"").trim();if(!k)return i(l,t("support.message_required","Message is required"),"error");i(l,t("support.sending","Sending..."),"info");let d=null;try{d=await y("/support/reply.php",{ticket_id:r,message:k})}catch(x){return i(l,x?.message||t("common.request_failed","Request failed"),"error")}if(!d||d.ok===!1)return i(l,d?.error||t("common.request_failed","Request failed"),"error");b(a,r)}),e.scrollIntoView({behavior:"smooth",block:"start"})}function M(a){const r=a||document;g(r);const e=r.querySelector("[data-ticket-form]");e&&e.addEventListener("submit",async o=>{o.preventDefault();const s=r.querySelector("[data-ticket-status]"),c=new FormData(e),u=String(c.get("message")||"").trim();if(!u)return i(s,t("support.message_required","Message is required"),"error");i(s,t("support.sending","Sending..."),"info");let p=null;try{p=await y("/support/create.php",{reason_code:String(c.get("reason_code")||"general"),subject:String(c.get("subject")||"").trim(),message:u,lang:S()})}catch(f){return i(s,f?.message||t("common.request_failed","Request failed"),"error")}if(!p||p.ok===!1)return i(s,p?.error||t("common.request_failed","Request failed"),"error");e.reset(),i(s,t("support.ticket_created","Ticket submitted. Our team will reply soon."),"success"),g(r),p.ticket_id&&b(r,Number(p.ticket_id))})}export{M as mount,j as render};
