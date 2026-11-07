export interface StoreDocument { color?: string; id: string; name: string; createdAt: string; }
export interface PersonDocument { previousNames?: string[]; id: string; name: string; createdAt: string; }
export interface EntryDocument { paidById?: string; storeColor?: string; id: string; storeId: string; storeName: string; items: string; amount: number; paidByMe: boolean; paidByName: string | null; iOweThem: boolean; personIds: string[]; personNames: string[]; createdAt: string; updatedAt: string; }
export interface DayDocument { date: string; total: number; entryCount: number; updatedAt: string; entries: EntryDocument[]; }
export interface SettingsDocument { currency: string; weekStart: 'monday' | 'sunday'; showDailyTotals: boolean; }
export interface DiaryDocument { schemaVersion: 1; stores: StoreDocument[]; people: PersonDocument[]; days: DayDocument[]; settings: SettingsDocument; }
export interface SyncEnvelope { revision: number; data: DiaryDocument; }
export const emptyDiary = (): DiaryDocument => ({schemaVersion:1,stores:[],people:[],days:[],settings:{currency:'INR',weekStart:'monday',showDailyTotals:false}});

