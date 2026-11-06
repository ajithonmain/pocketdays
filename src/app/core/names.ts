/** One definition of "the same name" for stores, people and payers: trimmed, single-spaced, case-insensitive. */
export const normalizeName = (value: string): string => (value ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');
export const nameKey = (value: string): string => normalizeName(value).toLocaleLowerCase();
export const sameName = (a: string, b: string): boolean => nameKey(a) === nameKey(b);
