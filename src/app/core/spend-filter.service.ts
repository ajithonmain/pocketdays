import { Injectable, computed, signal } from '@angular/core';
import { RelationKey, SpendFilter, spendFilterActive } from './spend-filters';
/** Relation and category filter shared by the Calendar and Stores pages. Starts as Friends and Food on every open; kept for the session only. */
@Injectable({ providedIn: 'root' })
export class SpendFilterService {
  readonly relation = signal<RelationKey | ''>('friends');
  readonly category = signal('food');
  readonly filter = computed<SpendFilter>(() => ({ relation: this.relation(), category: this.category() }));
  readonly active = computed(() => spendFilterActive(this.filter()));
  reset() { this.relation.set(''); this.category.set(''); }
}
