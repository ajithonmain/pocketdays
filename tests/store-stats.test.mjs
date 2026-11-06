import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './load-source.mjs';
const {storeRows,inPeriod}=await loadSource('store-stats');
const e=(storeId,storeName,amount,paidByMe=true)=>({id:storeId+amount,storeId,storeName,items:'',amount,paidByMe,paidByName:paidByMe?null:'Ravi',iOweThem:false,personIds:[],personNames:[],createdAt:'x',updatedAt:'x',storeColor:'#583bb0'});
const data={schemaVersion:1,stores:[{id:'a',name:'Alpha',createdAt:'x',color:'#583bb0'},{id:'b',name:'Beta',createdAt:'x',color:'#2e738a'}],people:[],settings:{},days:[
 {date:'2026-11-03',total:0,entryCount:0,updatedAt:'x',entries:[e('a','Alpha',100),e('b','Beta',50,false)]},
 {date:'2026-11-09',total:0,entryCount:0,updatedAt:'x',entries:[e('a','Alpha',30)]},
 {date:'2026-10-20',total:0,entryCount:0,updatedAt:'x',entries:[e('b','Beta',400)]},
 {date:'2025-12-01',total:0,entryCount:0,updatedAt:'x',entries:[e('gone','Removed shop',10)]},
]};
const now=new Date(2026,10,15);
const f=(o={})=>({period:'month',payer:'all',sort:'spent',query:'',...o});
test('period filter follows the anchored month, year or all time',()=>{assert.equal(inPeriod('2026-11-03','month',now),true);assert.equal(inPeriod('2026-10-31','month',now),false);assert.equal(inPeriod('2026-10-31','month',new Date(2026,9,5)),true);assert.equal(inPeriod('2025-12-01','year',now),false);assert.equal(inPeriod('2025-12-01','year',new Date(2025,0,1)),true);assert.equal(inPeriod('2025-12-01','all',now),true);});
test('rows group visits and totals per store for the period',()=>{const rows=storeRows(data,f(),now);assert.deepEqual(rows.map(r=>[r.name,r.visits,r.total,r.last]),[['Alpha',2,130,'2026-11-09'],['Beta',1,50,'2026-11-03']]);});
test('payer filter splits paid by me and others',()=>{assert.deepEqual(storeRows(data,f({payer:'others'}),now).map(r=>r.name),['Beta']);assert.deepEqual(storeRows(data,f({payer:'me'}),now).map(r=>[r.name,r.total]),[['Alpha',130]]);});
test('search is case-insensitive and sorting works',()=>{assert.deepEqual(storeRows(data,f({query:'  bET '}),now).map(r=>r.name),['Beta']);assert.deepEqual(storeRows(data,f({period:'all',sort:'name'}),now).map(r=>r.name),['Alpha','Beta','Removed shop']);assert.equal(storeRows(data,f({period:'all',sort:'visits'}),now)[0].name,'Beta');assert.equal(storeRows(data,f({period:'all',sort:'recent'}),now)[0].name,'Alpha');});
test('removed stores still appear using their snapshot name and color',()=>{const row=storeRows(data,f({period:'all'}),now).find(r=>r.name==='Removed shop');assert.ok(row);assert.equal(row.color,'#583bb0');});
const {storeOrders}=await loadSource('store-stats');
test('store orders carry the note, payer and people for the detail sheet',()=>{const d2={...data,days:[{date:'2026-11-12',total:0,entryCount:1,updatedAt:'x',entries:[{...e('a','Alpha',75,false),items:' Milk, bread ',personNames:['Ashbin','Sam']}]}]};const [o]=storeOrders(d2,'a',{period:'all',payer:'all'},now);assert.equal(o.items,'Milk, bread');assert.equal(o.payer,'Ravi');assert.equal(o.paidByMe,false);assert.deepEqual(o.people,['Ashbin','Sam']);});
test('store orders list every matching entry newest first and respect period and payer',()=>{
  const all=storeOrders(data,'a',{period:'all',payer:'all'},now);
  assert.deepEqual(all.map(o=>[o.date,o.amount,o.payer]),[['2026-11-09',30,'Me'],['2026-11-03',100,'Me']]);
  assert.deepEqual(storeOrders(data,'b',{period:'all',payer:'all'},now).map(o=>o.date),['2026-11-03','2026-10-20']);
  assert.deepEqual(storeOrders(data,'b',{period:'month',payer:'others'},now).map(o=>[o.amount,o.payer]),[[50,'Ravi']]);
  assert.deepEqual(storeOrders(data,'b',{period:'month',payer:'me'},now),[]);
  assert.equal(storeOrders(data,'gone',{period:'all',payer:'all'},now).length,1);
});
const {involves}=await loadSource('store-stats');
test('person filter matches people with you or the payer, ignoring case and spacing',()=>{
  const d2={...data,days:[
    {date:'2026-11-12',total:0,entryCount:2,updatedAt:'x',entries:[{...e('a','Alpha',75),personNames:['Ash  bin']},{...e('b','Beta',40,false),paidByName:'ashbin'}]},
    {date:'2026-11-13',total:0,entryCount:1,updatedAt:'x',entries:[{...e('a','Alpha',20),personNames:['Sam']}]},
  ]};
  assert.equal(involves({paidByMe:true,paidByName:null,personNames:['Ashbin']},'ashbin'),true);
  assert.equal(involves({paidByMe:false,paidByName:'Ravi',personNames:[]},'ravi'),true);
  assert.equal(involves({paidByMe:true,paidByName:'Ravi',personNames:[]},'ravi'),false);
  assert.equal(involves({paidByMe:true,paidByName:null,personNames:[]},''),true);
  const rows=storeRows(d2,{...f({period:'all'}),person:'ash bin'},now);
  assert.deepEqual(rows.map(r=>[r.name,r.visits,r.total]),[['Alpha',1,75]]);
  assert.deepEqual(storeRows(d2,{...f({period:'all'}),person:'Sam'},now).map(r=>[r.name,r.total]),[['Alpha',20]]);
  assert.deepEqual(storeOrders(d2,'a',{period:'all',payer:'all',person:'Sam'},now).map(o=>o.date),['2026-11-13']);
  assert.equal(storeRows(d2,{...f({period:'all'}),person:'Nobody'},now).length,0);
});
