import{i as c,j as l,f as e,m as o,g as w}from"./main-CrCNAud6.js";function U(){const a=c("user")||{},s=c("kyc")||{},n=c("level")||{},m=c("wallet")||{},f=c("brand")||{},y=c("support")||{},r=c("mode")==="real"?"real":"demo",t=r==="real"?m.real||{}:m.demo||{},i=n.current||a.user_level||{},p=n.next||a.next_level||null,h=Number(n.confirmed_deposit_total??a.confirmed_deposit_total??0),d=Number(p?.min_deposit_total||0),S=d>0?Math.min(100,Math.round(h/d*100)):100,k=d>0?Math.max(0,d-h):0,v=a.display_name||a.name||a.username||a.email||"Client",x=String(v).trim().charAt(0).toUpperCase()||"U",b=String(s.status||"not submitted").replace(/_/g," "),g=f.whatsapp_support_url||y.whatsapp_url||"",$=/^https?:\/\//i.test(String(g));return`
    <div class="account-page account-page-pro account-page-lean animate-fade-in">
      <a href="#/home" class="account-mobile-back">${l.back}<span>Dashboard</span></a>

      <section class="account-hero account-hero-lean">
        <div class="account-hero-main">
          <div class="account-avatar">${e(x)}</div>
          <div class="min-w-0">
            <div class="account-title-row">
              <h1>${e(v)}</h1>
              ${A(i)}
              <span class="status-chip ${r==="real"?"status-chip-live":"status-chip-derived"}">${r==="real"?"Real account":"Demo account"}</span>
            </div>
            <p class="text-muted text-sm truncate">${e(a.email||"No email attached")}</p>
            <div class="account-lean-metrics">
              ${u("KYC",_(b),s.status==="approved"?"text-buy":"")}
              ${u("Available",`${o(t.available||0)} ${t.currency||"USDT"}`)}
              ${u("In use",`${o(t.holds||0)} ${t.currency||"USDT"}`)}
            </div>
          </div>
        </div>
        <div class="account-hero-side">
          <span>Level progress</span>
          <strong>${e(i?.name||i?.name_en||i?.level_code||"Starter")}</strong>
          <div class="level-progress"><span style="width:${S}%"></span></div>
          <small>${p?`${o(k)} USDT to ${e(p.name||p.name_en||"next level")}`:"Top level unlocked"}</small>
        </div>
      </section>

      <section class="account-lean-grid">
        <article class="card account-lean-card">
          <span class="account-lean-icon">${l.kyc}</span>
          <div>
            <span class="badge-accent">Verification</span>
            <h2>KYC status</h2>
            <p>${e(_(b))}</p>
          </div>
          <a class="btn-ghost btn-sm" href="#/kyc">View KYC</a>
        </article>

        <article class="card account-lean-card account-wallet-summary">
          <span class="account-lean-icon">${l.wallet}</span>
          <div>
            <span class="badge-green">Wallet</span>
            <h2>${e(t.currency||"USDT")}</h2>
            <p>${r==="real"?"Real wallet selected":"Demo wallet selected"}</p>
          </div>
          <div class="account-wallet-lines">
            <span><small>Total</small><b>${o(t.balance||0)}</b></span>
            <span><small>Available</small><b>${o(t.available||0)}</b></span>
            <span><small>In use</small><b>${o(t.holds||0)}</b></span>
          </div>
        </article>

        <article class="card account-lean-card">
          <span class="account-lean-icon account-whatsapp-icon">${l.whatsapp||l.support}</span>
          <div>
            <span class="badge-green">Support</span>
            <h2>WhatsApp desk</h2>
            <p>${$?"Open a direct support chat.":"WhatsApp support link is not configured yet."}</p>
          </div>
          ${$?`<a class="btn-primary btn-sm" href="${w(g)}" target="_blank" rel="noopener">Open WhatsApp</a>`:'<button class="btn-ghost btn-sm" disabled>Setup required</button>'}
        </article>

        <article class="card account-session-card account-lean-card">
          <span class="account-lean-icon">${l.lock}</span>
          <div>
            <span class="badge-red">Session</span>
            <h2>Sign out</h2>
            <p>Close this client session safely.</p>
          </div>
          <a href="/logout.php" class="btn-danger btn-sm">Logout</a>
        </article>
      </section>
    </div>`}function D(){}function _(a){return String(a||"").replace(/\b\w/g,s=>s.toUpperCase())}function u(a,s,n=""){return`<span><small>${e(a)}</small><b class="${n}">${e(s)}</b></span>`}function A(a){const s=String(a?.level_code||a?.name_en||"starter").toLowerCase().replace(/[^a-z0-9]+/g,"-"),n=a?.name||a?.name_en||a?.level_code||"Starter";return`<span class="level-badge level-badge--${w(s)}">${e(n)}</span>`}export{D as mount,U as render};
