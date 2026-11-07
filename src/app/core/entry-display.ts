import { DiaryDocument, EntryDocument, PersonDocument } from './models';
import { sameName } from './names';
export const storeName = (data: DiaryDocument, entry: EntryDocument) => data.stores.find(s => s.id === entry.storeId)?.name ?? entry.storeName;
export function personByName(data: DiaryDocument, name: string): PersonDocument | undefined {
  return data.people.find(p => sameName(p.name, name)) ?? data.people.find(p => p.previousNames?.some(n => sameName(n, name)));
}
export const payerPerson = (data: DiaryDocument, entry: EntryDocument) => entry.paidByMe ? undefined : entry.paidById ? data.people.find(p => p.id === entry.paidById) : personByName(data, entry.paidByName ?? '');
export const payerName = (data: DiaryDocument, entry: EntryDocument) => entry.paidByMe ? 'Me' : payerPerson(data, entry)?.name ?? entry.paidByName ?? 'Other';
export function companionNames(data: DiaryDocument, entry: EntryDocument): string[] {
  return entry.personNames.map((name, i) => (entry.personIds[i] ? data.people.find(p => p.id === entry.personIds[i]) : personByName(data, name))?.name ?? name);
}
export const displayEntry = (data: DiaryDocument, entry: EntryDocument): EntryDocument => ({...entry, storeName: storeName(data, entry), paidByName: entry.paidByMe ? null : payerName(data, entry), personNames: companionNames(data, entry)});
