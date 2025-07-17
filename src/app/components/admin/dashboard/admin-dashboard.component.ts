import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartData, ChartOptions, ChartType } from 'chart.js';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/user.model';
import { ChartsModule } from '../../../charts.module';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ChartsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
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
    password: ''
  };

  Object = Object;

  // ---------------------- GRAPHIQUES ----------------------

  roleChartLabels: string[] = ['Administrateurs', 'Médecins', 'Patients'];
  roleChartData: ChartData<'pie', number[], string | string[]> = {
    labels: this.roleChartLabels,
    datasets: [
      {
        data: [0, 0, 0],
        backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56'],
      }
    ]
  };
  roleChartType: ChartType = 'pie';

  specialityChartLabels: string[] = [];
  specialityChartData: ChartData<'bar', number[], string | string[]> = {
    labels: [],
    datasets: [
      {
        label: 'Médecins par spécialité',
        data: [],
        backgroundColor: '#42A5F5',
      }
    ]
  };
  specialityChartType: ChartType = 'bar';

  chartOptions: ChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      }
    }
  };

  // ---------------------- PAGINATION ----------------------
  currentPage = 1;
  usersPerPage = 10;

  get paginatedUsers(): User[] {
    const startIndex = (this.currentPage - 1) * this.usersPerPage;
    return this.filteredUsers.slice(startIndex, startIndex + this.usersPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredUsers.length / this.usersPerPage);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // -------------------------------------------------------

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
      this.updateCharts();
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  }

  updateCharts() {
    const adminCount = this.users.filter(u => u.role === 'admin').length;
    const doctorCount = this.users.filter(u => u.role === 'medecin').length;
    const patientCount = this.users.filter(u => u.role === 'patient').length;

    this.roleChartData = {
      labels: this.roleChartLabels,
      datasets: [
        {
          data: [adminCount, doctorCount, patientCount],
          backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56'],
        }
      ]
    };

    this.specialityChartLabels = Object.keys(this.statistics.specialities);
    const specialityCounts = Object.values(this.statistics.specialities);

    this.specialityChartData = {
      labels: this.specialityChartLabels,
      datasets: [
        {
          label: 'Médecins par spécialité',
          data: specialityCounts,
          backgroundColor: '#42A5F5',
        }
      ]
    };
  }

  filterUsers() {
    this.filteredUsers = this.selectedRoleFilter
      ? this.users.filter(user => user.role === this.selectedRoleFilter)
      : this.users;

    this.currentPage = 1; // reset page
  }

  async addUser() {
    if (!this.newUser.email || !this.newUser.displayName) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (this.newUser.role === 'medecin' && !this.newUser.speciality) {
      alert('Veuillez indiquer la spécialité pour un médecin');
      return;
    }

    this.isLoading = true;

    try {
      const defaultPassword = 'password123';

      const userData: any = {
        displayName: this.newUser.displayName,
        role: this.newUser.role
      };

      if (this.newUser.role === 'medecin') {
        userData.speciality = this.newUser.speciality;
      }

      await this.authService.signUp(
        this.newUser.email,
        defaultPassword,
        userData,
        false
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
      role: 'patient',
      speciality: '',
      password: ''
    };
  }

  async deleteUser(userId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur?')) return;

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
