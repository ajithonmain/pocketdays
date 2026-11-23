import { DiaryDocument, EntryDocument, Relation, RelationDocument } from './models';
import { normalizeName, sameName } from './names';

export const FALLBACK_RELATION: Relation = 'others';
const DEFAULT_NAMES: [string, string][] = [['family', 'Family'], ['friends', 'Friends'], [FALLBACK_RELATION, 'Others']];
const EPOCH = '2026-01-01T00:00:00.000Z';
export const defaultRelations = (): RelationDocument[] => DEFAULT_NAMES.map(([id, name]) => ({ id, name, createdAt: EPOCH }));

/** Saved relations, or Family, Friends and Others until the list is first edited. */
export const relationsOf = (data: DiaryDocument): RelationDocument[] => data.relations ?? defaultRelations();

/** The id to group by: unknown or missing ids count as Others. */
export const relationId = (data: DiaryDocument, id: string | undefined): Relation =>
  id && relationsOf(data).some(r => r.id === id) ? id : FALLBACK_RELATION;

export const relationName = (data: DiaryDocument, id: string | undefined): string =>
  relationsOf(data).find(r => r.id === relationId(data, id))?.name ?? 'Others';

/** The next relation in the list after `current`, for the tag on a person chip. */
export function nextRelationId(data: DiaryDocument, current: string | undefined): Relation {
  const list = relationsOf(data);
  const at = list.findIndex(r => r.id === relationId(data, current));
  return list[(at + 1) % list.length].id;
}

export function addRelation(source: DiaryDocument, value: string): DiaryDocument {
  const name = normalizeName(value);
  if (!name) throw new Error('Enter a name.');
  if (name.length > 40) throw new Error('Use 40 characters or fewer.');
  const list = relationsOf(source);
  if (list.some(r => sameName(r.name, name))) throw new Error('This relation is already saved.');
  if (list.length >= 20) throw new Error('Too many relations.');
  const next = structuredClone(source);
  next.relations = [...list, { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() }];
  return next;
}

/** Removing a relation moves its people and tagged expenses to Others. */
export function removeRelation(source: DiaryDocument, id: string): DiaryDocument {
  if (id === FALLBACK_RELATION) throw new Error('Others cannot be removed.');
  const next = structuredClone(source);
  for (const person of next.people) if (person.relation === id) person.relation = FALLBACK_RELATION;
  for (const day of next.days) for (const entry of day.entries) if (entry.relation === id) entry.relation = FALLBACK_RELATION;
  next.relations = relationsOf(source).filter(r => r.id !== id);
  return next;
}

/** True when nobody else is on the expense: no companions and you paid. */
export const isSolo = (entry: Pick<EntryDocument, 'paidByMe' | 'personNames'>) => entry.paidByMe && entry.personNames.length === 0;
