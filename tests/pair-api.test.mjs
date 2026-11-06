import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/pair.ts';
const key = 'a'.repeat(64);
const id = 'b'.repeat(64);
const payload = 'QUJD'.repeat(31);
const put = (body, token = key) => new Request('https://example.test/api/pair', { method: 'PUT', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body) });
const post = body => new Request('https://example.test/api/pair', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });
const fakeDb = ({ diary = { revision: 1 }, claimed = null } = {}) => {
  const calls = [];
  return { calls, DB: { prepare(sql) { const call = { sql, values: [] }; calls.push(call); return { bind(...v) { call.values = v; return this; }, async first() { return sql.startsWith('SELECT') ? diary : claimed; }, async run() { return { meta: { changes: 1 } }; } }; } } };
};

test('creating a pairing requires a diary key before touching the database', async () => {
  const res = await onRequest({ request: put({ id, payload }, ''), env: {} });
  assert.equal(res.status, 401);
});

test('creating a pairing validates the id and payload', async () => {
  for (const body of [{}, { id: 'short', payload }, { id, payload: '<script>' }, { id, payload: 5 }]) assert.equal((await onRequest({ request: put(body), env: fakeDb() })).status, 400);
});

test('a diary that has never synced cannot create a pairing', async () => {
  assert.equal((await onRequest({ request: put({ id, payload }), env: fakeDb({ diary: null }) })).status, 404);
});

test('a pairing is stored by key hash with a ten minute expiry and replaces older ones', async () => {
  const db = fakeDb();
  const before = Math.floor(Date.now() / 1000);
  const res = await onRequest({ request: put({ id, payload }), env: db });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
  const { expiresAt } = await res.json();
  assert.ok(expiresAt >= before + 600 && expiresAt <= before + 602);
  const remove = db.calls.find(c => c.sql.startsWith('DELETE'));
  const insert = db.calls.find(c => c.sql.startsWith('INSERT'));
  assert.ok(remove);
  assert.match(insert.values[1], /^[a-f0-9]{64}$/);
  assert.notEqual(insert.values[1], key);
  assert.deepEqual([insert.values[0], insert.values[2], insert.values[3]], [id, payload, expiresAt]);
});

test('claiming validates the id and returns the payload once', async () => {
  assert.equal((await onRequest({ request: post('not json'), env: fakeDb() })).status, 400);
  assert.equal((await onRequest({ request: post({ id: 'x' }), env: fakeDb() })).status, 400);
  const ok = await onRequest({ request: post({ id }), env: fakeDb({ claimed: { payload } }) });
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { payload });
  const missing = await onRequest({ request: post({ id }), env: fakeDb({ claimed: null }) });
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get('Cache-Control'), 'no-store');
});

test('other methods are rejected', async () => {
  assert.equal((await onRequest({ request: new Request('https://example.test/api/pair'), env: {} })).status, 405);
});
