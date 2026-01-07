import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { Journal } from './journal/journal';
import { Resources } from './resources/resources';
import { Calendar } from './calendar/calendar';
import { Motivation } from './motivation/motivation';
import { Milestones } from './milestones/milestones';
import { Plan } from './plan/plan';
import { Support } from './support/support';
import { Meetings } from './meetings/meetings';
import { Forum } from './forum/forum';
import { FourthStep } from './fourth-step/fourth-step';

export const routes: Routes = [
    { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
    { path: 'dashboard', component: Dashboard },
    { path: 'journal', component: Journal },
    { path: 'resources', component: Resources },
    { path: 'calendar', component: Calendar },
    { path: 'motivation', component: Motivation },
    { path: 'milestones', component: Milestones },
    { path: 'plan', component: Plan },
    { path: 'support', component: Support },
    { path: 'meetings', component: Meetings },
    { path: 'forum', component: Forum },
    { path: 'fourth-step', component: FourthStep }
];
