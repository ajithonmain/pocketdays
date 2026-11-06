import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { DiaryService } from '../core/diary.service';
import { Payer, Period, Sort, storeOrders, storeRows } from '../core/store-stats';
import { IconComponent } from '../shared/icon.component';

@Component({ standalone: true, imports: [CurrencyPipe, DatePipe, DrawerModule, IconComponent], templateUrl: './stores.page.html' })
export class StoresPage {
  readonly diary = inject(DiaryService);
  readonly period = signal<Period>('month');
  readonly anchor = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  readonly payer = signal<Payer>('all');
  readonly sort = signal<Sort>('spent');
  readonly query = signal('');
  readonly person = signal('');
  readonly searching = signal(false);
  readonly sheet = signal(false);
  readonly detailKey = signal('');

  readonly periods: { id: Period; label: string }[] = [{ id: 'month', label: 'Month' }, { id: 'year', label: 'Year' }, { id: 'all', label: 'All time' }];
  readonly payers: { id: Payer; label: string }[] = [{ id: 'all', label: 'Everyone' }, { id: 'me', label: 'Me' }, { id: 'others', label: 'Others' }];
  readonly sorts: { id: Sort; label: string }[] = [{ id: 'spent', label: 'Most spent' }, { id: 'visits', label: 'Most visits' }, { id: 'recent', label: 'Latest' }, { id: 'name', label: 'A to Z' }];

  readonly rows = computed(() => storeRows(this.diary.data(), { period: this.period(), payer: this.payer(), sort: this.sort(), query: this.query(), person: this.person() }, this.anchor()));
  /** Saved people sorted by name, plus the active person if they were removed since. */
  readonly people = computed(() => {
    const names = this.diary.data().people.map(p => p.name);
    const active = this.person();
    if (active && !names.some(n => n.toLocaleLowerCase() === active.toLocaleLowerCase())) names.push(active);
    return names.sort((a, b) => a.localeCompare(b));
  });
  readonly detail = computed(() => this.rows().find(r => r.id === this.detailKey()) ?? null);
  readonly orders = computed(() => this.detailKey() ? storeOrders(this.diary.data(), this.detailKey(), { period: this.period(), payer: this.payer(), person: this.person() }, this.anchor()) : []);
  readonly periodText = computed(() => this.period() === 'all' ? 'All time' : this.period() === 'year' ? String(this.anchor().getFullYear()) : this.anchor().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }));
  readonly summary = computed(() => ({ total: this.rows().reduce((s, r) => s + r.total, 0), visits: this.rows().reduce((s, r) => s + r.visits, 0) }));
  readonly customised = computed(() => this.period() !== 'month' || this.payer() !== 'all' || this.sort() !== 'spent' || this.person() !== '');
  readonly filtered = computed(() => this.query().trim() !== '' || this.payer() !== 'all' || this.person() !== '');
  readonly navLabel = computed(() => this.period() === 'all' ? 'All time' : this.period() === 'year' ? String(this.anchor().getFullYear()) : '');
  readonly isMonth = computed(() => this.period() === 'month');
  readonly emptyText = computed(() => this.filtered() ? 'No stores match these filters.' : 'No spends in this period.');

  periodIndex() { return this.periods.findIndex(p => p.id === this.period()); }
  payerIndex() { return this.payers.findIndex(p => p.id === this.payer()); }
  step(direction: number) {
    const a = this.anchor();
    if (this.period() === 'month') this.anchor.set(new Date(a.getFullYear(), a.getMonth() + direction, 1));
    else if (this.period() === 'year') this.anchor.set(new Date(a.getFullYear() + direction, a.getMonth(), 1));
  }
  setPeriod(period: Period) { this.period.set(period); if (period === 'month') this.anchor.set(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); }
  reset() { this.period.set('month'); this.payer.set('all'); this.person.set(''); this.sort.set('spent'); this.anchor.set(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); }
  lastDate(key: string) { return new Date(key + 'T12:00:00'); }
  setQuery(event: Event) { this.query.set((event.target as HTMLInputElement).value); }
  toggleSearch() { if (this.searching()) { this.query.set(''); this.searching.set(false); } else this.searching.set(true); }

  private timer?: ReturnType<typeof setTimeout>;
  openSheet() { this.sheet.set(true); }
  closeSheet() { this.dismiss(() => this.sheet.set(false)); }
  openDetail(key: string) { this.detailKey.set(key); }
  closeDetail() { this.dismiss(() => this.detailKey.set('')); }
  private dismiss(done: () => void) {
    document.body.classList.add('sheet-closing');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { done(); document.body.classList.remove('sheet-closing'); }, 300);
  }
  ngOnDestroy() { clearTimeout(this.timer); document.body.classList.remove('sheet-closing'); }
}
