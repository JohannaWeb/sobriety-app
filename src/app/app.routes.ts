import { Routes } from '@angular/router';
import { authGuard } from './auth/auth-guard';

export const routes: Routes = [
    { path: 'login', loadComponent: () => import('./auth/login/login').then(m => m.LoginComponent) },
    { path: 'register', loadComponent: () => import('./auth/register/register').then(m => m.RegisterComponent) },
    { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
    { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard').then(m => m.Dashboard), canActivate: [authGuard] },
    { path: 'journal', loadComponent: () => import('./journal/journal').then(m => m.Journal), canActivate: [authGuard] },
    { path: 'resources', loadComponent: () => import('./resources/resources').then(m => m.Resources), canActivate: [authGuard] },
    { path: 'calendar', loadComponent: () => import('./calendar/calendar').then(m => m.Calendar), canActivate: [authGuard] },
    { path: 'motivation', loadComponent: () => import('./motivation/motivation').then(m => m.Motivation), canActivate: [authGuard] },
    { path: 'milestones', loadComponent: () => import('./milestones/milestones').then(m => m.Milestones), canActivate: [authGuard] },
    { path: 'plan', loadComponent: () => import('./plan/plan').then(m => m.Plan), canActivate: [authGuard] },
    { path: 'support', loadComponent: () => import('./support/support').then(m => m.Support), canActivate: [authGuard] },
    { path: 'meetings', loadComponent: () => import('./meetings/meetings').then(m => m.Meetings), canActivate: [authGuard] },
    { path: 'forum', loadComponent: () => import('./forum/forum').then(m => m.Forum), canActivate: [authGuard] },
    { path: 'fourth-step', loadComponent: () => import('./fourth-step/fourth-step').then(m => m.FourthStep), canActivate: [authGuard] }
];
