import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserVideo } from './user-video';

describe('UserVideo', () => {
  let component: UserVideo;
  let fixture: ComponentFixture<UserVideo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserVideo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserVideo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
