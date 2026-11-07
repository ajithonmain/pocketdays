import { Component, inject, input } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HistoryOrder } from '../core/history-stats';
import { CalendarFocusService } from '../core/calendar-focus.service';
@Component({selector:'app-order-row',imports:[CurrencyPipe,DatePipe,RouterLink],template:`
<div class="history-order"><button class="order-open" (click)="open()" [attr.aria-label]="'Open '+order().date+', '+order().entry.storeName">
<span class="row-main"><strong>{{date() | date:'EEE, d MMM'}}</strong>@if(order().entry.items){<small class="order-note">{{order().entry.items}}</small>}
<span class="mini-pills"><i class="mini-pill payer">{{order().entry.paidByMe?'Paid by me':'Paid by '+order().entry.paidByName}}</i>@for(name of order().entry.personNames;track $index){<i class="mini-pill">{{name}}</i>}</span></span><span class="row-amount">{{order().entry.amount | currency:currency():'symbol':'1.0-2'}}</span></button>
<a class="order-store" [routerLink]="['/stores',order().entry.storeId||order().entry.storeName]">{{order().entry.storeName}}</a></div>`})
export class OrderRowComponent {readonly order=input.required<HistoryOrder>();readonly currency=input('INR');private focus=inject(CalendarFocusService);private router=inject(Router);date(){return new Date(this.order().date+'T12:00:00');}open(){this.focus.set({date:this.order().date,entryId:this.order().entry.id});void this.router.navigateByUrl('/');}}
