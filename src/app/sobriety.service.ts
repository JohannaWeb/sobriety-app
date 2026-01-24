import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Api } from './api';

@Injectable({
  providedIn: 'root'
})
export class SobrietyService {
  private sobrietyStartDate = new BehaviorSubject<Date>(new Date());
  currentSobrietyStartDate = this.sobrietyStartDate.asObservable();

  constructor(private api: Api) {
    this.api.getSobrietyDate().subscribe(res => {
      console.log('Sobriety date from API:', res.sobriety_start_date);
      this.sobrietyStartDate.next(new Date(res.sobriety_start_date));
    });
  }

  updateSobrietyStartDate(date: Date) {
    return this.api.updateSobrietyDate(date.toISOString()).pipe(
      tap(() => {
        this.sobrietyStartDate.next(date);
      })
    );
  }
}
