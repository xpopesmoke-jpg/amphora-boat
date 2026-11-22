/* Amphora Boat: page behaviour. Edit CONFIG, nothing else needs touching. */
(function () {
  'use strict';

  var CONFIG = {
    // ---- contact (PLACEHOLDERS: replace before launch) ----
    whatsapp: '385996108522',            // digits only, with country code
    phoneDisplay: '+385 99 610 8522',
    phone: '+385996108522',
    email: 'amphorayacht@gmail.com',
    instagram: '',                        // add the handle to show it in the footer
    contactsArePlaceholders: false,
    // ---- availability: a public Google Calendar + an API key limited to this site ----
    // ---- prices in EUR ----
    // prices: defaults baked in at build time, then replaced by the owner's prices from the server
    priceFull: (window.AMPHORA_PRICES || {}).full || 650, priceHalf: (window.AMPHORA_PRICES || {}).half || 450,
    maxGuests: 10,
    productionHost: 'amphoraboat.com'
  };

  var D = window.AMPHORA_I18N || {};
  var lang = window.AMPHORA_LANG || 'en';
  var T = D[lang] || D.en;
  var LOCALE = { en: 'en-GB', de: 'de-DE', hr: 'hr-HR' };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fill = function (v) { return typeof v === 'string' ? v.replace(/\{full\}/g, CONFIG.priceFull).replace(/\{half\}/g, CONFIG.priceHalf) : v; };
  var get = function (o, p) { return fill(p.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o)); };

  /* ---------- engine ---------- */
  try { window.ScrollCraft && window.ScrollCraft.mount(document.body); } catch (e) { document.documentElement.classList.add('no-sc'); }
  setTimeout(function () {
    if (!document.documentElement.classList.contains('sc-ready')) document.documentElement.classList.add('no-sc');
  }, 2500);

  /* ---------- language ---------- */
  function applyLang(l) {
    if (!D[l]) return;
    lang = l; T = D[l];
    document.documentElement.lang = l;
    document.title = T.meta.title;
    $$('[data-i18n]').forEach(function (el) { var v = get(T, el.getAttribute('data-i18n')); if (v != null) el.textContent = v; });
    $$('[data-i18n-a]').forEach(function (el) {
      var parts = el.getAttribute('data-i18n-a').split(':'); var v = get(T, parts[1]);
      if (v != null) el.setAttribute(parts[0], v);
    });
    $$('.bar__lang a').forEach(function (a) {
      if (a.getAttribute('data-lang') === l) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    renderCal(); renderReq();
  }
  // On the real domain the language links are real pages. Anywhere else (preview), swap in place.
  var onProd = location.hostname === CONFIG.productionHost || location.hostname.slice(-(CONFIG.productionHost.length + 1)) === '.' + CONFIG.productionHost;
  $$('.bar__lang a').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (onProd) return;
      e.preventDefault(); applyLang(a.getAttribute('data-lang'));
    });
  });

  /* ---------- header + dock ---------- */
  var bar = $('.bar'), dock = $('[data-dock]'), hero = $('.hero'), bookSec = $('#book'), closeSec = $('.close');
  var bookingSeen = false, closeSeen = false, heroSeen = true;
  function syncChrome() {
    bar.classList.toggle('is-solid', window.scrollY > 24);
    dock.classList.toggle('is-up', !heroSeen && !bookingSeen);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { heroSeen = es[0].isIntersecting && es[0].intersectionRatio > 0.45; syncChrome(); }, { threshold: [0, 0.45, 1] }).observe(hero);
    new IntersectionObserver(function (es) { bookingSeen = es[0].isIntersecting; syncChrome(); }, { threshold: 0.08 }).observe(bookSec);
  } else { heroSeen = false; }
  window.addEventListener('scroll', syncChrome, { passive: true });
  syncChrome();

  /* ---------- the logbook: notebook pages flip up with the scroll ---------- */
  (function () {
    var book = $('[data-book]'); if (!book) return;
    var pages = $$('[data-page]', book), n = pages.length, dotsEl = $('[data-book-dots]', book);
    var prev = $('[data-book-prev]', book), next = $('[data-book-next]', book);
    if (reduce || n < 2) return;                      // reduced motion: the chapters stay a plain list
    var STEP = 0.72;                                  // viewport-heights of scroll per page
    book.classList.add('book--on');
    book.style.setProperty('--book-h', (100 + (n - 1) * STEP * 100) + 'vh');
    var shades = [], backs = [], sheets = [], side = [], mode = [];
    pages.forEach(function (p, i) {
      p.style.zIndex = String(n - i);
      var back = document.createElement('div'); back.className = 'page__back'; back.setAttribute('aria-hidden', 'true'); p.appendChild(back); backs.push(back); sheets.push($('.page__sheet', p)); side.push(0);
      var sh = document.createElement('div'); sh.className = 'page__shade'; sh.setAttribute('aria-hidden', 'true'); $('.page__sheet', p).appendChild(sh); shades.push(sh);
      dotsEl.appendChild(document.createElement('li')); mode.push('');
    });
    var dots = $$('li', dotsEl), cur = -1, shown = 0, target = 0, raf = 0, last = 0, top = 0, span = 1;

    function measure() { top = book.getBoundingClientRect().top + window.scrollY; span = Math.max(1, book.offsetHeight - window.innerHeight); }
    function read() { target = Math.min(1, Math.max(0, (window.scrollY - top) / span)) * (n - 1); }
    function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
    function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
    function paint(t) {
      var turns = [], i, j;
      for (i = 0; i < n; i++) turns.push(i === n - 1 ? 0 : ease(clamp((t - i - 0.16) / 0.84)));
      for (j = 0; j < n; j++) {
        var e = turns[j], deg = e * 176;
        var m = (j < t - 1.01 || j > t + 1.99) ? 'off' : (e > 0.001 && e < 0.999) ? 'live' : 'rest';
        if (m !== mode[j]) { mode[j] = m; pages[j].classList.toggle('is-off', m === 'off'); pages[j].classList.toggle('is-live', m === 'live'); }
        if (m === 'off') continue;
        pages[j].style.transform = 'rotateX(' + deg.toFixed(2) + 'deg)';
        pages[j].style.opacity = deg < 68 ? '1' : clamp(1 - (deg - 68) / 46).toFixed(3);
        var sd = deg > 90 ? 2 : 1;                       // past edge-on we are looking at the back of the sheet
        if (sd !== side[j]) { side[j] = sd; sheets[j].style.visibility = sd === 2 ? 'hidden' : 'visible'; backs[j].style.visibility = sd === 2 ? 'visible' : 'hidden'; }
        // a page darkens a little as it lifts, and casts a shadow on the page beneath it
        var above = j > 0 ? Math.sin(Math.min(1, turns[j - 1] * 1.25) * Math.PI) : 0;
        shades[j].style.opacity = Math.max(e < 0.5 ? e * 0.5 : 0.25, above * 0.42).toFixed(3);
      }
      var idx = Math.min(n - 1, Math.round(t));
      if (idx !== cur) {
        cur = idx;
        dots.forEach(function (d, k) { d.classList.toggle('is-on', k === idx); });
        prev.disabled = idx === 0; next.disabled = idx === n - 1;
        pages.forEach(function (p, k) { p.setAttribute('aria-hidden', k === idx ? 'false' : 'true'); });
      }
    }
    // The page never jumps to the scroll position: it glides toward it, so a jerky
    // finger or a mouse-wheel notch still gives one continuous turn.
    function frame(now) {
      var dt = Math.min(64, now - (last || now)); last = now;
      var d = target - shown;
      shown = Math.abs(d) < 0.0006 ? target : shown + d * (1 - Math.exp(-dt / 105));
      paint(shown);
      if (shown === target) { raf = 0; last = 0; } else raf = requestAnimationFrame(frame);
    }
    function kick() { read(); if (!raf) raf = requestAnimationFrame(frame); }
    function go(i) {
      i = Math.min(n - 1, Math.max(0, i)); measure();
      window.scrollTo({ top: top + (i / (n - 1)) * span + 1, behavior: 'smooth' });
    }
    prev.addEventListener('click', function () { go(cur - 1); });
    next.addEventListener('click', function () { go(cur + 1); });
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', function () { measure(); kick(); });
    window.addEventListener('load', function () { measure(); kick(); });
    measure(); read(); shown = target; paint(shown);
  })();

  /* ---------- availability ---------- */
  var busy = {};            // 'YYYY-MM-DD' -> { am: bool, pm: bool }
  // mode: 'loading' until the server answers, then 'live'. 'error' if the real site can't reach it.
  // 'demo' only in previews without a server: reads what the owner-page demo saved in this browser.
  var mode = 'loading', demoStore = false;
  var pad = function (x) { return (x < 10 ? '0' : '') + x; };
  var keyOf = function (y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); };
  var now = new Date(), today = keyOf(now.getFullYear(), now.getMonth(), now.getDate());
  var view = { y: now.getFullYear(), m: now.getMonth() };
  var state = { date: null, trip: null, guests: 4 };

  function demoBusy(key) {            // stable sample pattern for previews with no saved demo data
    var h = 0; for (var i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return { am: h % 5 === 0 || h % 11 === 0, pm: h % 7 === 0 || h % 11 === 0 };
  }
  function slot(key) {
    if (mode === 'live' || (mode === 'demo' && demoStore)) { var b = busy[key]; return { am: !!(b && b.am), pm: !!(b && b.pm) }; }
    if (mode === 'demo') return demoBusy(key);
    return { am: false, pm: false };
  }
  function usePrices(p) {
    if (!p) return;
    var ok = function (n) { return typeof n === 'number' && n > 0 && n < 100001; };
    if (ok(p.full)) CONFIG.priceFull = p.full;
    if (ok(p.half)) CONFIG.priceHalf = p.half;
  }
  function loadAvailability() {
    fetch('/api/public', { cache: 'no-store', credentials: 'omit' })
      .then(function (r) { if (!r.ok || !/json/.test(r.headers.get('content-type') || '')) throw new Error('no api'); return r.json(); })
      .then(function (j) { busy = j.booked || {}; usePrices(j.prices); mode = 'live'; })
      .catch(function () {
        if (onProd) { mode = 'error'; return; }
        mode = 'demo';
        try { var d = JSON.parse(localStorage.getItem('amphora-demo') || 'null'); if (d) { demoStore = true; busy = d.days || {}; usePrices(d.prices); } } catch (e) {}
        var ol = $('[data-owner-link]'); if (ol) ol.hidden = false;
      })
      .then(function () { applyLang(lang); });
  }


  /* ---------- calendar ---------- */
  var cal = $('[data-cal]'), grid = $('[data-cal-grid]'), monthEl = $('[data-cal-month]'), dowEl = $('[data-cal-dow]'), noteEl = $('[data-cal-note]');
  function renderCal() {
    if (!cal) return;
    var loc = LOCALE[lang] || 'en-GB';
    monthEl.textContent = new Intl.DateTimeFormat(loc, { month: 'long', year: 'numeric' }).format(new Date(view.y, view.m, 1));
    dowEl.innerHTML = '';
    for (var w = 0; w < 7; w++) {     // Monday first; 2024-01-01 was a Monday
      var s = document.createElement('span'); s.textContent = new Intl.DateTimeFormat(loc, { weekday: 'short' }).format(new Date(2024, 0, 1 + w)).replace('.', ''); dowEl.appendChild(s);
    }
    grid.innerHTML = '';
    var first = (new Date(view.y, view.m, 1).getDay() + 6) % 7, days = new Date(view.y, view.m + 1, 0).getDate();
    for (var b = 0; b < first; b++) grid.appendChild(document.createElement('span'));
    for (var d = 1; d <= days; d++) {
      var key = keyOf(view.y, view.m, d), sl = slot(key), past = key < today;
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'day'; btn.setAttribute('data-key', key);
      var label = new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(view.y, view.m, d));
      btn.setAttribute('aria-label', label + ': ' + T.book.am + ' ' + (sl.am ? T.book.taken : T.book.free) + ', ' + T.book.pm + ' ' + (sl.pm ? T.book.taken : T.book.free));
      btn.innerHTML = '<span>' + d + '</span><span class="day__halves"><i class="half ' + (sl.am ? 'half--busy' : 'half--free') + '"></i><i class="half ' + (sl.pm ? 'half--busy' : 'half--free') + '"></i></span>';
      if (past) btn.disabled = true;
      if (!past && sl.am && sl.pm) btn.classList.add('is-full');
      if (key === today) btn.classList.add('is-today');
      if (key === state.date) { btn.classList.add('is-sel'); btn.setAttribute('aria-pressed', 'true'); }
      grid.appendChild(btn);
    }
    $('[data-cal-prev]').disabled = view.y === now.getFullYear() && view.m === now.getMonth();
    var msg = mode === 'demo' ? T.book.demo : (mode === 'error' ? T.book.err : '');
    noteEl.hidden = !msg; noteEl.textContent = msg;
  }
  if (cal) {
    grid.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.day') : null; if (!b || b.disabled) return;
      state.date = b.getAttribute('data-key'); state.trip = null; renderCal(); renderReq();
      if (window.innerWidth < 900) $('[data-req]').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
    $('[data-cal-prev]').addEventListener('click', function () { view.m--; if (view.m < 0) { view.m = 11; view.y--; } renderCal(); });
    $('[data-cal-next]').addEventListener('click', function () { view.m++; if (view.m > 11) { view.m = 0; view.y++; } renderCal(); });
  }

  /* ---------- request form ---------- */
  var req = $('[data-req]'), waBtn = $('[data-wa]'), mailA = $('[data-mail]');
  function price() { if (!state.trip) return 0; return (state.trip === 'full' ? CONFIG.priceFull : CONFIG.priceHalf); }
  function eur(n) { return lang === 'en' ? '€' + n : n + ' €'; }
  function tripLabel(v) { return v === 'full' ? T.book.full + ' (' + T.book.fullT + ')' : v === 'am' ? T.book.half1 + ' (' + T.book.half1T + ')' : T.book.half2 + ' (' + T.book.half2T + ')'; }
  function renderReq() {
    if (!req) return;
    var loc = LOCALE[lang] || 'en-GB', dateEl = $('[data-req-date]'), radios = $$('input[name="trip"]', req);
    var sl = state.date ? slot(state.date) : null;
    var ok = { full: !!sl && !sl.am && !sl.pm, am: !!sl && !sl.am, pm: !!sl && !sl.pm };
    if (state.trip && !ok[state.trip]) state.trip = null;
    if (sl && !state.trip) state.trip = ok.full ? 'full' : ok.am ? 'am' : ok.pm ? 'pm' : null;
    radios.forEach(function (r) { r.disabled = !ok[r.value]; r.checked = state.trip === r.value; });
    var dateText = '';
    if (!state.date) { dateEl.textContent = T.book.pick; dateEl.classList.add('is-hint'); }
    else {
      var p = state.date.split('-');
      dateText = new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(+p[0], +p[1] - 1, +p[2]));
      dateEl.textContent = state.trip ? dateText : T.book.none; dateEl.classList.toggle('is-hint', !state.trip);
    }
    $('[data-guests]').textContent = state.guests;
    $('[data-g="-1"]').disabled = state.guests <= 1; $('[data-g="1"]').disabled = state.guests >= CONFIG.maxGuests;
    $('[data-total]').textContent = eur(price()) + '*';
    req.classList.toggle('is-idle', !state.date);
    radios.forEach(function (r) { var em = r.parentNode.querySelector('em'); if (em) em.textContent = eur(r.value === 'full' ? CONFIG.priceFull : CONFIG.priceHalf); });
    var name = (req.elements.name.value || '').trim();
    var guestMail = (req.elements.email.value || '').trim(), mailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(guestMail);
    if (mailOk) { $('[data-email-err]').hidden = true; req.elements.email.removeAttribute('aria-invalid'); }
    var lines = [T.book.msgHi, '', T.book.msgTrip + ': ' + (state.trip ? tripLabel(state.trip) : ''), T.book.msgDate + ': ' + dateText,
      T.book.msgGuests + ': ' + state.guests, T.book.msgTotal + ': ' + eur(price())];
    if (name) lines.push(T.book.msgName + ': ' + name);
    if (mailOk) lines.push(T.book.msgEmail + ': ' + guestMail);
    var text = lines.join('\n'), ready = !!(state.date && state.trip && mailOk);
    waBtn.setAttribute('aria-disabled', ready ? 'false' : 'true');
    waBtn.href = ready ? 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(text) : '#book';
    if (ready) waBtn.setAttribute('target', '_blank'); else waBtn.removeAttribute('target');
    mailA.href = ready ? 'mailto:' + CONFIG.email + '?subject=' + encodeURIComponent(T.book.subject + ' ' + dateText) + '&body=' + encodeURIComponent(text) : '#book';
    $('[data-mail-addr]').textContent = CONFIG.email;
  }
  if (req) {
    req.addEventListener('submit', function (e) { e.preventDefault(); });
    req.addEventListener('change', function (e) {
      if (e.target.name === 'trip') state.trip = e.target.value;
      renderReq();
    });
    req.addEventListener('input', function (e) { if (e.target.name === 'name' || e.target.name === 'email') renderReq(); });
    function needMail() {
      var f = req.elements.email; $('[data-email-err]').hidden = false; f.setAttribute('aria-invalid', 'true');
      f.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); f.focus({ preventScroll: true });
    }
    function blocked(e) {
      if (!(state.date && state.trip)) { e.preventDefault(); cal.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); return true; }
      if (waBtn.getAttribute('aria-disabled') === 'true') { e.preventDefault(); needMail(); return true; }
      return false;
    }
    $$('[data-g]', req).forEach(function (b) {
      b.addEventListener('click', function () { state.guests = Math.min(CONFIG.maxGuests, Math.max(1, state.guests + parseInt(b.getAttribute('data-g'), 10))); renderReq(); });
    });
    waBtn.addEventListener('click', blocked);
    mailA.addEventListener('click', blocked);
  }

  /* ---------- reviews: clamp long ones behind "Read more", arrows scroll the row ---------- */
  (function () {
    var row = $('[data-reviews]'), pv = $('[data-rev-prev]'), nx = $('[data-rev-next]');
    if (row && pv && nx) {
      var step = function () { var c = $('.rev', row); return c ? c.getBoundingClientRect().width + 20 : 320; };
      var sync = function () { pv.disabled = row.scrollLeft < 4; nx.disabled = row.scrollLeft + row.clientWidth > row.scrollWidth - 4; };
      pv.addEventListener('click', function () { row.scrollBy({ left: -step(), behavior: reduce ? 'auto' : 'smooth' }); });
      nx.addEventListener('click', function () { row.scrollBy({ left: step(), behavior: reduce ? 'auto' : 'smooth' }); });
      row.addEventListener('scroll', sync, { passive: true }); window.addEventListener('resize', sync); sync();
    }
    $$('[data-rev-text]').forEach(function (t) { t.classList.add('is-clamped'); });
    $$('.rev').forEach(function (card) {
      var text = $('[data-rev-text]', card), btn = $('[data-rev-more]', card);
      if (text.scrollHeight - text.clientHeight < 6) { text.classList.remove('is-clamped'); return; }
      btn.hidden = false;
      btn.addEventListener('click', function () {
        var open = text.classList.toggle('is-clamped') === false;
        btn.setAttribute('data-i18n', open ? 'reviews.less' : 'reviews.more');
        btn.textContent = open ? T.reviews.less : T.reviews.more;
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  })();

  /* ---------- footer contacts ---------- */
  (function () {
    var wa = $('[data-c="wa"]'), mail = $('[data-c="mail"]'), ig = $('[data-c="ig"]');
    if (wa) { wa.textContent = CONFIG.phoneDisplay; wa.href = 'https://wa.me/' + CONFIG.whatsapp; }
    if (mail) { mail.textContent = CONFIG.email; mail.href = 'mailto:' + CONFIG.email; }
    if (ig) { if (CONFIG.instagram) { ig.textContent = '@' + CONFIG.instagram; ig.href = 'https://instagram.com/' + CONFIG.instagram; } else $('[data-ig-row]').hidden = true; }
    $$('[data-c="tel"], [data-c="tel2"]').forEach(function (a) { a.textContent = CONFIG.phoneDisplay; a.href = 'tel:' + CONFIG.phone; });
    var ph = $('[data-foot-ph]'); if (ph) ph.hidden = !CONFIG.contactsArePlaceholders;
  })();

  renderCal(); renderReq();
  loadAvailability();
})();
