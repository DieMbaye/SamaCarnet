import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h1>MediCare</h1>
          <p>Connectez-vous à votre compte</p>
        </div>
        
        <form (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              type="email" 
              id="email" 
              [(ngModel)]="credentials.email"
              name="email"
              required
              placeholder="votre@email.com"
              class="form-input"
            >
          </div>
          
          <div class="form-group">
            <label for="password">Mot de passe</label>
            <input 
              type="password" 
              id="password" 
              [(ngModel)]="credentials.password"
              name="password"
              required
              placeholder="••••••••"
              class="form-input"
            >
          </div>
          
          <div class="error-message" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>
          
          <button 
            type="submit" 
            class="login-btn"
            [disabled]="isLoading"
          >
            {{ isLoading ? 'Connexion...' : 'Se connecter' }}
          </button>
        </form>
        
        
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
    }

    .login-card {
      background: white;
      border-radius: 1rem;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      padding: 3rem;
      width: 100%;
      max-width: 400px;
      animation: slideUp 0.5s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .login-header h1 {
      color: #2563eb;
      font-size: 2rem;
      margin-bottom: 0.5rem;
      font-weight: 700;
    }

    .login-header p {
      color: #6b7280;
      font-size: 1rem;
      margin: 0;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group label {
      font-weight: 600;
      color: #374151;
      font-size: 0.9rem;
    }

    .form-input {
      padding: 0.75rem;
      border: 2px solid #e5e7eb;
      border-radius: 0.5rem;
      font-size: 1rem;
      transition: all 0.2s;
      background: #f9fafb;
    }

    .form-input:focus {
      outline: none;
      border-color: #2563eb;
      background: white;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .error-message {
      background: #fee2e2;
      color: #dc2626;
      padding: 0.75rem;
      border-radius: 0.5rem;
      font-size: 0.9rem;
      border-left: 4px solid #dc2626;
    }

    .login-btn {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: white;
      border: none;
      padding: 0.875rem;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 1rem;
    }

    .login-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(37, 99, 235, 0.3);
    }

    .login-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .login-footer {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 0.85rem;
      color: #6b7280;
    }

    .login-footer p {
      margin: 0.25rem 0;
    }

    .login-footer strong {
      color: #374151;
    }

    @media (max-width: 480px) {
      .login-container {
        padding: 1rem;
      }
      
      .login-card {
        padding: 2rem;
      }
    }
  `]
})
export class LoginComponent {
  credentials = {
    email: '',
    password: ''
  };
  
  errorMessage = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

   async onSubmit() {
    if (!this.credentials.email || !this.credentials.password) {
      this.errorMessage = 'Veuillez remplir tous les champs';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const user = await this.authService.signIn(this.credentials.email, this.credentials.password);

      // Redirection selon le rôle
      switch (user.role) {
        case 'admin':
          this.router.navigate(['/admin']);
          break;
        case 'medecin':
          this.router.navigate(['/doctor']);
          break;
        case 'patient':
          this.router.navigate(['/patient']);
          break;
        default:
          this.router.navigate(['/']);
      }
    } catch (error: any) {
      console.error('Erreur Firebase:', error.code, error.message);
      this.errorMessage = 'Email ou mot de passe incorrect';
    } finally {
      this.isLoading = false;
    }
  }
}
