import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  @ViewChild('registerForm') registerForm!: NgForm;

  registerData = {
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    phone: '',
    dateOfBirth: '',
    address: ''
  };

  errorMessage = '';
  successMessage = '';
  isLoading = false;
  submitted = false;
  passwordVisible = { password: false, confirmPassword: false };

  // Modal + user actuel
  showLogoutModal = false;
  currentUser: any = null;

  constructor(
    public authService: AuthService,   // <-- DEVENU PUBLIC 
    private router: Router
  ) {}

  ngOnInit() {
    setTimeout(() => {
      if (this.authService.isAuthenticated()) {
        this.currentUser = this.authService.getCurrentUser();
        this.showLogoutModal = true;
      }
    }, 100);
  }

  async onSubmit() {
    if (this.authService.isAuthenticated()) {
      this.currentUser = this.authService.getCurrentUser();
      this.showLogoutModal = true;
      return;
    }

    this.submitted = true;
    if (!this.isFormValid()) {
      this.scrollToFirstError();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const userData = {
        displayName: this.registerData.displayName,
        role: 'patient' as const,
        phone: this.registerData.phone || '',
        dateOfBirth: this.registerData.dateOfBirth || '',
        address: this.registerData.address || ''
      };

      await this.authService.signUp(
        this.registerData.email,
        this.registerData.password,
        userData
      );

      this.successMessage = 'Compte patient créé avec succès ! Redirection...';
      this.registerForm.reset();
      this.submitted = false;

      setTimeout(() => {
        this.router.navigate(['/patient']);
      }, 2000);

    } catch (error: any) {
      this.handleAuthError(error);
    } finally {
      this.isLoading = false;
    }
  }

  async onLogout() {
    try {
      await this.authService.signOut();
      this.showLogoutModal = false;
      this.currentUser = null;

      this.successMessage = 'Déconnecté. Vous pouvez créer un nouveau compte.';
      this.resetForm();
    } catch (error) {
      this.errorMessage = 'Erreur lors de la déconnexion';
    }
  }

  onCancelLogout() {
    this.showLogoutModal = false;

    if (this.currentUser) {
      switch (this.currentUser.role) {
        case 'admin': this.router.navigate(['/admin']); break;
        case 'medecin': this.router.navigate(['/doctor']); break;
        case 'patient': this.router.navigate(['/patient']); break;
        default: this.router.navigate(['/']);
      }
    }
  }

  /* --------------------- VALIDATION + OUTILS --------------------- */

  private isFormValid(): boolean {
    if (!this.registerData.displayName?.trim()) {
      this.errorMessage = 'Le nom complet est requis';
      return false;
    }

    if (!this.registerData.email?.trim()) {
      this.errorMessage = 'L\'email est requis';
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.registerData.email)) {
      this.errorMessage = 'Adresse email invalide';
      return false;
    }

    if (!this.registerData.password || this.registerData.password.length < 6) {
      this.errorMessage = 'Mot de passe trop court';
      return false;
    }

    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas';
      return false;
    }

    return true;
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword') {
    this.passwordVisible[field] = !this.passwordVisible[field];
    const input = document.getElementById(field) as HTMLInputElement;
    if (input) input.type = this.passwordVisible[field] ? 'text' : 'password';
  }

  getPasswordStrength(): string {
    const pwd = this.registerData.password;
    if (!pwd) return '';

    let strength = 0;
    if (pwd.length >= 6) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) strength++;

    return strength <= 1 ? 'weak' : strength <= 3 ? 'medium' : 'strong';
  }

  getPasswordHint(): string {
    const strength = this.getPasswordStrength();
    return strength === 'weak'
      ? 'Faible - Ajoutez majuscules, chiffres et caractères spéciaux'
      : strength === 'medium'
      ? 'Moyen - Peut être amélioré'
      : strength === 'strong'
      ? 'Fort - Excellent mot de passe'
      : 'Minimum 6 caractères';
  }

private handleAuthError(error: any) {
  const map: Record<string, string> = {
    'auth/email-already-in-use': 'Cet email a déjà un compte',
    'auth/invalid-email': 'Email invalide',
    'auth/weak-password': 'Mot de passe trop faible',
    'auth/operation-not-allowed': 'Opération non autorisée'
  };

  const code = error.code as string;
  this.errorMessage = map[code] || 'Erreur lors de la création du compte';

  this.scrollToFirstError();
}


  private scrollToFirstError() {
    setTimeout(() => {
      const el = document.querySelector('.invalid, .validation-error, .error-message');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  resetForm() {
    this.registerForm?.resetForm();
    this.submitted = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.passwordVisible = { password: false, confirmPassword: false };
  }
}
