import { RouterLink } from '@angular/router';
import { colorForStore } from '../core/store-colors';
import { StoreDocument } from '../core/models';
import { AppDialogService } from '../core/app-dialog.service';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogKind } from '../core/catalog';
import { categoriesOf, FALLBACK_CATEGORY } from '../core/categories';
import { nextRelation, relationLabel } from '../core/spend-filters';
import { PersonDocument } from '../core/models';
import { sameName } from '../core/names';
import { DiaryService } from '../core/diary.service';
@Component({
  selector: 'app-catalog-settings',
  imports: [FormsModule, RouterLink],
  templateUrl: './catalog-settings.component.html',
})
export class CatalogSettingsComponent {
  readonly kind = input.required<CatalogKind | 'categories'>();
  readonly diary = inject(DiaryService);
  readonly items = computed<{id: string; name: string; relation?: PersonDocument['relation']; categoryId?: string}[]>(() => this.kind() === 'categories' ? categoriesOf(this.diary.data()) : this.diary.data()[this.kind() as CatalogKind]);
  readonly noun = computed(() => this.kind() === 'stores' ? 'store' : this.kind() === 'people' ? 'person' : 'category');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  private readonly dialogs = inject(AppDialogService);
  color(item: {id:string}) {return colorForStore(item as StoreDocument);}
  name = '';
  get duplicate() { return !!this.name.trim() && this.items().some(item => sameName(item.name, this.name)); }
  async add() {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.message.set('');
    try { if (this.kind() === 'categories') await this.diary.addCategory(this.name); else await this.diary.addCatalog(this.kind() as CatalogKind, this.name); this.name = ''; this.message.set('Added.'); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not save. Retry.'); }
    finally { this.busy.set(false); }
  }
  readonly fallback = FALLBACK_CATEGORY;
  readonly categoryChoices = computed(() => categoriesOf(this.diary.data()));
  async setCategory(storeId: string, categoryId: string) {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.message.set('');
    try { await this.diary.setStoreCategory(storeId, categoryId); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not save. Retry.'); }
    finally { this.busy.set(false); }
  }
  relation(item: {relation?: PersonDocument['relation']}) { return relationLabel(item.relation); }
  async cycle(item: {id: string; relation?: PersonDocument['relation']}) {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.message.set('');
    try { await this.diary.setRelation(item.id, nextRelation(item.relation)); }
    catch { this.error.set('Could not save. Retry.'); }
    finally { this.busy.set(false); }
  }
  async requestRemove(id: string, name: string) {
    if (this.busy()) return;
    const accepted = await this.dialogs.confirm({title: `Remove ${name}?`,message: `This removes the name from saved ${this.kind() === 'stores' ? 'stores' : this.kind() === 'people' ? 'people' : 'categories'}. Past expenses stay unchanged.`,confirmLabel: 'Remove',destructive: true});
    if (accepted) await this.remove(id);
  }
  private async remove(id: string) {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.message.set('');
    try { if (this.kind() === 'categories') await this.diary.removeCategory(id); else await this.diary.removeCatalog(this.kind() as CatalogKind, id); this.message.set('Removed.'); }
    catch { this.error.set('Could not remove. Retry.'); }
    finally { this.busy.set(false); }
  }
}
