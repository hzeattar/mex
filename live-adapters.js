(function(w){
  function resolveApiPath(path){
    try{
      const raw = String(path || '').trim();
      if(!raw) return raw;
      if (/^https?:\/\//i.test(raw)) return raw;
      const apiBase = String((w && w.__API_BASE) || '/api').trim().replace(/\/$/, '');
      if (raw.startsWith(apiBase + '/')) return raw;
      if (raw.startsWith('/api/')) return raw;
      if (raw.startsWith('/')) return apiBase + raw;
      return apiBase + '/' + raw.replace(/^\/+/, '');
    }catch(e){ return String(path || ''); }
  }
  async function fetchJson(path, timeoutMs){
    const finalPath = resolveApiPath(path);
    const controller = new AbortController();
    const t = setTimeout(()=>{ try{ controller.abort(); }catch(e){} }, Math.max(500, Number(timeoutMs||4500)));
    try{
      const res = await fetch(finalPath, {
        credentials:'same-origin',
        signal: controller.signal,
        cache:'no-store',
        headers:{'Accept':'application/json'}
      });
      const txt = await res.text();
      try{ return JSON.parse(txt); }catch(e){ return { ok:false, error:`HTTP ${res.status}`, items:[] }; }
    }finally{ clearTimeout(t); }
  }
  w.VPLiveAdapters = { fetchJson, resolveApiPath };
})(window);
