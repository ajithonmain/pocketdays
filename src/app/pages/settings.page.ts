import { ThemeService } from '../core/theme.service';
import { AppDialogService } from '../core/app-dialog.service';
import { CatalogSettingsComponent } from '../shared/catalog-settings.component';
import { CatalogKind } from '../core/catalog';
import { IconComponent } from '../shared/icon.component';
import { Component, inject, signal } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { DiaryService } from '../core/diary.service';
import { BACKUP_LIMIT_BYTES, backupFileName, createBackup, parseBackup, summarize } from '../core/backup';
import { InstallService } from '../core/install.service';
import { UpdateService } from '../core/update.service';
import { normalizePairCode, PAIR_CODE_TTL_SECONDS } from '../core/pairing';
@Component({standalone:true,imports:[CatalogSettingsComponent,DrawerModule,IconComponent],templateUrl:'./settings.page.html'})
export class SettingsPage {
  readonly theme=inject(ThemeService);readonly dialogs=inject(AppDialogService);readonly diary=inject(DiaryService);readonly installer=inject(InstallService);readonly updater=inject(UpdateService);readonly message=signal('');
  readonly managing=signal<CatalogKind|''>('');readonly backupMessage=signal('');readonly backupError=signal('');
  readonly linking=signal<''|'show'|'enter'>('');readonly pairCode=signal('');readonly pairError=signal('');readonly pairBusy=signal(false);readonly codeInput=signal('');
  readonly pairMinutes=PAIR_CODE_TTL_SECONDS/60;
  private timer?:ReturnType<typeof setTimeout>;private linkTimer?:ReturnType<typeof setTimeout>;
  themeIndex(){return ['light','dark','system'].indexOf(this.theme.choice());}
  open(kind:CatalogKind){this.managing.set(kind);}
  close(){document.body.classList.add('sheet-closing');clearTimeout(this.timer);this.timer=setTimeout(()=>{this.managing.set('');document.body.classList.remove('sheet-closing');},300);}
  async showCode(){
    this.linking.set('show');this.pairCode.set('');this.pairError.set('');this.pairBusy.set(true);
    try{this.pairCode.set((await this.diary.createPairCode()).code);}
    catch(error){this.pairError.set(error instanceof Error?error.message:'Could not create a code. Try again.');}
    finally{this.pairBusy.set(false);}
  }
  enterCode(){this.linking.set('enter');this.codeInput.set('');this.pairError.set('');}
  closeLink(){document.body.classList.add('sheet-closing');clearTimeout(this.linkTimer);this.linkTimer=setTimeout(()=>{this.linking.set('');this.pairCode.set('');this.codeInput.set('');this.pairError.set('');document.body.classList.remove('sheet-closing');},300);}
  formatCode(event:Event){
    const input=event.target as HTMLInputElement;const clean=input.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
    const text=clean.length>4?`${clean.slice(0,4)}-${clean.slice(4)}`:clean;input.value=text;this.codeInput.set(text);this.pairError.set('');
  }
  async connect(){
    if(this.pairBusy())return;
    if(!normalizePairCode(this.codeInput())){this.pairError.set('Enter the 8 character code.');return;}
    this.pairBusy.set(true);this.pairError.set('');
    try{
      const key=await this.diary.claimPairCode(this.codeInput());
      const mine=summarize(this.diary.data());
      const accepted=mine.entries===0||await this.dialogs.confirm({title:'Switch to the linked diary?',message:`This device will show the linked diary instead. Its ${mine.entries} expenses that are only on this device will no longer be shown. Download a backup first if you might need them.`,confirmLabel:'Switch diary',destructive:true});
      if(accepted)this.diary.joinDiary(key);
    }catch(error){this.pairError.set(error instanceof Error?error.message:'That code did not work.');}
    finally{this.pairBusy.set(false);}
  }
  ngOnDestroy(){clearTimeout(this.linkTimer);clearTimeout(this.timer);document.body.classList.remove('sheet-closing');}
  async resolve(local:boolean){
    const accepted=await this.dialogs.confirm({title:local?'Replace cloud diary?':'Replace this device\u2019s diary?',message:local?'Your diary on this device will replace the cloud copy. Cloud-only changes will be lost.':'The cloud copy will replace this device\u2019s diary. Unsynced local changes will be lost.',confirmLabel:local?'Use this device':'Use cloud copy',destructive:true});
    if(accepted)await this.diary.resolveConflict(local);
  }
  download(){
    this.backupError.set('');
    const blob=new Blob([JSON.stringify(createBackup(this.diary.data()),null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=backupFileName();document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);this.backupMessage.set('Backup file created.');
  }
  async restoreFile(event:Event){
    const input=event.target as HTMLInputElement;const file=input.files?.[0];input.value='';
    if(!file)return;this.backupError.set('');this.backupMessage.set('');
    if(file.size>BACKUP_LIMIT_BYTES){this.backupError.set('File too large for a backup.');return;}
    try{
      const {diary,summary}=parseBackup(await file.text());const now=summarize(this.diary.data());
      const when=summary.exportedAt?` from ${new Date(summary.exportedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`:'';
      const accepted=await this.dialogs.confirm({title:'Replace your diary?',message:`This replaces everything on this device (${now.entries} expenses on ${now.days} days) with the backup${when} (${summary.entries} expenses on ${summary.days} days). Download a backup of the current diary first if you might need it.`,confirmLabel:'Replace diary',destructive:true});
      if(!accepted)return;
      await this.diary.restore(diary);this.backupMessage.set('Backup restored.');
    }catch(error){this.backupError.set(error instanceof Error?error.message:'Could not restore this file.');}
  }
  released(){return new Date(this.updater.info.builtAt).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}
  async install(){await this.installer.install();}
  async copy(){this.message.set(await this.diary.copyLink()?'Private link copied.':'Copy unavailable. Use HTTPS.');}
}
