import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { SobrietyService } from '../sobriety.service';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dashboard implements OnInit, OnDestroy {
  sobrietyStartDate!: Date;
  days = 0;
  hours = 0;
  minutes = 0;
  seconds = 0;
  timer: any;
  dateForm: UntypedFormGroup;

  constructor(
    private fb: UntypedFormBuilder,
    private sobrietyService: SobrietyService,
    private cdr: ChangeDetectorRef
  ) {
    this.dateForm = this.fb.group({
      newDate: ['']
    });
  }

  ngOnInit() {
    this.sobrietyService.currentSobrietyStartDate.subscribe(date => {
      this.sobrietyStartDate = date;
      this.dateForm.patchValue({ newDate: this.sobrietyStartDate.toISOString().substring(0, 16) });
      this.updateCounter();
      this.cdr.markForCheck();
    });

    this.timer = setInterval(() => {
      this.updateCounter();
      this.cdr.markForCheck();
    }, 1000);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  updateCounter() {
    if (this.sobrietyStartDate) {
      const diff = new Date().getTime() - this.sobrietyStartDate.getTime();
      this.days = Math.floor(diff / (1000 * 60 * 60 * 24));
      this.hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      this.minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      this.seconds = Math.floor((diff % (1000 * 60)) / 1000);
    }
  }

  saveNewStartDate() {
    if (this.dateForm.valid) {
      const newDate = new Date(this.dateForm.value.newDate);
      this.sobrietyService.updateSobrietyStartDate(newDate).subscribe({
        next: () => {
          alert('Sobriety date updated successfully!');
        },
        error: (err) => {
          console.error('Failed to update date', err);
          alert('Failed to update sobriety date. Please try again.');
        }
      });
    }
  }
}
