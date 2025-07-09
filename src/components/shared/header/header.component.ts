import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { User, Notification } from '../../../models/user.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="header">
      <div class="header-content">
        <div class="logo">
          <h1>MediCare</h1>
        </div>
        
        <nav class="nav">
          <ul class="nav-list">
            <li *ngIf="currentUser?.role === 'admin'">
              <a [routerLink]="['/admin']" class="nav-link">Tableau de bord</a>
            </li>
            <li *ngIf="currentUser?.role === 'medecin'">
              <a [routerLink]="['/doctor']" class="nav-link">Mes rendez-vous</a>
            </li>
            <li *ngIf="currentUser?.role === 'patient'">
              <a [routerLink]="['/patient']" class="nav-link">Mon dossier</a>
            </li>
          </ul>
        </nav>

        <div class="user-section">
          <div class="notifications" *ngIf="currentUser">
            <button class="notification-btn" (click)="toggleNotifications()">
              <span class="notification-icon">🔔</span>
              <span class="notification-count" *ngIf="unreadCount > 0">{{ unreadCount }}</span>
            </button>
            
            <div class="notification-dropdown" *ngIf="showNotifications">
              <div class="notification-header">
                <h3>Notifications</h3>
                <button (click)="markAllAsRead()">Tout marquer comme lu</button>
              </div>
              <div class="notification-list">
                <div 
                  *ngFor="let notification of notifications" 
                  class="notification-item"
                  [class.unread]="!notification.read"
                  (click)="markAsRead(notification.id)"
                >
                  <h4>{{ notification.title }}</h4>
                  <p>{{ notification.message }}</p>
                  <small>{{ notification.createdAt | date:'short':'fr' }}</small>
                </div>
                <div *ngIf="notifications.length === 0" class="no-notifications">
                  Aucune notification
                </div>
              </div>
            </div>
          </div>

          <div class="user-info" *ngIf="currentUser">
            <span class="user-name">{{ currentUser.displayName }}</span>
            <span class="user-role">{{ getRoleDisplay(currentUser.role) }}</span>
          </div>
          
          <button class="logout-btn" (click)="logout()">
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .header {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: white;
      padding: 1rem 0;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo h1 {
      margin: 0;
      font-size: 1.8rem;
      font-weight: 700;
    }

    .nav-list {
      display: flex;
      list-style: none;
      margin: 0;
      padding: 0;
      gap: 2rem;
    }

    .nav-link {
      color: white;
      text-decoration: none;
      font-weight: 500;
      transition: opacity 0.2s;
    }

    .nav-link:hover {
      opacity: 0.8;
    }

    .user-section {
      display: flex;
      align-items: center;
      gap: 1rem;
      position: relative;
    }

    .notifications {
      position: relative;
    }

    .notification-btn {
      background: rgba(255,255,255,0.1);
      border: none;
      color: white;
      padding: 0.5rem;
      border-radius: 0.5rem;
      cursor: pointer;
      position: relative;
      transition: background 0.2s;
    }

    .notification-btn:hover {
      background: rgba(255,255,255,0.2);
    }

    .notification-count {
      position: absolute;
      top: -0.5rem;
      right: -0.5rem;
      background: #ef4444;
      color: white;
      border-radius: 50%;
      width: 1.5rem;
      height: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: bold;
    }

    .notification-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      background: white;
      color: black;
      border-radius: 0.5rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      width: 350px;
      max-height: 400px;
      overflow-y: auto;
      z-index: 1000;
      margin-top: 0.5rem;
    }

    .notification-header {
      padding: 1rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .notification-header h3 {
      margin: 0;
      font-size: 1.1rem;
    }

    .notification-header button {
      background: none;
      border: none;
      color: #2563eb;
      cursor: pointer;
      font-size: 0.9rem;
    }

    .notification-list {
      max-height: 300px;
      overflow-y: auto;
    }

    .notification-item {
      padding: 1rem;
      border-bottom: 1px solid #f3f4f6;
      cursor: pointer;
      transition: background 0.2s;
    }

    .notification-item:hover {
      background: #f9fafb;
    }

    .notification-item.unread {
      background: #eff6ff;
      border-left: 4px solid #2563eb;
    }

    .notification-item h4 {
      margin: 0 0 0.5rem 0;
      font-size: 0.95rem;
      font-weight: 600;
    }

    .notification-item p {
      margin: 0 0 0.5rem 0;
      font-size: 0.9rem;
      color: #6b7280;
    }

    .notification-item small {
      color: #9ca3af;
      font-size: 0.8rem;
    }

    .no-notifications {
      padding: 2rem;
      text-align: center;
      color: #6b7280;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      text-align: right;
    }

    .user-name {
      font-weight: 600;
      font-size: 0.95rem;
    }

    .user-role {
      font-size: 0.8rem;
      opacity: 0.8;
    }

    .logout-btn {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.3);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.9rem;
    }

    .logout-btn:hover {
      background: rgba(255,255,255,0.2);
      transform: translateY(-1px);
    }

    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        gap: 1rem;
      }
      
      .nav-list {
        gap: 1rem;
      }
      
      .notification-dropdown {
        width: 300px;
      }
    }
  `]
})
export class HeaderComponent implements OnInit {
  currentUser: User | null = null;
  notifications: Notification[] = [];
  unreadCount = 0;
  showNotifications = false;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadNotifications();
      }
    });
  }

  async loadNotifications() {
    if (!this.currentUser) return;
    
    try {
      this.notifications = await this.notificationService.getNotificationsByUser(this.currentUser.uid);
      this.unreadCount = this.notifications.filter(n => !n.read).length;
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    }
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
  }

  async markAsRead(notificationId: string) {
    try {
      await this.notificationService.markAsRead(notificationId);
      await this.loadNotifications();
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  }

  async markAllAsRead() {
    try {
      const unreadNotifications = this.notifications.filter(n => !n.read);
      for (const notification of unreadNotifications) {
        await this.notificationService.markAsRead(notification.id);
      }
      await this.loadNotifications();
    } catch (error) {
      console.error('Erreur lors du marquage global:', error);
    }
  }

  getRoleDisplay(role: string): string {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'medecin': return 'Médecin';
      case 'patient': return 'Patient';
      default: return role;
    }
  }

  async logout() {
    try {
      await this.authService.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  }
}