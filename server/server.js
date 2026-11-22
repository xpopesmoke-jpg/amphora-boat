// Amphora Boat server: serves the site, the owner page, and a small JSON API.
// No dependencies. Data is one JSON file in DATA_DIR (mount it as a volume).
//
// Environment:
//   OWNER_PASSWORD  required. The owner page login password.
//   SESSION_SECRET  recommended. Any long random string; keeps you logged in across restarts.
//   DATA_DIR        where data.json lives (default ./data).
//   PORT            default 3000.
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..', 'public');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const PORT = Number(process.env.PORT || 3000);
const PASSWORD = process.env.OWNER_PASSWORD || '';
const SESSION_DAYS = 30;
const COOKIE = 'amphora_owner';
const DEFAULT_PRICES = { full: 650, half: 450 };

if (!PASSWORD) console.warn('[amphora] OWNER_PASSWORD is not set: the owner page will refuse every login.');
if (PASSWORD && PASSWORD.length < 10) console.warn('[amphora] OWNER_PASSWORD is short. Use at least 10 characters.');

/* ---------------- data ---------------- */
fs.mkdirSync(DATA_DIR, { recursive: true });

function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const f = path.join(DATA_DIR, '.session-secret');
  try { return fs.readFileSync(f, 'utf8'); } catch (_) {}
  const s = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(f, s, { mode: 0o600 });
  return s;
}
const SECRET = secret();

function load() {
  try {
    const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return { prices: { ...DEFAULT_PRICES, ...(d.prices || {}) }, days: d.days || {}, updatedAt: d.updatedAt || null };
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('[amphora] could not read data.json, starting fresh:', e.message);
    return { prices: { ...DEFAULT_PRICES }, days: {}, updatedAt: null };
  }
}
let state = load();

function save() {
  state.updatedAt = new Date().toISOString();
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, DATA_FILE);      // atomic: a crash never leaves a half-written file
}

function todayZagreb() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zagreb', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function publicView() {
  const today = todayZagreb(), booked = {};
  for (const [k, v] of Object.entries(state.days)) if (k >= today && (v.am || v.pm)) booked[k] = { am: !!v.am, pm: !!v.pm };
  return { prices: state.prices, booked };
}

/* ---------------- sessions + login limits ---------------- */
const b64 = b => Buffer.from(b).toString('base64url');
function sign(payload) { return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url'); }
function makeSession() {
  const payload = b64(JSON.stringify({ exp: Date.now() + SESSION_DAYS * 864e5 }));
  return payload + '.' + sign(payload);
}
function validSession(token) {
  if (!token || token.indexOf('.') < 0) return false;
  const [payload, sig] = token.split('.');
  const good = sign(payload);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now(); } catch (_) { return false; }
}
function cookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function isOwner(req) { return validSession(cookies(req)[COOKIE]); }
function passwordOk(given) {
  if (!PASSWORD || typeof given !== 'string') return false;
  const a = crypto.createHash('sha256').update(given).digest(), b = crypto.createHash('sha256').update(PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

const WINDOW = 15 * 60 * 1000, MAX_FAILS = 5, fails = new Map();
function clientIp(req) { return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(); }
function locked(ip) {
  const f = fails.get(ip); if (!f) return false;
  if (Date.now() - f.first > WINDOW) { fails.delete(ip); return false; }
  return f.count >= MAX_FAILS;
}
function noteFail(ip) {
  const f = fails.get(ip);
  if (!f || Date.now() - f.first > WINDOW) fails.set(ip, { count: 1, first: Date.now() }); else f.count++;
}

/* ---------------- http helpers ---------------- */
const SECURITY = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' };
function json(res, code, body, extra) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SECURITY, ...(extra || {}) });
  res.end(JSON.stringify(body));
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    if (!/^application\/json/.test(req.headers['content-type'] || '')) return reject(Object.assign(new Error('JSON only'), { code: 415 }));
    let size = 0, data = '';
    req.on('data', c => { size += c.length; if (size > 10_000) { reject(Object.assign(new Error('Too large'), { code: 413 })); req.destroy(); } else data += c; });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (_) { reject(Object.assign(new Error('Bad JSON'), { code: 400 })); } });
    req.on('error', reject);
  });
}
const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T00:00:00Z'));
const isPrice = n => Number.isInteger(n) && n >= 1 && n <= 100000;

