import { Injectable } from "@angular/core";
import { CanActivate, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { map, take } from "rxjs/operators";

@Injectable({
  providedIn: "root",
})
export class NoAuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate() {
    return this.authService.authChecked$.pipe(
      take(1),
      map((authChecked) => {
        if (!authChecked) {
          // Attendre que l'authentification soit vérifiée
          return true; // Permettre l'accès temporairement
        }

        const isAuthenticated = this.authService.isAuthenticated();

        if (isAuthenticated) {
          // Rediriger vers la page appropriée selon le rôle
          const user = this.authService.getCurrentUser();
          switch (user?.role) {
            case "admin":
              this.router.navigate(["/admin"]);
              break;
            case "medecin":
              this.router.navigate(["/doctor"]);
              break;
            case "patient":
              this.router.navigate(["/patient"]);
              break;
            default:
              this.router.navigate(["/"]);
          }
          return false; // Bloquer l'accès à /login
        }

        return true; // Permettre l'accès à /login
      })
    );
  }
}
