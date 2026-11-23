import { DiaryDocument, EntryDocument, Relation } from './models';
import { entryCategoryId } from './categories';
import { personByName } from './entry-display';

export const RELATIONS: { id: Relation; label: string }[] = [{ id: 'family', label: 'Family' }, { id: 'friends', label: 'Friends' }, { id: 'others', label: 'Others' }];
/** Relations a filter or total can group by: the three saved ones plus 'none' for expenses with nobody else involved. */
export type RelationKey = Relation | 'none';
export const FILTER_RELATIONS: { id: RelationKey; label: string }[] = [...RELATIONS, { id: 'none', label: 'Just me' }];
export interface SpendFilter { relation: RelationKey | ''; category: string; }
export const noSpendFilter = (): SpendFilter => ({ relation: '', category: '' });
export const spendFilterActive = (f: SpendFilter) => !!f.relation || !!f.category;
export const nextRelation = (r: Relation | undefined): Relation => r === 'family' ? 'friends' : r === 'friends' ? 'others' : 'family';
export const relationLabel = (r: Relation | undefined) => RELATIONS.find(x => x.id === (r ?? 'others'))!.label;

/**
 * Relations that apply to an entry: those of everyone with you and of whoever paid.
 * An entry with nobody involved counts as 'none' (Just me); people without a relation count as Others.
 */
export function entryRelations(data: DiaryDocument, entry: EntryDocument): Set<RelationKey> {
  const found = new Set<RelationKey>();
  entry.personNames.forEach((name, i) => {
    const person = entry.personIds[i] ? data.people.find(p => p.id === entry.personIds[i]) : personByName(data, name);
    found.add(person?.relation ?? 'others');
  });
  if (!entry.paidByMe) {
    const payer = entry.paidById ? data.people.find(p => p.id === entry.paidById) : personByName(data, entry.paidByName ?? '');
    found.add(payer?.relation ?? 'others');
  }
  if (!found.size) found.add('none');
  return found;
}

export function matchesSpendFilter(data: DiaryDocument, entry: EntryDocument, filter: SpendFilter): boolean {
  if (filter.category && entryCategoryId(data, entry) !== filter.category) return false;
  return !filter.relation || entryRelations(data, entry).has(filter.relation);
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
