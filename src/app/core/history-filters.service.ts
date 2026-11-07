import { Injectable, computed, signal } from '@angular/core';
import { Payer, Period, Sort } from './store-stats';
@Injectable({providedIn:'root'})
export class HistoryFiltersService {
  readonly mode=signal<'stores'|'people'>('stores');
  readonly period=signal<Period>('month');readonly payer=signal<Payer>('all');readonly sort=signal<Sort>('spent');readonly person=signal('');
  readonly anchor=signal(new Date(new Date().getFullYear(),new Date().getMonth(),1));
  readonly filters=computed(()=>({period:this.period(),payer:this.payer(),sort:this.sort(),person:this.person(),query:''}));
  step(n:number){const a=this.anchor();if(this.period()!=='all')this.anchor.set(new Date(a.getFullYear()+(this.period()==='year'?n:0),a.getMonth()+(this.period()==='month'?n:0),1));}
  reset(){this.period.set('month');this.payer.set('all');this.person.set('');this.sort.set('spent');this.anchor.set(new Date(new Date().getFullYear(),new Date().getMonth(),1));}
}
