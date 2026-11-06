import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './load-source.mjs';
const { generatePairCode, normalizePairCode, pairingId, sealDiaryKey, openDiaryKey } = await loadSource('pairing');
const diaryKey = 'ab'.repeat(32);

test('generated codes use the unambiguous alphabet and are not repeated', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const code = generatePairCode();
    assert.match(code, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    seen.add(code);
  }
  assert.equal(seen.size, 200);
});

test('typed codes are normalized and impossible ones are rejected', () => {
  assert.equal(normalizePairCode(' k7m2-9qxa '), 'K7M29QXA');
  assert.equal(normalizePairCode('K7M29QXA'), 'K7M29QXA');
  for (const bad of ['', 'K7M2-9QX', 'K7M2-9QXAB', 'K7M2-9QX0', 'K7M2-9QXI']) assert.equal(normalizePairCode(bad), '');
});

test('a sealed key opens with the same code and the server-side values reveal nothing', async () => {
  const sealed = await sealDiaryKey('K7M2-9QXA', diaryKey);
  assert.match(sealed.id, /^[a-f0-9]{64}$/);
  assert.equal(sealed.id, await pairingId('k7m2 9qxa'));
  assert.ok(!sealed.payload.includes(diaryKey));
  assert.notEqual(sealed.id, diaryKey);
  assert.equal(await openDiaryKey('k7m2-9qxa', sealed.payload), diaryKey);
});

test('a wrong code cannot open the payload and has a different lookup id', async () => {
  const sealed = await sealDiaryKey('K7M2-9QXA', diaryKey);
  await assert.rejects(openDiaryKey('K7M2-9QXB', sealed.payload), /did not work/);
  assert.notEqual(await pairingId('K7M2-9QXB'), sealed.id);
});

test('tampered payloads and invalid keys are rejected', async () => {
  const sealed = await sealDiaryKey('K7M2-9QXA', diaryKey);
  const bytes = Buffer.from(sealed.payload, 'base64'); bytes[bytes.length - 1] ^= 1;
  await assert.rejects(openDiaryKey('K7M2-9QXA', bytes.toString('base64')), /did not work/);
  await assert.rejects(sealDiaryKey('K7M2-9QXA', 'not-a-key'), /Invalid diary key/);
});
