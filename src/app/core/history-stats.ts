import { DiaryDocument, EntryDocument } from './models';
import { displayEntry, personByName, companionNames, payerName, payerPerson } from './entry-display';
import { nameKey } from './names';
import { inPeriod, involves, StoreFilters } from './store-stats';
export type HistoryKind = 'stores' | 'people';
export interface HistoryOrder { date:string; entry:EntryDocument; payerKey?:string; }
export interface MonthTotal { month:string; total:number; visits:number; }
export const money=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export function personKey(data:DiaryDocument,name:string,id?:string) { return id || personByName(data,name)?.id || `name:${nameKey(name)}`; }
export const orderPayerKey=(data:DiaryDocument,entry:EntryDocument)=>entry.paidByMe||!entry.paidByName?undefined:entry.paidById||payerPerson(data,entry)?.id||`name:${nameKey(entry.paidByName)}`;
export function orderPeople(data:DiaryDocument,entry:EntryDocument) {
  const people=new Map<string,string>();
  companionNames(data,entry).forEach((name,i)=>{if(name.trim())people.set(personKey(data,name,entry.personIds[i]),name);});
  const payer=orderPayerKey(data,entry);
  if(payer)people.set(payer,payerName(data,entry));
  return people;
}
export const personMatches=(data:DiaryDocument,entry:EntryDocument,key:string)=>orderPeople(data,entry).has(key);
export function historyOrders(data:DiaryDocument,kind:HistoryKind,key:string,filters:Pick<StoreFilters,'period'|'payer'|'person'>,anchor=new Date()):HistoryOrder[] {
  return data.days.filter(d=>inPeriod(d.date,filters.period,anchor)).flatMap(day=>day.entries
    .filter(raw=>kind==='stores'?(raw.storeId||raw.storeName)===key:personMatches(data,raw,key))
    .map(raw=>({date:day.date,entry:displayEntry(data,raw),payerKey:orderPayerKey(data,raw)})))
    .filter(({entry:e})=>(filters.payer==='all'||(filters.payer==='me')===e.paidByMe) && involves(e,personByName(data,filters.person??'')?.name??filters.person??''))
    .sort((a,b)=>b.date.localeCompare(a.date));
}
export function summarizeOrders(orders:HistoryOrder[],personKey='') {
  const total=money(orders.reduce((s,o)=>s+money(o.entry.amount),0));
  const byMe=money(orders.filter(o=>o.entry.paidByMe).reduce((s,o)=>s+money(o.entry.amount),0));
  const byThem=orders.filter(o=>!o.entry.paidByMe && !!personKey && o.payerKey===personKey);
  return {total,visits:orders.length,average:orders.length?money(total/orders.length):0,first:orders.at(-1)?.date??'',last:orders[0]?.date??'',largest:orders.reduce<HistoryOrder|null>((best,o)=>!best||o.entry.amount>best.entry.amount?o:best,null),paidByMe:byMe,paidByOthers:money(total-byMe),paidByThem:money(byThem.reduce((s,o)=>s+o.entry.amount,0)),markedOwed:money(byThem.filter(o=>o.entry.iOweThem).reduce((s,o)=>s+o.entry.amount,0))};
}
export function seriesForOrders(orders:HistoryOrder[],endMonth:Date,months=12):MonthTotal[] {
  return Array.from({length:months},(_,i)=>{
    const d=new Date(endMonth.getFullYear(),endMonth.getMonth()-months+1+i,1);
    const month=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const matching=orders.filter(o=>o.date.startsWith(month));
    return {month,total:money(matching.reduce((s,o)=>s+money(o.entry.amount),0)),visits:matching.length};
  });
}
export function rankedNames(orders:HistoryOrder[],names:(e:EntryDocument)=>string[],limit=3) {
  const groups=new Map<string,{name:string;visits:number}>();
  for(const {entry} of orders) for(const name of new Set(names(entry).map(nameKey))) {
    const value=groups.get(name)??{name:names(entry).find(n=>nameKey(n)===name)!,visits:0}; value.visits++;groups.set(name,value);
  }
  return [...groups.values()].sort((a,b)=>b.visits-a.visits||a.name.localeCompare(b.name)).slice(0,limit);
}
export const groupOrders=(orders:HistoryOrder[])=>[...new Set(orders.map(o=>o.date.slice(0,7)))].map(month=>({month,orders:orders.filter(o=>o.date.startsWith(month))}));
export const storeSummary=(data:DiaryDocument,key:string,filters:StoreFilters,anchor=new Date())=>summarizeOrders(historyOrders(data,'stores',key,filters,anchor));
export const monthlySeries=(data:DiaryDocument,key:string,end:Date,months:number,filters:StoreFilters)=>seriesForOrders(historyOrders(data,'stores',key,{...filters,period:'all'},end),end,months);
export const topCompanions=(data:DiaryDocument,key:string,filters:StoreFilters,limit=3,anchor=new Date())=>rankedNames(historyOrders(data,'stores',key,filters,anchor),e=>e.personNames,limit);
