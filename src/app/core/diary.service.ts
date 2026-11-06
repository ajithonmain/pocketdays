import { normalizeDiaryColors } from './store-colors';
import { Injectable, signal } from '@angular/core';
import { DiaryDocument, emptyDiary, SyncEnvelope } from './models';
import { applyDay, EntryDraft } from './entries';
import { addCatalogItem, CatalogKind, removeCatalogItem } from './catalog';
import { mergeDiary } from './merge';
interface LocalRecord { data:DiaryDocument; revision:number; dirty:boolean; base?:DiaryDocument; }
@Injectable({providedIn:'root'})
export class DiaryService {
  readonly data=signal(emptyDiary()); readonly status=signal('Opening diary'); readonly online=signal(navigator.onLine);
  readonly ready=signal(false); readonly pending=signal(false); readonly error=signal(''); readonly conflict=signal(false);
  private key=''; private revision=0; private base=emptyDiary(); private db!:IDBDatabase; private syncing=false;
  private readonly channel=new BroadcastChannel('pocketdays');
  constructor(){
    addEventListener('online',()=>{this.online.set(true);void this.sync();});
    addEventListener('offline',()=>{this.online.set(false);this.status.set(this.pending()?'Offline · sync pending':'Offline');});
    this.channel.onmessage=()=>{if(this.ready())void this.lock(()=>this.load());};
    void this.initialize().catch(()=>this.error.set('Diary will not open. Check your link and browser storage.'));
  }
  private async initialize(){
    const fragment=new URLSearchParams(location.hash.slice(1)).get('diary');
    if(fragment&&!/^[a-f0-9]{64}$/.test(fragment))throw new Error('Invalid link');
    this.key=fragment||localStorage.getItem('pocketdays-key')||Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
    localStorage.setItem('pocketdays-key',this.key);history.replaceState(null,'',location.pathname+location.search);
    this.db=await new Promise((resolve,reject)=>{const r=indexedDB.open('pocketdays',1);r.onupgradeneeded=()=>r.result.createObjectStore('diaries');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    await this.lock(async()=>{await this.load();await this.persist();});this.ready.set(true);await this.sync();
    setInterval(()=>{if(document.visibilityState==='visible')void this.sync();},30000);
    addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void this.sync();});
  }
  private async lock<T>(fn:()=>Promise<T>):Promise<T>{return await navigator.locks.request('pocketdays-'+this.key,()=>fn());}
  private async load(){
    const record=await new Promise<LocalRecord|undefined>((resolve,reject)=>{const r=this.db.transaction('diaries').objectStore('diaries').get(this.key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    if(record){record.data=normalizeDiaryColors(record.data);if(record.base)record.base=normalizeDiaryColors(record.base);this.data.set(record.data);this.revision=record.revision;this.pending.set(record.dirty);this.base=record.base||record.data;}
  }
  private persist(){return new Promise<void>((resolve,reject)=>{const tx=this.db.transaction('diaries','readwrite');tx.objectStore('diaries').put({data:this.data(),revision:this.revision,dirty:this.pending(),base:this.base},this.key);tx.oncomplete=()=>{this.channel.postMessage('changed');resolve();};tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
  async saveDay(date:string,drafts:EntryDraft[],original:string){
    await this.lock(async()=>{
      await this.load();if(JSON.stringify(this.data().days.find(d=>d.date===date)?.entries||[])!==original)throw new Error('This day changed elsewhere. Close and reopen it.');
      const previous=this.data();this.data.set(applyDay(previous,date,drafts));this.pending.set(true);
      try{await this.persist();}catch(e){this.data.set(previous);throw e;}
      this.status.set(this.online()?'Sync pending':'Offline · sync pending');
    });void this.sync();
  }
  async addCatalog(kind: CatalogKind, name: string) {
    await this.editCatalog(data => addCatalogItem(data, kind, name));
  }
  async removeCatalog(kind: CatalogKind, id: string) {
    await this.editCatalog(data => removeCatalogItem(data, kind, id));
  }
  private async editCatalog(change: (data: DiaryDocument) => DiaryDocument) {
    if (!this.ready()) throw new Error('Diary is still opening.');
    await this.lock(async () => {
      await this.load();
      const previous = this.data(), wasPending = this.pending();
      this.data.set(change(previous)); this.pending.set(true);
      try { await this.persist(); }
      catch (error) { this.data.set(previous); this.pending.set(wasPending); throw error; }
      this.status.set(this.online() ? 'Sync pending' : 'Offline · sync pending');
    });
    void this.sync();
  }
  /** Replace the whole diary on this device with a validated backup; it syncs like any other local change. */
  async restore(diary: DiaryDocument) {
    if (!this.ready()) throw new Error('Diary is still opening.');
    await this.lock(async () => {
      await this.load();
      const previous = this.data(), wasPending = this.pending();
      this.data.set(normalizeDiaryColors(diary)); this.pending.set(true);
      try { await this.persist(); }
      catch (error) { this.data.set(previous); this.pending.set(wasPending); throw error; }
      this.status.set(this.online() ? 'Sync pending' : 'Offline · sync pending');
    });
    void this.sync();
  }
  async sync(){
    if(!this.ready()||this.syncing)return;if(!this.online()){this.status.set(this.pending()?'Offline · sync pending':'Offline');return;}
    this.syncing=true;
    try{await this.lock(async()=>{
      await this.load();this.error.set('');this.status.set('Syncing');
      const remote=await this.request('GET');
      if(this.pending()){
        if(remote.revision!==this.revision){
          let merged: DiaryDocument;
          try { merged = mergeDiary(this.base, this.data(), remote.data); }
          catch { this.conflict.set(true);this.status.set('Sync conflict');this.error.set('Changed on another device. Pick a copy in Settings.');return; }
          this.data.set(merged);this.revision=remote.revision;
        }
        const saved=await this.request('PUT');this.revision=saved.revision;this.data.set(saved.data);
      }else{this.data.set(remote.data);this.revision=remote.revision;}
      this.base=structuredClone(this.data());this.pending.set(false);this.conflict.set(false);await this.persist();this.status.set('Up to date');
    });}catch{this.status.set(this.pending()?'Sync pending':'On this device');this.error.set('Cloud sync unavailable. Saved on this device; will retry.');}finally{this.syncing=false;}
  }
  private async request(method:'GET'|'PUT'):Promise<SyncEnvelope>{
    const res=await fetch('/api/diary',{method,signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${this.key}`,'Content-Type':'application/json'},...(method==='PUT'?{body:JSON.stringify({revision:this.revision,data:this.data()})}:{})});
    if(!res.ok)throw new Error('Sync failed');const envelope:SyncEnvelope=await res.json();envelope.data=normalizeDiaryColors(envelope.data);return envelope;
  }
  async resolveConflict(useLocal:boolean){
    try{await this.lock(async()=>{await this.load();const remote=await this.request('GET');if(useLocal){this.revision=remote.revision;const saved=await this.request('PUT');this.data.set(saved.data);this.revision=saved.revision;}else{this.data.set(remote.data);this.revision=remote.revision;}this.base=structuredClone(this.data());this.pending.set(false);this.conflict.set(false);await this.persist();this.error.set('');this.status.set('Up to date');});}catch{this.error.set('Could not resolve it. Retry when connected.');}
  }
  async copyLink(){try{await navigator.clipboard.writeText(`${location.origin}/#diary=${this.key}`);return true;}catch{return false;}}
}
