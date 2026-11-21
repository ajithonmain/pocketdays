import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './load-source.mjs';
const {filterDiary,entryRelations}=await loadSource('spend-filters');
const {addCategory,removeCategory,categoriesOf,categoryName,lastCategoryForStore}=await loadSource('categories');
const {applyDay,newDraft}=await loadSource('entries');
const {setPersonRelation}=await loadSource('catalog');
const {mergeDiary}=await loadSource('merge');
const {parseBackup,createBackup}=await loadSource('backup');
const empty=()=>({schemaVersion:1,stores:[],people:[],days:[],settings:{currency:'INR',weekStart:'sunday',showDailyTotals:false}});
const draft=(patch)=>({...newDraft(),storeName:'Shop',amount:10,...patch});
function sample(){
  let d=applyDay(empty(),'2026-11-01',[draft({personNames:['Mum'],categoryId:'food',amount:30}),draft({personNames:['Raj'],categoryId:'clothing',amount:20}),draft({categoryId:'food',amount:5})]);
  d=setPersonRelation(d,d.people.find(p=>p.name==='Mum').id,'family');
  d=setPersonRelation(d,d.people.find(p=>p.name==='Raj').id,'friends');
  return d;
}
test('relation filter matches companions and payer; solo spends count as others',()=>{
  const d=sample();
  assert.equal(filterDiary(d,{relation:'family',category:''}).days[0].total,30);
  assert.equal(filterDiary(d,{relation:'friends',category:''}).days[0].total,20);
  assert.equal(filterDiary(d,{relation:'others',category:''}).days[0].total,5);
  const payer=applyDay(d,'2026-11-02',[draft({paidByMe:false,paidByName:'Mum',amount:7})]);
  assert.deepEqual([...entryRelations(payer,payer.days.at(-1).entries[0])],['family']);
});
test('category and relation combine; empty days are dropped and totals recomputed',()=>{
  const d=sample();
  const f=filterDiary(d,{relation:'',category:'food'});
  assert.equal(f.days[0].entryCount,2);assert.equal(f.days[0].total,35);
  assert.equal(filterDiary(d,{relation:'family',category:'clothing'}).days.length,0);
  assert.equal(filterDiary(d,{relation:'',category:''}),d);
  assert.equal(d.days[0].entries.length,3);
});
test('entries without a category count as others, unknown ids are kept with their snapshot',()=>{
  const d=applyDay(empty(),'2026-11-01',[draft({})]);
  assert.equal(d.days[0].entries[0].categoryId,'others');
  assert.equal(filterDiary(d,{relation:'',category:'others'}).days.length,1);
  const legacy=structuredClone(d);delete legacy.days[0].entries[0].categoryId;
  assert.equal(filterDiary(legacy,{relation:'',category:'others'}).days.length,1);
});
test('categories: defaults until edited, no duplicates, removal keeps the entry name',()=>{
  const base=empty();assert.equal(categoriesOf(base).length,7);
  const added=addCategory(base,' Pets ');assert.equal(added.categories.length,8);
  assert.throws(()=>addCategory(added,'pets'));assert.throws(()=>addCategory(base,'food'));
  const id=added.categories.at(-1).id;
  const used=applyDay(added,'2026-11-01',[draft({categoryId:id})]);
  const gone=removeCategory(used,id);
  assert.equal(gone.days[0].entries[0].categoryName,'Pets');assert.equal(categoryName(gone,gone.days[0].entries[0]),'Pets');
  assert.throws(()=>removeCategory(base,'others'));
  const resaved=applyDay(gone,'2026-11-01',[{...gone.days[0].entries[0],amount:11}]);
  assert.equal(resaved.days[0].entries[0].categoryId,id);assert.equal(resaved.days[0].entries[0].categoryName,'Pets');
});
test('a store remembers its last category',()=>{
  const d=applyDay(empty(),'2026-11-01',[draft({categoryId:'food'})]);
  const d2=applyDay(d,'2026-11-05',[draft({storeId:d.stores[0].id,categoryId:'clothing'})]);
  assert.equal(lastCategoryForStore(d2,d.stores[0].id),'clothing');assert.equal(lastCategoryForStore(d2,'other'),'');
});
test('backup round trip keeps relations and categories and rejects bad values',()=>{
  const d=addCategory(sample(),'Pets');
  const {diary}=parseBackup(JSON.stringify(createBackup(d)));
  assert.equal(diary.people.find(p=>p.name==='Mum').relation,'family');assert.equal(diary.categories.length,8);
  assert.equal(diary.days[0].entries[0].categoryId,'food');
  const bad=createBackup(d);bad.diary.people[0].relation='boss';assert.throws(()=>parseBackup(JSON.stringify(bad)));
  const plain=parseBackup(JSON.stringify(createBackup(empty()))).diary;assert.equal('categories' in plain,false);
});
test('categories merge from both devices; same-id divergence conflicts',()=>{
  const base=empty();const a=addCategory(base,'Pets'),b=addCategory(base,'Gifts');
  assert.equal(mergeDiary(base,a,b).categories.length,9);
  assert.equal(mergeDiary(base,base,b).categories.length,8);
  assert.equal('categories' in mergeDiary(base,base,base),false);
});
