import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AUTH_CONFIG } from '../config/auth.config';

@Injectable({
  providedIn: 'root'
})
export class AutoLogoutService {
  private timeoutId: any;
  private readonly events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];

  constructor(
    private authService: AuthService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  startTimer() {
    this.resetTimer();
    
    // Écouter les événements utilisateur
    this.events.forEach(event => {
      window.addEventListener(event, this.resetTimer.bind(this));
    });
  }

  resetTimer() {
    // Clear existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Get timeout duration based on user role
    const user = this.authService.getCurrentUser();
    const role = user?.role || 'default';
    const minutes = AUTH_CONFIG.autoLogout[role as keyof typeof AUTH_CONFIG.autoLogout] || AUTH_CONFIG.autoLogout.default;
    const timeoutDuration = minutes * 60 * 1000;

    // Set new timeout
    this.ngZone.runOutsideAngular(() => {
      this.timeoutId = setTimeout(() => {
        this.ngZone.run(() => {
          this.logoutUser();
        });
      }, timeoutDuration);
    });
  }

  private async logoutUser() {
    
    try {
      await this.authService.signOut();
      this.router.navigate(['/login'], {
        queryParams: { 
          reason: 'timeout',
          message: 'Vous avez été déconnecté pour inactivité'
        }
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion automatique:', error);
      this.router.navigate(['/login']);
    }
  }

  stopTimer() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    // Remove event listeners
    this.events.forEach(event => {
      window.removeEventListener(event, this.resetTimer.bind(this));
    });
  }
}