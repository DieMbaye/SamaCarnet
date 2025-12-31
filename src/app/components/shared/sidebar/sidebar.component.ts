import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  SimpleChanges,
  OnChanges,
  HostListener,
  OnDestroy
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { AuthService } from "../../../services/auth.service";
import { User } from "../../../models/user.model";
import { RoleService } from "../../../services/role.service";
import { NotificationService } from "../../../services/notification.service";
import { Subject, takeUntil } from "rxjs";

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  roles: string[];
  badge?: number;
  badgeColor?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

@Component({
  selector: "app-sidebar",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./sidebar.component.html",
  styleUrls: ["./sidebar.component.css"],
})
export class SidebarComponent implements OnInit, OnChanges, OnDestroy {
  @Input() isSidebarCollapsed = false;
  @Input() isMobileOpen = false;
  @Input() activeSection = "dashboard";
  @Input() currentUser: User | null = null;
  @Input() showNotificationsPanel = false;

  @Output() sectionChange = new EventEmitter<string>();
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() toggleMobileSidebar = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  // Propriétés pour le header
  notifications: Notification[] = [];
  unreadCount = 0;
  showNotifications = false;
  showProfileMenu = false;
  showQuickActions = false;
  authChecked = false;
  isLoading = true;

  userRole: string = "";
  menuItems: MenuItem[] = [];

  // Configuration fixe de l'application
  readonly appName = "MediCare ";
  readonly appLogo = "fas fa-heartbeat";

  // Quick actions items
  quickActions = [
    { icon: "📊", label: "Tableau de bord", route: "/admin", roles: ["admin"] },
    {
      icon: "👥",
      label: "Gestion utilisateurs",
      route: "/admin/users",
      roles: ["admin"],
    },
    {
      icon: "📅",
      label: "Mes rendez-vous",
      route: "/doctor/appointments",
      roles: ["doctor"],
    },
    {
      icon: "💊",
      label: "Ordonnances",
      route: "/doctor/prescriptions",
      roles: ["doctor"],
    },
    {
      icon: "🏥",
      label: "Mon dossier",
      route: "/patient/dossier",
      roles: ["patient"],
    },
    {
      icon: "💊",
      label: "Mes ordonnances",
      route: "/patient/prescriptions",
      roles: ["patient"],
    },
    {
      icon: "⚙️",
      label: "Paramètres",
      route: "/settings",
      roles: ["admin", "doctor", "patient"],
    },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private roleService: RoleService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    // Fermer les dropdowns si on clique en dehors
    if (!target.closest(".notifications") && this.showNotifications) {
      this.showNotifications = false;
    }

    if (!target.closest(".profile-menu") && this.showProfileMenu) {
      this.showProfileMenu = false;
    }

    if (!target.closest(".quick-actions") && this.showQuickActions) {
      this.showQuickActions = false;
    }
  }

