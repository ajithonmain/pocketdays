export interface StoreDocument { /** Category every expense at this store counts under. */ categoryId?: string; color?: string; id: string; name: string; createdAt: string; }
export type Relation = 'family' | 'friends' | 'others';
export interface CategoryDocument { id: string; name: string; createdAt: string; }
export interface PersonDocument { relation?: Relation; previousNames?: string[]; id: string; name: string; createdAt: string; }
export interface EntryDocument { categoryId?: string; categoryName?: string; paidById?: string; storeColor?: string; id: string; storeId: string; storeName: string; items: string; amount: number; paidByMe: boolean; paidByName: string | null; iOweThem: boolean; personIds: string[]; personNames: string[]; createdAt: string; updatedAt: string; }
export interface DayDocument { date: string; total: number; entryCount: number; updatedAt: string; entries: EntryDocument[]; }
export interface SettingsDocument { currency: string; weekStart: 'monday' | 'sunday'; showDailyTotals: boolean; }
export interface DiaryDocument { schemaVersion: 1; stores: StoreDocument[]; people: PersonDocument[]; /** Absent until the list is first edited; then the built-in defaults apply. */ categories?: CategoryDocument[]; days: DayDocument[]; settings: SettingsDocument; }
export interface SyncEnvelope { revision: number; data: DiaryDocument; }
export const emptyDiary = (): DiaryDocument => ({schemaVersion:1,stores:[],people:[],days:[],settings:{currency:'INR',weekStart:'sunday',showDailyTotals:false}});

