import { DiaryDocument } from './models';
import { colorForStore } from './store-colors';
import { displayEntry, personByName } from './entry-display';
import { sameName } from './names';

export type Period = 'month' | 'year' | 'all';
export type Payer = 'all' | 'me' | 'others';
export type Sort = 'spent' | 'visits' | 'name' | 'recent';
export interface StoreRow { id: string; name: string; color: string; visits: number; total: number; last: string; }
export interface StoreFilters { period: Period; payer: Payer; sort: Sort; query: string; /** Only orders where this person was with you or paid. Empty means anyone. */ person?: string; }

/** True when the person was with you on the order or was the one who paid. */
export function involves(entry: { personNames?: string[]; paidByMe: boolean; paidByName: string | null }, person: string): boolean {
  if (!person.trim()) return true;
  return (entry.personNames ?? []).some(n => sameName(n, person)) || (!entry.paidByMe && !!entry.paidByName && sameName(entry.paidByName, person));
}

const pad = (n: number) => String(n).padStart(2, '0');

/** True when a yyyy-MM-dd date falls in the month or year of `anchor`, or always for 'all'. */
export function inPeriod(date: string, period: Period, anchor = new Date()): boolean {
  switch (period) {
    case 'month': return date.startsWith(`${anchor.getFullYear()}-${pad(anchor.getMonth() + 1)}`);
    case 'year': return date.startsWith(`${anchor.getFullYear()}-`);
    default: return true;
  }
}

/** Group entries into per-store rows for the Stores page. A visit is one entry; removed stores still group by their snapshot name and color. */
export function storeRows(data: DiaryDocument, filters: StoreFilters, anchor = new Date()): StoreRow[] {
  const query = filters.query.trim().toLocaleLowerCase();
  const groups = new Map<string, StoreRow>();
  for (const day of data.days) {
    if (!inPeriod(day.date, filters.period, anchor)) continue;
    for (const raw of day.entries) {
      const entry = displayEntry(data, raw);
      if (filters.payer === 'me' && !entry.paidByMe) continue;
      if (filters.payer === 'others' && entry.paidByMe) continue;
      if (!involves(entry, personByName(data,filters.person??'')?.name ?? filters.person ?? '')) continue;
      const key = entry.storeId || entry.storeName;
      const store = data.stores.find(s => s.id === entry.storeId);
      const name = store?.name ?? entry.storeName;
      if (query && !name.toLocaleLowerCase().includes(query)) continue;
      const group = groups.get(key) ?? { id: key, name, color: colorForStore(store ?? { id: key, color: entry.storeColor }), visits: 0, total: 0, last: '' };
      group.visits += 1;
      group.total += entry.amount || 0;
      if (day.date > group.last) group.last = day.date;
      groups.set(key, group);
    }
  }
  const rows = [...groups.values()];
  const by = filters.sort;
  rows.sort((a, b) => by === 'name' ? a.name.localeCompare(b.name)
    : by === 'visits' ? b.visits - a.visits || b.total - a.total
    : by === 'recent' ? b.last.localeCompare(a.last)
    : b.total - a.total || a.name.localeCompare(b.name));
  for (const row of rows) row.total = Math.round(row.total*100)/100;
  return rows;
}

export interface StoreOrder { id: string; date: string; amount: number; items: string; payer: string; paidByMe: boolean; people: string[]; }

/** Every entry for one store (by the same key storeRows groups on) in the filtered period, newest first. */
export function storeOrders(data: DiaryDocument, key: string, filters: Pick<StoreFilters, 'period' | 'payer' | 'person'>, anchor = new Date()): StoreOrder[] {
  const orders: StoreOrder[] = [];
  for (const day of data.days) {
    if (!inPeriod(day.date, filters.period, anchor)) continue;
    for (const raw of day.entries) {
      const entry = displayEntry(data, raw);
      if ((entry.storeId || entry.storeName) !== key) continue;
      if (filters.payer === 'me' && !entry.paidByMe) continue;
      if (filters.payer === 'others' && entry.paidByMe) continue;
      if (!involves(entry, personByName(data,filters.person??'')?.name ?? filters.person ?? '')) continue;
      orders.push({ id: entry.id, date: day.date, amount: entry.amount || 0, items: entry.items?.trim() ?? '', payer: entry.paidByMe ? 'Me' : (entry.paidByName || 'Other'), paidByMe: entry.paidByMe, people: [...(entry.personNames ?? [])] });
    }
  }
  return orders.sort((a, b) => b.date.localeCompare(a.date));
}
