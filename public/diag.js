/* Reload detective. Silent for everyone. On a phone where the site was opened once with #diag,
   it shows a small box explaining why the page reloaded. Turn it off again with #nodiag. */
(function () {
  'use strict';
  var KEY = 'amphora-diag-session', ON = 'amphora-diag-on';
  var ss, ls;
  try { ss = window.sessionStorage; ls = window.localStorage; } catch (e) { return; }
  if (!ss) return;

  if (/[#&]diag\b/.test(location.hash)) { try { ls.setItem(ON, '1'); } catch (e) {} }
  if (/[#&]nodiag\b/.test(location.hash)) { try { ls.removeItem(ON); } catch (e) {} }

  var prev = null; try { prev = JSON.parse(ss.getItem(KEY) || 'null'); } catch (e) {}
  var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {};
  var navType = nav.type || (performance.navigation && ['navigate', 'reload', 'back_forward'][performance.navigation.type]) || 'unknown';

  var now = { y: 0, maxY: 0, t: Date.now(), clean: false, href: location.pathname + location.hash, lastTap: '', ver: window.AMPHORA_VER || '' };
  function save() { try { ss.setItem(KEY, JSON.stringify(now)); } catch (e) {} }
  var pending = false;
  window.addEventListener('scroll', function () {
    if (pending) return; pending = true;
    setTimeout(function () { pending = false; now.y = Math.round(window.scrollY); now.maxY = Math.max(now.maxY, now.y); now.t = Date.now(); save(); }, 250);
  }, { passive: true });
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a,button') : null;
    if (a) { now.lastTap = (a.tagName === 'A' ? 'link ' + (a.getAttribute('href') || '') : 'button ' + (a.getAttribute('aria-label') || a.textContent.trim()).slice(0, 30)); now.t = Date.now(); save(); }
  }, true);
  window.addEventListener('pagehide', function () { now.clean = true; now.y = Math.round(window.scrollY); now.t = Date.now(); save(); });
  window.addEventListener('pageshow', function () { now.clean = false; save(); });
  save();

  var show = false; try { show = ls.getItem(ON) === '1'; } catch (e) {}
  if (!show) return;

  var verdict;
  if (!prev) verdict = 'First visit in this tab. Scroll until the problem happens.';
  else if (navType === 'reload' && !prev.clean) verdict = 'BROWSER CRASH: the page was killed without closing and reopened (no tap, no pull).';
  else if (navType === 'reload') verdict = 'RELOAD: pull-to-refresh or the reload button.';
  else if (navType === 'navigate' && prev.lastTap && Date.now() - prev.t < 4000) verdict = 'TAP: opened by tapping ' + prev.lastTap + '.';
  else if (navType === 'back_forward') verdict = 'BACK/FORWARD: a swipe back or the back button.';
  else verdict = 'Opened normally (' + navType + ').';

  var box = document.createElement('div');
  box.setAttribute('style', 'position:fixed;left:8px;bottom:84px;z-index:99999;max-width:min(92vw,340px);padding:10px 12px;border-radius:10px;background:#fffbe6;color:#222;font:12px/1.4 system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.4)');
  var since = prev ? Math.round((Date.now() - prev.t) / 1000) : 0;
  box.innerHTML = '<b>Diagnostics</b> <button type="button" style="float:right;border:0;background:none;font-size:16px;line-height:1" aria-label="Hide">×</button><br>' +
    verdict.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '<br>' +
    (prev ? 'Before: scrolled to ' + prev.y + 'px (max ' + prev.maxY + ') ' + since + 's ago' + (prev.lastTap ? ', last tap: ' + prev.lastTap.replace(/</g, '&lt;') : '') + '<br>' : '') +
    'Version ' + (window.AMPHORA_VER || '?') + ' · ' + innerWidth + '×' + innerHeight + ' @' + (window.devicePixelRatio || 1) + 'x<br>' +
    '<span style="color:#666">' + navigator.userAgent.replace(/</g, '&lt;').slice(0, 140) + '</span>';
  box.querySelector('button').addEventListener('click', function () { box.remove(); });
  (document.body ? Promise.resolve() : new Promise(function (r) { document.addEventListener('DOMContentLoaded', r); })).then(function () { document.body.appendChild(box); });
})();
