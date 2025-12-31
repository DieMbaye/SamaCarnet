import { Component, OnInit, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ChartData, ChartOptions, ChartType } from "chart.js";
import { UserService } from "../../../services/user.service";
import { AuthService } from "../../../services/auth.service";
import { User } from "../../../models/user.model";
import { ChartsModule } from "../../../charts.module";

// Import des composants
import { UsersManagementComponent } from "../users/users-management.component";
import { AppointmentsManagementComponent } from "../appointments/appointments-management.component";
import { ReportsComponent } from "../reports/reports.component";
import { SidebarComponent } from "../../shared/sidebar/sidebar.component";

@Component({
  selector: "app-admin-dashboard",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChartsModule,
    UsersManagementComponent,
    AppointmentsManagementComponent,
    ReportsComponent,
    SidebarComponent, // Changé ici
  ],
  templateUrl: "./admin-dashboard.component.html",
  styleUrls: ["./admin-dashboard.component.css"],
})
export class AdminDashboardComponent implements OnInit {
getSectionTitle(arg0: string) {
throw new Error('Method not implemented.');
}
  statistics = {
    totalUsers: 0,
    totalDoctors: 0,
    totalPatients: 0,
    specialities: {} as { [key: string]: number },
  };

  Object = Object;
  Math = Math;

  recentAppointments: any[] = [];
  quickStats = {
    appointmentsToday: 0,
    activeAppointments: 0,
    growthRate: 0,
  };

  // Graphiques (garder le code existant)
  activityChartLabels: string[] = [];
  activityChartData: ChartData<"line", number[], string | string[]> = {
    labels: [],
    datasets: [
      {
        label: "Rendez-vous",
        data: [],
        borderColor: "#42A5F5",
        backgroundColor: "rgba(66, 165, 245, 0.1)",
        tension: 0.4,
      },
    ],
  };
  activityChartType: ChartType = "line";
  activityChartOptions: ChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  roleChartLabels: string[] = ["Administrateurs", "Médecins", "Patients"];
  roleChartData: ChartData<"pie", number[], string | string[]> = {
    labels: this.roleChartLabels,
    datasets: [
      {
        data: [0, 0, 0],
        backgroundColor: ["#36A2EB", "#FF6384", "#FFCE56"],
      },
    ],
  };
  roleChartType: ChartType = "pie";

  specialityChartLabels: string[] = [];
  specialityChartData: ChartData<"bar", number[], string | string[]> = {
    labels: [],
    datasets: [
      {
        label: "Médecins par spécialité",
        data: [],
        backgroundColor: "#42A5F5",
      },
    ],
  };
  specialityChartType: ChartType = "bar";

