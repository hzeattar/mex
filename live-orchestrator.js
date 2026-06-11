(function(w){
  function ttlFor(type, path){
    const norm = (w.VPLiveSelectors && w.VPLiveSelectors.normalizeType) ? w.VPLiveSelectors.normalizeType(type) : String(type||'crypto').toLowerCase();
    const raw = String(path||'');
    if(norm === 'crypto') return 250;
    if(raw.includes('direct=1')) return 350;
    if(raw.includes('visible=1')) return 650;
    return norm === 'forex' ? 1000 : 1400;
  }
  async function requestQuotes(path, type, timeoutMs){
    const selectors = w.VPLiveSelectors || {};
    const key = selectors.requestKey ? selectors.requestKey(path, type) : `${String(type||'crypto')}::${String(path||'')}`;
    const ttlMs = ttlFor(type, path);
    const cached = w.VPLiveStore && w.VPLiveStore.get ? w.VPLiveStore.get(key, ttlMs) : null;
    if(cached) return cached;
    const run = ()=> (w.VPLiveAdapters && w.VPLiveAdapters.fetchJson ? w.VPLiveAdapters.fetchJson(path, timeoutMs) : fetch(String(path||'')).then(r=>r.json())).then(data=>{
      try{ if(w.VPLiveStore && w.VPLiveStore.set) w.VPLiveStore.set(key, data); }catch(e){}
      return data;
    });
    if(w.VPLiveScheduler && w.VPLiveScheduler.once) return w.VPLiveScheduler.once(key, run);
    return run();
  }
  w.VPLiveOrchestrator = { requestQuotes };
})(window);
