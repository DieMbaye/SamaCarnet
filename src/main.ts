import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { routes } from './app.routes';
import { AuthService } from './services/auth.service';
import { HeaderComponent } from './components/shared/header/header.component';
import { OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent],
  template: `
    <div class="app">
      <app-header *ngIf="showHeader"></app-header>
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app {
      min-height: 100vh;
      background: #f3f4f6;
    }

    .main-content {
      min-height: calc(100vh - 80px);
    }

    .unauthorized {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-size: 1.5rem;
      color: #ef4444;
      background: #fef2f2;
    }
  `]
})
export class App implements OnInit {
  showHeader = false;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.showHeader = !!user;
    });
    
    // Initialiser le compte admin
    this.authService.initializeAdmin();
  }
}

bootstrapApplication(App, {
  providers: [
    provideRouter(routes)
  ]
});