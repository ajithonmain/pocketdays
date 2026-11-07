import { DiaryDocument, EntryDocument } from './models';
import { displayEntry } from './entry-display';
import { nameKey } from './names';
export function searchEntries(data: DiaryDocument, query: string, limit = 100): {date:string; entry:EntryDocument}[] {
  const q=nameKey(query); if(!q) return [];
  const amount= /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(q)?Number(q):null;
  return data.days.flatMap(day=>day.entries.map(raw=>({date:day.date,entry:displayEntry(data,raw)})))
    .filter(({entry:e})=>[e.storeName,e.items,e.paidByMe?'Me':e.paidByName??'',...e.personNames].some(text=>nameKey(text).includes(q)) || (amount!==null && Math.round(e.amount*100)/100===amount))
    .sort((a,b)=>b.date.localeCompare(a.date)).slice(0,Math.max(0,limit));
}
