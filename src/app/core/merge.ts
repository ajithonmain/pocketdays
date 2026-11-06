import { DiaryDocument } from './models';
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function mergeList<T>(base: T[], local: T[], remote: T[], key: (item: T) => string): T[] {
  const result: T[] = [];
  const baseMap = new Map(base.map(item => [key(item), item]));
  const localMap = new Map(local.map(item => [key(item), item]));
  const remoteMap = new Map(remote.map(item => [key(item), item]));
  for (const id of new Set([...remoteMap.keys(), ...localMap.keys(), ...baseMap.keys()])) {
    const before = baseMap.get(id), device = localMap.get(id), cloud = remoteMap.get(id);
    const localChanged = !equal(device, before), remoteChanged = !equal(cloud, before);
    if (localChanged && remoteChanged && !equal(device, cloud)) throw new Error('Sync conflict');
    const chosen = localChanged ? device : cloud;
    if (chosen !== undefined) result.push(chosen);
  }
  return result;
}
export function mergeDiary(base: DiaryDocument, local: DiaryDocument, remote: DiaryDocument): DiaryDocument {
  const merged = structuredClone(remote);
  merged.days = mergeList(base.days, local.days, remote.days, day => day.date);
  merged.stores = mergeList(base.stores, local.stores, remote.stores, item => item.id);
  merged.people = mergeList(base.people, local.people, remote.people, item => item.id);
  if (!equal(local.settings, base.settings)) {
    if (!equal(remote.settings, base.settings) && !equal(remote.settings, local.settings)) throw new Error('Sync conflict');
    merged.settings = structuredClone(local.settings);
  }
  return merged;
}
