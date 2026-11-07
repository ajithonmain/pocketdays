import { RouterLink } from '@angular/router';
import { colorForStore, dayMarkers } from '../core/store-colors';
import { Component, computed, inject, output, signal, input, effect, viewChild, ElementRef, untracked } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { EntryDocument } from '../core/models';
import { DiaryService } from '../core/diary.service';
import { IconComponent } from '../shared/icon.component';
import { CalendarFocus, localDateKey, isAwayFromToday } from '../core/calendar-navigation';
import { searchEntries } from '../core/entry-search';
import { displayEntry } from '../core/entry-display';
export const dateKey=localDateKey;
@Component({selector:'app-calendar',imports:[CurrencyPipe,DatePipe,IconComponent,RouterLink],templateUrl:'./calendar.component.html'})
export class CalendarComponent {
  readonly initialFocus=input<CalendarFocus|null>(null);readonly focusEntry=output<CalendarFocus>();readonly notice=output<string>();
  readonly searching=signal(false);readonly query=signal('');readonly resultLimit=signal(100);
  readonly searchField=viewChild<ElementRef<HTMLInputElement>>('searchField');readonly searchButton=viewChild<ElementRef<HTMLButtonElement>>('searchButton');
  private readonly matches=computed(()=>searchEntries(this.diary.data(),this.query(),Number.MAX_SAFE_INTEGER));
  readonly results=computed(()=>this.matches().slice(0,this.resultLimit()));
  readonly resultCount=computed(()=>this.matches().length);
  constructor(){effect(()=>{const focus=this.initialFocus();if(focus && this.diary.ready())untracked(()=>this.openFocused(focus));});}
  readonly Math=Math;readonly diary=inject(DiaryService);readonly open=output<string>();readonly add=output<string>();readonly today=signal(dateKey(new Date()));
  readonly month=signal(new Date(new Date().getFullYear(),new Date().getMonth(),1));readonly selected=signal(dateKey(new Date()));
  readonly weekdays=computed(()=>this.diary.data().settings.weekStart==='monday'?['Mon','Tue','Wed','Thu','Fri','Sat','Sun']:['Sun','Mon','Tue','Wed','Thu','Fri','Sat']);
  readonly days=computed(()=>{const d=this.month();const offset=(d.getDay()+(this.diary.data().settings.weekStart==='monday'?6:0))%7;return Array.from({length:Math.ceil((offset+new Date(d.getFullYear(),d.getMonth()+1,0).getDate())/7)*7},(_,i)=>{const date=new Date(d.getFullYear(),d.getMonth(),i-offset+1);const key=dateKey(date);return {key,date,inMonth:date.getMonth()===d.getMonth(),record:this.diary.data().days.find(x=>x.date===key),markers:dayMarkers(this.diary.data().days.find(x=>x.date===key),this.diary.data().stores)};});});
  readonly selectedEntries=computed(()=>this.diary.data().days.find(d=>d.date===this.selected())?.entries??[]);
  readonly selectedTotal=computed(()=>this.selectedEntries().reduce((sum,e)=>sum+(e.amount||0),0));
  readonly selectedDate=computed(()=>new Date(this.selected()+'T12:00:00'));
  colorFor(entry:EntryDocument){const id=entry.storeId||entry.storeName;const store=this.diary.data().stores.find(item=>item.id===id);return store?colorForStore(store):colorForStore({id,color:entry.storeColor});}
  payer(entry:EntryDocument){const e=displayEntry(this.diary.data(),entry);return e.paidByMe?'Me':(e.paidByName||'Other');}
  readonly awayFromToday=computed(()=>isAwayFromToday(this.month(),this.selected(),this.today()));
  readonly summary=computed(()=>{const prefix=dateKey(this.month()).slice(0,7);const days=this.diary.data().days.filter(d=>d.date.startsWith(prefix)&&d.entryCount);return {total:days.reduce((s,d)=>s+d.total,0),count:days.length};});
  readonly legend=computed(()=>{
    const prefix=dateKey(this.month()).slice(0,7);
    const items=this.diary.data().days.filter(day=>day.date.startsWith(prefix)).flatMap(day=>dayMarkers(day,this.diary.data().stores));
    return [...new Map(items.map(item=>[item.id,item])).values()];
  });
  ringDash(total:number,i:number){const n=Math.min(total,6);const seg=100/n;return (seg-3.6)+' '+(100-seg+3.6);}
  ringOffset(total:number,i:number){const n=Math.min(total,6);return -i*(100/n)-1.8;}
  markerLabel(markers:{name:string}[]){return markers.length?', stores: '+markers.map(marker=>marker.name).join(', '):'';}
  private touchX=0;private touchY=0;
  readonly years=computed(()=>{const y=new Date().getFullYear();const v=this.month().getFullYear();const from=Math.min(y-5,v),to=Math.max(y+2,v);return Array.from({length:to-from+1},(_,i)=>from+i);});
  setYear(value:string){const y=Number(value);if(Number.isInteger(y))this.month.update(d=>new Date(y,d.getMonth(),1));}
  move(n:number){this.month.update(d=>new Date(d.getFullYear(),d.getMonth()+n,1));}
  goToday(){const now=new Date();this.month.set(new Date(now.getFullYear(),now.getMonth(),1));this.today.set(localDateKey(now));this.selected.set(this.today());}
  choose(key:string){this.selected.set(key);if(!this.diary.data().days.find(d=>d.date===key)?.entryCount)this.open.emit(key);}
  display(entry:EntryDocument){return displayEntry(this.diary.data(),entry);}
  toggleSearch(){if(this.searching()){this.searching.set(false);this.query.set('');setTimeout(()=>this.searchButton()?.nativeElement.focus());}else{this.searching.set(true);setTimeout(()=>this.searchField()?.nativeElement.focus());}}
  more=(limit:number)=>limit+100;
  setQuery(event:Event){this.query.set((event.target as HTMLInputElement).value);this.resultLimit.set(100);}
  openFocused(focus:CalendarFocus){this.searching.set(false);this.query.set('');this.month.set(new Date(Number(focus.date.slice(0,4)),Number(focus.date.slice(5,7))-1,1));this.selected.set(focus.date);if(this.diary.data().days.find(d=>d.date===focus.date)?.entries.length)this.focusEntry.emit(focus);else this.notice.emit('That day has no entries.');}
  edit(){this.open.emit(this.selected());}
  addNew(){this.add.emit(this.selected());}
  start(e:TouchEvent){this.touchX=e.changedTouches[0].clientX;this.touchY=e.changedTouches[0].clientY;}
  end(e:TouchEvent){const dx=e.changedTouches[0].clientX-this.touchX;const dy=e.changedTouches[0].clientY-this.touchY;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5)this.move(dx<0?1:-1);}
}
