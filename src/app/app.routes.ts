import { Routes } from '@angular/router';
import { Login } from './features/login/login';
import { Dashboard } from './features/dashboard/dashboard';
import { Requests } from './features/requests/requests';
import { MedicalRecords } from './features/medical-records/medical-records';
import { AttentionReportComponent } from './features/attention-report/attention-report';
import { PatientDashboard } from './features/patient-dashboard/patient-dashboard';
import { PatientRequests } from './features/patient-requests/patient-requests';
import { PatientCreateRequest } from './features/patient-create-request/patient-create-request';
import { SpecialistLayout } from './layout/specialist-layout/specialist-layout';
import { PatientLayout } from './layout/patient-layout/patient-layout';
import { specialistAuthGuard } from './core/auth/specialist-auth.guard';
import { patientAuthGuard } from './core/auth/patient-auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: Login
  },

  {
    path: 'dashboard',
    component: SpecialistLayout,
    canActivate: [specialistAuthGuard],
    children: [
      {
        path: '',
        component: Dashboard
      }
    ]
  },
  {
    path: 'requests',
    component: SpecialistLayout,
    canActivate: [specialistAuthGuard],
    children: [
      {
        path: '',
        component: Requests
      }
    ]
  },
  {
    path: 'medical-records',
    component: SpecialistLayout,
    canActivate: [specialistAuthGuard],
    children: [
      {
        path: '',
        component: MedicalRecords
      }
    ]
  },
  {
    path: 'attention-report',
    component: SpecialistLayout,
    canActivate: [specialistAuthGuard],
    children: [
      {
        path: '',
        component: AttentionReportComponent
      }
    ]
  },
  {
    path: 'attention-report/:requestId',
    component: SpecialistLayout,
    canActivate: [specialistAuthGuard],
    children: [
      {
        path: '',
        component: AttentionReportComponent
      }
    ]
  },

  {
    path: 'patient-dashboard',
    component: PatientLayout,
    canActivate: [patientAuthGuard],
    children: [
      {
        path: '',
        component: PatientDashboard
      }
    ]
  },
  {
    path: 'patient-create-request',
    component: PatientLayout,
    canActivate: [patientAuthGuard],
    children: [
      {
        path: '',
        component: PatientCreateRequest
      }
    ]
  },
  {
    path: 'patient-requests',
    component: PatientLayout,
    canActivate: [patientAuthGuard],
    children: [
      {
        path: '',
        component: PatientRequests
      }
    ]
  },

  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];