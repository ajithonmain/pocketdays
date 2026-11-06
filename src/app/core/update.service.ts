import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { BUILD_INFO } from './build-info';
const CHECK_INTERVAL_MS = 30 * 60 * 1000;
@Injectable({providedIn:'root'})
export class UpdateService {
  readonly available=signal(false);readonly dismissed=signal(false);readonly checking=signal(false);readonly checkResult=signal('');
  readonly info=BUILD_INFO;
  private readonly updates=inject(SwUpdate);
  constructor(){
    if(!this.updates.isEnabled)return;
    this.updates.versionUpdates.subscribe(e=>{if(e.type==='VERSION_READY'){this.dismissed.set(false);this.available.set(true);}});
    const check=()=>void this.updates.checkForUpdate().catch(()=>false);
    addEventListener('online',check);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check();});
    setInterval(()=>{if(document.visibilityState==='visible')check();},CHECK_INTERVAL_MS);
  }
  /** Manual check from Settings. */
  async check(){
    if(!this.updates.isEnabled){this.checkResult.set('Updates are checked in the installed or hosted app.');return;}
    this.checking.set(true);this.checkResult.set('');
    try{const found=await this.updates.checkForUpdate();this.checkResult.set(found||this.available()?'A new version is ready.':'You have the latest version.');}
    catch{this.checkResult.set('Could not check. Try again when online.');}
    finally{this.checking.set(false);}
  }
  later(){this.dismissed.set(true);}
  reload(){location.reload();}
}
