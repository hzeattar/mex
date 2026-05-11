// News View
import { get, set } from '../state/store.js';
import { esc } from '../utils/format.js';
import { api } from '../services/api.js';
import { icons } from '../components/common/Icons.js';

export function render() {
  return `
    <div class="space-y-6 animate-fade-in">
      <section class="card">
        <div class="flex items-center justify-between">
          <div>
            <span class="badge-accent">News</span>
            <h1 class="text-xl font-bold mt-1">Platform Updates</h1>
            <p class="text-muted text-sm">Announcements, market notes, and operational updates.</p>
          </div>
          <button class="btn-ghost btn-sm" id="refresh-news">${icons.refresh} Refresh</button>
        </div>
      </section>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="news-grid">
        <div class="skeleton h-48 rounded-lg"></div>
        <div class="skeleton h-48 rounded-lg"></div>
        <div class="skeleton h-48 rounded-lg"></div>
      </div>
    </div>`;
}

export function mount(container) {
  loadNews(container);
  container.querySelector('#refresh-news')?.addEventListener('click', () => loadNews(container));
}

async function loadNews(container) {
  try {
    const data = await api('/news/list.php?lang=en', { timeout: 6000 });
    const grid = container.querySelector('#news-grid');
    if (!grid || !data) return;
    const items = data.items || [];
    if (!items.length) { grid.innerHTML = `<p class="text-muted text-sm col-span-full text-center py-12">No news articles yet.</p>`; return; }
    grid.innerHTML = items.map(newsCard).join('');
  } catch (e) {
    container.querySelector('#news-grid').innerHTML = `<p class="text-red text-sm col-span-full text-center py-8">${esc(e.message)}</p>`;
  }
}

function newsCard(item) {
  const img = item.image_url ? `<img src="${esc(item.image_url)}" class="w-full h-32 object-cover rounded-t-lg" loading="lazy" />` : `<div class="h-32 rounded-t-lg bg-gradient-to-br from-accent/20 to-panel-2 grid place-items-center">${icons.news}</div>`;
  return `<article class="card p-0 overflow-hidden hover:border-accent/30 transition-colors">
    ${img}
    <div class="p-4 space-y-2">
      <h3 class="font-semibold text-sm line-clamp-2">${esc(item.title_en || item.title || '--')}</h3>
      <p class="text-xs text-muted line-clamp-3">${esc(item.body_en || item.excerpt || '')}</p>
      <div class="text-[10px] text-muted">${esc(item.published_at || item.created_at || '')}</div>
    </div>
  </article>`;
}
