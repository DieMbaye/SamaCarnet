import { Component, OnInit, HostListener, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router, ActivatedRoute, NavigationEnd } from "@angular/router";
import { filter } from "rxjs/operators";
import { Doctor } from "../../../models/user.model";
import { AuthService } from "../../../services/auth.service";
import { AppointmentService } from "../../../services/appointment.service";
import { UserService } from "../../../services/user.service";

// Import des composants
import { SidebarComponent } from "../../shared/sidebar/sidebar.component";

interface HeaderConfig {
  title: string;
  subtitle?: string;
  showProfile?: boolean;
  showStats?: boolean;
  actions?: {
    label: string;
    icon: string;
    action: () => void;
    primary?: boolean;
    disabled?: boolean;
  }[];
}

@Component({
  selector: "app-doctor-dashboard",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SidebarComponent,
  ],
  templateUrl: "./doctor-dashboard.component.html",
  styleUrls: ["./doctor-dashboard.component.css"],
})
export class DoctorDashboardComponent implements OnInit, OnDestroy {
  currentUser: Doctor | null = null;

  // Navigation state
  isSidebarCollapsed = false;
  isMobileOpen = false;
  activeSection = 'dashboard';

  // Statistics for header
  doctorStats = {
    totalPatients: 0,
    todayAppointments: 0,
    rating: 0,
    experience: 0,
  };

  // Header configuration based on active section
  headerConfig: HeaderConfig = {
    title: 'Tableau de bord',
    showProfile: true,
    showStats: true,
    actions: []
  };

  isLoading = false;

  private refreshInterval: any;
  private routeSubscription: any;

