import { AppDialogService } from '../core/app-dialog.service';
import { Component, OnDestroy, computed, inject, input, output, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';
import { DiaryService } from '../core/diary.service';
import { displayEntry } from '../core/entry-display';
import { draftError, EntryDraft, newDraft } from '../core/entries';
import { StoreSectionComponent } from './store-section.component';
@Component({selector:'app-day-drawer',imports:[DrawerModule,CurrencyPipe,DatePipe,StoreSectionComponent],templateUrl:'./day-drawer.component.html'})
export class DayDrawerComponent implements OnDestroy {
  readonly dialogs=inject(AppDialogService);private closing=false;readonly diary=inject(DiaryService);readonly date=input.required<string>();readonly addNew=input(false);readonly entryId=input('');readonly closed=output<void>();readonly saved=output<void>();
  readonly visible=signal(true);readonly drafts=signal<EntryDraft[]>([]);readonly active=signal('');readonly submitted=signal(false);readonly saving=signal(false);readonly error=signal('');readonly dirty=signal(false);
  readonly total=computed(()=>this.drafts().reduce((s,e)=>s+(e.amount||0),0));private original='[]';private touchY=0;
  ngOnInit(){const entries=this.diary.data().days.find(d=>d.date===this.date())?.entries||[];this.original=JSON.stringify(entries);this.drafts.set(entries.map(raw=>{const e=displayEntry(this.diary.data(),raw);return {...e,paidByName:e.paidByName||'',personNames:[...e.personNames]};}));if(!entries.length||this.addNew())this.add(false);else this.active.set(entries.find(e=>e.id===this.entryId())?.id??entries[0].id);}
  private exitTimer?:ReturnType<typeof setTimeout>;
  private dismiss(){document.body.classList.add('sheet-closing');this.exitTimer=setTimeout(()=>{this.visible.set(false);document.body.classList.remove('sheet-closing');this.closed.emit();},300);}
  ngOnDestroy(){clearTimeout(this.exitTimer);document.body.classList.remove('sheet-closing');}
  dateObject(){return new Date(this.date()+'T12:00:00');}
  add(mark=true){const e=newDraft();this.drafts.update(list=>[...list,e]);this.active.set(e.id);if(mark)this.dirty.set(true);}
  change(id:string,patch:Partial<EntryDraft>){this.drafts.update(list=>list.map(e=>e.id===id?{...e,...patch}:e));this.dirty.set(true);}
  remove(id:string){this.drafts.update(list=>list.filter(e=>e.id!==id));if(this.active()===id)this.active.set(this.drafts()[0]?.id||'');this.dirty.set(true);}
  validation(e:EntryDraft){return this.submitted()?draftError(e):'';}
  async requestClose(){
    if(this.saving() || this.closing)return;
    this.closing=true;
    try {
      if(this.dirty() && !await this.dialogs.confirm({title:'Discard changes?',message:'Your changes are not saved.',confirmLabel:'Discard',cancelLabel:'Keep editing',destructive:true}))return;
      this.dismiss();
    } finally {this.closing=false;}
  }
  swipeStart(e:TouchEvent){this.touchY=e.changedTouches[0].clientY;}
  swipeEnd(e:TouchEvent){if(e.changedTouches[0].clientY-this.touchY>65)this.requestClose();}
  async save(){this.submitted.set(true);const invalid=this.drafts().find(draftError);if(invalid){this.active.set(invalid.id);return;}this.saving.set(true);this.error.set('');try{await this.diary.saveDay(this.date(),this.drafts(),this.original);this.dirty.set(false);this.saved.emit();this.dismiss();}catch(e){this.error.set(e instanceof Error?e.message:'Could not save. Retry.');}finally{this.saving.set(false);}}
}
