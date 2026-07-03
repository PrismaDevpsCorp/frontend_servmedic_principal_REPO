import { Routes } from '@angular/router';
import { Login } from './features/login/login';
import { Dashboard } from './features/dashboard/dashboard';
import { Requests } from './features/requests/requests';
import { MedicalRecords } from './features/medical-records/medical-records';
import { AttentionReportComponent } from './features/attention-report/attention-report';
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
        path: 'medical-records',
        component: MedicalRecords
      },
      {
        path: 'attention-report',
        component: AttentionReportComponent
      },
      {
        path: 'attention-report/:requestId',
        component: AttentionReportComponent
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