/* Amphora Boat owner page. Talks to /api/owner/*. When there is no server
   (the preview in Claude), it runs as a demo that saves in this browser only. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var DEMO_KEY = 'amphora-demo';
  var demo = false;
  var data = { prices: { full: 650, half: 450 }, days: {} };

  /* ---------- storage: server, or browser-only demo ---------- */
  function demoLoad() { try { var d = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null'); if (d) return d; } catch (e) {} return { prices: { full: 650, half: 450 }, days: {} }; }
  function demoSave(d) { try { d.updatedAt = new Date().toISOString(); localStorage.setItem(DEMO_KEY, JSON.stringify(d)); } catch (e) {} }
  function call(method, path, body) {
    if (demo) {
      var d = demoLoad();
      if (path === '/api/owner/state') return Promise.resolve(d);
      if (path === '/api/owner/login' || path === '/api/owner/logout') return Promise.resolve({ ok: true });
      if (path === '/api/owner/day') { if (body.am || body.pm) d.days[body.date] = { am: body.am, pm: body.pm }; else delete d.days[body.date]; demoSave(d); return Promise.resolve({ ok: true }); }
      if (path === '/api/owner/prices') { d.prices = { full: body.full, half: body.half }; demoSave(d); return Promise.resolve({ ok: true }); }
    }
    return fetch(path, { method: method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) { var e = new Error(j.error || 'Something went wrong.'); e.status = r.status; throw e; }
          return j;
        });
      });
  }

  /* ---------- toast ---------- */
  var toastEl = $('[data-toast]'), toastT;
  function toast(msg, err) {
    toastEl.textContent = msg; toastEl.classList.toggle('is-err', !!err); toastEl.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, err ? 4000 : 1800);
  }

  /* ---------- screens ---------- */
  function showLogin() { $('[data-app]').hidden = true; $('[data-login]').hidden = false; $('[data-demo-hint]').hidden = !demo; setTimeout(function () { $('[name="password"]').focus(); }, 50); }
  function showApp(d) {
    data = { prices: d.prices, days: d.days || {}, updatedAt: d.updatedAt };
    $('[data-login]').hidden = true; $('[data-app]').hidden = false;
    $('[name="full"]').value = data.prices.full; $('[name="half"]').value = data.prices.half;
    renderCal(); renderDay(); stamp();
  }
  function stamp() {
    $('[data-updated]').textContent = data.updatedAt ? 'Last change: ' + new Date(data.updatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  }

  $('[data-login-form]').addEventListener('submit', function (e) {
    e.preventDefault();
    var pw = $('[name="password"]').value, err = $('[data-login-err]'), btn = e.target.querySelector('button');
    if (!pw) { err.textContent = 'Enter your password.'; err.hidden = false; return; }
    btn.disabled = true; err.hidden = true;
    call('POST', '/api/owner/login', { password: pw })
      .then(function () { return call('GET', '/api/owner/state'); })
      .then(function (d) { $('[name="password"]').value = ''; showApp(d); })
      .catch(function (x) { err.textContent = x.message; err.hidden = false; })
      .then(function () { btn.disabled = false; });
  });
  $('[data-logout]').addEventListener('click', function () { call('POST', '/api/owner/logout').then(showLogin, showLogin); });

  /* ---------- calendar ---------- */
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var keyOf = function (y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); };
  var now = new Date(), today = keyOf(now.getFullYear(), now.getMonth(), now.getDate());
  var view = { y: now.getFullYear(), m: now.getMonth() }, sel = null;
  var dayOf = function (k) { return data.days[k] || { am: false, pm: false }; };

  function renderCal() {
    $('[data-month]').textContent = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(view.y, view.m, 1));
    var grid = $('[data-grid]'); grid.innerHTML = '';
    var first = (new Date(view.y, view.m, 1).getDay() + 6) % 7, n = new Date(view.y, view.m + 1, 0).getDate();
    for (var b = 0; b < first; b++) grid.appendChild(document.createElement('span'));
    for (var d = 1; d <= n; d++) {
      var k = keyOf(view.y, view.m, d), s = dayOf(k), c = document.createElement('button');
      c.type = 'button'; c.className = 'cell'; c.setAttribute('data-key', k);
      c.innerHTML = '<span class="cell__n">' + d + '</span><span class="cell__bars"><i class="bar ' + (s.am ? 'bar--busy' : 'bar--free') + '"></i><i class="bar ' + (s.pm ? 'bar--busy' : 'bar--free') + '"></i></span>';
      c.setAttribute('aria-label', d + ': morning ' + (s.am ? 'booked' : 'free') + ', afternoon ' + (s.pm ? 'booked' : 'free'));
      if (k < today) c.disabled = true;
      if (k === today) c.classList.add('is-today');
      if (k === sel) { c.classList.add('is-sel'); c.setAttribute('aria-pressed', 'true'); }
      grid.appendChild(c);
    }
    $('[data-prev]').disabled = view.y === now.getFullYear() && view.m === now.getMonth();
  }
  function renderDay() {
    var box = $('[data-day]');
    if (!sel) { box.hidden = true; return; }
    var p = sel.split('-'), s = dayOf(sel);
    box.hidden = false;
    $('[data-day-title]').textContent = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(+p[0], +p[1] - 1, +p[2]));
    ['am', 'pm'].forEach(function (h) {
      var btn = $('[data-slot="' + h + '"]');
      btn.classList.toggle('is-busy', s[h]);
      btn.setAttribute('aria-pressed', s[h] ? 'true' : 'false');
      $('[data-slot-state="' + h + '"]').textContent = s[h] ? 'Booked · tap to free' : 'Free · tap to book';
    });
  }
  function setDay(k, next) {
    var prev = dayOf(k);
    if (next.am || next.pm) data.days[k] = next; else delete data.days[k];
    renderCal(); renderDay();
    call('PUT', '/api/owner/day', { date: k, am: next.am, pm: next.pm })
      .then(function () { data.updatedAt = new Date().toISOString(); stamp(); toast('Saved'); })
      .catch(function (x) {
        if (prev.am || prev.pm) data.days[k] = prev; else delete data.days[k];
        renderCal(); renderDay();
        if (x.status === 401) { toast('Please log in again.', true); showLogin(); } else toast('Not saved: ' + x.message, true);
      });
  }

  $('[data-grid]').addEventListener('click', function (e) {
    var c = e.target.closest('.cell'); if (!c || c.disabled) return;
    sel = c.getAttribute('data-key'); renderCal(); renderDay();
    if (window.innerWidth < 700) $('[data-day]').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  $$('[data-slot]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!sel) return; var s = dayOf(sel), h = b.getAttribute('data-slot'), next = { am: s.am, pm: s.pm };
      next[h] = !next[h]; setDay(sel, next);
    });
  });
  $$('[data-all]').forEach(function (b) {
    b.addEventListener('click', function () { if (!sel) return; var on = b.getAttribute('data-all') === 'book'; setDay(sel, { am: on, pm: on }); });
  });
  $('[data-prev]').addEventListener('click', function () { view.m--; if (view.m < 0) { view.m = 11; view.y--; } renderCal(); });
  $('[data-next]').addEventListener('click', function () { view.m++; if (view.m > 11) { view.m = 0; view.y++; } renderCal(); });

  /* ---------- prices ---------- */
  $('[data-prices]').addEventListener('submit', function (e) {
    e.preventDefault();
    var full = Number($('[name="full"]').value), half = Number($('[name="half"]').value), btn = e.target.querySelector('button');
    var ok = function (n) { return Number.isInteger(n) && n >= 1 && n <= 100000; };
    if (!ok(full) || !ok(half)) { toast('Prices must be whole euros, like 650.', true); return; }
    btn.disabled = true;
    call('PUT', '/api/owner/prices', { full: full, half: half })
      .then(function () { data.prices = { full: full, half: half }; data.updatedAt = new Date().toISOString(); stamp(); toast('Prices saved. The website now shows €' + full + ' and €' + half + '.'); })
      .catch(function (x) { if (x.status === 401) { toast('Please log in again.', true); showLogin(); } else toast('Not saved: ' + x.message, true); })
      .then(function () { btn.disabled = false; });
  });

  /* ---------- start: logged in already? is there a server? ---------- */
  fetch('/api/owner/state', { credentials: 'same-origin' })
    .then(function (r) {
      var isJson = /json/.test(r.headers.get('content-type') || '');
      if (!isJson) throw new Error('no server');
      if (r.status === 401) { showLogin(); return; }
      return r.json().then(showApp);
    })
    .catch(function () { demo = true; $('[data-demo]').hidden = false; showLogin(); });
})();
