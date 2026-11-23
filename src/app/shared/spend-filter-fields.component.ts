import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { categoriesOf } from '../core/categories';
import { DiaryService } from '../core/diary.service';
import { FILTER_RELATIONS, RelationKey } from '../core/spend-filters';
import { SpendFilterService } from '../core/spend-filter.service';

/** Relation and category selects, shared by the Calendar and Stores filter drawers. */
@Component({
  selector: 'app-spend-filter-fields',
  imports: [FormsModule, SelectModule],
  template: `
    <p class="group-label"><label for="filter-relation">Relation</label></p>
    <p-select inputId="filter-relation" [options]="relations" optionLabel="label" optionValue="value" appendTo="body" [ngModel]="state.relation()" (ngModelChange)="state.relation.set($event)"/>
    <p class="group-label"><label for="filter-category">Category</label></p>
    <p-select inputId="filter-category" [options]="categories()" optionLabel="label" optionValue="value" appendTo="body" [ngModel]="state.category()" (ngModelChange)="state.category.set($event)"/>`,
})
export class SpendFilterFieldsComponent {
  readonly state = inject(SpendFilterService);
  private readonly diary = inject(DiaryService);
  readonly relations: { label: string; value: RelationKey | '' }[] = [{ label: 'All', value: '' }, ...FILTER_RELATIONS.map(r => ({ label: r.label, value: r.id }))];
  readonly categories = computed(() => [{ label: 'All', value: '' }, ...categoriesOf(this.diary.data()).map(c => ({ label: c.name, value: c.id }))]);
}
