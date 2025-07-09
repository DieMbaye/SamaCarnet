import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-dashboard">
      <div class="dashboard-header">
        <h1>Tableau de bord administrateur</h1>
        <p>Gérez les utilisateurs et consultez les statistiques</p>
      </div>

      <!-- Cartes de statistiques -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-info">
            <h3>{{ statistics.totalUsers }}</h3>
            <p>Utilisateurs total</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">👨‍⚕️</div>
          <div class="stat-info">
            <h3>{{ statistics.totalDoctors }}</h3>
            <p>Médecins</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🏥</div>
          <div class="stat-info">
            <h3>{{ statistics.totalPatients }}</h3>
            <p>Patients</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-info">
            <h3>{{ Object.keys(statistics.specialities).length }}</h3>
            <p>Spécialités</p>
          </div>
        </div>
      </div>

      <!-- Spécialités -->
      <div class="specialities-section">
        <h2>Répartition par spécialité</h2>
        <div class="specialities-grid">
          <div 
            *ngFor="let speciality of Object.keys(statistics.specialities)"
            class="speciality-card"
          >
            <h4>{{ speciality }}</h4>
            <span class="speciality-count">{{ statistics.specialities[speciality] }} médecin(s)</span>
          </div>
        </div>
      </div>

      <!-- Gestion des utilisateurs -->
      <div class="users-section">
        <div class="section-header">
          <h2>Gestion des utilisateurs</h2>
          <button class="add-btn" (click)="showAddUserForm = true">
            Ajouter un utilisateur
          </button>
        </div>

        <!-- Formulaire d'ajout d'utilisateur -->
        <div class="add-user-form" *ngIf="showAddUserForm">
          <h3>Ajouter un nouvel utilisateur</h3>
          <form (ngSubmit)="addUser()" class="user-form">
            <div class="form-row">
              <div class="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  [(ngModel)]="newUser.email"
                  name="email"
                  required
                  class="form-input"
                >
              </div>
              
              <div class="form-group">
                <label>Nom complet</label>
                <input 
                  type="text" 
                  [(ngModel)]="newUser.displayName"
                  name="displayName"
                  required
                  class="form-input"
                >
              </div>
            </div>
            <div class="form-row">
  <div class="form-group">
    <label>Mot de passe</label>
    <input 
      type="password" 
      [(ngModel)]="newUser.password"
      name="password"
      required
      class="form-input"
      placeholder="Mot de passe"
    >
  </div>
