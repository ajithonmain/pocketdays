import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HistoryFiltersService } from '../core/history-filters.service';
@Component({selector:'app-range-controls',imports:[DatePipe],template:`
<div class="range-controls"><div class="segmented" style="--n:3" [style.--i]="state.period()==='month'?0:state.period()==='year'?1:2" role="group" aria-label="Range">
@for(p of periods;track p.id){<button [attr.aria-pressed]="state.period()===p.id" (click)="state.period.set(p.id)">{{p.label}}</button>}</div>
<div class="range-step"><button class="text-button" aria-label="Previous period" [disabled]="state.period()==='all'" (click)="state.step(-1)">Previous</button><strong>{{state.period()==='all'?'All time':(state.anchor() | date:(state.period()==='year'?'yyyy':'MMM yyyy'))}}</strong><button class="text-button" aria-label="Next period" [disabled]="state.period()==='all'" (click)="state.step(1)">Next</button></div></div>`})
export class RangeControlsComponent {readonly state=inject(HistoryFiltersService);readonly periods=[{id:'month',label:'Month'},{id:'year',label:'Year'},{id:'all',label:'All time'}] as const;}
