(function(w){
  function normalizeType(type){
    try{ return (typeof w.normalizeLiveAssetType === 'function') ? w.normalizeLiveAssetType(type||'crypto') : String(type||'crypto').toLowerCase(); }catch(e){ return String(type||'crypto').toLowerCase(); }
  }
  function canonicalPath(path){
    try{ return (typeof w.vpCanonicalizeLiveApiPath === 'function') ? w.vpCanonicalizeLiveApiPath(path||'') : String(path||''); }catch(e){ return String(path||''); }
  }
  function requestKey(path, type){ return `${normalizeType(type)}::${canonicalPath(path)}`; }
  w.VPLiveSelectors = { normalizeType, canonicalPath, requestKey };
})(window);
