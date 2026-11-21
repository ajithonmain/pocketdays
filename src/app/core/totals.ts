import { DiaryDocument, Relation } from './models';
import { categoryName, entryCategoryId } from './categories';
import { inPeriod, involves, Payer, Period } from './store-stats';
import { displayEntry, personByName } from './entry-display';
import { entryRelations, RELATIONS } from './spend-filters';

export interface TotalRow { id: string; name: string; total: number; count: number; }
export interface Totals { total: number; count: number; byCategory: TotalRow[]; byRelation: TotalRow[]; }
export interface TotalsFilters { period: Period; payer: Payer; person?: string; }

const money = (n: number) => Math.round(n * 100) / 100;

/**
 * Spending for a period grouped by category and by relation. Each expense counts once per category. An expense
 * with people from two relations counts under both, so the relation rows can add up to more than the total.
 * Categories follow the store link; empty groups are left out and rows are sorted by amount.
 */
export function spendTotals(data: DiaryDocument, filters: TotalsFilters, anchor = new Date()): Totals {
  const categories = new Map<string, TotalRow>();
  const relations = new Map<Relation, TotalRow>();
  let total = 0, count = 0;
  const person = personByName(data, filters.person ?? '')?.name ?? filters.person ?? '';
  for (const day of data.days) {
    if (!inPeriod(day.date, filters.period, anchor)) continue;
    for (const raw of day.entries) {
      const entry = displayEntry(data, raw);
      if (filters.payer === 'me' && !entry.paidByMe) continue;
      if (filters.payer === 'others' && entry.paidByMe) continue;
      if (!involves(entry, person)) continue;
      const amount = entry.amount || 0;
      total += amount; count += 1;
      const id = entryCategoryId(data, raw);
      const row = categories.get(id) ?? { id, name: categoryName(data, raw), total: 0, count: 0 };
      row.total += amount; row.count += 1; categories.set(id, row);
      for (const r of entryRelations(data, raw)) {
        const rel = relations.get(r) ?? { id: r, name: RELATIONS.find(x => x.id === r)!.label, total: 0, count: 0 };
        rel.total += amount; rel.count += 1; relations.set(r, rel);
      }
    }
  }
  const sorted = (rows: Iterable<TotalRow>) => [...rows].map(r => ({ ...r, total: money(r.total) })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  return { total: money(total), count, byCategory: sorted(categories.values()), byRelation: sorted(relations.values()) };
}