</div>

            <div class="form-row">
              <div class="form-group">
                <label>Rôle</label>
                <select 
                  [(ngModel)]="newUser.role"
                  name="role"
                  required
                  class="form-select"
                >
                  <option value="patient">Patient</option>
                  <option value="medecin">Médecin</option>
                </select>
              </div>
              
              <div class="form-group" *ngIf="newUser.role === 'medecin'">
                <label>Spécialité</label>
                <select 
                  [(ngModel)]="newUser.speciality"
                  name="speciality"
                  class="form-select"
                >
                  <option value="Cardiologie">Cardiologie</option>
                  <option value="Dermatologie">Dermatologie</option>
                  <option value="Pédiatrie">Pédiatrie</option>
                  <option value="Neurologie">Neurologie</option>
                  <option value="Orthopédie">Orthopédie</option>
                  <option value="Gynécologie">Gynécologie</option>
                  <option value="Psychiatrie">Psychiatrie</option>
                </select>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="submit" class="submit-btn" [disabled]="isLoading">
                {{ isLoading ? 'Ajout...' : 'Ajouter' }}
              </button>
              <button type="button" class="cancel-btn" (click)="cancelAddUser()">
                Annuler
              </button>
            </div>
          </form>
        </div>

        <!-- Liste des utilisateurs -->
        <div class="users-list">
          <div class="users-filters">
            <select [(ngModel)]="selectedRoleFilter" (change)="filterUsers()" class="filter-select">
              <option value="">Tous les rôles</option>
              <option value="admin">Administrateur</option>
              <option value="medecin">Médecin</option>
              <option value="patient">Patient</option>
            </select>
          </div>
          
          <div class="users-table">
            <div class="table-header">
              <div class="header-cell">Nom</div>
              <div class="header-cell">Email</div>
              <div class="header-cell">Rôle</div>
              <div class="header-cell">Spécialité</div>
              <div class="header-cell">Date d'inscription</div>
              <div class="header-cell">Actions</div>
            </div>
            
            <div *ngFor="let user of filteredUsers" class="table-row">
              <div class="table-cell">{{ user.displayName }}</div>
              <div class="table-cell">{{ user.email }}</div>
              <div class="table-cell">
                <span class="role-badge" [class]="'role-' + user.role">
                  {{ getRoleDisplay(user.role) }}
                </span>
              </div>
              <div class="table-cell">{{ user.speciality || '-' }}</div>
              <div class="table-cell">{{ user.createdAt | date:'short':'fr' }}</div>
              <div class="table-cell">
                <button 
                  class="delete-btn"
                  (click)="deleteUser(user.uid)"
                  [disabled]="user.role === 'admin'"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-dashboard {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .dashboard-header {
      text-align: center;
      margin-bottom: 3rem;
    }

    .dashboard-header h1 {
      color: #1f2937;
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      font-weight: 700;
    }

    .dashboard-header p {
      color: #6b7280;
      font-size: 1.1rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 2rem;
      margin-bottom: 3rem;
    }

    .stat-card {
      background: white;
      border-radius: 1rem;
      padding: 2rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: transform 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-2px);
    }

    .stat-icon {
      font-size: 3rem;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      border-radius: 1rem;
      padding: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-info h3 {
      color: #1f2937;
      font-size: 2rem;
      margin: 0;
      font-weight: 700;
    }

    .stat-info p {
      color: #6b7280;
      margin: 0;
      font-size: 1rem;
    }

    .specialities-section {
      margin-bottom: 3rem;
    }

    .specialities-section h2 {
      color: #1f2937;
      margin-bottom: 1.5rem;
      font-size: 1.5rem;
    }

    .specialities-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .speciality-card {
      background: white;
      border-radius: 0.5rem;
      padding: 1.5rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      text-align: center;
    }

    .speciality-card h4 {
      color: #1f2937;
      margin: 0 0 0.5rem 0;
      font-size: 1.1rem;
    }

    .speciality-count {
      color: #2563eb;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .users-section {
      background: white;
      border-radius: 1rem;
      padding: 2rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .section-header h2 {
      color: #1f2937;
      margin: 0;
      font-size: 1.5rem;
    }

    .add-btn {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .add-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
    }

    .add-user-form {
      background: #f9fafb;
      border-radius: 0.5rem;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .add-user-form h3 {
      color: #1f2937;
      margin-bottom: 1.5rem;
      font-size: 1.2rem;
    }

    .user-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group label {
      color: #374151;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .form-input, .form-select {
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.5rem;
      font-size: 1rem;
    }

    .form-input:focus, .form-select:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }

    .submit-btn {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .submit-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .cancel-btn {
      background: #6b7280;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .cancel-btn:hover {
      background: #4b5563;
    }

    .users-filters {
      margin-bottom: 1.5rem;
    }

    .filter-select {
      padding: 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 0.5rem;
      font-size: 0.9rem;
    }

    .users-table {
      overflow-x: auto;
    }

    .table-header {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
      gap: 1rem;
      padding: 1rem;
      background: #f3f4f6;
      border-radius: 0.5rem;
      font-weight: 600;
      color: #374151;
    }

    .table-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
      gap: 1rem;
      padding: 1rem;
      border-bottom: 1px solid #e5e7eb;
      align-items: center;
    }

    .table-row:hover {
      background: #f9fafb;
    }

    .table-cell {
      font-size: 0.9rem;
      color: #374151;
    }

    .role-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .role-admin {
      background: #fef3c7;
      color: #92400e;
    }

    .role-medecin {
      background: #dbeafe;
      color: #1e40af;
    }

    .role-patient {
      background: #d1fae5;
      color: #065f46;
    }

    .delete-btn {
      background: #ef4444;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
    }

    .delete-btn:hover:not(:disabled) {
      background: #dc2626;
    }

    .delete-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }
      
      .table-header, .table-row {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }
      
      .section-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  statistics = {
    totalUsers: 0,
    totalDoctors: 0,
    totalPatients: 0,
    specialities: {} as { [key: string]: number }
  };

  users: User[] = [];
  filteredUsers: User[] = [];
  selectedRoleFilter = '';
  showAddUserForm = false;
  isLoading = false;

  newUser = {
  email: '',
  displayName: '',
  role: 'patient' as 'patient' | 'medecin',
  speciality: '',
  password: '' // <-- ajoute cette ligne
};


  Object = Object;

  constructor(
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    try {
      this.statistics = await this.userService.getStatistics();
      this.users = await this.userService.getAllUsers();
      this.filteredUsers = this.users;
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  }

  filterUsers() {
    if (this.selectedRoleFilter) {
      this.filteredUsers = this.users.filter(user => user.role === this.selectedRoleFilter);
    } else {
      this.filteredUsers = this.users;
    }
  }

 async addUser() {
  if (!this.newUser.email || !this.newUser.displayName) {
    alert('Veuillez remplir tous les champs obligatoires');
    return;
  }

  this.isLoading = true;

  try {
    const defaultPassword = 'password123';

    await this.authService.signUp(
      this.newUser.email,
      defaultPassword,
      {
        displayName: this.newUser.displayName,
        role: this.newUser.role,
        speciality: this.newUser.role === 'medecin' ? this.newUser.speciality : undefined
      },
      false // Ne pas remplacer l'utilisateur actuellement connecté
    );

    await this.loadData();
    this.cancelAddUser();
    alert(`Utilisateur ajouté avec succès !\nMot de passe par défaut : ${defaultPassword}`);
  } catch (error) {
    console.error('Erreur lors de l\'ajout:', error);
    alert('Erreur lors de l\'ajout de l\'utilisateur');
  } finally {
    this.isLoading = false;
  }
}


  cancelAddUser() {
    this.showAddUserForm = false;
    this.newUser = {
  email: '',
  displayName: '',
  role: 'patient' as 'patient' | 'medecin',
  speciality: '',
  password: ''  // nouveau champ
};

  }

  async deleteUser(userId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur?')) {
      return;
    }

    try {
      await this.userService.deleteUser(userId);
      await this.loadData();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression de l\'utilisateur');
    }
  }

  getRoleDisplay(role: string): string {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'medecin': return 'Médecin';
      case 'patient': return 'Patient';
      default: return role;
    }
  }
}