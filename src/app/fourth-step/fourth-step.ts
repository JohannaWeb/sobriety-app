import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { Api } from '../api';

interface FourthStepItem {
  id?: number;
  type: 'resentment' | 'fear' | 'sexual';
  description: string;
  affects_what?: string;
  my_part?: string;
  fear_type?: string;
}

@Component({
  selector: 'app-fourth-step',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatListModule,
    MatIconModule
  ],
  templateUrl: './fourth-step.html',
  styleUrls: ['./fourth-step.scss']
})
export class FourthStep implements OnInit {
  resentments: FourthStepItem[] = [];
  fears: FourthStepItem[] = [];
  sexualInventory: FourthStepItem[] = [];

  newResentment: Partial<FourthStepItem> = { type: 'resentment', description: '', affects_what: '', my_part: '' };
  newFear: Partial<FourthStepItem> = { type: 'fear', description: '' };
  newSexualItem: Partial<FourthStepItem> = { type: 'sexual', description: '', my_part: '' };

  constructor(private api: Api) { }

  ngOnInit(): void {
    this.loadInventory();
  }

  loadInventory(): void {
    this.api.getFourthStepInventory().subscribe(items => {
      this.resentments = items.filter(item => item.type === 'resentment');
      this.fears = items.filter(item => item.type === 'fear');
      this.sexualInventory = items.filter(item => item.type === 'sexual');
    });
  }

  addItem(item: Partial<FourthStepItem>): void {
    this.api.addFourthStepItem(item).subscribe(() => {
      this.loadInventory();
      this.resetForms();
    });
  }

  deleteItem(id: number): void {
    this.api.deleteFourthStepItem(id).subscribe(() => {
      this.loadInventory();
    });
  }

  resetForms(): void {
    this.newResentment = { type: 'resentment', description: '', affects_what: '', my_part: '' };
    this.newFear = { type: 'fear', description: '' };
    this.newSexualItem = { type: 'sexual', description: '', my_part: '' };
  }
}