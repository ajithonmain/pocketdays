import { CategoryDocument, DiaryDocument, EntryDocument } from './models';
import { normalizeName, sameName } from './names';

export const FALLBACK_CATEGORY = 'others';
const DEFAULT_NAMES: [string, string][] = [
  ['food', 'Food'], ['clothing', 'Clothing'], ['transport', 'Transport'], ['bills', 'Bills'],
  ['health', 'Health'], ['entertainment', 'Entertainment'], [FALLBACK_CATEGORY, 'Others'],
];
const EPOCH = '2026-01-01T00:00:00.000Z';
export const defaultCategories = (): CategoryDocument[] => DEFAULT_NAMES.map(([id, name]) => ({ id, name, createdAt: EPOCH }));

/** Saved categories, or the built-in defaults until the list is first edited. */
export const categoriesOf = (data: DiaryDocument): CategoryDocument[] => data.categories ?? defaultCategories();

/** Category name for an entry: the live name, else the snapshot saved with the entry, else Others. */
export function categoryName(data: DiaryDocument, entry: Pick<EntryDocument, 'categoryId' | 'categoryName'>): string {
  const id = entry.categoryId || FALLBACK_CATEGORY;
  return categoriesOf(data).find(c => c.id === id)?.name ?? entry.categoryName ?? 'Others';
}

export function addCategory(source: DiaryDocument, value: string): DiaryDocument {
  const name = normalizeName(value);
  if (!name) throw new Error('Enter a name.');
  if (name.length > 40) throw new Error('Use 40 characters or fewer.');
  const list = categoriesOf(source);
  if (list.some(c => sameName(c.name, name))) throw new Error('This category is already saved.');
  if (list.length >= 40) throw new Error('Too many categories.');
  const next = structuredClone(source);
  next.categories = [...list, { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() }];
  return next;
}

/** Removing keeps the name on past entries; they stay filterable under the removed id. */
export function removeCategory(source: DiaryDocument, id: string): DiaryDocument {
  if (id === FALLBACK_CATEGORY) throw new Error('Others cannot be removed.');
  const list = categoriesOf(source);
  const target = list.find(c => c.id === id);
  const next = structuredClone(source);
  if (target) for (const day of next.days) for (const entry of day.entries) {
    if ((entry.categoryId || FALLBACK_CATEGORY) === id) { entry.categoryId = id; entry.categoryName = target.name; }
  }
  next.categories = list.filter(c => c.id !== id);
  return next;
}

/** The category used the last time this store was logged, so repeat visits need no extra tap. */
export function lastCategoryForStore(data: DiaryDocument, storeId: string): string {
  if (!storeId || storeId === 'other') return '';
  const ids = new Set(categoriesOf(data).map(c => c.id));
  let best = { date: '', id: '' };
  for (const day of data.days) for (const e of day.entries) {
    if (e.storeId === storeId && e.categoryId && ids.has(e.categoryId) && day.date >= best.date) best = { date: day.date, id: e.categoryId };
  }
  return best.id;
}
