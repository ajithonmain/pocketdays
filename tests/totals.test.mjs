import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './load-source.mjs';
const {spendTotals}=await loadSource('totals');
const {applyDay,newDraft}=await loadSource('entries');
const {setPersonRelation}=await loadSource('catalog');
const {setStoreCategory}=await loadSource('categories');
const empty=()=>({schemaVersion:1,stores:[],people:[],days:[],settings:{currency:'INR',weekStart:'sunday',showDailyTotals:false}});
const draft=(p)=>({...newDraft(),storeName:'Shop',amount:10,...p});
function sample(){
  let d=applyDay(empty(),'2026-11-03',[draft({storeName:'Grocer',categoryId:'food',amount:30,personNames:['Mum']}),draft({storeName:'Tailor',categoryId:'clothing',amount:20,personNames:['Mum','Raj']}),draft({storeName:'Cafe',categoryId:'food',amount:5})]);
  d=applyDay(d,'2026-10-02',[draft({storeName:'Grocer',categoryId:'food',amount:100})]);
  d=setPersonRelation(d,d.people.find(p=>p.name==='Mum').id,'family');
  return setPersonRelation(d,d.people.find(p=>p.name==='Raj').id,'friends');
}
const anchor=new Date(2026,10,1);
test('totals group by category for the month and sort by amount',()=>{
  const t=spendTotals(sample(),{period:'month',payer:'all'},anchor);
  assert.equal(t.total,55);assert.equal(t.count,3);
  assert.deepEqual(t.byCategory.map(r=>[r.id,r.total,r.count]),[['food',35,2],['clothing',20,1]]);
  assert.equal(spendTotals(sample(),{period:'all',payer:'all'}).total,155);
});
test('relation totals count a mixed expense under each relation and solo spends under others',()=>{
  const t=spendTotals(sample(),{period:'month',payer:'all'},anchor);
  const by=Object.fromEntries(t.byRelation.map(r=>[r.id,r.total]));
  assert.deepEqual(by,{family:50,friends:20,others:5});
});
test('payer and person filters apply; empty periods give no rows',()=>{
  const d=sample();
  assert.equal(spendTotals(d,{period:'month',payer:'all',person:'Raj'},anchor).total,20);
  assert.equal(spendTotals(d,{period:'month',payer:'others'},anchor).total,0);
  assert.equal(spendTotals(d,{period:'month',payer:'all'},new Date(2025,0,1)).byCategory.length,0);
});
test('totals follow the store category link',()=>{
  const d=sample();const tailor=d.stores.find(s=>s.name==='Tailor');
  const t=spendTotals(setStoreCategory(d,tailor.id,'food'),{period:'month',payer:'all'},anchor);
  assert.deepEqual(t.byCategory.map(r=>[r.id,r.total]),[['food',55]]);
});
