import { ensureStoreColors, nextStoreColor } from './store-colors';
import { DiaryDocument } from './models';
import { companionNames, payerName, personByName } from './entry-display';
import { normalizeName, sameName } from './names';
export type CatalogKind = 'stores' | 'people';
export function addCatalogItem(source: DiaryDocument, kind: CatalogKind, value: string): DiaryDocument {
  const name = normalizeName(value);
  if (!name) throw new Error('Enter a name.');
  if (name.length > 80) throw new Error('Use 80 characters or fewer.');
  if (source[kind].some(item => sameName(item.name, name)) || (kind === 'people' && source.people.some(p => p.previousNames?.some(n => sameName(n,name))))) {
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
      if (entry.storeId === id) { entry.storeName = store.name; if (!entry.storeColor) entry.storeColor = store.color; }
    }
  }
  if (kind === 'people') {
    const person = next.people.find(p => p.id === id);
    if (person) for (const day of next.days) for (const entry of day.entries) {
      entry.personNames = entry.personNames.map((name,i)=>entry.personIds[i]===id || (!entry.personIds[i] && personByName(source,name)?.id===id) ? companionNames(source,entry)[i] : name);
      if (!entry.paidByMe && (entry.paidById === id || (!entry.paidById && personByName(source, entry.paidByName ?? '')?.id === id))) {
        entry.paidByName = payerName(source, entry); entry.paidById = id;
      }
    }
  }
  next[kind] = next[kind].filter(item => item.id !== id);
  return next;
}

/** Rename only the catalog record. Preserve historical aliases for legacy name-only payers. */
export function renameCatalogItem(source: DiaryDocument, kind: CatalogKind, id: string, value: string, originalName?: string): DiaryDocument {
  const item=source[kind].find(p=>p.id===id);
  if(!item) throw new Error('This saved name was removed.');
  if(originalName !== undefined && item.name !== originalName) throw new Error('This name changed elsewhere. Close and reopen it.');
  const name=normalizeName(value);
  if(!name) throw new Error('Enter a name.');
  if(name.length>80) throw new Error('Use 80 characters or fewer.');
  if(source[kind].some(p=>p.id!==id && sameName(p.name,name))) throw new Error(kind==='stores'?'This store is already saved.':'This person is already saved.');
  if(kind==='people' && source.people.some(p=>p.id!==id && p.previousNames?.some(n=>sameName(n,name)))) throw new Error('This name belongs to another saved person.');
  const next=structuredClone(source);
  const target=next[kind].find(p=>p.id===id)!;
  if(kind==='people' && !sameName(item.name,name)) {
    const person=next.people.find(p=>p.id===id)!;
    person.previousNames=[...new Set([...(person.previousNames??[]),item.name])];
    if(person.previousNames.length>100) throw new Error('This person has too many previous names.');
  }
  target.name=name;
  return next;
}
export const renameStore=(source:DiaryDocument,id:string,name:string)=>renameCatalogItem(source,'stores',id,name);
