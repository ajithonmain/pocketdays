import { RangeControlsComponent } from '../shared/range-controls.component';
import { Router } from '@angular/router';
import { HistoryFiltersService } from '../core/history-filters.service';
import { personRows } from '../core/people-stats';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { DiaryService } from '../core/diary.service';
import { Payer, Sort, storeRows } from '../core/store-stats';
import { IconComponent } from '../shared/icon.component';

@Component({ standalone: true, imports: [CurrencyPipe, DatePipe, DrawerModule, IconComponent, RangeControlsComponent], templateUrl: './stores.page.html' })
export class StoresPage {
  readonly diary = inject(DiaryService);
  readonly state=inject(HistoryFiltersService);private router=inject(Router);
  readonly mode=this.state.mode;
  readonly period=this.state.period;readonly anchor=this.state.anchor;readonly payer=this.state.payer;readonly sort=this.state.sort;
  readonly query = signal('');
  readonly person = this.state.person;
  readonly searching = signal(false);
  readonly sheet = signal(false);

  readonly payers: { id: Payer; label: string }[] = [{ id: 'all', label: 'Everyone' }, { id: 'me', label: 'Me' }, { id: 'others', label: 'Others' }];
  readonly sorts: { id: Sort; label: string }[] = [{ id: 'spent', label: 'Most spent' }, { id: 'visits', label: 'Most visits' }, { id: 'recent', label: 'Latest' }, { id: 'name', label: 'A to Z' }];

  readonly rows = computed(() => (this.mode()==='stores'?storeRows:personRows)(this.diary.data(), { period: this.period(), payer: this.payer(), sort: this.sort(), query: this.query(), person: this.person() }, this.anchor()));
  /** Saved people sorted by name, plus the active person if they were removed since. */
  readonly people = computed(() => {
    const names = this.diary.data().people.map(p => p.name);
    const active = this.person();
    if (active && !names.some(n => n.toLocaleLowerCase() === active.toLocaleLowerCase())) names.push(active);
    return names.sort((a, b) => a.localeCompare(b));
  });
  readonly periodText = computed(() => this.period() === 'all' ? 'All time' : this.period() === 'year' ? String(this.anchor().getFullYear()) : this.anchor().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }));
  readonly summary = computed(() => ({ total: this.rows().reduce((s, r) => s + r.total, 0), visits: this.rows().reduce((s, r) => s + r.visits, 0) }));
  readonly customised = computed(() => this.period() !== 'month' || this.payer() !== 'all' || this.sort() !== 'spent' || this.person() !== '');
  readonly filtered = computed(() => this.query().trim() !== '' || this.payer() !== 'all' || this.person() !== '');
  readonly navLabel = computed(() => this.period() === 'all' ? 'All time' : this.period() === 'year' ? String(this.anchor().getFullYear()) : '');
  readonly isMonth = computed(() => this.period() === 'month');
  readonly emptyText = computed(() => this.filtered() ? 'No stores match these filters.' : 'No spends in this period.');

  rowColor(row: {id:string;color?:string}) {return row.color??'var(--text)';}
  payerIndex() { return this.payers.findIndex(p => p.id === this.payer()); }
  step(direction:number) { this.state.step(direction); }
  reset() { this.state.reset(); }
  countLabel(count:number) {return this.mode()==='people'?(count===1?'1 order together':`${count} orders together`):(count===1?'1 visit':`${count} visits`);}
  lastDate(key: string) { return new Date(key + 'T12:00:00'); }
  setQuery(event: Event) { this.query.set((event.target as HTMLInputElement).value); }
  toggleSearch() { if (this.searching()) { this.query.set(''); this.searching.set(false); } else this.searching.set(true); }

  private timer?: ReturnType<typeof setTimeout>;
  openSheet() { this.sheet.set(true); }
  closeSheet() { this.dismiss(() => this.sheet.set(false)); }
  openDetail(key: string) { void this.router.navigate([this.mode()==='stores'?'/stores':'/people',key]); }
  private dismiss(done: () => void) {
    document.body.classList.add('sheet-closing');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { done(); document.body.classList.remove('sheet-closing'); }, 300);
  }
  ngOnDestroy() { clearTimeout(this.timer); document.body.classList.remove('sheet-closing'); }
}
