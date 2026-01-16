import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/user.model';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    SidebarComponent,
  ],
  templateUrl: './patient-dashboard.component.html',
  styleUrls: ['./patient-dashboard.component.css']
})
export class PatientDashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  
  // Navigation state
  isSidebarCollapsed = false;
  isMobileOpen = false;
  activeSection = 'dashboard';

  private routeSubscription: any;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // S'abonner aux changements d'utilisateur
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });

    // S'abonner aux changements de route
    this.routeSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateActiveSection();
    });

    // Initialiser la section active
    this.updateActiveSection();
  }

  ngOnDestroy() {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  // Mettre à jour la section active en fonction de l'URL
  updateActiveSection() {
    const url = this.router.url;
    
    if (url.includes('/patient/dashboard') || url === '/patient' || url === '/patient/') {
      this.activeSection = 'dashboard';
    } else if (url.includes('/patient/appointments')) {
      this.activeSection = 'my-appointments';
    } else if (url.includes('/patient/medical-records')) {
      this.activeSection = 'medical-records';
    } else if (url.includes('/patient/prescriptions')) {
      this.activeSection = 'prescriptions';
    } else if (url.includes('/patient/find-doctor')) {
      this.activeSection = 'find-doctor';
    } else if (url.includes('/patient/chat')) {
      this.activeSection = 'chat';
    } else if (url.includes('/patient/health-tracker')) {
      this.activeSection = 'health-tracker';
    } else if (url.includes('/patient/emergency')) {
      this.activeSection = 'emergency';
    } else if (url.includes('/patient/consultation/')) {
      this.activeSection = 'chat'; // Consultation fait partie de la messagerie
    } else {
      this.activeSection = 'dashboard';
    }
  }

  // Méthode appelée par le sidebar
  getActiveSection(): string {
    return this.activeSection;
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
      'dashboard': ['/patient', 'dashboard'],
      'my-appointments': ['/patient', 'appointments'],
      'medical-records': ['/patient', 'medical-records'],
      'prescriptions': ['/patient', 'prescriptions'],
      'find-doctor': ['/patient', 'find-doctor'],
      'chat': ['/patient', 'chat'],
      'health-tracker': ['/patient', 'health-tracker'],
      'emergency': ['/patient', 'emergency']
    };

    const route = routeMap[section] || ['/patient', 'dashboard'];
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
}