  constructor(
    private authService: AuthService,
    private appointmentService: AppointmentService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    // S'abonner aux changements d'utilisateur
    this.authService.currentUser$.subscribe(async (user) => {
      this.currentUser = user as Doctor;
      if (user) {
        await this.loadDoctorStats();
        this.startAutoRefresh();
      }
    });

    // S'abonner aux changements de route
    this.routeSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateActiveSection();
      this.updateHeaderConfig();
    });

    // Initialiser la section active
    this.updateActiveSection();
    this.updateHeaderConfig();
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  // Mettre à jour la section active en fonction de l'URL
  updateActiveSection() {
    const url = this.router.url;
    
    if (url.includes('/doctor/dashboard') || url === '/doctor' || url === '/doctor/') {
      this.activeSection = 'dashboard';
    } else if (url.includes('/doctor/appointments')) {
      this.activeSection = 'appointments';
    } else if (url.includes('/doctor/patients')) {
      this.activeSection = 'patients';
    } else if (url.includes('/doctor/my-schedule')) {
      this.activeSection = 'schedule';
    } else {
      this.activeSection = 'dashboard';
    }
  }

  // Mettre à jour la configuration du header selon la section
  updateHeaderConfig() {
    switch (this.activeSection) {
      case 'dashboard':
        this.headerConfig = {
          title: 'Tableau de bord',
          subtitle: `Dr. ${this.currentUser?.displayName}`,
          showProfile: true,
          showStats: true,
          actions: [
            {
              label: 'Nouveau RDV',
              icon: 'fas fa-plus',
              action: () => this.createNewAppointment(),
              primary: true,
              disabled: this.isLoading
            },
            {
              label: this.isLoading ? 'Actualisation...' : 'Actualiser',
              icon: 'fas fa-sync-alt',
              action: () => this.refreshData(),
              disabled: this.isLoading
            }
          ]
        };
        break;

      case 'appointments':
        this.headerConfig = {
          title: 'Gestion des Rendez-vous',
          subtitle: 'Planifiez et gérez vos consultations',
          showProfile: false,
          showStats: false,
          actions: [
            {
              label: 'Nouveau RDV',
              icon: 'fas fa-calendar-plus',
              action: () => this.createNewAppointment(),
              primary: true,
              disabled: this.isLoading
            },
            {
              label: this.isLoading ? 'Actualisation...' : 'Actualiser',
              icon: 'fas fa-sync-alt',
              action: () => this.refreshData(),
              disabled: this.isLoading
            }
          ]
        };
        break;

      case 'patients':
        this.headerConfig = {
          title: 'Mes Patients',
          subtitle: 'Gérez vos dossiers patients',
          showProfile: false,
          showStats: false,
          actions: [
            {
              label: 'Nouveau Patient',
              icon: 'fas fa-user-plus',
              action: () => this.addNewPatient(),
              primary: true,
              disabled: this.isLoading
            },
            {
              label: this.isLoading ? 'Actualisation...' : 'Actualiser',
              icon: 'fas fa-sync-alt',
              action: () => this.refreshData(),
              disabled: this.isLoading
            }
          ]
        };
        break;

      case 'schedule':
        this.headerConfig = {
          title: 'Mon Planning',
          subtitle: 'Organisez votre emploi du temps',
          showProfile: false,
          showStats: false,
          actions: [
            {
              label: 'Nouvelle Disponibilité',
              icon: 'fas fa-clock',
              action: () => this.addAvailability(),
              primary: true,
              disabled: this.isLoading
            },
            {
              label: this.isLoading ? 'Actualisation...' : 'Actualiser',
              icon: 'fas fa-sync-alt',
              action: () => this.refreshData(),
              disabled: this.isLoading
            }
          ]
        };
        break;

      default:
        this.headerConfig = {
          title: 'Tableau de bord',
          subtitle: `Dr. ${this.currentUser?.displayName}`,
          showProfile: true,
          showStats: true,
          actions: []
        };
    }
  }

  // Méthode appelée par le sidebar
  getActiveSection(): string {
    return this.activeSection;
  }

  private startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      this.loadDoctorStats();
    }, 300000); // Refresh every 5 minutes
  }

  // Sidebar methods
  onToggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  onToggleMobileSidebar() {
    this.isMobileOpen = !this.isMobileOpen;
  }

  // Navigation quand on clique sur un élément du sidebar
  onSectionChange(section: string) {
    const routeMap: Record<string, string[]> = {
      'dashboard': ['/doctor', 'dashboard'],
      'appointments': ['/doctor', 'appointments'],
      'patients': ['/doctor', 'patients'],
      'schedule': ['/doctor', 'my-schedule']
    };

    const route = routeMap[section] || ['/doctor', 'dashboard'];
    this.router.navigate(route);
    
    // Fermer le sidebar mobile après navigation
    if (window.innerWidth <= 768) {
      this.isMobileOpen = false;
    }
  }

  async onLogout() {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  }

  @HostListener("window:resize", ["$event"])
  onResize(event: any) {
    if (event.target.innerWidth > 768) {
      this.isMobileOpen = false;
    }
  }

  // Charger les statistiques réelles du médecin
  async loadDoctorStats() {
    if (!this.currentUser) return;

    this.isLoading = true;
    try {
      const [patients, appointments] = await Promise.all([
        this.userService.getUsersByRole("patient"),
        this.appointmentService.getAppointmentsByDoctor(this.currentUser.uid),
      ]);

      const today = new Date().toDateString();
      const todayAppointments = appointments.filter((app) => {
        const appointmentDate = new Date(app.date).toDateString();
        return (
          appointmentDate === today &&
          (app.status === "confirmed" || app.status === "pending")
        );
      });

      this.doctorStats = {
        totalPatients: patients.length,
        todayAppointments: todayAppointments.length,
        rating: this.currentUser["rating"] || 4.8,
        experience: this.calculateExperience(
          this.currentUser.experienceYears || this.currentUser.createdAt
        ),
      };
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques:", error);
    } finally {
      this.isLoading = false;
      this.updateHeaderConfig(); // Mettre à jour le header après chargement
    }
  }

  private calculateExperience(experienceData: any): number {
    if (typeof experienceData === "number") {
      return experienceData;
    }

    if (experienceData instanceof Date) {
      const startDate = new Date(experienceData);
      const today = new Date();
      return today.getFullYear() - startDate.getFullYear();
    }

    // Par défaut, retourner 0 si on ne peut pas calculer
    return 0;
  }

  // Actions du header
  async createNewAppointment() {
    // Implémentez la logique pour créer un nouveau rendez-vous
    console.log('Créer un nouveau rendez-vous');
  }

  async refreshData() {
    await this.loadDoctorStats();
  }

  addNewPatient() {
    // Implémentez la logique pour ajouter un nouveau patient
    console.log('Ajouter un nouveau patient');
  }

  addAvailability() {
    // Implémentez la logique pour ajouter une disponibilité
    console.log('Ajouter une disponibilité');
  }
}