import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './load-source.mjs';
const {normalizeName,sameName}=await loadSource('names');
const {applyDay,newDraft}=await loadSource('entries');
const {addCatalogItem}=await loadSource('catalog');
const empty=()=>({schemaVersion:1,stores:[],people:[],days:[],settings:{currency:'INR',weekStart:'monday',showDailyTotals:false}});
const draft=(o)=>({...newDraft(),amount:10,...o});
test('names compare ignoring case, outer and inner spacing',()=>{assert.equal(normalizeName('  Big   Bazaar '),'Big Bazaar');assert.equal(sameName('big bazaar','BIG   BAZAAR '),true);assert.equal(sameName('Zepto','Zepto Now'),false);});
test('catalog rejects a duplicate that differs only by case or inner spacing',()=>{const base=addCatalogItem(empty(),'stores','Big Bazaar');assert.throws(()=>addCatalogItem(base,'stores','big   bazaar'),/already saved/);const people=addCatalogItem(empty(),'people','Alex Smith');assert.throws(()=>addCatalogItem(people,'people',' ALEX  smith'),/already saved/);});
test('saving a day never creates duplicate stores or people from spacing and case variants',()=>{
  let data=applyDay(empty(),'2026-11-07',[draft({storeId:'other',storeName:'Big  Bazaar',personNames:['Ashbin','ashbin ','Ash  bin']})]);
  data=applyDay(data,'2026-11-08',[draft({storeId:'other',storeName:' big bazaar',personNames:['ASHBIN'],paidByMe:false,paidByName:'ash bin'})]);
  assert.equal(data.stores.length,1);assert.equal(data.stores[0].name,'Big Bazaar');
  assert.deepEqual(data.people.map(p=>p.name).sort(),['Ash bin','Ashbin']);
  const first=data.days.find(d=>d.date==='2026-11-07').entries[0];assert.deepEqual(first.personNames.sort(),['Ash bin','Ashbin']);
});
