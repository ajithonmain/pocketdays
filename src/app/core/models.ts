export interface StoreDocument { /** Category every expense at this store counts under. */ categoryId?: string; color?: string; id: string; name: string; createdAt: string; }
/** Id of a saved relation. Family, Friends and Others are built in; more can be added. */
export type Relation = string;
export interface RelationDocument { id: string; name: string; createdAt: string; }
export interface CategoryDocument { id: string; name: string; createdAt: string; }
export interface PersonDocument { relation?: Relation; previousNames?: string[]; id: string; name: string; createdAt: string; }
export interface EntryDocument { /** Relation chosen for an expense with nobody else on it. */ relation?: Relation; categoryId?: string; categoryName?: string; paidById?: string; storeColor?: string; id: string; storeId: string; storeName: string; items: string; amount: number; paidByMe: boolean; paidByName: string | null; iOweThem: boolean; personIds: string[]; personNames: string[]; createdAt: string; updatedAt: string; }
export interface DayDocument { date: string; total: number; entryCount: number; updatedAt: string; entries: EntryDocument[]; }
export interface SettingsDocument { currency: string; weekStart: 'monday' | 'sunday'; showDailyTotals: boolean; }
export interface DiaryDocument { schemaVersion: 1; stores: StoreDocument[]; people: PersonDocument[]; /** Absent until the list is first edited; then the built-in defaults apply. */ categories?: CategoryDocument[]; /** Absent until the list is first edited; then the built-in defaults apply. */ relations?: RelationDocument[]; days: DayDocument[]; settings: SettingsDocument; }
export interface SyncEnvelope { revision: number; data: DiaryDocument; }
export const emptyDiary = (): DiaryDocument => ({schemaVersion:1,stores:[],people:[],days:[],settings:{currency:'INR',weekStart:'sunday',showDailyTotals:false}});

