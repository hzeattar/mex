(function(w){
  const inflight = new Map();
  function once(key, factory){
    key = String(key||'');
    if(inflight.has(key)) return inflight.get(key);
    const p = Promise.resolve().then(factory).finally(()=>{ inflight.delete(key); });
    inflight.set(key, p);
    return p;
  }
  w.VPLiveScheduler = { once };
})(window);
