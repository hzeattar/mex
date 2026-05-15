import{i as r,a as d,e as s}from"./main-CD3d5mYX.js";function o(){return`
    <div class="space-y-6 animate-fade-in">
      <section class="card">
        <div class="flex items-center justify-between">
          <div>
            <span class="badge-accent">News</span>
            <h1 class="text-xl font-bold mt-1">Platform Updates</h1>
            <p class="text-muted text-sm">Announcements, market notes, and operational updates.</p>
          </div>
          <button class="btn-ghost btn-sm" id="refresh-news">${r.refresh} Refresh</button>
        </div>
      </section>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="news-grid">
        <div class="skeleton h-48 rounded-lg"></div>
        <div class="skeleton h-48 rounded-lg"></div>
        <div class="skeleton h-48 rounded-lg"></div>
      </div>
    </div>`}function p(e){l(e),e.querySelector("#refresh-news")?.addEventListener("click",()=>l(e))}async function l(e){try{const t=await d("/news/list.php?lang=en",{timeout:6e3}),n=e.querySelector("#news-grid");if(!n||!t)return;const a=t.items||[];if(!a.length){n.innerHTML='<p class="text-muted text-sm col-span-full text-center py-12">No news articles yet.</p>';return}n.innerHTML=a.map(c).join("")}catch(t){e.querySelector("#news-grid").innerHTML=`<p class="text-red text-sm col-span-full text-center py-8">${s(t.message)}</p>`}}function c(e){return`<article class="card p-0 overflow-hidden hover:border-accent/30 transition-colors">
    ${e.image_url?`<img src="${s(e.image_url)}" class="w-full h-32 object-cover rounded-t-lg" loading="lazy" />`:`<div class="h-32 rounded-t-lg bg-gradient-to-br from-accent/20 to-panel-2 grid place-items-center">${r.news}</div>`}
    <div class="p-4 space-y-2">
      <h3 class="font-semibold text-sm line-clamp-2">${s(e.title_en||e.title||"--")}</h3>
      <p class="text-xs text-muted line-clamp-3">${s(e.body_en||e.excerpt||"")}</p>
      <div class="text-[10px] text-muted">${s(e.published_at||e.created_at||"")}</div>
    </div>
  </article>`}export{p as mount,o as render};
