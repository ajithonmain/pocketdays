export const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const isAwayFromToday = (month: Date, selected: string, today: string) => localDateKey(month).slice(0,7) !== today.slice(0,7) || selected !== today;
export interface CalendarFocus { date: string; entryId?: string; }
export class CalendarFocusState {
  private value: CalendarFocus | null = null;
  set(value: CalendarFocus) { this.value = {...value}; }
  take() { const value = this.value; this.value = null; return value; }
}
