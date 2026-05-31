import{i as o,e as s,t as r,c as g,b as f}from"./main-BvBtKEZ9.js";let w=[];function h(){return`
    <div class="space-y-6 animate-fade-in">
      <section class="news-hero card">
        <div class="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span class="badge-accent">${s(r("news.badge"))}</span>
            <h1 class="mt-2 text-3xl font-black">${s(r("news.title"))}</h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-muted">${s(r("news.subtitle"))}</p>
          </div>
          <button class="btn-primary btn-sm self-start md:self-auto" id="refresh-news">${o.refresh} ${s(r("common.refresh"))}</button>
        </div>
      </section>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="news-grid">
        <div class="skeleton h-48 rounded-lg"></div>
        <div class="skeleton h-48 rounded-lg"></div>
        <div class="skeleton h-48 rounded-lg"></div>
      </div>
    </div>`}function k(e){u(e),e.querySelector("#refresh-news")?.addEventListener("click",()=>u(e)),e.addEventListener("click",v),e.addEventListener("keydown",$)}async function u(e){try{const t=g(),a=await f(`/news/list.php?lang=${encodeURIComponent(t)}`,{timeout:6e3}),c=e.querySelector("#news-grid");if(!c||!a)return;const n=a.items||[];if(w=n,!n.length){c.innerHTML=`<p class="text-muted text-sm col-span-full text-center py-12">${s(r("news.empty"))}</p>`;return}c.innerHTML=n.map((l,d)=>b(l,d)).join("")}catch(t){const a=e.querySelector("#news-grid");a&&(a.innerHTML=`<p class="text-red text-sm col-span-full text-center py-8">${s(t.message)}</p>`)}}function b(e,t){const a=m(e),c=e.image_url?`<img src="${s(e.image_url)}" class="news-card-media" loading="lazy" alt="${s(a.title)}" />`:`<div class="news-card-media news-card-media--fallback">${o.news}</div>`,n=e.source||e.category||"MEX Group";return`<article class="news-card" data-news-index="${t}" role="button" tabindex="0" aria-label="${s(a.title)}">
    ${c}
    <div class="p-4 space-y-2">
      <div class="flex items-center justify-between gap-3">
        <span class="badge-accent">${s(n)}</span>
        <span class="text-[10px] text-muted">${s(e.published_at||e.created_at||"")}</span>
      </div>
      <h3 class="text-base font-black leading-snug line-clamp-2">${s(a.title)}</h3>
      <p class="text-xs leading-5 text-muted line-clamp-3">${s(a.excerpt)}</p>
      <div class="flex items-center gap-2 text-[11px] font-bold text-accent">
        <span>${s(r("news.readMore"))}</span>
        <span aria-hidden="true">&rarr;</span>
      </div>
    </div>
  </article>`}function m(e){const a=g()==="ar",c=a&&(e.title_ar||e.titleAr)||e.title_en||e.title||e.headline||"MEX Group Update",n=a&&(e.body_ar||e.bodyAr)||e.body_en||e.body||e.excerpt||"",l=a&&(e.excerpt_ar||e.excerptAr)||e.excerpt_en||e.excerpt||n;return{title:c,body:n,excerpt:l}}function v(e){const t=e.target.closest("[data-news-index]");t&&x(Number(t.dataset.newsIndex||0))}function $(e){if(e.key!=="Enter"&&e.key!==" ")return;const t=e.target.closest("[data-news-index]");t&&(e.preventDefault(),x(Number(t.dataset.newsIndex||0)))}function x(e){const t=w[e];if(!t)return;const a=m(t),c=t.image_url?`<img src="${s(t.image_url)}" class="news-dialog-media" alt="${s(a.title)}" />`:`<div class="news-dialog-media news-dialog-media--fallback">${o.news}</div>`,n=t.source||t.category||"MEX Group",l=document.createElement("div");l.className="dialog-backdrop news-dialog-backdrop",l.innerHTML=`
    <article class="dialog-card news-dialog-panel" role="dialog" aria-modal="true" aria-label="${s(a.title)}">
      <button class="dialog-close" data-news-close aria-label="${s(r("common.close"))}">${o.close}</button>
      ${c}
      <div class="news-dialog-body">
        <div class="flex flex-wrap items-center gap-2">
          <span class="badge-accent">${s(n)}</span>
          <span class="text-[11px] text-muted">${s(t.published_at||t.created_at||"")}</span>
        </div>
        <h2>${s(a.title)}</h2>
        <p>${s(a.body||a.excerpt)}</p>
        ${t.url?`<a class="btn-primary self-start" href="${s(t.url)}" target="_blank" rel="noopener">${s(r("news.openSource"))}</a>`:""}
      </div>
    </article>`;const d=i=>{i.key==="Escape"&&p()},p=()=>{document.removeEventListener("keydown",d),l.remove()};l.addEventListener("click",i=>{(i.target===l||i.target.closest("[data-news-close]"))&&p()}),document.addEventListener("keydown",d),document.body.appendChild(l)}export{k as mount,h as render};
