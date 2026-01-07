import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatGridListModule } from '@angular/material/grid-list';
import { Api } from '../api';
import { JournalEntry } from '../journal/journal';

interface CalendarDay {
  date: Date;
  entries: JournalEntry[];
}

@Component({
  selector: 'app-calendar',
  imports: [CommonModule, MatGridListModule],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class Calendar implements OnInit {
  calendarDays: CalendarDay[] = [];
  currentMonth: Date = new Date();

  constructor(private api: Api) {}

  ngOnInit() {
    this.generateCalendar();
    this.fetchJournalEntries();
  }

  generateCalendar() {
    this.calendarDays = [];
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDay = firstDayOfMonth.getDay(); // 0 for Sunday, 1 for Monday, etc.

    // Fill leading empty days
    for (let i = 0; i < startDay; i++) {
      this.calendarDays.push({ date: new Date(year, month, -startDay + i + 1), entries: [] });
    }

    // Fill days of the month
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      this.calendarDays.push({ date: new Date(year, month, i), entries: [] });
    }
  }

  fetchJournalEntries() {
    this.api.getJournalEntries().subscribe(res => {
      res.entries.forEach(entry => {
        const entryDate = new Date(entry.date);
        const day = this.calendarDays.find(d =>
          d.date.getDate() === entryDate.getDate() &&
          d.date.getMonth() === entryDate.getMonth() &&
          d.date.getFullYear() === entryDate.getFullYear()
        );
        if (day) {
          day.entries.push(entry);
        }
      });
    });
  }

  nextMonth() {
    this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
    this.generateCalendar();
    this.fetchJournalEntries();
  }

  prevMonth() {
    this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
    this.generateCalendar();
    this.fetchJournalEntries();
  }
}
