import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take, filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate() {
    return this.authService.authChecked$.pipe(
      filter(checked => checked),
      take(1),
      map(() => {
        const isAuthenticated = this.authService.isAuthenticated();
        
        if (!isAuthenticated) {
          // Stocker l'URL demandée pour redirection après login
          const currentUrl = this.router.url;
          if (currentUrl !== '/login') {
            localStorage.setItem('redirectUrl', currentUrl);
          }
          this.router.navigate(['/login']);
          return false;
        }

        return true;
      })
    );
  }
}