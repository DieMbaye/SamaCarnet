import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service'; // ← IMPORT AJOUTÉ
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  showHeader = true;

  constructor(
    private router: Router,
    public authService: AuthService // ← 'public' pour utiliser dans le template
  ) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const noHeaderRoutes = ['/login', '/register'];
        this.showHeader = !noHeaderRoutes.includes(event.urlAfterRedirects);
      });
  }
}