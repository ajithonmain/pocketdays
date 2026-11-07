import { displayEntry } from './entry-display';
import { DayDocument, DiaryDocument, EntryDocument, PersonDocument, SettingsDocument, StoreDocument } from './models';

export const BACKUP_LIMIT_BYTES = 8 * 1024 * 1024;
export interface BackupFile { app: 'PocketDays'; kind: 'backup'; version: 1; exportedAt: string; diary: DiaryDocument; }
export interface BackupSummary { exportedAt: string; days: number; entries: number; stores: number; people: number; }

/** Wraps the diary for download. The private diary link is never included. */
export function createBackup(diary: DiaryDocument, now = new Date()): BackupFile {
  return { app: 'PocketDays', kind: 'backup', version: 1, exportedAt: now.toISOString(), diary: {...diary, days:diary.days.map(day=>({...day,entries:day.entries.map(entry=>displayEntry(diary,entry))}))} };
}
export function backupFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `pocketdays-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}
export function summarize(diary: DiaryDocument, exportedAt = ''): BackupSummary {
  return { exportedAt, days: diary.days.length, entries: diary.days.reduce((n, d) => n + d.entries.length, 0), stores: diary.stores.length, people: diary.people.length };
}

const fail = (message: string): never => { throw new Error(message); };
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, label: string, max: number, required = true): string => {
  if (typeof v !== 'string') return fail(`${label} is missing or not text.`);
  if (v.length > max) return fail(`${label} is too long.`);
  if (required && !v.trim()) return fail(`${label} is empty.`);
  return v;
};
const list = (v: unknown, label: string, max: number): unknown[] => {
  if (!Array.isArray(v)) return fail(`${label} must be a list.`);
  if (v.length > max) return fail(`${label} has too many items.`);
  return v;
};
const hex = (v: unknown): string | undefined => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) ? v : undefined;
const isoDate = (v: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T12:00:00Z')) && new Date(v + 'T12:00:00Z').toISOString().startsWith(v);

function parseStore(v: unknown): StoreDocument {
  if (!isRecord(v)) return fail('A store is not valid.');
  const store: StoreDocument = { id: text(v['id'], 'A store id', 64), name: text(v['name'], 'A store name', 80), createdAt: text(v['createdAt'], 'A store date', 40) };
  const color = hex(v['color']); if (color) store.color = color;
  return store;
}
function parsePerson(v: unknown): PersonDocument {
  if (!isRecord(v)) return fail('A person is not valid.');
  return { id: text(v['id'], 'A person id', 64), name: text(v['name'], 'A person name', 80), createdAt: text(v['createdAt'], 'A person date', 40), ...(v['previousNames'] === undefined ? {} : { previousNames: list(v['previousNames'], 'Previous names', 100).map(n => text(n, 'A previous name', 80)) }) };
}
function parseEntry(v: unknown): EntryDocument {
  if (!isRecord(v)) return fail('An expense is not valid.');
  const amount = v['amount'];
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 1e9) return fail('An expense has an invalid amount.');
  if (typeof v['paidByMe'] !== 'boolean' || typeof v['iOweThem'] !== 'boolean') return fail('An expense has an invalid payer.');
  const paidByMe = v['paidByMe'] as boolean;
  const names = list(v['personNames'], 'People on an expense', 100).map(n => text(n, 'A person name', 80));
  const ids = list(v['personIds'], 'People ids on an expense', 100).map(n => text(n, 'A person id', 64));
  const entry: EntryDocument = {
    id: text(v['id'], 'An expense id', 64), storeId: text(v['storeId'], 'An expense store id', 64), storeName: text(v['storeName'], 'An expense store', 80),
    items: text(v['items'] ?? '', 'An expense note', 2000, false), amount: Math.round(amount * 100) / 100, paidByMe,
    paidByName: paidByMe ? null : (v['paidByName'] == null ? null : text(v['paidByName'], 'A payer name', 80, false)),
    iOweThem: !paidByMe && v['iOweThem'] === true, personIds: ids, personNames: names,
    createdAt: text(v['createdAt'], 'An expense date', 40), updatedAt: text(v['updatedAt'], 'An expense date', 40),
  };
  if (v['paidById'] !== undefined) { const id=text(v['paidById'], 'A payer id', 64); if (!paidByMe) entry.paidById=id; }
  const color = hex(v['storeColor']); if (color) entry.storeColor = color;
  return entry;
}
function parseSettings(v: unknown): SettingsDocument {
  if (!isRecord(v)) return fail('Settings are missing.');
  const currency = v['currency'], week = v['weekStart'];
  if (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) return fail('The currency is not valid.');
  if (week !== 'monday' && week !== 'sunday') return fail('The week start is not valid.');
  return { currency, weekStart: week, showDailyTotals: v['showDailyTotals'] === true };
}

/**
 * Validate untrusted backup text and rebuild a clean diary from it: unknown fields are dropped, every value is
 * checked, day totals and counts are recomputed. Throws an Error with a plain message when anything is wrong.
 */
export function parseBackup(raw: string): { diary: DiaryDocument; summary: BackupSummary } {
  if (raw.length > BACKUP_LIMIT_BYTES) fail('File too large for a backup.');
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return fail('Not a PocketDays backup.'); }
  if (!isRecord(json) || json['app'] !== 'PocketDays' || json['kind'] !== 'backup') return fail('Not a PocketDays backup.');
  if (json['version'] !== 1) return fail('Backup is from a newer version.');
  const source = json['diary'];
  if (!isRecord(source) || source['schemaVersion'] !== 1) return fail('Unsupported backup format.');
  const stores = list(source['stores'], 'Stores', 5000).map(parseStore);
  const people = list(source['people'], 'People', 5000).map(parsePerson);
  const seen = new Set<string>();
  const days: DayDocument[] = list(source['days'], 'Days', 40000).map(item => {
    if (!isRecord(item)) return fail('A day is not valid.');
    const date = text(item['date'], 'A day date', 10);
    if (!isoDate(date)) return fail(`The date ${date} is not valid.`);
    if (seen.has(date)) return fail(`The day ${date} appears twice.`);
    seen.add(date);
    const entries = list(item['entries'], 'Expenses', 1000).map(parseEntry);
    return { date, entries, entryCount: entries.length, total: Math.round(entries.reduce((s, e) => s + e.amount, 0) * 100) / 100, updatedAt: typeof item['updatedAt'] === 'string' ? item['updatedAt'].slice(0, 40) : new Date(0).toISOString() };
  }).filter(day => day.entries.length > 0).sort((a, b) => a.date.localeCompare(b.date));
  const diary: DiaryDocument = { schemaVersion: 1, stores, people, days, settings: parseSettings(source['settings']) };
  return { diary, summary: summarize(diary, typeof json['exportedAt'] === 'string' ? json['exportedAt'] : '') };
}
