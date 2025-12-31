import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { NgChartsModule } from "ng2-charts";
import { ChartOptions, ChartData } from "chart.js";
import { Doctor, Appointment, MedicalRecord, User } from "../../../models/user.model";
import { AppointmentService } from "../../../services/appointment.service";
import { UserService } from "../../../services/user.service";
import { MedicalRecordService } from "../../../services/medical-record.service";
import { AuthService } from "../../../services/auth.service";

@Component({
  selector: 'app-doctor-overview',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './doctor-overview.component.html',
  styleUrls: ['./doctor-overview.component.css']
})
export class DoctorOverviewComponent implements OnInit, OnDestroy {
  currentUser: Doctor | null = null;
  
  // Data
  appointments: Appointment[] = [];
  patients: User[] = [];
  medicalRecords: MedicalRecord[] = [];
  
  // Statistics
  stats = {
    todayAppointments: 0,
    pendingConfirmations: 0,
    totalPatients: 0,
    completedThisWeek: 0,
    cancellationRate: 0
  };

  historyStats = {
    completed: 0,
    cancelled: 0,
    completionRate: 0
  };

  // Filtered data
  upcomingAppointments: Appointment[] = [];
  recentMedicalRecords: MedicalRecord[] = [];
  urgentCases: Appointment[] = [];

