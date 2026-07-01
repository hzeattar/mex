import{k as p,g as s,v as r,e as m,c as y}from"./main-EAQdaZsU.js";let f=[];function E(){return`
    <div class="space-y-6 animate-fade-in">
      <section class="news-hero card">
        <div class="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span class="badge-accent">${s(r("news.badge"))}</span>
            <h1 class="mt-2 text-3xl font-black">${s(r("news.title"))}</h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-muted">${s(r("news.subtitle"))}</p>
          </div>
          <button class="btn-primary btn-sm self-start md:self-auto" id="refresh-news">${p.refresh} ${s(r("common.refresh"))}</button>
        </div>
      </section>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="news-grid">
        <div class="skeleton h-48 rounded-lg"></div>
        <div class="skeleton h-48 rounded-lg"></div>
        <div class="skeleton h-48 rounded-lg"></div>
      </div>
    </div>`}let d=null;function L(e){d=e,w(e),e.querySelector("#refresh-news")?.addEventListener("click",()=>w(e)),e.addEventListener("click",b),e.addEventListener("keydown",v)}function _(){d&&(d.removeEventListener("click",b),d.removeEventListener("keydown",v),d=null)}async function w(e){try{const t=m(),a=await y(`/news/list.php?lang=${encodeURIComponent(t)}`,{timeout:6e3}),n=e.querySelector("#news-grid");if(!n||!a)return;const l=a.items||[];if(f=l,!l.length){n.innerHTML=`<p class="text-muted text-sm col-span-full text-center py-12">${s(r("news.empty"))}</p>`;return}n.innerHTML=l.map((c,i)=>k(c,i)).join(""),$(n)}catch(t){const a=e.querySelector("#news-grid");a&&(a.innerHTML=`<p class="text-red text-sm col-span-full text-center py-8">${s(t.message)}</p>`)}}function $(e){e.querySelectorAll("[data-news-index]").forEach(t=>{const a=n=>{n.stopPropagation(),u(Number(t.dataset.newsIndex||0))};t.addEventListener("click",a),t.addEventListener("keydown",n=>{n.key!=="Enter"&&n.key!==" "||(n.preventDefault(),a(n))})})}function k(e,t){const a=x(e),n=e.image_url?`<img src="${s(e.image_url)}" class="news-card-media" loading="lazy" alt="${s(a.title)}" />`:`<div class="news-card-media news-card-media--fallback">${p.news}</div>`,l=e.source||e.category||"MEX Group";return`<article class="news-card" data-news-index="${t}" role="button" tabindex="0" aria-label="${s(a.title)}">
    ${n}
    <div class="p-4 space-y-2">
      <div class="flex items-center justify-between gap-3">
        <span class="badge-accent">${s(l)}</span>
        <span class="text-[10px] text-muted">${s(e.published_at||e.created_at||"")}</span>
      </div>
      <h3 class="text-base font-black leading-snug line-clamp-2">${s(a.title)}</h3>
      <p class="text-xs leading-5 text-muted line-clamp-3">${s(a.excerpt)}</p>
      <div class="flex items-center gap-2 text-[11px] font-bold text-accent">
        <span>${s(r("news.readMore"))}</span>
        <span aria-hidden="true">&rarr;</span>
      </div>
    </div>
  </article>`}function x(e){const a=m()==="ar",n=a&&(e.title_ar||e.titleAr)||e.title_en||e.title||e.headline||"MEX Group Update",l=a&&(e.body_ar||e.bodyAr)||e.body_en||e.body||e.excerpt||"",c=a&&(e.excerpt_ar||e.excerptAr)||e.excerpt_en||e.excerpt||l;return{title:n,body:l,excerpt:c}}function b(e){const t=e.target.closest("[data-news-index]");t&&u(Number(t.dataset.newsIndex||0))}function v(e){if(e.key!=="Enter"&&e.key!==" ")return;const t=e.target.closest("[data-news-index]");t&&(e.preventDefault(),u(Number(t.dataset.newsIndex||0)))}function u(e){const t=f[e];if(!t)return;const a=x(t),n=t.image_url?`<img src="${s(t.image_url)}" class="news-dialog-media" alt="${s(a.title)}" />`:`<div class="news-dialog-media news-dialog-media--fallback">${p.news}</div>`,l=t.source||t.category||"MEX Group",c=document.createElement("div");c.className="dialog-backdrop news-dialog-backdrop",c.innerHTML=`
    <article class="dialog-card news-dialog-panel" role="dialog" aria-modal="true" aria-label="${s(a.title)}">
      <button class="dialog-close" data-news-close aria-label="${s(r("common.close"))}">${p.close}</button>
      ${n}
      <div class="news-dialog-body">
        <div class="flex flex-wrap items-center gap-2">
          <span class="badge-accent">${s(l)}</span>
          <span class="text-[11px] text-muted">${s(t.published_at||t.created_at||"")}</span>
        </div>
        <h2>${s(a.title)}</h2>
        <p>${s(a.body||a.excerpt)}</p>
        ${t.url?`<a class="btn-primary self-start" href="${s(t.url)}" target="_blank" rel="noopener">${s(r("news.openSource"))}</a>`:""}
      </div>
    </article>`;const i=o=>{o.key==="Escape"&&g()},g=()=>{document.removeEventListener("keydown",i),c.remove()};c.addEventListener("click",o=>{(o.target===c||o.target.closest("[data-news-close]"))&&g()}),document.addEventListener("keydown",i),document.body.appendChild(c)}export{_ as cleanup,L as mount,E as render};