  ngOnInit() {
    this.isLoading = true;
    this.setupAuthListener();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupAuthListener() {
    // Écouter l'état d'authentification
    this.authService.authChecked$
      .pipe(takeUntil(this.destroy$))
      .subscribe((checked) => {
        this.authChecked = checked;
        
        if (checked) {
          // Une fois que l'auth est vérifiée, on peut obtenir l'utilisateur
          this.authService.currentUser$
            .pipe(takeUntil(this.destroy$))
            .subscribe((user) => {
              // Mettre à jour l'utilisateur même si c'est null
              this.currentUser = user;
              this.updateUserRole();
              this.isLoading = false;
              
              if (user) {
                this.loadNotifications();
              }
            });
        }
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    // Si le parent passe un currentUser (depuis AdminDashboardComponent)
    if (changes["currentUser"] && changes["currentUser"].currentValue !== undefined) {
      this.currentUser = changes["currentUser"].currentValue;
      this.updateUserRole();
      this.isLoading = false;
      
      if (this.currentUser) {
        this.loadNotifications();
      }
    }
  }

  updateUserRole() {
    
    // Utilisation du RoleService pour normaliser le rôle
    if (this.currentUser) {
      const rawRole = this.currentUser.role || "patient";
      this.userRole = this.roleService.normalizeRole(rawRole);
    } else {
      this.userRole = "patient";
    }

    this.menuItems = this.getMenuItems();
  }

  async loadNotifications() {
    if (!this.currentUser) return;

    try {
      this.notifications =
        await this.notificationService.getNotificationsByUser(
          this.currentUser.uid
        );
      this.unreadCount = this.notifications.filter((n) => !n.read).length;
    } catch (error) {
      console.error("Erreur lors du chargement des notifications:", error);
    }
  }

  // Méthodes pour le header
  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    this.showProfileMenu = false;
    this.showQuickActions = false;
  }

  toggleProfileMenu() {
    this.showProfileMenu = !this.showProfileMenu;
    this.showNotifications = false;
    this.showQuickActions = false;
  }

  toggleQuickActions() {
    this.showQuickActions = !this.showQuickActions;
    this.showNotifications = false;
    this.showProfileMenu = false;
  }

  async markAsRead(notificationId: string) {
    try {
      await this.notificationService.markAsRead(notificationId);
      await this.loadNotifications();
    } catch (error) {
      console.error("Erreur lors du marquage comme lu:", error);
    }
  }

  async markAllAsRead() {
    try {
      const unreadNotifications = this.notifications.filter((n) => !n.read);
      for (const notification of unreadNotifications) {
        await this.notificationService.markAsRead(notification.id);
      }
      await this.loadNotifications();
    } catch (error) {
      console.error("Erreur lors du marquage global:", error);
    }
  }

  getRoleDisplay(role: string): string {
    return this.roleService.getRoleDisplayName(role);
  }

  getFilteredQuickActions() {
    if (!this.currentUser) return [];
    return this.quickActions.filter((action) =>
      action.roles.includes(this.userRole)
    );
  }

  onQuickActionClick(action: any) {
    this.router.navigate([action.route]);
    this.showQuickActions = false;
  }

  navigateToProfile() {
    this.router.navigate(["/profile"]);
    this.showProfileMenu = false;
  }

  navigateToSettings() {
    this.router.navigate(["/settings"]);
    this.showProfileMenu = false;
  }

  async onLogout() {
    try {
      this.authService.logout();
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  }

  // Méthodes pour la sidebar
  setActiveSection(section: string) {
    this.activeSection = section;
    this.sectionChange.emit(section);
  }

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  onToggleMobileSidebar() {
    this.toggleMobileSidebar.emit();
  }

  // Méthode pour déterminer si on montre le texte
  shouldShowText(): boolean {
    return !this.isSidebarCollapsed || this.isMobileOpen;
  }

  // Déterminer les menus selon le rôle
  getMenuItems(): MenuItem[] {
    const commonMenus: MenuItem[] = [
      {
        id: "dashboard",
        label: "Tableau de bord",
        icon: "fas fa-tachometer-alt",
        roles: ["admin", "doctor", "patient"],
      },
    ];

    const adminMenus: MenuItem[] = [
      {
        id: "users",
        label: "Gestion utilisateurs",
        icon: "fas fa-users",
        roles: ["admin"],
        badge: 0,
        badgeColor: "primary",
      },
      {
        id: "appointments",
        label: "Tous les rendez-vous",
        icon: "fas fa-calendar-alt",
        roles: ["admin"],
      },
      {
        id: "reports",
        label: "Rapports et Stats",
        icon: "fas fa-chart-bar",
        roles: ["admin"],
      },
      {
        id: "settings",
        label: "Paramètres système",
        icon: "fas fa-cogs",
        roles: ["admin"],
      },
    ];

    const doctorMenus: MenuItem[] = [
      {
        id: "appointments",
        label: "Mes rendez-vous",
        icon: "fas fa-calendar-check",
        roles: ["doctor"],
      },
      {
        id: "patients",
        label: "Mes patients",
        icon: "fas fa-user-injured",
        roles: ["doctor"],
      },
      {
        id: "schedule",
        label: "Mon planning",
        icon: "fas fa-calendar",
        roles: ["doctor"],
      },
    ];

    const patientMenus: MenuItem[] = [
      {
        id: "my-appointments",
        label: "Mes rendez-vous",
        icon: "fas fa-calendar-check",
        roles: ["patient"],
      },
      {
        id: "medical-records",
        label: "Dossiers médicaux",
        icon: "fas fa-file-medical",
        roles: ["patient"],
      },
      {
        id: "prescriptions",
        label: "Ordonnances",
        icon: "fas fa-prescription",
        roles: ["patient"],
      },
    ];

    const allItems = [
      ...commonMenus,
      ...adminMenus,
      ...doctorMenus,
      ...patientMenus,
    ];

    const filteredItems = allItems.filter((item) =>
      item.roles.includes(this.userRole)
    );

    return filteredItems;
  }

  getSidebarTitle(): string {
    return this.roleService.getRoleDisplayName(this.userRole);
  }

  // Ajoutez cette méthode pour obtenir le titre de la section
  getSectionTitle(sectionId: string): string {
    const sectionTitles: { [key: string]: string } = {
      dashboard: "Tableau de bord",
      users: "Gestion utilisateurs",
      appointments: "Rendez-vous",
      reports: "Rapports",
      settings: "Paramètres",
    };

    return sectionTitles[sectionId] || "Tableau de bord";
  }

  // Méthode pour obtenir les initiales de l'utilisateur
  getUserInitials(): string {
    if (!this.currentUser?.displayName) return "U";
    return this.currentUser.displayName
      .split(" ")
      .map((name) => name[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  }
}