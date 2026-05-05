(function(w){
  const mem = new Map();
  function get(key, ttlMs){
    const hit = mem.get(String(key||''));
    if(!hit) return null;
    if(Number(ttlMs||0) > 0 && (Date.now() - Number(hit.ts||0)) > Number(ttlMs||0)) return null;
    return hit.data || null;
  }
  function set(key, data){ mem.set(String(key||''), { ts: Date.now(), data }); return data; }
  function del(key){ mem.delete(String(key||'')); }
  w.VPLiveStore = { get, set, del };
})(window);
