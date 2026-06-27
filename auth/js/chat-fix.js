/**
 * Pin Conferbot chat widget to the LEFT regardless of language/RTL direction.
 * The widget renders inside a shadow root, so we inject a <style> there.
 *
 * Implementation notes:
 *  - Logical properties (inset-inline-*) are declared BEFORE physical
 *    properties (left/right) so that physical declarations win the cascade
 *    in both LTR and RTL.
 *  - Everything uses !important so the host stylesheet cannot override us.
 *  - Same behavior applies to desktop AND mobile (mobile is fine, per spec).
 */
(function () {
  'use strict';

  var FIX_ID = 'mex-conferbot-pin-left';
  var CSS = [
    '.chatbot__icon, #open-chatbot {',
    '  inset-inline-start: auto !important;',
    '  inset-inline-end: auto !important;',
    '  right: auto !important;',
    '  left: 16px !important;',
    '  direction: ltr !important;',
    '}',
    '.live_chat__chat__screen {',
    '  inset-inline-start: auto !important;',
    '  inset-inline-end: auto !important;',
    '  right: auto !important;',
    '  left: 16px !important;',
    '  direction: ltr !important;',
    '}',
    '@media (max-width: 780px) {',
    '  .chatbot__icon, #open-chatbot {',
    '    left: 12px !important;',
    '  }',
    '  .live_chat__chat__screen {',
    '    left: 8px !important;',
    '    right: 8px !important;',
    '  }',
    '}'
  ].join('\n');

  function applyFix() {
    var host = document.querySelector('conferbot-widget');
    if (!host || !host.shadowRoot) return false;
    var root = host.shadowRoot;
    if (root.getElementById(FIX_ID)) return true;
    var style = document.createElement('style');
    style.id = FIX_ID;
    style.textContent = CSS;
    root.appendChild(style);
    return true;
  }

  // Retry every 300ms for up to ~15s while the widget bootstraps.
  var tries = 0;
  var id = setInterval(function () {
    if (applyFix() || ++tries > 50) clearInterval(id);
  }, 300);

  // Re-apply if the widget host is replaced (defensive).
  if (typeof MutationObserver === 'function') {
    var mo = new MutationObserver(function () { applyFix(); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