  // Chart configurations
  chartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { size: 12, family: 'Segoe UI' },
          color: '#2c3e50'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { family: 'Segoe UI', size: 12 },
        bodyFont: { family: 'Segoe UI', size: 11 },
        padding: 12,
        cornerRadius: 8
      }
    }
  };

  // Chart data
  appointmentStatusChartData: ChartData<'doughnut', number[], string> = {
    labels: ['Confirmés', 'En attente', 'Terminés', 'Annulés'],
    datasets: [
      {
        data: [0, 0, 0, 0],
        backgroundColor: ['#4CAF50', '#FFC107', '#2196F3', '#F44336'],
        borderWidth: 3,
        borderColor: '#ffffff',
        hoverOffset: 8
      }
    ]
  };

  weeklyAppointmentsChartData: ChartData<'line', number[], string> = {
    labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
    datasets: [
      {
        label: 'Rendez-vous par jour',
        data: [0, 0, 0, 0, 0, 0],
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#667eea',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2
      }
    ]
  };

  private refreshInterval: any;

  constructor(
    private appointmentService: AppointmentService,
    private userService: UserService,
    private medicalRecordService: MedicalRecordService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // S'abonner aux changements d'utilisateur
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user as Doctor;
      if (this.currentUser) {
        this.loadOverviewData();
        this.startAutoRefresh();
      }
    });
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      if (this.currentUser) {
        this.loadOverviewData();
      }
    }, 300000); // Refresh every 5 minutes
  }

  async loadOverviewData() {
    if (!this.currentUser) return;

    try {
      await Promise.all([
        this.loadAppointments(),
        this.loadPatients(),
        this.loadMedicalRecords()
      ]);

      this.calculateStatistics();
      this.filterData();
      this.updateCharts();
    } catch (error) {
      console.error('Erreur lors du chargement des données overview:', error);
    }
  }

  async loadAppointments() {
    if (!this.currentUser) return;
    
    this.appointments = await this.appointmentService.getAppointmentsByDoctor(
      this.currentUser.uid
    );
    
    // Convert dates if needed
    this.appointments = this.appointments.map(app => ({
      ...app,
      date: this.convertToDate(app.date),
      createdAt: this.convertToDate(app.createdAt)
    }));
  }

  async loadPatients() {
    this.patients = await this.userService.getUsersByRole('patient');
  }

  async loadMedicalRecords() {
    if (!this.currentUser) return;
    
    this.medicalRecords = await this.medicalRecordService.getMedicalRecordsByDoctor(
      this.currentUser.uid
    );
  }

  private convertToDate(date: any): Date {
    if (date instanceof Date) return date;
    if (date?.toDate) return date.toDate();
    if (typeof date === 'string') return new Date(date);
    return new Date();
  }

  private calculateStatistics() {
    const today = new Date().toDateString();
    
    this.stats = {
      todayAppointments: this.appointments.filter(app => 
        new Date(app.date).toDateString() === today && 
        (app.status === 'confirmed' || app.status === 'completed')
      ).length,
      
      pendingConfirmations: this.appointments.filter(app => 
        app.status === 'pending'
      ).length,
      
      totalPatients: this.patients.length,
      
      completedThisWeek: this.getCompletedThisWeek(),
      
      cancellationRate: this.calculateCancellationRate()
    };

    const completed = this.appointments.filter(app => app.status === 'completed').length;
    const cancelled = this.appointments.filter(app => app.status === 'cancelled').length;
    const totalHistory = completed + cancelled;

    this.historyStats = {
      completed,
      cancelled,
      completionRate: totalHistory > 0 ? Math.round((completed / totalHistory) * 100) : 0
    };
  }

  private getCompletedThisWeek(): number {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    return this.appointments.filter(
      app => app.status === 'completed' && new Date(app.date) >= startOfWeek
    ).length;
  }

  private calculateCancellationRate(): number {
    const total = this.appointments.length;
    const cancelled = this.appointments.filter(app => app.status === 'cancelled').length;
    return total > 0 ? Math.round((cancelled / total) * 100) : 0;
  }

  private filterData() {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Upcoming appointments (next 7 days)
    this.upcomingAppointments = this.appointments
      .filter(app => 
        new Date(app.date) > new Date() &&
        new Date(app.date) <= nextWeek &&
        (app.status === 'confirmed' || app.status === 'pending')
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);

    // Recent medical records
    this.recentMedicalRecords = this.medicalRecords
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    // Urgent cases (pending appointments within 24 hours)
    this.urgentCases = this.appointments
      .filter(app => this.isUrgentAppointment(app))
      .slice(0, 3);
  }

  private updateCharts() {
    // Update appointment status chart
    const confirmed = this.appointments.filter(app => app.status === 'confirmed').length;
    const pending = this.appointments.filter(app => app.status === 'pending').length;
    const completed = this.appointments.filter(app => app.status === 'completed').length;
    const cancelled = this.appointments.filter(app => app.status === 'cancelled').length;

    this.appointmentStatusChartData = {
      ...this.appointmentStatusChartData,
      datasets: [
        {
          ...this.appointmentStatusChartData.datasets[0],
          data: [confirmed, pending, completed, cancelled]
        }
      ]
    };

    // Update weekly appointments chart
    const weekData = this.getWeeklyAppointmentsData();
    this.weeklyAppointmentsChartData = {
      ...this.weeklyAppointmentsChartData,
      datasets: [
        {
          ...this.weeklyAppointmentsChartData.datasets[0],
          data: weekData
        }
      ]
    };
  }

  private getWeeklyAppointmentsData(): number[] {
    const days = [0, 0, 0, 0, 0, 0]; // Monday to Saturday
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Start from Monday

    this.appointments.forEach(app => {
      const appDate = new Date(app.date);
      if (appDate >= startOfWeek && appDate <= today) {
        const dayIndex = appDate.getDay() - 1; // Monday = 0, Saturday = 5
        if (dayIndex >= 0 && dayIndex < 6) {
          days[dayIndex]++;
        }
      }
    });

    return days;
  }

  // Public methods for template
  getPatientName(patientId: string): string {
    const patient = this.patients.find(p => p.uid === patientId);
    return patient?.displayName || 'Patient inconnu';
  }

  isUrgentAppointment(appointment: Appointment): boolean {
    const now = new Date();
    const appointmentDate = new Date(appointment.date);
    const diffTime = appointmentDate.getTime() - now.getTime();
    const diffHours = diffTime / (1000 * 60 * 60);
    return diffHours <= 24 && appointment.status === 'pending';
  }

  formatAppointmentDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getAppointmentStatusBadge(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending: 'warning',
      confirmed: 'success',
      completed: 'info',
      cancelled: 'error'
    };
    return statusMap[status] || 'default';
  }

  // Refresh method
  async refreshData() {
    await this.loadOverviewData();
  }
}