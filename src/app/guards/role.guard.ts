import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take, filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot) {
    const requiredRole = route.data['role'];
    
    return this.authService.authChecked$.pipe(
      // Attendre que l'authentification soit vérifiée
      filter(checked => checked),
      take(1),
      map(() => {
        const user = this.authService.getCurrentUser();
        
        if (user && user.role === requiredRole) {
          return true;
        }
        
        this.router.navigate(['/unauthorized']);
        return false;
      })
    );
  }
}