  chartOptions: ChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
    },
  };

  activeSection: string = "dashboard";
  isSidebarCollapsed = false;
  isMobileOpen = false;
  
  // Propriété pour l'utilisateur courant
  currentUser: User | null = null;

  constructor(
    private userService: UserService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    await this.loadDashboardData();
    this.setupAuthListener();
  }

  setupAuthListener() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  // Gestion de la sidebar
  onToggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
  onToggleMobileSidebar() {
    this.isMobileOpen = !this.isMobileOpen;
  }
  onSectionChange(section: string) {
    this.activeSection = section;
    if (window.innerWidth <= 768) {
      this.isMobileOpen = false;
    }
  }

  onLogout() {
    this.authService.logout();
  }

  @HostListener("window:resize", ["$event"])
  onResize(event: any) {
    if (event.target.innerWidth > 768) {
      this.isMobileOpen = false;
    }
  }

  // Garder les autres méthodes existantes...
  async loadDashboardData() {
    try {
      this.statistics = await this.userService.getStatistics();
      await this.loadAdvancedStats();
      this.updateCharts();
    } catch (error) {
      console.error("Erreur lors du chargement du dashboard:", error);
      this.loadFallbackData();
    }
  }

  async loadAdvancedStats() {
    try {
      this.quickStats.appointmentsToday =
        (await this.userService.getAppointmentsToday?.()) || 12;
      this.quickStats.activeAppointments =
        (await this.userService.getActiveAppointments?.()) || 45;
      this.quickStats.growthRate =
        (await this.userService.getGrowthRate?.()) || 15;
      this.recentAppointments =
        (await this.userService.getRecentAppointments?.(5)) ||
        this.generateSampleAppointments();
      await this.loadActivityChartData();
    } catch (error) {
      console.error("Erreur lors du chargement des stats avancées:", error);
      this.loadFallbackAdvancedStats();
    }
  }

  async loadActivityChartData() {
    try {
      const activityData =
        (await this.userService.getAppointmentActivity?.(7)) ||
        this.generateSampleActivityData(); // 7 derniers jours

      this.activityChartLabels = activityData.map((item: any) =>
        new Date(item.date).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
        })
      );

      this.activityChartData = {
        labels: this.activityChartLabels,
        datasets: [
          {
            label: "Rendez-vous",
            data: activityData.map((item: any) => item.count),
            borderColor: "#42A5F5",
            backgroundColor: "rgba(66, 165, 245, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      };
    } catch (error) {
      console.error("Erreur lors du chargement des données d'activité:", error);
      this.loadFallbackActivityData();
    }
  }

  // Méthodes de fallback pour les données de démonstration
  loadFallbackData() {
    this.statistics = {
      totalUsers: 156,
      totalDoctors: 24,
      totalPatients: 128,
      specialities: {
        Cardiologie: 5,
        Dermatologie: 3,
        Pédiatrie: 4,
        Neurologie: 2,
        Orthopédie: 3,
        "Médecine générale": 7,
      },
    };

    this.loadFallbackAdvancedStats();
    this.updateCharts();
  }

  loadFallbackAdvancedStats() {
    this.quickStats = {
      appointmentsToday: 12,
      activeAppointments: 45,
      growthRate: 15,
    };

    this.recentAppointments = this.generateSampleAppointments();
    this.loadFallbackActivityData();
  }

  loadFallbackActivityData() {
    this.activityChartLabels = this.generateLast7Days();
    this.activityChartData = {
      labels: this.activityChartLabels,
      datasets: [
        {
          label: "Rendez-vous",
          data: this.generateRandomData(7, 8, 25),
          borderColor: "#42A5F5",
          backgroundColor: "rgba(66, 165, 245, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }

  generateSampleAppointments() {
    return [
      {
        patientName: "Marie Dupont",
        doctorName: "Martin",
        date: new Date(),
        time: "09:00",
        status: "confirmed",
      },
      {
        patientName: "Jean Leroy",
        doctorName: "Bernard",
        date: new Date(Date.now() + 86400000),
        time: "10:30",
        status: "pending",
      },
      {
        patientName: "Sophie Moreau",
        doctorName: "Dubois",
        date: new Date(Date.now() + 172800000),
        time: "14:15",
        status: "confirmed",
      },
      {
        patientName: "Pierre Lambert",
        doctorName: "Petit",
        date: new Date(Date.now() + 259200000),
        time: "11:00",
        status: "pending",
      },
      {
        patientName: "Alice Rousseau",
        doctorName: "Garcia",
        date: new Date(Date.now() + 345600000),
        time: "16:45",
        status: "confirmed",
      },
    ];
  }

  generateSampleActivityData() {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString(),
        count: Math.floor(Math.random() * (25 - 8 + 1)) + 8,
      });
    }
    return data;
  }

  generateLast7Days(): string[] {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(
        date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
      );
    }
    return days;
  }

  generateRandomData(count: number, min: number, max: number): number[] {
    return Array.from(
      { length: count },
      () => Math.floor(Math.random() * (max - min + 1)) + min
    );
  }

  // Mise à jour des graphiques avec les statistiques
  updateCharts() {
    // Calcul basé sur les statistics
    const adminCount = Math.max(
      1,
      this.statistics.totalUsers -
        this.statistics.totalDoctors -
        this.statistics.totalPatients
    );
    const doctorCount = this.statistics.totalDoctors;
    const patientCount = this.statistics.totalPatients;

    this.roleChartData = {
      labels: this.roleChartLabels,
      datasets: [
        {
          data: [adminCount, doctorCount, patientCount],
          backgroundColor: ["#36A2EB", "#FF6384", "#FFCE56"],
          hoverBackgroundColor: ["#2B8CD5", "#E04E6D", "#E6B84E"],
        },
      ],
    };

    this.specialityChartLabels = Object.keys(this.statistics.specialities);
    const specialityCounts = Object.values(this.statistics.specialities);

    this.specialityChartData = {
      labels: this.specialityChartLabels,
      datasets: [
        {
          label: "Médecins par spécialité",
          data: specialityCounts,
          backgroundColor: "#42A5F5",
          borderColor: "#1E88E5",
          borderWidth: 1,
        },
      ],
    };
  }

  // Navigation entre sections
  setActiveSection(section: string) {
    this.activeSection = section;
    // Fermer le sidebar mobile après sélection
    if (window.innerWidth <= 768) {
      this.isMobileOpen = false;
    }
  }

  viewAllAppointments() {
    this.setActiveSection("appointments");
  }

  exportData() {
    // Implémentez ici la logique d'export
    const data = {
      statistics: this.statistics,
      quickStats: this.quickStats,
      recentAppointments: this.recentAppointments,
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(dataBlob);
    link.download = `dashboard-export-${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.click();

    URL.revokeObjectURL(link.href);
  }

  getStatusDisplay(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending: "En attente",
      confirmed: "Confirmé",
      completed: "Terminé",
      cancelled: "Annulé",
    };
    return statusMap[status] || status;
  }

  getFormattedDate(date: any): string {
    if (!date) return "N/A";

    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return dateObj.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (error) {
      return "Date invalide";
    }
  }

  // Méthode utilitaire pour formater les nombres
  formatNumber(num: number): string {
    return num.toLocaleString("fr-FR");
  }

  // Méthode pour calculer le pourcentage de croissance
  getGrowthPercentage(): string {
    return this.quickStats.growthRate > 0
      ? `+${this.quickStats.growthRate}%`
      : `${this.quickStats.growthRate}%`;
  }
}
