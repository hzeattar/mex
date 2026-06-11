// Hash-based SPA router with lazy-loaded views
import { t, translateDom } from './utils/i18n.js';

const routes = new Map();
let currentRoute = null;
let beforeHooks = [];
let routeContainer = null;

export function defineRoute(path, loader) {
  routes.set(path, { loader, module: null });
}

export function navigate(path, params = {}) {
  const query = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
  location.hash = `#/${path}${query}`;
}

export function currentPath() {
  const raw = (location.hash || '#/home').replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  return { path: path || 'home', params: Object.fromEntries(new URLSearchParams(query)) };
}

export function onBeforeRoute(fn) {
  beforeHooks.push(fn);
}

export async function startRouter(container) {
  routeContainer = container;
  let navSeq = 0;
  const handler = async () => {
    const myNav = ++navSeq;
    const { path, params } = currentPath();
    const route = routes.get(path) || routes.get('home');
    if (!route) return;

    for (const hook of beforeHooks) {
      if (hook(path, params) === false) return;
    }

    try {
      if (!route.module) route.module = await route.loader();
      if (myNav !== navSeq) return; // a newer navigation superseded this one
      if (currentRoute && currentRoute.cleanup) currentRoute.cleanup();
      container.innerHTML = '';
      currentRoute = route.module;

      // Pass _path so views know which route they are
      const enriched = { ...params, _path: path };
      if (route.module.render) {
        const html = route.module.render(enriched);
        if (typeof html === 'string') container.innerHTML = html;
      }
      if (route.module.mount) route.module.mount(container, enriched);
      translateDom(container);
    } catch (err) {
      console.error('Route error:', err);
      container.innerHTML = `<div class="flex items-center justify-center min-h-[40vh]"><div class="text-center"><p class="text-red text-sm">${err.message || t('common.failed_to_load', 'Page failed to load')}</p><button class="btn-ghost btn-sm mt-3" onclick="location.reload()">${t('common.retry', 'Retry')}</button></div></div>`;
      translateDom(container);
    }
  };

  window.addEventListener('hashchange', handler);
  await handler();
}
