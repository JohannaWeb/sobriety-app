import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FourthStep } from './fourth-step';

describe('FourthStep', () => {
  let component: FourthStep;
  let fixture: ComponentFixture<FourthStep>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FourthStep]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FourthStep);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
