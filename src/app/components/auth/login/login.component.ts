import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  credentials = {
    email: '',
    password: ''
  };

  isResettingPassword = false;
  resetEmail = '';
  errorMessage = '';
  successMessage = '';
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
    this.successMessage = '';

    try {
      const user = await this.authService.signIn(this.credentials.email, this.credentials.password);
      this.redirectUser(user.role);
    } catch (error: any) {
      console.error('Erreur Firebase:', error.code, error.message);
      this.handleAuthError(error);
    } finally {
      this.isLoading = false;
    }
  }

  async onResetPassword() {
    if (!this.resetEmail) {
      this.errorMessage = 'Veuillez entrer votre adresse email';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      await this.authService.resetUserPassword(this.resetEmail);
      this.successMessage = 'Un email de réinitialisation a été envoyé à votre adresse';
      this.isResettingPassword = false;
      this.resetEmail = '';
    } catch (error: any) {
      console.error('Erreur réinitialisation:', error);
      this.handleAuthError(error);
    } finally {
      this.isLoading = false;
    }
  }

  showResetPassword() {
    this.isResettingPassword = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  private redirectUser(role: string) {
    switch (role) {
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
  }

  private handleAuthError(error: any) {
    switch (error.code) {
      case 'auth/user-not-found':
        this.errorMessage = 'Aucun compte trouvé avec cet email';
        break;
      case 'auth/wrong-password':
        this.errorMessage = 'Mot de passe incorrect';
        break;
      case 'auth/invalid-email':
        this.errorMessage = 'Adresse email invalide';
        break;
      case 'auth/too-many-requests':
        this.errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard';
        break;
      default:
        this.errorMessage = 'Une erreur est survenue. Veuillez réessayer';
    }
  }
}