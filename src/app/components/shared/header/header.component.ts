import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../../services/notification.service';
import { User, Notification } from '../../../models/user.model';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit {
  currentUser: User | null = null;
  notifications: Notification[] = [];
  unreadCount = 0;
  showNotifications = false;

  authChecked = false; // Ajout du flag

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.authChecked$.subscribe(checked => {
      this.authChecked = checked;
    });

    this.authService.currentUser$.subscribe(user => {
      if (this.authChecked) { // On agit seulement si auth check terminé
        this.currentUser = user;
        if (user) {
          this.loadNotifications();
        } else {
          this.notifications = [];
          this.unreadCount = 0;
        }
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
