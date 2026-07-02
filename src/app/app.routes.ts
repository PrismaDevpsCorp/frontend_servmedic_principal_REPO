import { Routes } from '@angular/router';
import { Login } from './features/login/login';
import { Dashboard } from './features/dashboard/dashboard';
import { Requests } from './features/requests/requests';
import { AttentionReport } from './features/attention-report/attention-report';
import { SpecialistLayout } from './layout/specialist-layout/specialist-layout';
import { specialistAuthGuard } from './core/auth/specialist-auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: Login
  },
  {
    path: '',
    component: SpecialistLayout,
    canActivate: [specialistAuthGuard],
    children: [
      {
        path: 'dashboard',
        component: Dashboard
      },
      {
        path: 'requests',
        component: Requests
      },
      {
        path: 'attention-report',
        component: AttentionReport
      },
      {
        path: 'attention-report/:requestId',
        component: AttentionReport
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];