import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, FormArray } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-plan',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatExpansionModule,
    MatIconModule
  ],
  templateUrl: './plan.html',
  styleUrls: ['./plan.scss'],
})
export class Plan {
  planForm: UntypedFormGroup;

  constructor(private fb: UntypedFormBuilder) {
    this.planForm = this.fb.group({
      triggers: this.fb.array([]),
      copingStrategies: this.fb.array([]),
      supportContacts: this.fb.array([])
    });
  }

  get triggers(): FormArray {
    return this.planForm.get('triggers') as FormArray;
  }

  get copingStrategies(): FormArray {
    return this.planForm.get('copingStrategies') as FormArray;
  }

  get supportContacts(): FormArray {
    return this.planForm.get('supportContacts') as FormArray;
  }

  addTrigger() {
    this.triggers.push(this.fb.group({ trigger: [''] }));
  }

  addCopingStrategy() {
    this.copingStrategies.push(this.fb.group({ strategy: [''] }));
  }

  addSupportContact() {
    this.supportContacts.push(this.fb.group({ name: [''], phone: [''] }));
  }

  removeTrigger(index: number) {
    this.triggers.removeAt(index);
  }

  removeCopingStrategy(index: number) {
    this.copingStrategies.removeAt(index);
  }

  removeSupportContact(index: number) {
    this.supportContacts.removeAt(index);
  }

  savePlan() {
    // In a future iteration, this will save the plan to the database
    console.log(this.planForm.value);
  }
}
