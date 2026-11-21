import assert from 'node:assert/strict';
import test from 'node:test';
import { signal } from '@angular/core';
import { loadSource } from './load-source.mjs';

const { DiaryService } = await loadSource('diary.service');
const { emptyDiary } = await loadSource('models');
const { applyDay, newDraft } = await loadSource('entries');

const draft = () => ({ ...newDraft(), storeName: 'Market', amount: 10 });

// Exercise the service with a shared record and a controlled network response.
// Construct without opening browser storage or starting background sync timers.
function serviceWithRecord(initial) {
  let record = structuredClone(initial);
  const service = Object.assign(Object.create(DiaryService.prototype), {
    ready: signal(true), online: signal(true), pending: signal(record.dirty),
    status: signal(''), error: signal(''), conflict: signal(false),
    data: signal(record.data), revision: record.revision, base: record.base,
    lock: callback => callback(),
    async load() {
      const { data, dirty, revision, base } = structuredClone(record);
      this.data.set(data);
      this.pending.set(dirty);
      this.revision = revision;
      this.base = base;
    },
    async persist() {
      record = structuredClone({ data: this.data(), dirty: this.pending(), revision: this.revision, base: this.base });
    },
  });
  return { service, read: () => structuredClone(record) };
}

test('a save during a merged upload keeps the remote day in the next upload', { timeout: 2000 }, async () => {
  const base = emptyDiary();
  const local = applyDay(base, '2026-11-06', [draft()]);
  const remote = applyDay(base, '2026-11-07', [draft()]);
  const { service, read } = serviceWithRecord({ data: local, dirty: true, revision: 1, base });
  const started = Promise.withResolvers();
  const upload = Promise.withResolvers();
  const nextUpload = Promise.withResolvers();
  let cloud = { data: remote, revision: 2 };
  service.request = async (method, sent) => {
    if (method === 'GET') return structuredClone(cloud);
    if (sent.revision === 2) {
      started.resolve();
      await upload.promise;
    } else {
      nextUpload.resolve(sent.data);
    }
    cloud = { data: sent.data, revision: sent.revision + 1 };
    return structuredClone(cloud);
  };
  const syncing = service.sync();
  await started.promise;
  await service.saveDay('2026-11-08', [draft()], '[]');
  const localDates = read().data.days.map(day => day.date).sort();
  upload.resolve();
  await syncing;
  const expected = ['2026-11-06', '2026-11-07', '2026-11-08'];
  assert.deepEqual(localDates, expected);
  assert.deepEqual((await nextUpload.promise).days.map(day => day.date).sort(), expected);
});
