import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
@Injectable({providedIn:'root'})
export class UpdateService {
  readonly available=signal(false);
  private readonly updates=inject(SwUpdate);
  constructor(){if(this.updates.isEnabled){this.updates.versionUpdates.subscribe(e=>{if(e.type==='VERSION_READY')this.available.set(true);}); addEventListener('online',()=>void this.updates.checkForUpdate().catch(()=>false));}}
  reload(){location.reload();}
}
