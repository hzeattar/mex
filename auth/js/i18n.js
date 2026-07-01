/* ============================================================
   I18N ENGINE — Language switching for MEX Global website
   - 7 languages with RTL/LTR handling
   - data-i18n attribute-based translation
   - localStorage persistence
   - Professional switcher UI (auto-injected into header)
   ============================================================ */
(function(){
  'use strict';

  const LANGS = {
    ar: { name: 'العربية',  flag: '🇸🇦', dir: 'rtl', short: 'AR' },
    en: { name: 'English',  flag: '🇺🇸', dir: 'ltr', short: 'EN' },
    ru: { name: 'Русский',  flag: '🇷🇺', dir: 'ltr', short: 'RU' },
    tr: { name: 'Türkçe',   flag: '🇹🇷', dir: 'ltr', short: 'TR' },
    es: { name: 'Español',  flag: '🇪🇸', dir: 'ltr', short: 'ES' },
    fr: { name: 'Français', flag: '🇫🇷', dir: 'ltr', short: 'FR' },
    zh: { name: '中文',      flag: '🇨🇳', dir: 'ltr', short: 'ZH' }
  };

  const STORAGE_KEY = 'mex_lang';
  const DEFAULT_LANG = 'ar';

  // Current language state
  let current = DEFAULT_LANG;

  function getDict(lang){
    return (window.TRANSLATIONS && window.TRANSLATIONS[lang]) || {};
  }

  function t(key){
    const dict = getDict(current);
    if (dict[key] != null) return dict[key];
    // Fallback to Arabic
    const ar = getDict('ar');
    if (ar[key] != null) return ar[key];
    return key; // last resort: show the key itself
  }

  /* ------------------------------------------------------------
     Apply translations to all data-i18n elements
     ------------------------------------------------------------ */
  function applyTranslations(){
    // Text content
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (val) el.textContent = val;
    });
    // Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el){
      const key = el.getAttribute('data-i18n-placeholder');
      const val = t(key);
      if (val) el.setAttribute('placeholder', val);
    });
    // HTML content (for elements with inline children)
    document.querySelectorAll('[data-i18n-html]').forEach(function(el){
      const key = el.getAttribute('data-i18n-html');
      const val = t(key);
      if (val) el.innerHTML = val;
    });
    // Title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(function(el){
      const key = el.getAttribute('data-i18n-title');
      const val = t(key);
      if (val) el.setAttribute('title', val);
    });
    // aria-label
    document.querySelectorAll('[data-i18n-aria]').forEach(function(el){
      const key = el.getAttribute('data-i18n-aria');
      const val = t(key);
      if (val) el.setAttribute('aria-label', val);
    });
    // Document title
    const titleKey = document.documentElement.getAttribute('data-page-title');
    if (titleKey){
      const val = t(titleKey);
      if (val) document.title = val;
    }
    // Dynamic translation of hard-coded Arabic title on product subpages
    if (current !== 'ar' && document.title && /[\u0600-\u06FF]/u.test(document.title)) {
      const map = window.TRANSLATIONS && window.TRANSLATIONS._arToEn;
      if (map) {
        let newTitle = document.title;
        for (const ar of Object.keys(map).sort((a,b)=>b.length-a.length)) {
          let idx = newTitle.indexOf(ar);
          while (idx !== -1) {
            newTitle = newTitle.slice(0, idx) + map[ar] + newTitle.slice(idx + ar.length);
            idx = newTitle.indexOf(ar, idx + map[ar].length);
          }
        }
        if (newTitle !== document.title) document.title = newTitle;
      }
    }

    // Translate static Arabic text inside product subpages when a non-Arabic locale is active.
    // The site ships with Arabic hard-coded in many places; this reverse-translates those strings.
    translateHardcodedArabic();
  }

  function translateHardcodedArabic(){
    if (current === 'ar') return;
    const map = window.TRANSLATIONS && window.TRANSLATIONS._arToEn;
    if (!map) return;
    const arKeys = Object.keys(map).sort(function(a, b){ return b.length - a.length; });
    if (!arKeys.length) return;
    const body = document.body || document.documentElement;

    // 1) Text nodes
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
      acceptNode: function(node){
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = node.parentNode;
        if (!p) return NodeFilter.FILTER_REJECT;
        const tag = p.nodeName.toLowerCase();
        if (tag === 'script' || tag === 'style' || tag === 'code' || tag === 'pre') return NodeFilter.FILTER_REJECT;
        if (p.dataset && (p.dataset.i18n || p.dataset.i18nHtml || p.dataset.i18nPlaceholder || p.dataset.i18nTitle || p.dataset.i18nAria)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node = walker.nextNode())) {
      let text = node.nodeValue;
      if (/[\u0600-\u06FF]/u.test(text)) {
        let changed = false;
        for (let i = 0; i < arKeys.length; i++) {
          const ar = arKeys[i];
          let idx = text.indexOf(ar);
          while (idx !== -1) {
            text = text.slice(0, idx) + map[ar] + text.slice(idx + ar.length);
            changed = true;
            idx = text.indexOf(ar, idx + map[ar].length);
          }
        }
        if (changed) node.nodeValue = text;
      }
    }

    // 2) data-label attributes used by products.js price table (kept Arabic; set data-label-en)
    document.querySelectorAll('[data-label]').forEach(function(el){
      const map = window.TRANSLATIONS && window.TRANSLATIONS._arToEn;
      if (!map) return;
      const original = el.getAttribute('data-label-original') || el.getAttribute('data-label');
      if (!el.getAttribute('data-label-original')) el.setAttribute('data-label-original', original);
      const translated = map[original] || original;
      el.setAttribute('data-label-en', translated === original ? '' : translated);
    });
  }

  /* ------------------------------------------------------------
     Set the active language and apply
     ------------------------------------------------------------ */
  function setLang(lang, persist){
    if (!LANGS[lang]) lang = DEFAULT_LANG;
    current = lang;
    if (persist !== false){
      try { localStorage.setItem(STORAGE_KEY, lang); } catch(_){}
      try {
        var d = new Date(); d.setTime(d.getTime() + 365 * 24 * 60 * 60 * 1000);
        document.cookie = 'vp_lang=' + lang + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
      } catch(_){}
    }
    const html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', LANGS[lang].dir);
    html.setAttribute('data-lang', lang);
    applyTranslations();
    updateSwitcherTrigger();
    // Custom event for any listener (e.g. dynamic content)
    document.dispatchEvent(new CustomEvent('lang:changed', { detail: { lang: lang } }));
  }

  /* ------------------------------------------------------------
     Switcher UI — injected into header
     ------------------------------------------------------------ */
  function buildSwitcherDOM(){
    const root = document.createElement('div');
    root.className = 'lang-switcher';
    root.id = 'langSwitcher';
    root.innerHTML =
      '<button type="button" class="lang-switcher__trigger" id="langSwitcherTrigger" aria-haspopup="listbox" aria-expanded="false" aria-label="' + (t('lang.choose') || 'Choose language') + '">' +
        '<span class="lang-switcher__flag" id="langSwitcherFlag">' + LANGS[current].flag + '</span>' +
        '<span class="lang-switcher__short" id="langSwitcherShort">' + LANGS[current].short + '</span>' +
        '<svg class="lang-switcher__caret" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M1 1l4 4 4-4"/></svg>' +
      '</button>' +
      '<div class="lang-switcher__panel" id="langSwitcherPanel" role="listbox" hidden>' +
        '<div class="lang-switcher__head">' +
          '<span class="lang-switcher__title">' + (t('lang.choose') || 'Choose language') + '</span>' +
        '</div>' +
        '<ul class="lang-switcher__list" id="langSwitcherList" role="listbox" aria-label="' + (t('lang.choose') || 'Choose language') + '">' +
          Object.keys(LANGS).map(function(code){
            const L = LANGS[code];
            const isActive = (code === current) ? ' is-active' : '';
            return '<li class="lang-switcher__opt' + isActive + '" role="option" data-lang="' + code + '" aria-selected="' + (code === current) + '">' +
                     '<span class="lang-switcher__opt-flag">' + L.flag + '</span>' +
                     '<span class="lang-switcher__opt-name">' + L.name + '</span>' +
                     '<span class="lang-switcher__opt-short">' + L.short + '</span>' +
                     '<svg class="lang-switcher__opt-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                       '<polyline points="20 6 9 17 4 12"/></svg>' +
                   '</li>';
          }).join('') +
        '</ul>' +
      '</div>';
    return root;
  }

  function updateSwitcherTrigger(){
    const flagEl  = document.getElementById('langSwitcherFlag');
    const shortEl = document.getElementById('langSwitcherShort');
    if (flagEl)  flagEl.textContent  = LANGS[current].flag;
    if (shortEl) shortEl.textContent = LANGS[current].short;
    // Update list active states
    document.querySelectorAll('.lang-switcher__opt').forEach(function(li){
      const isActive = li.dataset.lang === current;
      li.classList.toggle('is-active', isActive);
      li.setAttribute('aria-selected', isActive);
    });
    // Re-apply text in switcher (for the title which uses translation)
    const titleEl = document.querySelector('.lang-switcher__title');
    if (titleEl) titleEl.textContent = t('lang.choose');
    const trigger = document.getElementById('langSwitcherTrigger');
    if (trigger) trigger.setAttribute('aria-label', t('lang.choose'));
  }

  function attachSwitcherEvents(){
    const root    = document.getElementById('langSwitcher');
    const trigger = document.getElementById('langSwitcherTrigger');
    const panel   = document.getElementById('langSwitcherPanel');
    const list    = document.getElementById('langSwitcherList');
    if (!root || !trigger || !panel || !list) return;

    // Track original parent so we can restore after close.
    // Always move panel to <body> when open so position:fixed coordinates
    // are relative to viewport (not blocked by ancestor backdrop-filter
    // / transform creating a containing block).
    const originalParent = panel.parentNode;

    function moveToBody(){
      if (panel.parentNode !== document.body) {
        document.body.appendChild(panel);
        root.classList.add('lang-switcher--detached');
      }
    }
    function restoreParent(){
      if (panel.parentNode === document.body && originalParent && !document.body.isSameNode(originalParent)) {
        originalParent.appendChild(panel);
        root.classList.remove('lang-switcher--detached');
      }
    }

    // Compute the visual bottom edge of the header / floating trigger so
    // the panel slides out as a natural extension of the bar.
    function positionPanel(){
      const isMobile = window.innerWidth <= 768;
      const header = document.getElementById('siteHeader');
      const useHeader = header && !root.classList.contains('lang-switcher--floating');

      let top;
      if (useHeader) {
        const hr = header.getBoundingClientRect();
        top = Math.max(0, Math.round(hr.bottom));
      } else {
        const tr = trigger.getBoundingClientRect();
        top = Math.max(0, Math.round(tr.bottom));
      }

      if (isMobile) {
        // Mobile uses left:12 / right:12 from CSS — only set top.
        panel.style.setProperty('--lang-panel-top', top + 'px');
        panel.style.removeProperty('--lang-panel-right');
        panel.style.removeProperty('--lang-panel-left');
      } else {
        // Desktop: anchor panel under its trigger so it always drops down
        // from the same side as the icon, regardless of LTR/RTL.
        const tr = trigger.getBoundingClientRect();
        const triggerCenter = (tr.left + tr.right) / 2;
        const triggerOnLeftSide = triggerCenter < window.innerWidth / 2;

        panel.style.setProperty('--lang-panel-top', top + 'px');
        if (triggerOnLeftSide) {
          // Anchor panel's LEFT edge to the trigger's LEFT edge → panel extends right.
          const leftPx = Math.max(8, Math.round(tr.left));
          panel.style.setProperty('--lang-panel-left', leftPx + 'px');
          panel.style.setProperty('--lang-panel-right', 'auto');
        } else {
          // Anchor panel's RIGHT edge to the trigger's RIGHT edge → panel extends left.
          const rightPx = Math.max(8, Math.round(window.innerWidth - tr.right));
          panel.style.setProperty('--lang-panel-right', rightPx + 'px');
          panel.style.setProperty('--lang-panel-left', 'auto');
        }
      }
    }

    let trackingHandlersAttached = false;
    function attachTracking(){
      if (trackingHandlersAttached) return;
      window.addEventListener('scroll', positionPanel, { passive: true });
      window.addEventListener('resize', positionPanel);
      trackingHandlersAttached = true;
    }
    function detachTracking(){
      if (!trackingHandlersAttached) return;
      window.removeEventListener('scroll', positionPanel);
      window.removeEventListener('resize', positionPanel);
      trackingHandlersAttached = false;
    }

    function open(){
      moveToBody();
      positionPanel();
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      root.classList.add('is-open');
      attachTracking();
    }
    function close(){
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      root.classList.remove('is-open');
      detachTracking();
      restoreParent();
    }
    function toggle(){
      if (panel.hidden) open(); else close();
    }

    trigger.addEventListener('click', function(e){
      e.stopPropagation();
      toggle();
    });

    list.addEventListener('click', function(e){
      const li = e.target.closest('.lang-switcher__opt');
      if (!li) return;
      const lang = li.dataset.lang;
      if (lang && lang !== current) {
        setLang(lang);
      }
      close();
    });

    document.addEventListener('click', function(e){
      // Click outside closes (root contains trigger; panel may be detached)
      if (!root.contains(e.target) && !panel.contains(e.target) && !panel.hidden) close();
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && !panel.hidden) close();
    });
    window.addEventListener('resize', function(){
      if (panel.hidden) return;
      escapeContainingBlock();
    });
  }

  function injectSwitcher(){
    // Try to inject into header-actions (the right-side button container)
    const actions = document.querySelector('.header-actions');
    if (actions) {
      const sw = buildSwitcherDOM();
      // Insert before the hamburger button (or as first child if no hamburger)
      const hamburger = actions.querySelector('.hamburger');
      if (hamburger) actions.insertBefore(sw, hamburger);
      else actions.insertBefore(sw, actions.firstChild);
      attachSwitcherEvents();
      return;
    }
    // Fallback: try .auth-page-bar (login/register pages may have it)
    const authBar = document.querySelector('.auth-topbar') || document.querySelector('.auth-page__header');
    if (authBar){
      const sw = buildSwitcherDOM();
      authBar.appendChild(sw);
      attachSwitcherEvents();
      return;
    }
    // Final fallback: floating button bottom-left
    const sw = buildSwitcherDOM();
    sw.classList.add('lang-switcher--floating');
    document.body.appendChild(sw);
    attachSwitcherEvents();
  }

  /* ------------------------------------------------------------
     Initial detection — load saved or detect from browser
     ------------------------------------------------------------ */
  function detectInitialLang(){
    try {
      const m = location.search.match(/[?&]lang=([^&#]+)/);
      if (m) {
        const urlLang = decodeURIComponent(m[1]).toLowerCase();
        if (LANGS[urlLang]) return urlLang;
      }
    } catch(_){}
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && LANGS[saved]) return saved;
    } catch(_){}
    // Detect from browser language
    const nav = (navigator.language || navigator.userLanguage || 'ar').toLowerCase();
    const code = nav.split('-')[0];
    if (LANGS[code]) return code;
    // ar variants
    if (nav.indexOf('ar') === 0) return 'ar';
    return DEFAULT_LANG;
  }

  /* ------------------------------------------------------------
     Boot
     ------------------------------------------------------------ */
  function boot(){
    current = detectInitialLang();
    setLang(current, false);    // apply without re-saving
    injectSwitcher();
    updateSwitcherTrigger();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Public API
  window.MEXi18n = {
    setLang: setLang,
    t: t,
    current: function(){ return current; },
    apply: applyTranslations,
    languages: LANGS
  };
})();
