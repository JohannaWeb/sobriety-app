import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule, MatCardActions } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { Api } from '../api';
import { MatRadioModule } from '@angular/material/radio';

export interface JournalEntry {
  id?: number;
  date: Date;
  content: string;
  mood: string;
}

@Component({
  selector: 'app-journal',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatCardActions,
    MatRadioModule
  ],
  templateUrl: './journal.html',
  styleUrl: './journal.scss',
})
export class Journal implements OnInit {
  entryForm: UntypedFormGroup;
  entries: JournalEntry[] = [];
  isEditing = false;
  editingEntryId: number | null = null;
  moods = ['😃', '😐', '😢', '😠'];

  constructor(private fb: UntypedFormBuilder, private api: Api) {
    this.entryForm = this.fb.group({
      content: ['', Validators.required],
      mood: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.api.getJournalEntries().subscribe(res => {
      this.entries = res.entries;
    });
  }

  submitEntry() {
    if (this.entryForm.valid) {
      if (this.isEditing) {
        this.api.updateJournalEntry(this.editingEntryId!, this.entryForm.value.content, this.entryForm.value.mood).subscribe(() => {
          this.ngOnInit();
          this.cancelEdit();
        });
      } else {
        const newEntry = {
          date: new Date().toISOString(),
          content: this.entryForm.value.content,
          mood: this.entryForm.value.mood
        };
        this.api.addJournalEntry(newEntry).subscribe(() => {
          this.ngOnInit(); // Refresh the entries
          this.entryForm.reset();
        });
      }
    }
  }

  editEntry(entry: JournalEntry) {
    this.isEditing = true;
    this.editingEntryId = entry.id!;
    this.entryForm.setValue({
      content: entry.content,
      mood: entry.mood
    });
  }

  deleteEntry(id: number) {
    this.api.deleteJournalEntry(id).subscribe(() => {
      this.ngOnInit();
    });
  }

  cancelEdit() {
    this.isEditing = false;
    this.editingEntryId = null;
    this.entryForm.reset();
  }
}
