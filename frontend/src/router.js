// Hash-based SPA router with lazy-loaded views
const routes = new Map();
let currentRoute = null;
let beforeHooks = [];

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
  const handler = async () => {
    const { path, params } = currentPath();
    const route = routes.get(path) || routes.get('home');
    if (!route) return;

    for (const hook of beforeHooks) {
      const result = hook(path, params);
      if (result === false) return;
    }

    try {
      if (!route.module) route.module = await route.loader();
      if (currentRoute && currentRoute.cleanup) currentRoute.cleanup();
      container.innerHTML = '';
      currentRoute = route.module;
      if (route.module.render) {
        const html = route.module.render(params);
        if (typeof html === 'string') container.innerHTML = html;
      }
      if (route.module.mount) route.module.mount(container, params);
    } catch (err) {
      console.error('Route error:', err);
      container.innerHTML = `<div class="p-8 text-center text-red">${err.message}</div>`;
    }
  };

  window.addEventListener('hashchange', handler);
  await handler();
}
