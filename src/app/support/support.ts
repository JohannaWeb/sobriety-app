import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-support',
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
  templateUrl: './support.html',
  styleUrls: ['./support.scss'],
})
export class Support {
  supportForm: UntypedFormGroup;

  constructor(private fb: UntypedFormBuilder) {
    this.supportForm = this.fb.group({
      name: [''],
      phone: [''],
      email: ['']
    });
  }

  saveSupportPerson() {
    // In a future iteration, this will save the support person to the database
    console.log(this.supportForm.value);
  }
}
