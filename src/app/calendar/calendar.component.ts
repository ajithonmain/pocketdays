import { colorForStore, dayMarkers } from '../core/store-colors';
import { Component, computed, inject, output, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { EntryDocument } from '../core/models';
import { DiaryService } from '../core/diary.service';
import { IconComponent } from '../shared/icon.component';
export const dateKey=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
@Component({selector:'app-calendar',imports:[CurrencyPipe,DatePipe,IconComponent],templateUrl:'./calendar.component.html'})
export class CalendarComponent {
  readonly Math=Math;readonly diary=inject(DiaryService);readonly open=output<string>();readonly add=output<string>();readonly today=dateKey(new Date());
  readonly month=signal(new Date(new Date().getFullYear(),new Date().getMonth(),1));readonly selected=signal(dateKey(new Date()));
  readonly weekdays=computed(()=>this.diary.data().settings.weekStart==='monday'?['Mon','Tue','Wed','Thu','Fri','Sat','Sun']:['Sun','Mon','Tue','Wed','Thu','Fri','Sat']);
  readonly days=computed(()=>{const d=this.month();const offset=(d.getDay()+(this.diary.data().settings.weekStart==='monday'?6:0))%7;return Array.from({length:Math.ceil((offset+new Date(d.getFullYear(),d.getMonth()+1,0).getDate())/7)*7},(_,i)=>{const date=new Date(d.getFullYear(),d.getMonth(),i-offset+1);const key=dateKey(date);return {key,date,inMonth:date.getMonth()===d.getMonth(),record:this.diary.data().days.find(x=>x.date===key),markers:dayMarkers(this.diary.data().days.find(x=>x.date===key),this.diary.data().stores)};});});
  readonly selectedEntries=computed(()=>this.diary.data().days.find(d=>d.date===this.selected())?.entries??[]);
  readonly selectedTotal=computed(()=>this.selectedEntries().reduce((sum,e)=>sum+(e.amount||0),0));
  readonly selectedDate=computed(()=>new Date(this.selected()+'T12:00:00'));
  colorFor(entry:EntryDocument){const id=entry.storeId||entry.storeName;const store=this.diary.data().stores.find(item=>item.id===id);return store?colorForStore(store):colorForStore({id,color:entry.storeColor});}
  payer(entry:EntryDocument){return entry.paidByMe?'Me':(entry.paidByName||'Other');}
  readonly isCurrentMonth=computed(()=>dateKey(this.month()).slice(0,7)===this.today.slice(0,7));
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
  goToday(){this.month.set(new Date(new Date().getFullYear(),new Date().getMonth(),1));}
  choose(key:string){this.selected.set(key);if(!this.diary.data().days.find(d=>d.date===key)?.entryCount)this.open.emit(key);}
  edit(){this.open.emit(this.selected());}
  addNew(){this.add.emit(this.selected());}
  start(e:TouchEvent){this.touchX=e.changedTouches[0].clientX;this.touchY=e.changedTouches[0].clientY;}
  end(e:TouchEvent){const dx=e.changedTouches[0].clientX-this.touchX;const dy=e.changedTouches[0].clientY-this.touchY;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5)this.move(dx<0?1:-1);}
}
