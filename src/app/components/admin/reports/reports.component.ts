import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ChartData, ChartOptions, ChartType } from "chart.js";
import { UserService } from "../../../services/user.service";
import { AppointmentService } from "../../../services/appointment.service";
import { NgChartsModule } from 'ng2-charts';


@Component({
  selector: "app-reports",
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule],
  templateUrl: "./reports.component.html",
  styleUrls: ["./reports.component.css"],
})
export class ReportsComponent implements OnInit {
  // Filtres de période
  dateRange = {
    start: this.getFirstDayOfMonth(),
    end: new Date().toISOString().split("T")[0],
  };

  reportType: string = "appointments";
  isLoading: boolean = false;

  // Données des rapports
  reportData: any = {};

  // Graphiques
  appointmentsChartData: ChartData<"line"> = {
    labels: [],
    datasets: [
      {
        label: "Rendez-vous",
        data: [],
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  appointmentsChartOptions: ChartOptions<"line"> = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Évolution des rendez-vous",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  statusChartData: ChartData<"doughnut"> = {
    labels: ["En attente", "Confirmés", "Terminés", "Annulés"],
    datasets: [
      {
        data: [0, 0, 0, 0],
        backgroundColor: ["#f59e0b", "#10b981", "#3b82f6", "#ef4444"],
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  };

  doctorsChartData: ChartData<"bar"> = {
    labels: [],
    datasets: [
      {
        label: "Rendez-vous par médecin",
        data: [],
        backgroundColor: "#8b5cf6",
        borderColor: "#7c3aed",
        borderWidth: 1,
      },
    ],
  };

  specialitiesChartData: ChartData<"pie"> = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [
          "#ef4444",
          "#f59e0b",
          "#10b981",
          "#3b82f6",
          "#8b5cf6",
          "#ec4899",
          "#06b6d4",
          "#84cc16",
        ],
      },
    ],
  };
Object: any;

  constructor(
    private userService: UserService,
    private appointmentService: AppointmentService
  ) {}

  async ngOnInit() {
    await this.generateReports();
  }

  private getFirstDayOfMonth(): string {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split("T")[0];
  }

  async generateReports() {
    this.isLoading = true;
    try {
      // Charger les données nécessaires
      const [users, appointments] = await Promise.all([
        this.userService.getAllUsers(),
        this.loadAppointmentsInRange(),
      ]);

      // Générer les rapports
      this.generateAppointmentsReport(appointments, users);
      this.generateUsersReport(users);
      this.generateFinancialReport(appointments);
      this.generateChartsData(appointments, users);
    } catch (error) {
      console.error("Erreur lors de la génération des rapports:", error);
      alert("Erreur lors de la génération des rapports");
    } finally {
      this.isLoading = false;
    }
  }

  async loadAppointmentsInRange(): Promise<any[]> {
    // Simulation - à adapter avec votre service
    // Pour l'instant, retourne des données simulées
    return this.generateMockAppointmentsData();
  }

  generateAppointmentsReport(appointments: any[], users: any[]) {
    const doctors = users.filter((u) => u.role === "medecin");
    const patients = users.filter((u) => u.role === "patient");

    const appointmentsByStatus = appointments.reduce((acc, apt) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1;
      return acc;
    }, {});

    const appointmentsByDoctor = appointments.reduce((acc, apt) => {
      acc[apt.doctorId] = (acc[apt.doctorId] || 0) + 1;
      return acc;
    }, {});

    this.reportData.appointments = {
      total: appointments.length,
      byStatus: appointmentsByStatus,
      byDoctor: appointmentsByDoctor,
      averagePerDay: this.calculateAveragePerDay(appointments),
      peakDay: this.findPeakDay(appointments),
      cancellationRate: this.calculateCancellationRate(appointments),
    };
  }

  generateUsersReport(users: any[]) {
    const doctors = users.filter((u) => u.role === "medecin");
    const patients = users.filter((u) => u.role === "patient");
    const admins = users.filter((u) => u.role === "admin");

    const doctorsBySpeciality = doctors.reduce((acc, doctor) => {
      const spec = doctor.speciality || "Non spécifié";
      acc[spec] = (acc[spec] || 0) + 1;
      return acc;
    }, {});

    this.reportData.users = {
      total: users.length,
      doctors: doctors.length,
      patients: patients.length,
      admins: admins.length,
      doctorsBySpeciality: doctorsBySpeciality,
      growthRate: this.calculateGrowthRate(users),
    };
  }

  generateFinancialReport(appointments: any[]) {
    // Simulation de données financières
    const completedAppointments = appointments.filter(
      (apt) => apt.status === "completed"
    );
    const revenue = completedAppointments.length * 50; // 50€ par consultation

    this.reportData.financial = {
      totalRevenue: revenue,
      averageRevenuePerAppointment:
        completedAppointments.length > 0
          ? revenue / completedAppointments.length
          : 0,
      monthlyGrowth: 15.5, // %
      mostProfitableSpeciality: "Cardiologie",
    };
  }

