import { Routes } from "@angular/router";
import { AuthGuard } from "./guards/auth.guard";
import { RoleGuard } from "./guards/role.guard";
import { NoAuthGuard } from "./guards/no-auth.guard";
import { RegisterGuard } from "./guards/register.guard";

// Importez les nouveaux composants pour les prescriptions
import { PatientPrescriptionsComponent } from "./components/patient/prescriptions/patient-prescriptions.component";
import { DoctorCreatePrescriptionComponent } from "./components/doctor/prescriptions/doctor-create-prescriptions.component";
import { DoctorPrescriptionsComponent } from "./components/doctor/prescriptions/doctor-prescriptions.component";
import { DoctorPrescriptionTemplatesComponent } from "./components/doctor/prescriptions/doctor-prescriptions-templates.component";

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
    canActivate: [NoAuthGuard],
  },
  {
    path: "register",
    loadComponent: () =>
      import("./components/auth/register/register.component").then(
        (m) => m.RegisterComponent
      ),
    canActivate: [RegisterGuard],
  },
  {
    path: "admin",
    loadComponent: () =>
      import("./components/admin/dashboard/admin-dashboard.component").then(
        (m) => m.AdminDashboardComponent
      ),
    children: [
      { 
        path: "", 
        redirectTo: "dashboard", 
        pathMatch: "full" 
      },
      { 
        path: "dashboard",
        loadComponent: () =>
          import("./components/admin/dashboard/admin-dashboard.component").then(
            (m) => m.AdminDashboardComponent
          )
      },
      { 
        path: "users", 
        loadComponent: () =>
          import("./components/admin/users/users-management.component").then(
            (m) => m.UsersManagementComponent
          )
      },
      { 
        path: "appointments", 
        loadComponent: () =>
          import("./components/admin/appointments/appointments-management.component").then(
            (m) => m.AppointmentsManagementComponent
          )
      },
      { 
        path: "reports", 
        loadComponent: () =>
          import("./components/admin/reports/reports.component").then(
            (m) => m.ReportsComponent
          )
      },
      { 
        path: "settings", 
        loadComponent: () =>
          import("./components/admin/settings/admin-settings.component").then(
            (m) => m.AdminSettingsComponent
          )
      },
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
      {
        path: "prescriptions",
        children: [
          {
            path: "",
            redirectTo: "manage",
            pathMatch: "full"
          },
          {
            path: "create",
            component: DoctorCreatePrescriptionComponent,
          },
          {
            path: "manage",
            component: DoctorPrescriptionsComponent,
          },
          {
            path: "templates",
            component: DoctorPrescriptionTemplatesComponent,
          }
        ]
      }
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
        component: PatientPrescriptionsComponent,
      },
      {
        path: "find-doctor",
        loadComponent: () =>
          import("./components/patient/find_doctor/patient-find-doctor.component").then(
            (m) => m.PatientFindDoctorComponent
          ),
      },
      {
        path: "chat",
        loadComponent: () =>
          import("./components/patient/chat/patient-chat.component").then(
            (m) => m.PatientChatComponent
          ),
      },
      {
        path: "consultation/:id",
        loadComponent: () =>
          import("./components/patient/online/video-consultation.component").then(
            (m) => m.VideoConsultationComponent
          ),
      },
      {
        path: "health-tracker",
        loadComponent: () =>
          import(
            "./components/patient/health/patient-health-tracker.component"
          ).then((m) => m.HealthTrackerComponent),
      },
      {
        path: "emergency",
        loadComponent: () =>
          import(
            "./components/patient/emergency/patient-emergency.component"
          ).then((m) => m.PatientEmergencyComponent),
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