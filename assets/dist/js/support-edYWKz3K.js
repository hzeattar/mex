import{j as s,k as r,h as e,g as o}from"./main-v-tQbWh8.js";function i(){const a=s("brand")||{},n=s("support")||{},t=a.whatsapp_support_url||n.whatsapp_url||"",p=/^https?:\/\//i.test(String(t));return`
    <div class="support-whatsapp-page animate-fade-in">
      <section class="card support-whatsapp-card">
        <span class="support-whatsapp-logo">${r.whatsapp}</span>
        <div>
          <span class="badge-green">Support</span>
          <h1>WhatsApp desk</h1>
          <p>${p?"Open a direct support chat for funding, KYC, and trading help.":"WhatsApp support is not configured yet."}</p>
        </div>
        ${p?`<a class="btn-primary" href="${e(t)}" target="_blank" rel="noopener">Open WhatsApp</a>`:`<button class="btn-ghost" disabled>${o("Setup required")}</button>`}
      </section>
    </div>`}function d(){}export{d as mount,i as render};