  generateChartsData(appointments: any[], users: any[]) {
    // Graphique évolution des rendez-vous (30 derniers jours)
    const last30Days = this.getLast30Days();
    const appointmentsByDay = this.groupAppointmentsByDay(
      appointments,
      last30Days
    );

    this.appointmentsChartData = {
      ...this.appointmentsChartData,
      labels: last30Days.map((date) => this.formatChartDate(date)),
      datasets: [
        {
          ...this.appointmentsChartData.datasets[0],
          data: last30Days.map((date) => appointmentsByDay[date] || 0),
        },
      ],
    };

    // Graphique statut des rendez-vous
    const statusCounts = this.countAppointmentsByStatus(appointments);
    this.statusChartData = {
      ...this.statusChartData,
      datasets: [
        {
          ...this.statusChartData.datasets[0],
          data: [
            statusCounts.pending || 0,
            statusCounts.confirmed || 0,
            statusCounts.completed || 0,
            statusCounts.cancelled || 0,
          ],
        },
      ],
    };

    // Graphique médecins les plus actifs
    const doctors = users.filter((u) => u.role === "medecin");
    const topDoctors = this.getTopDoctors(appointments, doctors, 5);

    this.doctorsChartData = {
      labels: topDoctors.map((d) => d.doctorName),
      datasets: [
        {
          ...this.doctorsChartData.datasets[0],
          data: topDoctors.map((d) => d.appointmentCount),
        },
      ],
    };

    // Graphique répartition par spécialité
    const specialitiesData = this.getAppointmentsBySpeciality(
      appointments,
      doctors
    );
    this.specialitiesChartData = {
      labels: Object.keys(specialitiesData),
      datasets: [
        {
          ...this.specialitiesChartData.datasets[0],
          data: Object.values(specialitiesData),
        },
      ],
    };
  }

  // Méthodes utilitaires pour les calculs
  private calculateAveragePerDay(appointments: any[]): number {
    const days = new Set(
      appointments.map((apt) => new Date(apt.date).toDateString())
    );
    return appointments.length / Math.max(days.size, 1);
  }

  private findPeakDay(appointments: any[]): { date: string; count: number } {
    const dayCounts = appointments.reduce((acc, apt) => {
      const date = new Date(apt.date).toDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const peakDate = Object.keys(dayCounts).reduce((a, b) =>
      dayCounts[a] > dayCounts[b] ? a : b
    );

    return {
      date: peakDate,
      count: dayCounts[peakDate],
    };
  }

  private calculateCancellationRate(appointments: any[]): number {
    const cancelled = appointments.filter(
      (apt) => apt.status === "cancelled"
    ).length;
    return appointments.length > 0
      ? (cancelled / appointments.length) * 100
      : 0;
  }

  private calculateGrowthRate(users: any[]): number {
    // Simulation - en réalité, il faudrait comparer avec la période précédente
    return 12.5; // %
  }

  private getLast30Days(): string[] {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split("T")[0]);
    }
    return days;
  }

  private groupAppointmentsByDay(
    appointments: any[],
    dates: string[]
  ): { [key: string]: number } {
    return dates.reduce((acc, date) => {
      const count = appointments.filter(
        (apt) => new Date(apt.date).toISOString().split("T")[0] === date
      ).length;
      acc[date] = count;
      return acc;
    }, {} as { [key: string]: number });
  }

  private formatChartDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    });
  }

  private countAppointmentsByStatus(appointments: any[]): any {
    return appointments.reduce((acc, apt) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1;
      return acc;
    }, {});
  }

  private getTopDoctors(
    appointments: any[],
    doctors: any[],
    limit: number
  ): any[] {
    const doctorCounts = appointments.reduce((acc, apt) => {
      acc[apt.doctorId] = (acc[apt.doctorId] || 0) + 1;
      return acc;
    }, {});

    return doctors
      .map((doctor) => ({
        doctorName: doctor.displayName,
        appointmentCount: doctorCounts[doctor.uid] || 0,
      }))
      .sort((a, b) => b.appointmentCount - a.appointmentCount)
      .slice(0, limit);
  }

  private getAppointmentsBySpeciality(
    appointments: any[],
    doctors: any[]
  ): { [key: string]: number } {
    const specialityCounts: { [key: string]: number } = {};

    appointments.forEach((apt) => {
      const doctor = doctors.find((d) => d.uid === apt.doctorId);

      if (doctor?.speciality) {
        specialityCounts[doctor.speciality] =
          (specialityCounts[doctor.speciality] || 0) + 1;
      }
    });

    return specialityCounts;
  }

  // Méthodes pour l'interface utilisateur
  async onDateRangeChange() {
    await this.generateReports();
  }

  onReportTypeChange() {
    // Re-générer les rapports si nécessaire
    this.generateReports();
  }

  exportReport(format: "pdf" | "excel" | "csv") {
    // Implémentez l'export ici
    alert(`Export ${format} en cours de développement`);
  }

  printReport() {
    window.print();
  }

  // Méthode pour générer des données simulées (à supprimer en production)
  private generateMockAppointmentsData(): any[] {
    const appointments = [];
    const statuses = ["pending", "confirmed", "completed", "cancelled"];
    const reasons = [
      "Consultation générale",
      "Suivi médical",
      "Urgence",
      "Vaccination",
      "Bilan de santé",
    ];

    for (let i = 0; i < 150; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));

      appointments.push({
        id: `apt${i}`,
        patientId: `patient${Math.floor(Math.random() * 50)}`,
        doctorId: `doctor${Math.floor(Math.random() * 10)}`,
        date: date.toISOString().split("T")[0],
        time: `${10 + Math.floor(Math.random() * 8)}:${
          Math.random() > 0.5 ? "00" : "30"
        }`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        reason: reasons[Math.floor(Math.random() * reasons.length)],
        createdAt: new Date(
          date.getTime() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)
        ),
      });
    }

    return appointments;
  }

  // Getters pour les templates
  get appointmentStats() {
    return this.reportData.appointments || {};
  }

  get userStats() {
    return this.reportData.users || {};
  }

  get financialStats() {
    return this.reportData.financial || {};
  }
}
