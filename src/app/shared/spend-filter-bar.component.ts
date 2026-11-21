import { Component, computed, inject } from '@angular/core';
import { categoriesOf } from '../core/categories';
import { DiaryService } from '../core/diary.service';
import { RELATIONS } from '../core/spend-filters';
import { SpendFilterService } from '../core/spend-filter.service';
import { Relation } from '../core/models';

/** Two scrolling chip rows (who, what) shared by Calendar and Stores. Tapping the active chip clears it. */
@Component({
  selector: 'app-spend-filter-bar',
  template: `
    <div class="filter-bar" aria-label="Spending filters">
      <div class="filter-row" role="group" aria-label="Relation">
        <button type="button" class="filter-chip" [attr.aria-pressed]="!state.relation()" (click)="state.relation.set('')">All</button>
        @for (r of relations; track r.id) {<button type="button" class="filter-chip" [attr.aria-pressed]="state.relation()===r.id" (click)="toggleRelation(r.id)">{{r.label}}</button>}
      </div>
      <div class="filter-row" role="group" aria-label="Category">
        <button type="button" class="filter-chip" [attr.aria-pressed]="!state.category()" (click)="state.category.set('')">All</button>
        @for (c of categories(); track c.id) {<button type="button" class="filter-chip" [attr.aria-pressed]="state.category()===c.id" (click)="toggleCategory(c.id)">{{c.name}}</button>}
      </div>
    </div>`,
})
export class SpendFilterBarComponent {
  readonly state = inject(SpendFilterService);
  private readonly diary = inject(DiaryService);
  readonly relations = RELATIONS;
  readonly categories = computed(() => categoriesOf(this.diary.data()));
  toggleRelation(id: Relation) { this.state.relation.set(this.state.relation() === id ? '' : id); }
  toggleCategory(id: string) { this.state.category.set(this.state.category() === id ? '' : id); }
}
