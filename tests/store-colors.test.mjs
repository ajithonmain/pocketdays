import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './load-source.mjs';
const sc=await loadSource('store-colors');globalThis.__sc=sc;const {ensureStoreColors,nextStoreColor,dayMarkers}=sc;
const {applyDay,newDraft}=await loadSource('entries');
const {removeCatalogItem}=await loadSource('catalog');
const store=id=>({id,name:id,createdAt:'2026-11-07'});
test('legacy colors are unique, stable and independent of list order',()=>{const stores=Array.from({length:30},(_,i)=>store(String(i)));const colored=ensureStoreColors(stores);assert.equal(new Set(colored.map(s=>s.color)).size,30);assert.deepEqual(ensureStoreColors(colored),colored);const reversed=ensureStoreColors([...stores].reverse());for(const s of colored)assert.equal(reversed.find(x=>x.id===s.id).color,s.color);assert.ok(!colored.some(s=>s.color===nextStoreColor(colored)));});
test('valid saved colors survive normalization and duplicate colors are repaired',()=>{const stores=[{...store('a'),color:'#ff3366'},{...store('b'),color:'#ff3366'}];const result=ensureStoreColors(stores);assert.equal(result[0].color,'#ff3366');assert.notEqual(result[0].color,result[1].color);});
test('repeated visits to one store make one marker and snapshot colors survive removal',()=>{const stores=ensureStoreColors([store('a'),store('b')]);const day={entries:[{storeId:'a',storeName:'A',storeColor:stores[0].color},{storeId:'a',storeName:'A'},{storeId:'b',storeName:'B',storeColor:stores[1].color}]};assert.equal(dayMarkers(day,stores).length,2);assert.equal(dayMarkers(day,[])[0].color,stores[0].color);assert.equal(dayMarkers(undefined,stores).length,0);});
test('new expense stores receive unique colors and retain them after catalog deletion',()=>{const base={schemaVersion:1,stores:[],people:[],days:[],settings:{currency:'INR',weekStart:'monday',showDailyTotals:false}};const data=applyDay(base,'2026-11-07',[{...newDraft(),storeName:'A',amount:10},{...newDraft(),storeName:'B',amount:20}]);assert.notEqual(data.stores[0].color,data.stores[1].color);const color=data.days[0].entries[0].storeColor;const deleted=removeCatalogItem(data,'stores',data.stores[0].id);assert.equal(dayMarkers(deleted.days[0],deleted.stores).find(m=>m.name==='A').color,color);});

test('backfilling legacy stores does not take an existing saved color',()=>{const result=ensureStoreColors([store('a'),{...store('z'),color:'#ff3366'}]);assert.equal(result.find(s=>s.id==='z').color,'#ff3366');assert.notEqual(result.find(s=>s.id==='a').color,'#ff3366');});

const lum=hex=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4);return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];};
const contrastWithWhite=hex=>1.05/(lum(hex)+0.05);
test('store color derives from the name and is stable for the same name',()=>{assert.equal(nextStoreColor([],'Zepto'),nextStoreColor([],'  zepto '));assert.notEqual(nextStoreColor([],'Zepto'),nextStoreColor([],'Blue Tokai'));});
test('auto colors never duplicate, even for identical names and 300 stores',()=>{const stores=[];for(let i=0;i<300;i++)stores.push({color:nextStoreColor(stores,i%3?'Same name':'Other '+i)});assert.equal(new Set(stores.map(s=>s.color)).size,300);});
test('every generated color keeps white text readable',()=>{const {whiteContrast}=globalThis.__sc;const stores=[];for(let i=0;i<40;i++)stores.push({color:nextStoreColor(stores,'Store '+i)});for(const s of stores)assert.ok(whiteContrast(s.color)>=3.1,`${s.color} has white contrast ${whiteContrast(s.color).toFixed(2)}`);});
test('early store colors keep a clear hue gap from each other',()=>{const stores=[];for(const n of ['Zepto','Blue Tokai','Swiggy','Amazon','Decathlon','Starbucks','Uber','Reliance Fresh','Apollo','Big Bazaar'])stores.push({color:nextStoreColor(stores,n)});const hue=hex=>{const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;const h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;return (h*60+360)%360;};for(let i=0;i<stores.length;i++)for(let j=i+1;j<stores.length;j++){const d=Math.abs(hue(stores[i].color)-hue(stores[j].color));assert.ok(Math.min(d,360-d)>=26,`${stores[i].color} vs ${stores[j].color}`);}});

test('muted legacy colors are refreshed to vivid ones, entry snapshots follow, and saved vivid colors stay',()=>{
  const {normalizeDiaryColors,isLegacyColor}=globalThis.__sc;
  const diary={schemaVersion:1,people:[],settings:{},stores:[{id:'a',name:'Zepto',createdAt:'x',color:'#8464d3'},{id:'b',name:'Blue Tokai',createdAt:'x',color:'#d86d62'},{id:'c',name:'Kept',createdAt:'x',color:'#ff3366'}],days:[{date:'2026-11-07',total:0,entryCount:3,updatedAt:'x',entries:[{storeId:'a',storeName:'Zepto',storeColor:'#8464d3'},{storeId:'gone',storeName:'Removed',storeColor:'#3f9c85'},{storeId:'c',storeName:'Kept',storeColor:'#ff3366'}]}]};
  const out=normalizeDiaryColors(diary);
  assert.equal(isLegacyColor('#8464d3'),true);assert.equal(isLegacyColor('#ff3366'),false);
  assert.equal(out.stores[2].color,'#ff3366');
  for(const s of out.stores.slice(0,2)){assert.equal(isLegacyColor(s.color),false);}
  assert.equal(new Set(out.stores.map(s=>s.color)).size,3);
  const [e1,e2,e3]=out.days[0].entries;assert.equal(e1.storeColor,out.stores[0].color);assert.equal(isLegacyColor(e2.storeColor),false);assert.equal(e3.storeColor,'#ff3366');
  const again=normalizeDiaryColors(out);assert.deepEqual(again.stores.map(s=>s.color),out.stores.map(s=>s.color));
});
test('new store colors are vivid: high saturation',()=>{const sat=hex=>{const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);const mx=Math.max(r,g,b),mn=Math.min(r,g,b);const l=(mx+mn)/2;return mx===mn?0:(mx-mn)/(1-Math.abs(2*l-1));};const stores=[];for(let i=0;i<24;i++)stores.push({color:nextStoreColor(stores,'Shop '+i)});for(const s of stores)assert.ok(sat(s.color)>=0.7,`${s.color} saturation ${sat(s.color).toFixed(2)}`);});
