import { Routes } from "@angular/router";
import { AuthGuard } from "./guards/auth.guard";
import { RoleGuard } from "./guards/role.guard";
import { NoAuthGuard } from "./guards/no-auth.guard";
import { RegisterGuard } from "./guards/register.guard";
import { AdminDashboardComponent } from "./components/admin/dashboard/admin-dashboard.component";
import { UsersManagementComponent } from "./components/admin/users/users-management.component";
import { AppointmentsManagementComponent } from "./components/admin/appointments/appointments-management.component";
import { ReportsComponent } from "./components/admin/reports/reports.component";
import { AdminSettingsComponent } from "./components/admin/settings/admin-settings.component";
import { DoctorDashboardComponent } from "./components/doctor/dashboard/doctor-dashboard.component";
import { DoctorOverviewComponent } from "./components/doctor/overview/doctor-overview.component";
import { DoctorAppointmentsComponent } from "./components/doctor/appointments/doctor-appointments.component";
import { DoctorPatientsComponent } from "./components/doctor/patients/doctor-patients.component";
import { DoctorScheduleComponent } from "./components/doctor/schedule/doctor-schedule.component";
import { PatientDashboardComponent } from "./components/patient/dashboard/patient-dashboard.component";
import { PatientAppointmentsComponent } from "./components/patient/appointments/patient-appointments.component";
import { PatientMedicalRecordsComponent } from "./components/patient/medical-records/patient-medical-records.component";
//import { PatientFindDoctorComponent } from "./components/patient/find-doctor/patient-find-doctor.component";
import { PatientPrescriptionsComponent } from "./components/patient/prescriptions/patient-prescriptions.component";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./components/welcome/welcome.component").then(
        (m) => m.AccueilComponent
      ),
  },
  {
    path: "login",
    loadComponent: () =>
      import("./components/auth/login/login.component").then(
        (m) => m.LoginComponent
      ),
    canActivate: [NoAuthGuard], // ← Guard ajouté ici
  },
  {
    path: "register",
    loadComponent: () =>
      import("./components/auth/register/register.component").then(
        (m) => m.RegisterComponent
      ),
    canActivate: [RegisterGuard], // ✅ Utiliser le nouveau guard
  },
  {
    path: "admin",
    loadComponent: () =>
      import("./components/admin/dashboard/admin-dashboard.component").then(
        (m) => m.AdminDashboardComponent
      ),
    children: [
      { path: "", component: AdminDashboardComponent },
      { path: "users", component: UsersManagementComponent },
      { path: "appointments", component: AppointmentsManagementComponent },
      { path: "reports", component: ReportsComponent },
      { path: "settings", component: AdminSettingsComponent },
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
    ],
    canActivate: [AuthGuard, RoleGuard],
    data: { role: "admin" },
  },
{
  path: "doctor",
  loadComponent: () =>
    import("./components/doctor/dashboard/doctor-dashboard.component").then(
      (m) => m.DoctorDashboardComponent
    ),
  children: [
    {
      path: "",
      redirectTo: "dashboard",
      pathMatch: "full",
    },
    {
      path: "dashboard",
      loadComponent: () =>
        import("./components/doctor/overview/doctor-overview.component").then(
          (m) => m.DoctorOverviewComponent
        ),
    },
    {
      path: "appointments",
      loadComponent: () =>
        import(
          "./components/doctor/appointments/doctor-appointments.component"
        ).then((m) => m.DoctorAppointmentsComponent),
    },
    {
      path: "patients",
      loadComponent: () =>
        import("./components/doctor/patients/doctor-patients.component").then(
          (m) => m.DoctorPatientsComponent
        ),
    },
    {
      path: "my-schedule",
      loadComponent: () =>
        import("./components/doctor/schedule/doctor-schedule.component").then(
          (m) => m.DoctorScheduleComponent
        ),
    },
  ],
  canActivate: [AuthGuard, RoleGuard],
  data: { role: "medecin" },
},
  {
    path: "patient",
    loadComponent: () =>
      import("./components/patient/dashboard/patient-dashboard.component").then(
        (m) => m.PatientDashboardComponent
      ),
    children: [
      {
        path: "",
        redirectTo: "dashboard",
        pathMatch: "full",
      },
      {
        path: "dashboard",
        loadComponent: () =>
          import(
            "./components/patient/overview/patient-overview.component"
          ).then((m) => m.PatientOverviewComponent),
      },
      {
        path: "appointments",
        loadComponent: () =>
          import(
            "./components/patient/appointments/patient-appointments.component"
          ).then((m) => m.PatientAppointmentsComponent),
      },
      {
        path: "medical-records",
        loadComponent: () =>
          import(
            "./components/patient/medical-records/patient-medical-records.component"
          ).then((m) => m.PatientMedicalRecordsComponent),
      },
      {
        path: "prescriptions",
        loadComponent: () =>
          import(
            "./components/patient/prescriptions/patient-prescriptions.component"
          ).then((m) => m.PatientPrescriptionsComponent),
      },
    ],
    canActivate: [AuthGuard, RoleGuard],
    data: { role: "patient" },
  },
  {
    path: "unauthorized",
    loadComponent: () =>
      import("./components/shared/unauthorized/unauthorized.component").then(
        (m) => m.UnauthorizedComponent
      ),
  },
  {
    path: "**",
    redirectTo: "",
  },
];