/* ---------------- api ---------------- */
async function api(req, res, url) {
  const p = url.pathname, m = req.method;
  if (p === '/api/public' && m === 'GET') return json(res, 200, publicView());

  if (p === '/api/owner/login' && m === 'POST') {
    const ip = clientIp(req);
    if (locked(ip)) return json(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
    const body = await readJson(req);
    if (!passwordOk(body.password)) {
      noteFail(ip);
      await new Promise(r => setTimeout(r, 600));          // slow down guessing
      return json(res, 401, { error: 'Wrong password.' });
    }
    fails.delete(ip);
    const secure = (req.headers['x-forwarded-proto'] || '').includes('https') || req.socket.encrypted;
    const cookie = `${COOKIE}=${makeSession()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}${secure ? '; Secure' : ''}`;
    return json(res, 200, { ok: true }, { 'Set-Cookie': cookie });
  }
  if (p === '/api/owner/logout' && m === 'POST') {
    return json(res, 200, { ok: true }, { 'Set-Cookie': `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0` });
  }

  if (p.startsWith('/api/owner/')) {
    if (!isOwner(req)) return json(res, 401, { error: 'Please log in.' });

    if (p === '/api/owner/state' && m === 'GET') return json(res, 200, { prices: state.prices, days: state.days, updatedAt: state.updatedAt });

    if (p === '/api/owner/day' && m === 'PUT') {
      const b = await readJson(req);
      if (!isDate(b.date) || typeof b.am !== 'boolean' || typeof b.pm !== 'boolean') return json(res, 400, { error: 'Send a date and true/false for am and pm.' });
      if (b.am || b.pm) state.days[b.date] = { am: b.am, pm: b.pm }; else delete state.days[b.date];
      save();
      return json(res, 200, { ok: true, date: b.date, day: state.days[b.date] || { am: false, pm: false } });
    }
    if (p === '/api/owner/prices' && m === 'PUT') {
      const b = await readJson(req);
      if (!isPrice(b.full) || !isPrice(b.half)) return json(res, 400, { error: 'Prices must be whole euros between 1 and 100000.' });
      state.prices = { full: b.full, half: b.half };
      save();
      return json(res, 200, { ok: true, prices: state.prices });
    }
  }
  return json(res, 404, { error: 'Not found' });
}

/* ---------------- static files ---------------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };
function serveStatic(req, res, url) {
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch (_) { res.writeHead(400); return res.end(); }
  if (rel.includes('\0') || rel.split('/').some(seg => seg.startsWith('.'))) { res.writeHead(404); return res.end('Not found'); }
  let file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep) && file !== ROOT) { res.writeHead(404); return res.end('Not found'); }
  try {
    if (fs.statSync(file).isDirectory()) {
      if (!rel.endsWith('/')) { res.writeHead(301, { Location: rel + '/' + url.search }); return res.end(); }
      file = path.join(file, 'index.html');
    }
  } catch (_) { /* fall through to 404 */ }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain', ...SECURITY }); return res.end('Not found'); }
    const ext = path.extname(file), owner = rel.startsWith('/owner');
    const headers = { 'Content-Type': TYPES[ext] || 'application/octet-stream', ...SECURITY,
      'Cache-Control': ext === '.html' || owner ? 'no-cache' : 'public, max-age=86400' };
    if (owner) { headers['X-Frame-Options'] = 'DENY'; headers['X-Robots-Tag'] = 'noindex, nofollow'; }
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : buf);
  });
}

/* ---------------- server ---------------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    if (url.pathname === '/owner') { res.writeHead(301, { Location: '/owner/' }); return res.end(); }
    serveStatic(req, res, url);
  } catch (e) {
    const code = [400, 413, 415].includes(e.code) ? e.code : 500;
    if (code === 500) console.error('[amphora]', e);
    if (!res.headersSent) json(res, code, { error: code === 500 ? 'Server error' : e.message });
  }
});

if (require.main === module) server.listen(PORT, () => console.log(`[amphora] listening on :${PORT}, data in ${DATA_FILE}`));
module.exports = { server };
