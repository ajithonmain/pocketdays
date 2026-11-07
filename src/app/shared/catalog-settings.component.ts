import { RouterLink } from '@angular/router';
import { colorForStore } from '../core/store-colors';
import { StoreDocument } from '../core/models';
import { AppDialogService } from '../core/app-dialog.service';
import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogKind } from '../core/catalog';
import { sameName } from '../core/names';
import { DiaryService } from '../core/diary.service';
@Component({
  selector: 'app-catalog-settings',
  imports: [FormsModule, RouterLink],
  templateUrl: './catalog-settings.component.html',
})
export class CatalogSettingsComponent {
  readonly kind = input.required<CatalogKind>();
  readonly diary = inject(DiaryService);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  private readonly dialogs = inject(AppDialogService);
  color(item: {id:string}) {return colorForStore(item as StoreDocument);}
  name = '';
  get duplicate() { return !!this.name.trim() && this.diary.data()[this.kind()].some(item => sameName(item.name, this.name)); }
  async add() {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.message.set('');
    try { await this.diary.addCatalog(this.kind(), this.name); this.name = ''; this.message.set('Added.'); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not save. Retry.'); }
    finally { this.busy.set(false); }
  }
  async requestRemove(id: string, name: string) {
    if (this.busy()) return;
    const accepted = await this.dialogs.confirm({title: `Remove ${name}?`,message: `This removes the name from saved ${this.kind() === 'stores' ? 'stores' : 'people'}. Past expenses stay unchanged.`,confirmLabel: 'Remove',destructive: true});
    if (accepted) await this.remove(id);
  }
  private async remove(id: string) {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.message.set('');
    try { await this.diary.removeCatalog(this.kind(), id); this.message.set('Removed.'); }
    catch { this.error.set('Could not remove. Retry.'); }
    finally { this.busy.set(false); }
  }
}
