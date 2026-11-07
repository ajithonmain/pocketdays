import { DayDocument, DiaryDocument, StoreDocument } from './models';
function hash(value: string): number {
  let result = 2166136261;
  for (const char of value.trim().toLowerCase()) result = Math.imul(result ^ char.charCodeAt(0), 16777619) >>> 0;
  return result >>> 0;
}
function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100, light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const channel = (n: number) => Math.round(255 * (light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return '#' + [channel(0), channel(8), channel(4)].map(value => value.toString(16).padStart(2, '0')).join('');
}
const SLOTS = 24;
const RINGS: ReadonlyArray<readonly [number, number]> = [[86, 50], [86, 50], [90, 56], [90, 56], [82, 46], [82, 46]];
/** Parameters of the earlier, muted generator. Colors it produced are recognised so they can be refreshed once. */
const MUTED_RINGS: ReadonlyArray<readonly [number, number]> = [[50, 46], [46, 38], [56, 54], [42, 42], [60, 33], [38, 52]];
const OLD_PALETTE = ['#8464d3', '#d86d62', '#3f9c85', '#cc9634', '#4c8fc4', '#b96ca3', '#708f45', '#b97942'];
const LEGACY = new Set<string>(OLD_PALETTE);
const hueOf = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (!d) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};
const hueGap = (a: number, b: number): number => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };
function hueFor(slot: number, ring: number): number {
  return (slot * (360 / SLOTS) + (ring % 2) * (360 / SLOTS / 2) + Math.floor(ring / RINGS.length) * 3.7) % 360;
}
for (let ring = 0; ring < 14; ring++) {
  for (let slot = 0; slot < SLOTS; slot++) {
    const hue = hueFor(slot, ring);
    const [sat, light] = MUTED_RINGS[ring % MUTED_RINGS.length];
    LEGACY.add(hue >= 40 && hue <= 75 ? hslToHex(hue, 70, 34) : hslToHex(hue, sat, light - (hue > 75 && hue <= 200 ? 10 : 0)));
  }
}
export const isLegacyColor = (color: string | undefined): boolean => !!color && LEGACY.has(color.toLowerCase());
const lumOf = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** Contrast ratio of white text on a color. */
export const whiteContrast = (hex: string): number => 1.05 / (lumOf(hex) + 0.05);
/**
 * Candidate color for a name: hue chosen from a hash, probed in steps of 7 slots so neighbours differ strongly.
 * Vivid, and darkened only as much as needed (yellows, oranges, greens, cyans) so white text always reads on it.
 */
function candidate(name: string, ring: number, step: number): string {
  let hue = hueFor((hash(name) % SLOTS + 7 * step) % SLOTS, ring);
  if (hue > 52 && hue < 78) hue = hue < 65 ? 46 : 80; // skip muddy yellow-olive; use amber or lime instead
  const [sat, start] = RINGS[ring % RINGS.length];
  let light = start;
  let hex = hslToHex(hue, sat, light);
  while (whiteContrast(hex) < 3.3 && light > 20) { light -= 1; hex = hslToHex(hue, sat, light); }
  return hex;
}
/**
 * Deterministic color derived from the store name. Prefers a hue at least 36 degrees from every color already in
 * use, relaxing that gap only when the palette fills up. Never returns a color that is already taken.
 */
export function nextStoreColor(stores: Pick<StoreDocument, 'color'>[], name = ''): string {
  const used = new Set(stores.map(store => store.color?.toLowerCase()));
  const hues = stores.filter(store => store.color && /^#[0-9a-f]{6}$/i.test(store.color)).map(store => hueOf(store.color!));
  for (const gap of [36, 26, 18, 10, 4, 0]) {
    for (let ring = 0; ring < (gap ? RINGS.length : 600); ring++) {
      for (let step = 0; step < SLOTS; step++) {
        const color = candidate(name, ring, step);
        if (!used.has(color) && hues.every(h => hueGap(h, hueOf(color)) >= gap)) return color;
      }
    }
  }
  return hslToHex(hash(name) % 360, 60, 50);
}
export function colorForStore(store: Pick<StoreDocument, 'id' | 'color'>): string {
  return store.color && /^#[0-9a-f]{6}$/i.test(store.color) ? store.color : candidate(store.id, 0, 0);
}
export function ensureStoreColors(stores: StoreDocument[]): StoreDocument[] {
  const assigned: StoreDocument[] = [];
  const sorted = [...stores].sort((a,b) => a.id.localeCompare(b.id));
  for (const store of sorted) {
    if (store.color && /^#[0-9a-f]{6}$/i.test(store.color) && !isLegacyColor(store.color) && !assigned.some(item => item.color === store.color)) assigned.push({...store});
  }
  for (const store of sorted) {
    if (!assigned.some(item => item.id === store.id)) assigned.push({ ...store, color: nextStoreColor(assigned, store.name || store.id) });
  }
  return stores.map(store => assigned.find(item => item.id === store.id)!);
}
export interface StoreMarker { id: string; name: string; color: string; }
export function dayMarkers(day: DayDocument | undefined, stores: StoreDocument[]): StoreMarker[] {
  const unique = new Map<string, StoreMarker>();
  for (const entry of day?.entries ?? []) {
    const id = entry.storeId || entry.storeName;
    const store = stores.find(item => item.id === id);
    if (!unique.has(id)) unique.set(id, {id, name: store?.name ?? entry.storeName, color: store ? colorForStore(store) : colorForStore({id, color: entry.storeColor})});
  }
  return [...unique.values()].sort((a,b) => a.id.localeCompare(b.id));
}

/**
 * Normalizes every color in a diary: stores keep a unique color, and stores still on an older muted color are given
 * a vivid one. Entry color snapshots follow their store; snapshots of removed stores are refreshed from the store name.
 */
export function normalizeDiaryColors(data: DiaryDocument): DiaryDocument {
  const stores = ensureStoreColors(data.stores);
  const changed = new Map<string, string>();
  data.stores.forEach((old, i) => { if (old.color !== stores[i].color) changed.set(old.id, stores[i].color!); });
  const refreshed = data.days.some(day => day.entries.some(e => (changed.has(e.storeId) || (!data.stores.some(s => s.id === e.storeId) && isLegacyColor(e.storeColor)))));
  if (!changed.size && !refreshed) return { ...data, stores };
  const days = data.days.map(day => ({ ...day, entries: day.entries.map(entry => {
    const own = changed.get(entry.storeId);
    if (own) return { ...entry, storeColor: own };
    if (!data.stores.some(s => s.id === entry.storeId) && isLegacyColor(entry.storeColor)) return { ...entry, storeColor: nextStoreColor(stores, entry.storeName || entry.storeId) };
    return entry;
  }) }));
  return { ...data, stores, days };
}

