import { DiaryDocument, EntryDocument, Relation } from './models';
import { entryCategoryId } from './categories';
import { personByName } from './entry-display';
import { FALLBACK_RELATION, isSolo, relationId } from './relations';

export interface SpendFilter { relation: Relation | ''; category: string; }
export const noSpendFilter = (): SpendFilter => ({ relation: '', category: '' });
export const spendFilterActive = (f: SpendFilter) => !!f.relation || !!f.category;

/**
 * Relations that apply to an entry: those of everyone with you and of whoever paid.
 * An entry with nobody involved, or only people without a relation, counts as Others.
 */
export function entryRelations(data: DiaryDocument, entry: EntryDocument): Set<Relation> {
  const found = new Set<Relation>();
  entry.personNames.forEach((name, i) => {
    const person = entry.personIds[i] ? data.people.find(p => p.id === entry.personIds[i]) : personByName(data, name);
    found.add(relationId(data, person?.relation));
  });
  if (!entry.paidByMe) {
    const payer = entry.paidById ? data.people.find(p => p.id === entry.paidById) : personByName(data, entry.paidByName ?? '');
    found.add(relationId(data, payer?.relation));
  }
  if (!found.size) found.add(entry.relation ? relationId(data, entry.relation) : FALLBACK_RELATION);
  return found;
}

export function matchesSpendFilter(data: DiaryDocument, entry: EntryDocument, filter: SpendFilter): boolean {
  if (filter.category && entryCategoryId(data, entry) !== filter.category) return false;
  // A solo expense with no relation chosen shows under every relation filter; a chosen one filters like any other.
  return !filter.relation || (isSolo(entry) && !entry.relation) || entryRelations(data, entry).has(filter.relation);
}

/** A copy of the diary holding only matching entries, with day totals and counts recomputed. Never saved. */
export function filterDiary(data: DiaryDocument, filter: SpendFilter): DiaryDocument {
  if (!spendFilterActive(filter)) return data;
  const days = data.days.flatMap(day => {
    const entries = day.entries.filter(e => matchesSpendFilter(data, e, filter));
    if (!entries.length) return [];
    return [{ ...day, entries, entryCount: entries.length, total: Math.round(entries.reduce((s, e) => s + e.amount, 0) * 100) / 100 }];
  });
  return { ...data, days };
}
