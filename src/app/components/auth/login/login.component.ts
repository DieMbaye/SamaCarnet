import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl:'./login.component.html',
  styleUrls: ['./login.component.css']
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
