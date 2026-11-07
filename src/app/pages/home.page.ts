import { Component, signal, inject, effect } from '@angular/core';
import { DiaryService } from '../core/diary.service';
import { CalendarFocusService } from '../core/calendar-focus.service';
import { CalendarFocus } from '../core/calendar-navigation';
import { CalendarComponent } from '../calendar/calendar.component';
import { DayDrawerComponent } from '../day/day-drawer.component';
import { IconComponent } from '../shared/icon.component';
@Component({standalone:true,imports:[CalendarComponent,DayDrawerComponent,IconComponent],template:`<app-calendar [initialFocus]="initialFocus()" (focusEntry)="focus($event)" (notice)="notify($event)" (open)="date.set($event);addNew.set(false);message.set('')" (add)="date.set($event);addNew.set(true);message.set('')"/>@if(date()){@for(d of [date()];track d){<app-day-drawer [date]="d" [addNew]="addNew()" [entryId]="entryId()" (closed)="closed(d)" (saved)="notify('Saved')"/>}}@if(message()){<p class="save-toast" role="status"><app-icon name="check"/>{{message()}}</p>}`})
export class HomePage {
  readonly initialFocus=signal<CalendarFocus|null>(null);readonly entryId=signal('');private diary=inject(DiaryService);private pendingFocus=inject(CalendarFocusService);
  constructor(){effect(()=>{if(this.diary.ready()){const focus=this.pendingFocus.take();if(focus)this.initialFocus.set(focus);}});}
  focus(value:CalendarFocus){this.initialFocus.set(null);this.entryId.set(value.entryId??'');this.addNew.set(false);this.date.set(value.date);}
  readonly date=signal('');readonly addNew=signal(false);readonly message=signal('');private timer?:ReturnType<typeof setTimeout>;
  closed(d:string){if(this.date()===d){this.date.set('');this.entryId.set('');}}
  ngOnDestroy(){clearTimeout(this.timer);}
  notify(text:string){clearTimeout(this.timer);this.message.set(text);this.timer=setTimeout(()=>this.message.set(''),2200);}
}
