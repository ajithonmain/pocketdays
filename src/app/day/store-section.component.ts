import { colorForStore } from '../core/store-colors';
import { AppDialogService } from '../core/app-dialog.service';
import { Component, inject, input, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { EntryDraft } from '../core/entries';
import { CategoryDocument, PersonDocument, StoreDocument } from '../core/models';
import { IconComponent } from '../shared/icon.component';
import { PeopleFieldComponent } from '../shared/people-field.component';
@Component({selector:'app-store-section',imports:[FormsModule,CurrencyPipe,SelectModule,InputTextModule,TextareaModule,IconComponent,PeopleFieldComponent],templateUrl:'./store-section.component.html'})
export class StoreSectionComponent {
  readonly entry=input.required<EntryDraft>();readonly expanded=input(false);readonly grouped=input(false);readonly stores=input<StoreDocument[]>([]);readonly people=input<PersonDocument[]>([]);readonly categories=input<CategoryDocument[]>([]);readonly currency=input('INR');readonly error=input('');
  readonly toggle=output<void>();readonly remove=output<void>();readonly changed=output<Partial<EntryDraft>>();private readonly dialogs=inject(AppDialogService);
  async requestRemove(){
    if(await this.dialogs.confirm({title:'Delete expense?',message:`Remove ${this.entry().storeName || 'this expense'} from this day? The deletion takes effect when you save.`,confirmLabel:'Delete expense',destructive:true}))this.remove.emit();
  }
  storeColor(){const store=this.stores().find(item=>item.id===this.entry().storeId);return store?colorForStore(store):'var(--accent)';}
  options(){return [...this.stores().map(s=>({label:s.name,value:s.id})),{label:'Other',value:'other'}];}
  select(id:string){this.changed.emit({storeId:id,storeName:this.stores().find(s=>s.id===id)?.name||''});}
  patch(value:Partial<EntryDraft>){this.changed.emit(value);}
  /** Saved categories, plus the entry's own if it was removed since. */
  categoryChoices(){const list=this.categories().map(c=>({id:c.id,name:c.name}));const e=this.entry();const id=e.categoryId||'others';if(!list.some(c=>c.id===id)&&e.categoryName)list.push({id,name:e.categoryName});return list;}
  /** Name of the category the selected store is linked to, if any. The entry then follows the store. */
  linkedCategory(){const id=this.stores().find(s=>s.id===this.entry().storeId)?.categoryId;return id?this.categories().find(c=>c.id===id)?.name??'':'';}
  categoryId(){return this.entry().categoryId||'others';}
  peopleNames(){return this.people().map(p=>p.name);}
}
