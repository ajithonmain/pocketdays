import { provideAnimations } from '@angular/platform-browser/animations';
import { ApplicationConfig, isDevMode, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
export const appConfig: ApplicationConfig = { providers: [provideAnimations(), provideZonelessChangeDetection(), providePrimeNG({theme:{preset:Aura,options:{darkModeSelector:'.dark'}}}), provideRouter([{path:'',loadComponent:()=>import('./pages/home.page').then(m=>m.HomePage)},{path:'stores',loadComponent:()=>import('./pages/stores.page').then(m=>m.StoresPage)},{path:'stores/:key',data:{kind:'stores'},loadComponent:()=>import('./pages/history-detail.page').then(m=>m.HistoryDetailPage)},{path:'people/:key',data:{kind:'people'},loadComponent:()=>import('./pages/history-detail.page').then(m=>m.HistoryDetailPage)},{path:'settings',loadComponent:()=>import('./pages/settings.page').then(m=>m.SettingsPage)},{path:'**',redirectTo:''}]),provideServiceWorker('ngsw-worker.js',{enabled:!isDevMode(),registrationStrategy:'registerWhenStable:30000'})] };

