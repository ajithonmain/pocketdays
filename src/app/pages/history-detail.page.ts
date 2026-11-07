import { Component, computed, effect, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { DiaryService } from '../core/diary.service';
import { HistoryFiltersService } from '../core/history-filters.service';
import { groupOrders, historyOrders, rankedNames, seriesForOrders, summarizeOrders } from '../core/history-stats';
import { personRows } from '../core/people-stats';
import { colorForStore } from '../core/store-colors';
import { RangeControlsComponent } from '../shared/range-controls.component';
import { MonthBarsComponent } from '../shared/month-bars.component';
import { OrderRowComponent } from '../shared/order-row.component';
import { normalizeName, sameName } from '../core/names';
@Component({standalone:true,imports:[CurrencyPipe,DatePipe,RouterLink,DrawerModule,InputTextModule,FormsModule,RangeControlsComponent,MonthBarsComponent,OrderRowComponent],templateUrl:'./history-detail.page.html'})
export class HistoryDetailPage {
  readonly diary=inject(DiaryService);readonly state=inject(HistoryFiltersService);private route=inject(ActivatedRoute);private params=toSignal(this.route.paramMap);private location=inject(Location);private router=inject(Router);
  readonly kind=this.route.snapshot.data['kind'] as 'stores'|'people';readonly key=computed(()=>this.params()?.get('key')??'');
  readonly live=computed(()=>this.diary.data()[this.kind].find(p=>p.id===this.key()));
  readonly allOrders=computed(()=>historyOrders(this.diary.data(),this.kind,this.key(),{period:'all',payer:'all'},this.state.anchor()));
  readonly name=computed(()=>this.live()?.name??(this.kind==='stores'?this.allOrders()[0]?.entry.storeName:personRows(this.diary.data(),{period:'all',payer:'all',sort:'name',query:''}).find(p=>p.id===this.key())?.name)??'Not found');
  readonly color=computed(()=>this.kind==='stores'?colorForStore(this.live()??{id:this.key(),color:this.allOrders()[0]?.entry.storeColor}):'var(--text)');
  readonly orders=computed(()=>historyOrders(this.diary.data(),this.kind,this.key(),this.state.filters(),this.state.anchor()));
  readonly summary=computed(()=>summarizeOrders(this.orders(),this.kind==='people'?this.key():''));
  readonly companions=computed(()=>rankedNames(this.orders(),e=>e.personNames,1));
  readonly favorites=computed(()=>rankedNames(this.orders(),e=>[e.storeName],3));
  readonly selectedMonth=signal('');
  readonly series=computed(()=>{
    const anchor=this.state.anchor();const end=this.state.period()==='year'?new Date(anchor.getFullYear(),11,1):anchor;
    return seriesForOrders(historyOrders(this.diary.data(),this.kind,this.key(),{...this.state.filters(),period:'all'},anchor),end,12);
  });
  readonly activeMonth=computed(()=>this.series().some(b=>b.month===this.selectedMonth())?this.selectedMonth():'');
  readonly groups=computed(()=>groupOrders((this.activeMonth()?historyOrders(this.diary.data(),this.kind,this.key(),{...this.state.filters(),period:'all'},this.state.anchor()):this.orders()).filter(o=>!this.activeMonth()||o.date.startsWith(this.activeMonth()))));
  readonly filterText=computed(()=>[this.state.payer()==='all'?'':this.state.payer()==='me'?'Paid by me':'Paid by others',this.state.person()?'With '+this.state.person():''].filter(Boolean).join(', '));
  readonly renaming=signal(false);readonly saving=signal(false);readonly renameError=signal('');readonly originalName=signal('');nameDraft='';private touchY=0;
  constructor(){effect(()=>{this.key();this.state.period();this.state.anchor();this.selectedMonth.set('');});}
  readonly existing=computed(()=>!!this.live()||this.allOrders().length>0);
  countLabel(count:number){return this.kind==='stores'?(count===1?'1 visit':`${count} visits`):(count===1?'1 order together':`${count} orders together`);}
  date(value:string){return new Date(value.length===7?value+'-01T12:00:00':value+'T12:00:00');}
  back(){if(history.state?.navigationId>1)this.location.back();else void this.router.navigateByUrl('/stores');}
  openRename(){this.nameDraft=this.name();this.originalName.set(this.name());this.renameError.set('');this.renaming.set(true);}
  closeRename(){if(!this.saving())this.renaming.set(false);}
  renameValidation(){const name=normalizeName(this.nameDraft);return !name?'Enter a name.':name.length>80?'Use 80 characters or fewer.':this.diary.data()[this.kind].some(p=>p.id!==this.key()&&sameName(p.name,name))?(this.kind==='stores'?'This store is already saved.':'This person is already saved.'):'';}
  async saveName(){if(this.saving())return;const error=this.renameValidation();if(error){this.renameError.set(error);return;}this.saving.set(true);try{await this.diary.renameCatalog(this.kind,this.key(),this.nameDraft,this.originalName());this.renaming.set(false);}catch(e){this.renameError.set(e instanceof Error?e.message:'Could not save. Retry.');}finally{this.saving.set(false);}}
  swipeStart(e:TouchEvent){this.touchY=e.changedTouches[0].clientY;}swipeEnd(e:TouchEvent){if(e.changedTouches[0].clientY-this.touchY>65)this.closeRename();}
}
