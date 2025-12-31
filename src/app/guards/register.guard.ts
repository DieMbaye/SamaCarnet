import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class RegisterGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate() {
    return this.authService.authChecked$.pipe(
      take(1),
      map((authChecked) => {
        if (!authChecked) {
          return true; // Permettre l'accès temporairement
        }

        const isAuthenticated = this.authService.isAuthenticated();

        if (isAuthenticated) {
          // Au lieu de rediriger automatiquement, on montre un modal
          // On reste sur la page register mais on affiche le modal
          return true; // ✅ On autorise l'accès pour afficher le modal
        }

        return true; // Permettre l'accès si non connecté
      })
    );
  }
}