// Run: node --test test/
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'amphora-'));
process.env.DATA_DIR = dir;
process.env.OWNER_PASSWORD = 'correct horse battery';
process.env.SESSION_SECRET = 'test-secret';
const { server } = require('../server/server.js');

let base, cookie = '';
const req = async (method, p, body, extra = {}) => {
  const r = await fetch(base + p, { method, redirect: 'manual', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...extra }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let data; try { data = JSON.parse(text); } catch (_) { data = text; }
  return { status: r.status, data, headers: r.headers };
};
const future = (() => { const d = new Date(Date.now() + 30 * 864e5); return d.toISOString().slice(0, 10); })();

test.before(() => new Promise(r => server.listen(0, () => { base = 'http://127.0.0.1:' + server.address().port; r(); })));
test.after(() => { server.close(); fs.rmSync(dir, { recursive: true, force: true }); });

test('public data starts with default prices and nothing booked', async () => {
  const r = await req('GET', '/api/public');
  assert.equal(r.status, 200);
  assert.deepEqual(r.data, { prices: { full: 650, half: 450 }, booked: {} });
  assert.equal(r.headers.get('cache-control'), 'no-store');
});

test('owner actions are refused without login', async () => {
  assert.equal((await req('GET', '/api/owner/state')).status, 401);
  assert.equal((await req('PUT', '/api/owner/prices', { full: 1, half: 1 })).status, 401);
  assert.equal((await req('PUT', '/api/owner/day', { date: future, am: true, pm: true })).status, 401);
});

test('a forged session cookie is refused', async () => {
  const r = await req('GET', '/api/owner/state', null, { Cookie: 'amphora_owner=eyJleHAiOjk5OTk5OTk5OTk5OTl9.forged' });
  assert.equal(r.status, 401);
});

test('wrong password fails, right password logs in', async () => {
  assert.equal((await req('POST', '/api/owner/login', { password: 'nope' })).status, 401);
  const r = await req('POST', '/api/owner/login', { password: 'correct horse battery' });
  assert.equal(r.status, 200);
  const set = r.headers.get('set-cookie');
  assert.match(set, /HttpOnly/); assert.match(set, /SameSite=Strict/);
  cookie = set.split(';')[0];
});

test('owner books a morning, then the whole day, and the public view follows', async () => {
  let r = await req('PUT', '/api/owner/day', { date: future, am: true, pm: false });
  assert.equal(r.status, 200);
  assert.deepEqual((await req('GET', '/api/public')).data.booked[future], { am: true, pm: false });
  await req('PUT', '/api/owner/day', { date: future, am: true, pm: true });
  assert.deepEqual((await req('GET', '/api/public')).data.booked[future], { am: true, pm: true });
  await req('PUT', '/api/owner/day', { date: future, am: false, pm: false });
  assert.equal((await req('GET', '/api/public')).data.booked[future], undefined);
});

test('past days are not sent to guests', async () => {
  await req('PUT', '/api/owner/day', { date: '2020-01-01', am: true, pm: true });
  assert.equal((await req('GET', '/api/public')).data.booked['2020-01-01'], undefined);
});

test('owner changes prices and guests see them; bad prices are rejected', async () => {
  assert.equal((await req('PUT', '/api/owner/prices', { full: 700, half: 0 })).status, 400);
  assert.equal((await req('PUT', '/api/owner/prices', { full: '700', half: 480 })).status, 400);
  assert.equal((await req('PUT', '/api/owner/prices', { full: 700, half: 480 })).status, 200);
  assert.deepEqual((await req('GET', '/api/public')).data.prices, { full: 700, half: 480 });
});

test('changes are saved to disk and survive a reload', async () => {
  const saved = JSON.parse(fs.readFileSync(path.join(dir, 'data.json'), 'utf8'));
  assert.deepEqual(saved.prices, { full: 700, half: 480 });
});

test('bad input is rejected', async () => {
  assert.equal((await req('PUT', '/api/owner/day', { date: 'tomorrow', am: true, pm: true })).status, 400);
  assert.equal((await req('PUT', '/api/owner/day', { date: future, am: 'yes', pm: true })).status, 400);
  const r = await fetch(base + '/api/owner/prices', { method: 'PUT', headers: { Cookie: cookie, 'Content-Type': 'text/plain' }, body: '{}' });
  assert.equal(r.status, 415);
});

test('logout clears the cookie', async () => {
  const r = await req('POST', '/api/owner/logout');
  assert.match(r.headers.get('set-cookie'), /Max-Age=0/);
});

test('too many wrong passwords lock the login for a while', async () => {
  for (let i = 0; i < 5; i++) await req('POST', '/api/owner/login', { password: 'x' + i }, { 'X-Forwarded-For': '9.9.9.9' });
  const r = await req('POST', '/api/owner/login', { password: 'correct horse battery' }, { 'X-Forwarded-For': '9.9.9.9' });
  assert.equal(r.status, 429);
});

test('site files are served, hidden files and path tricks are not', async () => {
  assert.equal((await req('GET', '/')).status, 200);
  assert.equal((await req('GET', '/de/')).status, 200);
  assert.equal((await req('GET', '/owner')).status, 301);
  assert.equal((await req('GET', '/%2e%2e/server/server.js')).status, 404);
  assert.equal((await req('GET', '/../data/data.json')).status, 404);
  assert.equal((await req('GET', '/.session-secret')).status, 404);
});
