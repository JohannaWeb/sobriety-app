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
import { LoginComponent } from './auth/login/login';
import { RegisterComponent } from './auth/register/register';
import { authGuard } from './auth/auth-guard';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
    { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
    { path: 'journal', component: Journal, canActivate: [authGuard] },
    { path: 'resources', component: Resources, canActivate: [authGuard] },
    { path: 'calendar', component: Calendar, canActivate: [authGuard] },
    { path: 'motivation', component: Motivation, canActivate: [authGuard] },
    { path: 'milestones', component: Milestones, canActivate: [authGuard] },
    { path: 'plan', component: Plan, canActivate: [authGuard] },
    { path: 'support', component: Support, canActivate: [authGuard] },
    { path: 'meetings', component: Meetings, canActivate: [authGuard] },
    { path: 'forum', component: Forum, canActivate: [authGuard] },
    { path: 'fourth-step', component: FourthStep, canActivate: [authGuard] }
];
