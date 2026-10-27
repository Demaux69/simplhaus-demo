/* SimplHaus — upravljanje privolitev za piškotke in zunanje vsebine.
   Nujni piškotki so vedno dovoljeni. Vse drugo je privzeto IZKLOPLJENO. */
(function () {
  'use strict';

  var KEY = 'sh-consent-v1';
  var VERSION = 1;

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (!d || d.v !== VERSION) return null;
      return d;
    } catch (e) { return null; }
  }

  function write(state) {
    state.v = VERSION;
    state.necessary = true;
    state.ts = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    apply(state);
  }

  function apply(state) {
    var external = !!(state && state.external);
    document.querySelectorAll('[data-map-embed]').forEach(function (box) {
      if (external) loadMap(box);
      else showMapPlaceholder(box);
    });
    document.documentElement.setAttribute('data-consent-external', external ? 'on' : 'off');
  }

  function loadMap(box) {
    if (box.querySelector('iframe')) return;
    var src = box.getAttribute('data-src');
    if (!src) return;
    var f = document.createElement('iframe');
    f.src = src;
    f.title = box.getAttribute('data-title') || 'Zemljevid';
    f.loading = 'lazy';
    f.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    f.setAttribute('allowfullscreen', '');
    box.innerHTML = '';
    box.appendChild(f);
  }

  function showMapPlaceholder(box) {
    if (box.querySelector('.map-placeholder')) return;
    box.innerHTML =
      '<div class="map-placeholder">' +
        '<p>Zemljevid Google se naloži šele, ko to dovolite. Ob nalaganju Google nastavi svoje piškotke.</p>' +
        '<button type="button" class="btn btn--sm" data-map-allow>Prikaži zemljevid</button>' +
      '</div>';
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  var banner = null, dialog = null;

  function buildBanner() {
    banner = el('div', 'cookie-banner');
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Nastavitve piškotkov');
    banner.innerHTML =
      '<div class="cookie-banner__inner">' +
        '<div class="cookie-banner__text">' +
          '<strong>Piškotki</strong>' +
          '<p>Nujni piškotki so potrebni za delovanje strani. Vse drugo — na primer Google Zemljevid — uporabimo le, če to dovolite. ' +
          '<a href="zasebnost.html">Politika zasebnosti</a></p>' +
        '</div>' +
        '<div class="cookie-banner__actions">' +
          '<button type="button" class="btn btn--sm" data-c-accept-all>Sprejmi vse</button>' +
          '<button type="button" class="btn btn--sm btn--line" data-c-reject>Zavrni nenujne</button>' +
          '<button type="button" class="cookie-link" data-c-settings>Nastavitve piškotkov</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(banner);
  }

  function buildDialog() {
    dialog = el('dialog', 'cookie-dialog');
    dialog.setAttribute('aria-label', 'Nastavitve piškotkov');
    dialog.innerHTML =
      '<form method="dialog" class="cookie-dialog__inner">' +
        '<div class="cookie-dialog__head">' +
          '<h2>Nastavitve piškotkov</h2>' +
          '<button type="button" class="icon-btn" data-c-close aria-label="Zapri">' +
            '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M3 3l10 10M13 3 3 13"/></svg>' +
          '</button>' +
        '</div>' +
        '<ul class="cookie-list">' +
          '<li>' +
            '<div><strong>Nujni piškotki</strong><span>Potrebni za delovanje strani in shranjevanje vaše odločitve. Vedno vklopljeni.</span></div>' +
            '<label class="switch"><input type="checkbox" checked disabled><span></span></label>' +
          '</li>' +
          '<li>' +
            '<div><strong>Zunanje vsebine</strong><span>Google Zemljevid na strani O nas. Ob nalaganju Google nastavi svoje piškotke in prejme vaš IP naslov.</span></div>' +
            '<label class="switch"><input type="checkbox" data-c-external><span></span></label>' +
          '</li>' +
        '</ul>' +
        '<div class="cookie-dialog__actions">' +
          '<button type="button" class="btn btn--sm" data-c-save>Shrani nastavitve</button>' +
          '<button type="button" class="btn btn--sm btn--line" data-c-accept-all2>Sprejmi vse</button>' +
          '<button type="button" class="btn btn--sm btn--line" data-c-reject2>Zavrni nenujne</button>' +
        '</div>' +
      '</form>';
    document.body.appendChild(dialog);
  }

  function openSettings() {
    if (!dialog) buildDialog();
    var st = read() || { external: false };
    var cb = dialog.querySelector('[data-c-external]');
    if (cb) cb.checked = !!st.external;
    if (typeof dialog.showModal === 'function') { try { dialog.showModal(); } catch (e) { dialog.setAttribute('open', ''); } }
    else dialog.setAttribute('open', '');
  }

  function closeBanner() {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
  }

  function decide(external) {
    write({ external: !!external });
    closeBanner();
    if (dialog && dialog.open) dialog.close();
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('button, a') : null;
    if (!t) return;

    if (t.matches('[data-c-accept-all], [data-c-accept-all2]')) { e.preventDefault(); decide(true); }
    else if (t.matches('[data-c-reject], [data-c-reject2]')) { e.preventDefault(); decide(false); }
    else if (t.matches('[data-c-settings], [data-consent-open]')) {
      e.preventDefault();
      openSettings();
    }
    else if (t.matches('[data-c-close]')) { e.preventDefault(); if (dialog) dialog.close(); }
    else if (t.matches('[data-c-save]')) {
      e.preventDefault();
      var cb = document.querySelector('[data-c-external]');
      decide(cb ? cb.checked : false);
    }
    else if (t.matches('[data-map-allow]')) {
      e.preventDefault();
      decide(true);
    }
  });

  function init() {
    var st = read();
    apply(st);
    if (!st) buildBanner();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.shConsent = { open: openSettings, get: read };
})();
