import { ensureStoreColors, nextStoreColor } from './store-colors';
import { personByName } from './entry-display';
import { categoriesOf, FALLBACK_CATEGORY } from './categories';
import { relationsOf } from './relations';
import { normalizeName, sameName } from './names';
import { DiaryDocument, EntryDocument } from './models';
export interface EntryDraft { id:string; storeId:string; storeName:string; items:string; amount:number|null; paidByMe:boolean; paidByName:string; iOweThem:boolean; personNames:string[]; categoryId:string; categoryName?:string; relation?:string; createdAt:string; }
export function newDraft():EntryDraft {return {id:crypto.randomUUID(),storeId:'other',storeName:'',items:'',amount:null,paidByMe:true,paidByName:'',iOweThem:false,personNames:[],categoryId:'',createdAt:new Date().toISOString()};}
export function draftError(e:EntryDraft):string {if(!e.storeName.trim())return 'Choose a store or enter its name.';if(e.amount===null||!Number.isFinite(e.amount)||Math.round(e.amount*100)<=0)return 'Enter an amount greater than zero.';if(!e.paidByMe&&!e.paidByName.trim())return 'Enter who paid.';return '';}
export function applyDay(source:DiaryDocument,date:string,drafts:EntryDraft[]):DiaryDocument {
  if(drafts.some(draftError))throw new Error('Fix the highlighted entries.');
  const data=structuredClone(source);data.stores=ensureStoreColors(data.stores);const now=new Date().toISOString();
  const person=(name:string)=>{let p=personByName(data,name);if(!p){p={id:crypto.randomUUID(),name:normalizeName(name),createdAt:now};data.people.push(p);}return p;};
  const categories=categoriesOf(data);const relations=relationsOf(data);
  const entries:EntryDocument[]=drafts.map(d=>{
    let store=data.stores.find(s=>s.id===d.storeId)||data.stores.find(s=>sameName(s.name,d.storeName));
    if(!store){store={color:nextStoreColor(data.stores,d.storeName),id:crypto.randomUUID(),name:normalizeName(d.storeName),createdAt:now};if(d.categoryId&&categories.some(c=>c.id===d.categoryId))store.categoryId=d.categoryId;data.stores.push(store);}
    const live=categories.find(c=>c.id===store.categoryId)??categories.find(c=>c.id===d.categoryId);const keep=!live&&!!d.categoryId&&d.categoryId!==FALLBACK_CATEGORY&&!!d.categoryName;
    const categoryId=live?live.id:keep?d.categoryId:FALLBACK_CATEGORY;const categoryName=live?live.name:keep?d.categoryName!:(categories.find(c=>c.id===FALLBACK_CATEGORY)?.name??'Others');
    const seen=new Map<string,string>();for(const n of d.personNames.map(normalizeName).filter(Boolean)){const k=n.toLocaleLowerCase();if(!seen.has(k))seen.set(k,n);}const people=[...seen.values()].map(person);
    if(!d.paidByMe)person(d.paidByName);
    const solo=d.paidByMe&&people.length===0;const relation=solo&&d.relation&&relations.some(r=>r.id===d.relation)?d.relation:undefined;
    return {...d,relation,categoryId,categoryName,storeColor:store.color,storeId:store.id,storeName:store.name,amount:Math.round(d.amount!*100)/100,paidById:d.paidByMe?undefined:person(d.paidByName).id,paidByName:d.paidByMe?null:(person(d.paidByName).name),iOweThem:!d.paidByMe&&d.iOweThem,personIds:people.map(p=>p.id),personNames:people.map(p=>p.name),updatedAt:now};
  });
  data.days=data.days.filter(d=>d.date!==date);
  if(entries.length)data.days.push({date,entries,total:Math.round(entries.reduce((sum,e)=>sum+e.amount,0)*100)/100,entryCount:entries.length,updatedAt:now});
  return data;
}
