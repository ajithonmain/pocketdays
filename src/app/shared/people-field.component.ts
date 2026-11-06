import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { normalizeName, sameName } from '../core/names';

/** Token field: selected people appear as tokens inside the field, typing filters saved names, picking adds a token. */
@Component({
  selector: 'app-people-field',
  imports: [FormsModule],
  template: `
  <div class="tag-field" (click)="field.focus()">
    @for(name of selected(); track name){
      <span class="tag">{{name}}<button type="button" class="tag-remove" [attr.aria-label]="'Remove '+name" (click)="remove(name); $event.stopPropagation()"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m5 5 6 6m0-6-6 6"/></svg></button></span>
    }
    <input #field class="tag-input" type="text" autocomplete="off" [attr.aria-label]="label()" [placeholder]="selected().length ? '' : 'Type a name'" [ngModel]="query" (ngModelChange)="setQuery($event)" (focus)="open.set(true)" (blur)="closeSoon()" (keydown.enter)="enter($event)" (keydown.backspace)="backspace()" (keydown.escape)="open.set(false)">
  </div>
  @if(open() && (suggestions().length || canCreate())){
    <div class="tag-menu" role="listbox">
      @for(s of suggestions(); track s){<button type="button" role="option" (pointerdown)="pick(s, $event)">{{s}}</button>}
      @if(canCreate()){<button type="button" role="option" class="create" (pointerdown)="pick(query, $event)">Add "{{shown()}}"</button>}
    </div>
  }`,
})
export class PeopleFieldComponent {
  readonly selected = input<string[]>([]);
  readonly options = input<string[]>([]);
  readonly label = input('People with me');
  readonly changed = output<string[]>();
  query = '';
  readonly open = signal(false);
  private readonly q = signal('');
  private same = sameName;
  readonly suggestions = computed(() => {
    const query = this.q().trim().toLocaleLowerCase();
    const taken = this.selected();
    return this.options().filter(o => !taken.some(t => this.same(t, o)) && (!query || o.toLocaleLowerCase().includes(query))).slice(0, 6);
  });
  shown() { return normalizeName(this.query); }
  readonly canCreate = computed(() => {
    const query = normalizeName(this.q());
    return !!query && ![...this.options(), ...this.selected()].some(o => this.same(o, query));
  });
  setQuery(value: string) { this.query = value; this.q.set(value); this.open.set(true); }
  pick(raw: string, event: Event) {
    event.preventDefault();
    const name = normalizeName(raw);
    if (name && !this.selected().some(t => this.same(t, name))) this.changed.emit([...this.selected(), name]);
    this.query = ''; this.q.set('');
  }
  remove(name: string) { this.changed.emit(this.selected().filter(n => n !== name)); }
  enter(event: Event) {
    event.preventDefault();
    const target = this.suggestions()[0] ?? (this.canCreate() ? normalizeName(this.query) : '');
    if (target) this.pick(target, event);
  }
  backspace() { if (!this.query && this.selected().length) this.remove(this.selected()[this.selected().length - 1]); }
  closeSoon() { setTimeout(() => this.open.set(false), 120); }
}
