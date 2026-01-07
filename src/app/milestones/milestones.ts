import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { SobrietyService } from '../sobriety.service';

interface Milestone {
  name: string;
  days: number;
  achieved: boolean;
  badge: string;
}

@Component({
  selector: 'app-milestones',
  imports: [CommonModule, MatCardModule],
  templateUrl: './milestones.html',
  styleUrls: ['./milestones.scss'],
})
export class Milestones implements OnInit {
  sobrietyStartDate!: Date;
  days = 0;

  milestones: Milestone[] = [
    { name: '1 Day', days: 1, achieved: false, badge: 'bronze' },
    { name: '1 Week', days: 7, achieved: false, badge: 'bronze' },
    { name: '1 Month', days: 30, achieved: false, badge: 'silver' },
    { name: '3 Months', days: 90, achieved: false, badge: 'silver' },
    { name: '6 Months', days: 180, achieved: false, badge: 'gold' },
    { name: '1 Year', days: 365, achieved: false, badge: 'gold' },
  ];

  constructor(private sobrietyService: SobrietyService) {}

  ngOnInit() {
    this.sobrietyService.currentSobrietyStartDate.subscribe(date => {
      this.sobrietyStartDate = date;
      this.updateDays();
      this.checkMilestones();
    });
  }

  updateDays() {
    if (this.sobrietyStartDate) {
      const diff = new Date().getTime() - this.sobrietyStartDate.getTime();
      this.days = Math.floor(diff / (1000 * 60 * 60 * 24));
    }
  }

  checkMilestones() {
    this.milestones.forEach(milestone => {
      if (this.days >= milestone.days) {
        milestone.achieved = true;
      }
    });
  }
}
