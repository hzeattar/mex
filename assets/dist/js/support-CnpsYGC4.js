import{e as n,g as o,b as l,h as p}from"./main-Ca1FYfWG.js";function u(){return`
    <div class="space-y-6 animate-fade-in">
      <section class="card">
        <div class="flex items-center justify-between">
          <div>
            <span class="badge-accent">Support</span>
            <h1 class="text-xl font-bold mt-1">Help Center</h1>
            <p class="text-muted text-sm">Create tickets and get help from the support team.</p>
          </div>
          <a class="btn-ghost btn-sm" href="mailto:${n(o("brand.support_email")||"support@mexgroup.com")}">Email</a>
        </div>
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section class="card">
          <h2 class="font-semibold mb-4">New Ticket</h2>
          <form class="space-y-4" id="support-form">
            <label class="block"><span class="text-xs text-muted">Subject</span><input type="text" name="subject" class="input mt-1" maxlength="190" required /></label>
            <label class="block"><span class="text-xs text-muted">Priority</span>
              <select name="priority" class="input mt-1"><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select>
            </label>
            <label class="block"><span class="text-xs text-muted">Message</span><textarea name="message" class="input mt-1" rows="5" required></textarea></label>
            <button type="submit" class="btn-primary w-full">Create Ticket</button>
            <p class="text-xs text-center" id="support-status"></p>
          </form>
        </section>

        <section class="card">
          <h2 class="font-semibold mb-4">Your Tickets</h2>
          <div id="tickets-list"><p class="text-muted text-sm text-center py-8">Loading...</p></div>
        </section>
      </div>
    </div>`}function x(s){c(s),s.querySelector("#support-form")?.addEventListener("submit",a=>d(a,s))}async function c(s){try{const a=await l("/support/list.php",{timeout:6e3}),i=s.querySelector("#tickets-list");if(!i||!a)return;const t=a.items||[];if(!t.length){i.innerHTML='<p class="text-muted text-sm text-center py-4">No tickets yet.</p>';return}i.innerHTML=`<div class="space-y-2">${t.map(e=>`
      <div class="p-3 rounded-lg bg-panel-2/50 border border-line/50">
        <div class="flex justify-between items-start">
          <strong class="text-sm">${n(e.subject||"--")}</strong>
          <span class="badge ${e.status==="open"?"badge-green":"badge-accent"}">${n(e.status||"open")}</span>
        </div>
        <div class="text-[11px] text-muted mt-1">${n(e.priority||"normal")} - ${n(e.updated_at||e.created_at||"")}</div>
      </div>`).join("")}</div>`}catch{}}async function d(s,a){s.preventDefault();const i=s.target,t=a.querySelector("#support-status");try{t&&(t.textContent="Submitting...");const e=Object.fromEntries(new FormData(i)),r=await p("/support/create.php",e);r&&r.ok!==!1?(t&&(t.textContent="Ticket created!",t.className="text-xs text-center text-green"),i.reset(),c(a)):t&&(t.textContent=r?.error||"Failed",t.className="text-xs text-center text-red")}catch(e){t&&(t.textContent=e.message,t.className="text-xs text-center text-red")}}export{x as mount,u as render};
