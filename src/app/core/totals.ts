import { DiaryDocument, EntryDocument } from './models';
import { categoryName, entryCategoryId } from './categories';
import { inPeriod, involves, Payer, Period } from './store-stats';
import { displayEntry, personByName } from './entry-display';
import { entryRelations, FILTER_RELATIONS, RelationKey } from './spend-filters';
import { colorForStore } from './store-colors';

export interface TotalRow { id: string; name: string; total: number; count: number; }
export interface Totals { total: number; count: number; byCategory: TotalRow[]; byRelation: TotalRow[]; }
export interface TotalsFilters { period: Period; payer: Payer; person?: string; }
export type TotalsGroup = 'category' | 'relation';
export interface BreakdownStore extends TotalRow { color: string; }
export interface Breakdown { total: number; count: number; byStore: BreakdownStore[]; }

const money = (n: number) => Math.round(n * 100) / 100;
const rank = <T extends { total: number; name: string }>(rows: Iterable<T>): T[] =>
  [...rows].map(r => ({ ...r, total: money(r.total) })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

/** Entries in the range that pass the paid-by and person filters. The relation and category filters are not applied. */
function* inRange(data: DiaryDocument, filters: TotalsFilters, anchor: Date): Generator<{ date: string; raw: EntryDocument; entry: EntryDocument }> {
  const person = personByName(data, filters.person ?? '')?.name ?? filters.person ?? '';
  for (const day of data.days) {
    if (!inPeriod(day.date, filters.period, anchor)) continue;
    for (const raw of day.entries) {
      const entry = displayEntry(data, raw);
      if (filters.payer === 'me' && !entry.paidByMe) continue;
      if (filters.payer === 'others' && entry.paidByMe) continue;
      if (!involves(entry, person)) continue;
      yield { date: day.date, raw, entry };
    }
  }
}

/**
 * Spending for a period grouped by category and by relation. Each expense counts once per category. An expense
 * with people from two relations counts under both, so the relation rows can add up to more than the total.
 * Categories follow the store link; empty groups are left out and rows are sorted by amount.
 */
export function spendTotals(data: DiaryDocument, filters: TotalsFilters, anchor = new Date()): Totals {
  const categories = new Map<string, TotalRow>();
  const relations = new Map<RelationKey, TotalRow>();
  let total = 0, count = 0;
  for (const { raw, entry } of inRange(data, filters, anchor)) {
    const amount = entry.amount || 0;
    total += amount; count += 1;
    const id = entryCategoryId(data, raw);
    const row = categories.get(id) ?? { id, name: categoryName(data, raw), total: 0, count: 0 };
    row.total += amount; row.count += 1; categories.set(id, row);
    for (const r of entryRelations(data, raw)) {
      const rel = relations.get(r) ?? { id: r, name: FILTER_RELATIONS.find(x => x.id === r)!.label, total: 0, count: 0 };
      rel.total += amount; rel.count += 1; relations.set(r, rel);
    }
  }
  return { total: money(total), count, byCategory: rank(categories.values()), byRelation: rank(relations.values()) };
}

/** How one category or relation total is made up: spend per store. */
export function totalsBreakdown(data: DiaryDocument, filters: TotalsFilters, group: TotalsGroup, id: string, anchor = new Date()): Breakdown {
  const stores = new Map<string, BreakdownStore>();
  let total = 0, count = 0;
  for (const { raw, entry } of inRange(data, filters, anchor)) {
    const match = group === 'category' ? entryCategoryId(data, raw) === id : entryRelations(data, raw).has(id as RelationKey);
    if (!match) continue;
    const amount = entry.amount || 0;
    const key = entry.storeId || entry.storeName;
    const store = data.stores.find(s => s.id === entry.storeId);
    const color = colorForStore(store ?? { id: key, color: entry.storeColor });
    const row = stores.get(key) ?? { id: key, name: entry.storeName, color, total: 0, count: 0 };
    row.total += amount; row.count += 1; stores.set(key, row);
    total += amount; count += 1;
  }
  return { total: money(total), count, byStore: rank(stores.values()) };
}
