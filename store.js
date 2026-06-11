// Minimal reactive store with subscriber pattern
const listeners = new Map();
let state = {};

export function createStore(initialState) {
  state = structuredClone(initialState);
  return { get, set, subscribe, dispatch };
}

export function get(path) {
  if (!path) return state;
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), state);
}

export function set(path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  let target = state;
  for (const k of keys) {
    if (!target[k] || typeof target[k] !== 'object') target[k] = {};
    target = target[k];
  }
  const prev = target[last];
  target[last] = value;
  if (prev !== value) notify(path, value, prev);
}

export function subscribe(path, fn) {
  if (!listeners.has(path)) listeners.set(path, new Set());
  listeners.get(path).add(fn);
  return () => listeners.get(path)?.delete(fn);
}

export function dispatch(action, payload) {
  const [slice, method] = action.split('/');
  const handler = reducers.get(slice);
  if (handler && handler[method]) handler[method](payload);
}

function notify(path, value, prev) {
  listeners.forEach((fns, key) => {
    if (path.startsWith(key) || key.startsWith(path) || key === '*') {
      fns.forEach((fn) => { try { fn(value, prev, path); } catch (e) { console.error(e); } });
    }
  });
}

const reducers = new Map();
export function registerReducer(name, handler) { reducers.set(name, handler); }
export { state };
