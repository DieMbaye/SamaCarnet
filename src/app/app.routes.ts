import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/accueil/accueil.component').then(m => m.AccueilComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./components/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./components/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { role: 'admin' }
  },
  {
    path: 'doctor',
    loadComponent: () => import('./components/doctor/doctor-dashboard.component').then(m => m.DoctorDashboardComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { role: 'medecin' }
  },
  {
    path: 'patient',
    loadComponent: () => import('./components/patient/patient-dashboard.component').then(m => m.PatientDashboardComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { role: 'patient' }
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./components/shared/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
