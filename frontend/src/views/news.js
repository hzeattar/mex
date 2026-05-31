// News View
import { esc } from '../utils/format.js';
import { api } from '../services/api.js';
import { icons } from '../components/common/Icons.js';
import { currentLocale, t } from '../utils/i18n.js';

let activeNewsItems = [];

export function render() {
  return `
    <div class="space-y-6 animate-fade-in">
      <section class="news-hero card">
        <div class="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span class="badge-accent">${esc(t('news.badge'))}</span>
            <h1 class="mt-2 text-3xl font-black">${esc(t('news.title'))}</h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-muted">${esc(t('news.subtitle'))}</p>
          </div>
          <button class="btn-primary btn-sm self-start md:self-auto" id="refresh-news">${icons.refresh} ${esc(t('common.refresh'))}</button>
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
  container.addEventListener('click', onNewsClick);
  container.addEventListener('keydown', onNewsKeydown);
}

async function loadNews(container) {
  try {
    const lang = currentLocale();
    const data = await api(`/news/list.php?lang=${encodeURIComponent(lang)}`, { timeout: 6000 });
    const grid = container.querySelector('#news-grid');
    if (!grid || !data) return;
    const items = data.items || [];
    activeNewsItems = items;
    if (!items.length) {
      grid.innerHTML = `<p class="text-muted text-sm col-span-full text-center py-12">${esc(t('news.empty'))}</p>`;
      return;
    }
    grid.innerHTML = items.map((item, index) => newsCard(item, index)).join('');
    bindNewsCards(grid);
  } catch (e) {
    const grid = container.querySelector('#news-grid');
    if (grid) grid.innerHTML = `<p class="text-red text-sm col-span-full text-center py-8">${esc(e.message)}</p>`;
  }
}

function bindNewsCards(grid) {
  grid.querySelectorAll('[data-news-index]').forEach((card) => {
    const open = (event) => {
      event.stopPropagation();
      openNewsDialog(Number(card.dataset.newsIndex || 0));
    };
    card.addEventListener('click', open);
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      open(event);
    });
  });
}

function newsCard(item, index) {
  const localized = localizeNews(item);
  const img = item.image_url
    ? `<img src="${esc(item.image_url)}" class="news-card-media" loading="lazy" alt="${esc(localized.title)}" />`
    : `<div class="news-card-media news-card-media--fallback">${icons.news}</div>`;
  const source = item.source || item.category || 'MEX Group';
  return `<article class="news-card" data-news-index="${index}" role="button" tabindex="0" aria-label="${esc(localized.title)}">
    ${img}
    <div class="p-4 space-y-2">
      <div class="flex items-center justify-between gap-3">
        <span class="badge-accent">${esc(source)}</span>
        <span class="text-[10px] text-muted">${esc(item.published_at || item.created_at || '')}</span>
      </div>
      <h3 class="text-base font-black leading-snug line-clamp-2">${esc(localized.title)}</h3>
      <p class="text-xs leading-5 text-muted line-clamp-3">${esc(localized.excerpt)}</p>
      <div class="flex items-center gap-2 text-[11px] font-bold text-accent">
        <span>${esc(t('news.readMore'))}</span>
        <span aria-hidden="true">&rarr;</span>
      </div>
    </div>
  </article>`;
}

function localizeNews(item) {
  const lang = currentLocale();
  const isAr = lang === 'ar';
  const title = (isAr && (item.title_ar || item.titleAr)) || item.title_en || item.title || item.headline || 'MEX Group Update';
  const body = (isAr && (item.body_ar || item.bodyAr)) || item.body_en || item.body || item.excerpt || '';
  const excerpt = (isAr && (item.excerpt_ar || item.excerptAr)) || item.excerpt_en || item.excerpt || body;
  return { title, body, excerpt };
}

function onNewsClick(event) {
  const card = event.target.closest('[data-news-index]');
  if (!card) return;
  openNewsDialog(Number(card.dataset.newsIndex || 0));
}

function onNewsKeydown(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const card = event.target.closest('[data-news-index]');
  if (!card) return;
  event.preventDefault();
  openNewsDialog(Number(card.dataset.newsIndex || 0));
}

function openNewsDialog(index) {
  const item = activeNewsItems[index];
  if (!item) return;
  const localized = localizeNews(item);
  const img = item.image_url
    ? `<img src="${esc(item.image_url)}" class="news-dialog-media" alt="${esc(localized.title)}" />`
    : `<div class="news-dialog-media news-dialog-media--fallback">${icons.news}</div>`;
  const source = item.source || item.category || 'MEX Group';
  const dialog = document.createElement('div');
  dialog.className = 'dialog-backdrop news-dialog-backdrop';
  dialog.innerHTML = `
    <article class="dialog-card news-dialog-panel" role="dialog" aria-modal="true" aria-label="${esc(localized.title)}">
      <button class="dialog-close" data-news-close aria-label="${esc(t('common.close'))}">${icons.close}</button>
      ${img}
      <div class="news-dialog-body">
        <div class="flex flex-wrap items-center gap-2">
          <span class="badge-accent">${esc(source)}</span>
          <span class="text-[11px] text-muted">${esc(item.published_at || item.created_at || '')}</span>
        </div>
        <h2>${esc(localized.title)}</h2>
        <p>${esc(localized.body || localized.excerpt)}</p>
        ${item.url ? `<a class="btn-primary self-start" href="${esc(item.url)}" target="_blank" rel="noopener">${esc(t('news.openSource'))}</a>` : ''}
      </div>
    </article>`;
  const handleEscape = (event) => {
    if (event.key === 'Escape') close();
  };
  const close = () => {
    document.removeEventListener('keydown', handleEscape);
    dialog.remove();
  };
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog || event.target.closest('[data-news-close]')) close();
  });
  document.addEventListener('keydown', handleEscape);
  document.body.appendChild(dialog);
}
