import { ensureStoreColors, nextStoreColor } from './store-colors';
import { DiaryDocument } from './models';
import { normalizeName, sameName } from './names';
export type CatalogKind = 'stores' | 'people';
export function addCatalogItem(source: DiaryDocument, kind: CatalogKind, value: string): DiaryDocument {
  const name = normalizeName(value);
  if (!name) throw new Error('Enter a name.');
  if (name.length > 80) throw new Error('Use 80 characters or fewer.');
  if (source[kind].some(item => sameName(item.name, name))) {
    throw new Error(kind === 'stores' ? 'This store is already saved.' : 'This person is already saved.');
  }
  const next = structuredClone(source);
  next.stores = ensureStoreColors(next.stores);
  next[kind].push({ ...(kind === 'stores' ? {color: nextStoreColor(next.stores, name)} : {}), id: crypto.randomUUID(), name, createdAt: new Date().toISOString() });
  return next;
}
export function removeCatalogItem(source: DiaryDocument, kind: CatalogKind, id: string): DiaryDocument {
  const next = structuredClone(source);
  if (kind === 'stores') {
    const store = next.stores.find(item => item.id === id);
    if (store) for (const day of next.days) for (const entry of day.entries) {
      if (entry.storeId === id && !entry.storeColor) entry.storeColor = store.color;
    }
  }
  next[kind] = next[kind].filter(item => item.id !== id);
  return next;
}
