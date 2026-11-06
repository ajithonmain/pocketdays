import { Component, signal } from '@angular/core';
import { CalendarComponent } from '../calendar/calendar.component';
import { DayDrawerComponent } from '../day/day-drawer.component';
import { IconComponent } from '../shared/icon.component';
@Component({standalone:true,imports:[CalendarComponent,DayDrawerComponent,IconComponent],template:`<app-calendar (open)="date.set($event);addNew.set(false);message.set('')" (add)="date.set($event);addNew.set(true);message.set('')"/>@if(date()){@for(d of [date()];track d){<app-day-drawer [date]="d" [addNew]="addNew()" (closed)="closed(d)" (saved)="notify('Saved')"/>}}@if(message()){<p class="save-toast" role="status"><app-icon name="check"/>{{message()}}</p>}`})
export class HomePage {
  readonly date=signal('');readonly addNew=signal(false);readonly message=signal('');private timer?:ReturnType<typeof setTimeout>;
  closed(d:string){if(this.date()===d)this.date.set('');}
  notify(text:string){clearTimeout(this.timer);this.message.set(text);this.timer=setTimeout(()=>this.message.set(''),2200);}
}
