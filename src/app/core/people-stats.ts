import { DiaryDocument } from './models';
import { displayEntry, personByName } from './entry-display';
import { nameKey } from './names';
import { inPeriod, involves, StoreFilters } from './store-stats';
import { historyOrders, money, orderPeople, rankedNames, seriesForOrders, summarizeOrders } from './history-stats';
export function personRows(data:DiaryDocument,filters:StoreFilters,anchor=new Date()) {
  const grouped=new Map<string,{id:string;name:string;total:number;visits:number;last:string}>();
  const query=nameKey(filters.query);
  for(const day of data.days) {
    if(!inPeriod(day.date,filters.period,anchor))continue;
    for(const raw of day.entries) {
      const entry=displayEntry(data,raw);
      if((filters.payer!=='all'&&(filters.payer==='me')!==entry.paidByMe)||!involves(entry,personByName(data,filters.person??'')?.name??filters.person??''))continue;
      for(const [id,name] of orderPeople(data,raw)) {
        if(query && !nameKey(name).includes(query))continue;
        const row=grouped.get(id)??{id,name,total:0,visits:0,last:''};
        row.total=money(row.total+money(entry.amount));row.visits++;if(day.date>row.last)row.last=day.date;
        grouped.set(id,row);
      }
    }
  }
  const rows=[...grouped.values()];
  return rows.sort((a,b)=>filters.sort==='name'?a.name.localeCompare(b.name):filters.sort==='recent'?b.last.localeCompare(a.last):filters.sort==='visits'?b.visits-a.visits||b.total-a.total:b.total-a.total||a.name.localeCompare(b.name));
}
export const personOrders=(data:DiaryDocument,key:string,filters:StoreFilters,anchor=new Date())=>historyOrders(data,'people',key,filters,anchor);
export const personSummary=(data:DiaryDocument,key:string,filters:StoreFilters,anchor=new Date())=>summarizeOrders(personOrders(data,key,filters,anchor),key);
export const personMonthlySeries=(data:DiaryDocument,key:string,end:Date,months:number,filters:StoreFilters)=>seriesForOrders(personOrders(data,key,{...filters,period:'all'},end),end,months);
export const personStores=(data:DiaryDocument,key:string,filters:StoreFilters,anchor=new Date())=>rankedNames(personOrders(data,key,filters,anchor),e=>[e.storeName]);
