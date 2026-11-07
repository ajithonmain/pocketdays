import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { ThemeService } from './core/theme.service';
import { AppDialogComponent } from './shared/app-dialog.component';
import { Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DiaryService } from './core/diary.service';
import { UpdateService } from './core/update.service';
import { IconComponent } from './shared/icon.component';
@Component({selector:'app-root',imports:[RouterOutlet,RouterLink,RouterLinkActive,IconComponent,AppDialogComponent],templateUrl:'./app.component.html'})
export class AppComponent { readonly theme=inject(ThemeService);readonly diary=inject(DiaryService); readonly update=inject(UpdateService);
  private readonly router=inject(Router);
  readonly peopleRoute=toSignal(this.router.events.pipe(filter(e=>e instanceof NavigationEnd),map(e=>e.urlAfterRedirects.startsWith('/people/'))),{initialValue:false});
  readonly syncLabel=computed(()=>this.diary.conflict()?'sync conflict':!this.diary.online()&&this.diary.pending()?'offline, changes not synced yet':''); }
