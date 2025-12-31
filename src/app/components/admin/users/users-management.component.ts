import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { UserService } from "../../../services/user.service";
import { AuthService } from "../../../services/auth.service";
import { User } from "../../../models/user.model";

@Component({
  selector: "app-users-management",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./users-management.component.html",
  styleUrls: ["./users-management.component.css"],
})
export class UsersManagementComponent implements OnInit {
[x: string]: any;
  Math = Math;

  // Données utilisateurs
  users: User[] = [];
  filteredUsers: User[] = [];

  // Filtres et recherche
  searchTerm: string = "";
  selectedRole: string = "";
  selectedStatus: string = "";

  // Tri et vue
  sortBy: string = "displayName";
  sortOrder: "asc" | "desc" = "asc";
  viewMode: "table" | "cards" = "table";

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;

  // Gestion des formulaires
  showUserForm: boolean = false;
  showInfoModal: boolean = false;
  editingUser: User | null = null;
  selectedUser: User | null = null;
  isLoading: boolean = false;

  // Nouvel utilisateur
  newUser = {
    email: "",
    displayName: "",
    role: "patient" as "patient" | "medecin" | "admin",
    speciality: "",
    password: "",
    phone: "",
    address: "",
    birthDate: "",
  };

  // Statistiques
  userStats = {
    total: 0,
    admins: 0,
    doctors: 0,
    patients: 0,
    active: 0,
    inactive: 0,
    verified: 0,
    unverified: 0
  };

  // Spécialités disponibles
  specialities = [
    "Cardiologie",
    "Dermatologie",
    "Pédiatrie",
    "Neurologie",
    "Orthopédie",
    "Gynécologie",
    "Psychiatrie",
    "Radiologie",
    "Chirurgie",
    "Médecine générale",
    "Ophtalmologie",
    "ORL",
  ];

  // Filtres avancés
  showAdvancedFilters: boolean = false;
  dateFilter: string = "";
  specialityFilter: string = "";
showPassword: any;

  constructor(
    private userService: UserService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    await this.loadUsers();
  }

  async loadUsers() {
    this.isLoading = true;
    try {
      this.users = await this.userService.getAllUsers();
      this.applyFilters();
      this.calculateStats();
    } catch (error) {
      console.error("Error loading users:", error);
      this.showError("Erreur lors du chargement des utilisateurs");
    } finally {
      this.isLoading = false;
    }
  }

  calculateStats() {
    this.userStats = {
      total: this.users.length,
      admins: this.users.filter((u) => u.role === "admin").length,
      doctors: this.users.filter((u) => u.role === "medecin").length,
      patients: this.users.filter((u) => u.role === "patient").length,
      active: this.users.filter((u) => !u.disabled).length,
      inactive: this.users.filter((u) => u.disabled).length,
      verified: this.users.filter((u) => u.emailVerified).length,
      unverified: this.users.filter((u) => !u.emailVerified).length
    };
  }

  // Filtrage et recherche amélioré
  applyFilters() {
    let filtered = [...this.users];

    // Filtre par rôle
    if (this.selectedRole) {
      filtered = filtered.filter((user) => user.role === this.selectedRole);
    }

    // Filtre par statut
    if (this.selectedStatus) {
      const isActive = this.selectedStatus === "active";
      filtered = filtered.filter((user) => user.disabled !== isActive);
    }

    // Filtre par spécialité
    if (this.specialityFilter) {
      filtered = filtered.filter((user) => 
        user.speciality === this.specialityFilter
      );
    }

    // Filtre par date
    if (this.dateFilter) {
      filtered = filtered.filter((user) => {
        const userDate = this.getDateValue(user.createdAt);
        const filterDate = new Date(this.dateFilter).getTime();
        return userDate >= filterDate;
      });
    }

    // Filtre par recherche
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.displayName?.toLowerCase().includes(term) ||
          user.email?.toLowerCase().includes(term) ||
          user.speciality?.toLowerCase().includes(term) ||
          user.phone?.includes(term) ||
          user.address?.toLowerCase().includes(term)
      );
    }

    this.filteredUsers = this.sortUsersList(filtered);
    this.currentPage = 1;
  }

  sortUsersList(users: User[]): User[] {
    return users.sort((a, b) => {
      let valueA: any, valueB: any;

      switch (this.sortBy) {
        case "displayName":
          valueA = a.displayName?.toLowerCase() || "";
          valueB = b.displayName?.toLowerCase() || "";
          break;
        case "email":
          valueA = a.email?.toLowerCase() || "";
          valueB = b.email?.toLowerCase() || "";
          break;
        case "role":
          valueA = a.role || "";
          valueB = b.role || "";
          break;
        case "createdAt":
          valueA = this.getDateValue(a.createdAt);
          valueB = this.getDateValue(b.createdAt);
          break;
        case "status":
          valueA = a.disabled ? 1 : 0;
          valueB = b.disabled ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (valueA < valueB) {
        return this.sortOrder === "asc" ? -1 : 1;
      }
      if (valueA > valueB) {
        return this.sortOrder === "asc" ? 1 : -1;
      }
      return 0;
    });
  }

  getDateValue(date: any): number {
    if (!date) return 0;
    if (date.toDate) return date.toDate().getTime();
    if (date instanceof Date) return date.getTime();
    return new Date(date).getTime();
  }

  // Méthode pour les icônes de tri
  getSortIconClass(field: string): string {
    if (this.sortBy !== field) {
      return 'fa-sort';
    }
    return this.sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  sortByField(field: string) {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc";
    } else {
      this.sortBy = field;
      this.sortOrder = "asc";
    }
    this.applyFilters();
  }

  // Gestion des modales
  showUserInfo(user: User) {
    this.selectedUser = user;
    this.showInfoModal = true;
  }

  closeInfoModal() {
    this.showInfoModal = false;
    this.selectedUser = null;
  }

  // Gestion des utilisateurs
  addUser() {
    this.editingUser = null;
    this.resetForm();
    this.showUserForm = true;
  }

  editUser(user: User) {
    this.editingUser = user;
    this.newUser = {
      email: user.email || "",
      displayName: user.displayName || "",
      role: user.role as any,
      speciality: user.speciality || "",
      password: "",
      phone: user.phone || "",
      address: user.address || "",
      birthDate: user.birthDate
        ? (user.birthDate as Date).toISOString().split("T")[0]
        : "",
    };
    this.showUserForm = true;
    this.closeInfoModal();
  }

  async saveUser() {
    if (!this.validateUserForm()) return;

    this.isLoading = true;
    try {
      if (this.editingUser) {
        await this.updateUser();
        this.showSuccess("Utilisateur modifié avec succès!");
      } else {
        await this.createUser();
        this.showSuccess("Utilisateur créé avec succès!");
      }
      await this.loadUsers();
      this.cancelForm();
    } catch (error: any) {
      console.error("Error saving user:", error);
      this.showError(error.message || "Erreur lors de la sauvegarde");
    } finally {
      this.isLoading = false;
    }
  }

  async createUser() {
    const userData: any = {
      displayName: this.newUser.displayName,
      role: this.newUser.role,
      phone: this.newUser.phone,
      address: this.newUser.address,
      birthDate: this.newUser.birthDate,
    };

    if (this.newUser.role === "medecin") {
      userData.speciality = this.newUser.speciality;
    }

    await this.authService.signUp(
      this.newUser.email,
      this.newUser.password,
      userData,
      false
    );
  }

  async updateUser() {
    if (!this.editingUser) return;

    const updateData: any = {
      displayName: this.newUser.displayName,
      role: this.newUser.role,
      phone: this.newUser.phone,
      address: this.newUser.address,
      birthDate: this.newUser.birthDate,
    };

    if (this.newUser.role === "medecin") {
      updateData.speciality = this.newUser.speciality;
    } else {
      updateData.speciality = null;
    }

    await this.userService.updateUser(this.editingUser.uid, updateData);
  }

  async deleteUser(user: User) {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer l'utilisateur "${user.displayName}" ? Cette action est irréversible.`
      )
    ) {
      return;
    }

    try {
      await this.userService.deleteUser(user.uid);
      await this.loadUsers();
      this.showSuccess("Utilisateur supprimé avec succès");
    } catch (error) {
      console.error("Error deleting user:", error);
      this.showError("Erreur lors de la suppression");
    }
  }

  async toggleUserStatus(user: User) {
    const newStatus = !user.disabled;
    const action = newStatus ? "désactiver" : "activer";

    if (
      !confirm(
        `Êtes-vous sûr de vouloir ${action} l'utilisateur "${user.displayName}" ?`
      )
    ) {
      return;
    }

    try {
      await this.userService.updateUser(user.uid, { disabled: newStatus });
      await this.loadUsers();
      this.showSuccess(
        `Utilisateur ${newStatus ? "désactivé" : "activé"} avec succès`
      );
    } catch (error) {
      console.error("Error toggling user status:", error);
      this.showError("Erreur lors de la modification du statut");
    }
  }

  async resetPassword(user: User) {
    if (
      !confirm(
        `Envoyer un email de réinitialisation de mot de passe à ${user.email} ?`
      )
    ) {
      return;
    }

    try {
      await this.authService.resetUserPassword(user.uid);
      this.showSuccess("Email de réinitialisation envoyé avec succès");
    } catch (error) {
      console.error("Error resetting password:", error);
      this.showError("Erreur lors de l'envoi de l'email");
    }
  }


  
  async sendVerificationEmail(user: User) {
    try {
      await this.authService.sendEmailVerification(user.uid);
      this.showSuccess("Email de vérification envoyé avec succès");
    } catch (error) {
      console.error("Error sending verification email:", error);
      this.showError("Erreur lors de l'envoi de l'email de vérification");
    }
  }

  validateUserForm(): boolean {
    if (!this.newUser.email || !this.newUser.displayName) {
      this.showError("Veuillez remplir l'email et le nom complet");
      return false;
    }

    if (!this.editingUser && !this.newUser.password) {
      this.showError("Veuillez saisir un mot de passe");
      return false;
    }

    if (this.newUser.role === "medecin" && !this.newUser.speciality) {
      this.showError("Veuillez sélectionner une spécialité pour le médecin");
      return false;
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.newUser.email)) {
      this.showError("Veuillez saisir un email valide");
      return false;
    }

    // Validation mot de passe
    if (!this.editingUser && this.newUser.password.length < 6) {
      this.showError("Le mot de passe doit contenir au moins 6 caractères");
      return false;
    }

    return true;
  }

  resetForm() {
    this.newUser = {
      email: "",
      displayName: "",
      role: "patient",
      speciality: "",
      password: "",
      phone: "",
      address: "",
      birthDate: "",
    };
  }

  cancelForm() {
    this.showUserForm = false;
    this.editingUser = null;
    this.resetForm();
  }

  onRoleChange() {
    if (this.newUser.role !== "medecin") {
      this.newUser.speciality = "";
    }
  }

  toggleAdvancedFilters() {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  clearFilters() {
    this.searchTerm = "";
    this.selectedRole = "";
    this.selectedStatus = "";
    this.dateFilter = "";
    this.specialityFilter = "";
    this.applyFilters();
  }

  // Pagination
  get paginatedUsers() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredUsers.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages() {
    return Math.ceil(this.filteredUsers.length / this.itemsPerPage);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
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

  // Utilitaires
  getRoleDisplay(role: string): string {
    const roles: { [key: string]: string } = {
      admin: "Administrateur",
      medecin: "Médecin",
      patient: "Patient",
    };
    return roles[role] || role;
  }

  getStatusDisplay(user: User): string {
    return user.disabled ? "Inactif" : "Actif";
  }

  getStatusClass(user: User): string {
    return user.disabled ? "status-inactive" : "status-active";
  }

  getVerificationStatus(user: User): string {
    return user.emailVerified ? "Vérifié" : "Non vérifié";
  }

  getVerificationClass(user: User): string {
    return user.emailVerified ? "status-verified" : "status-unverified";
  }

  getFormattedDate(date: any): string {
    if (!date) return "N/A";

    try {
      let dateObj: Date;
      if (date.toDate) {
        dateObj = date.toDate();
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        dateObj = new Date(date);
      }

      return dateObj.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (error) {
      return "Date invalide";
    }
  }

  getAge(birthDate: any): number {
    if (!birthDate) return 0;
    
    try {
      let dateObj: Date;
      if (birthDate.toDate) {
        dateObj = birthDate.toDate();
      } else if (birthDate instanceof Date) {
        dateObj = birthDate;
      } else {
        dateObj = new Date(birthDate);
      }
      
      const today = new Date();
      let age = today.getFullYear() - dateObj.getFullYear();
      const monthDiff = today.getMonth() - dateObj.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateObj.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      return 0;
    }
  }

  // Messages
  showSuccess(message: string) {
    // Intégrer un système de notifications toast ici
    alert(message);
  }

  showError(message: string) {
    alert(`Erreur: ${message}`);
  }
  // Dans votre composant TypeScript
get hasActiveFilters(): boolean {
  return !!(this.searchTerm || this.selectedRole || this.selectedStatus);
}

  // Export amélioré
  exportUsers() {
    const data = this.filteredUsers.map((user) => ({
      Nom: user.displayName,
      Email: user.email,
      Rôle: this.getRoleDisplay(user.role),
      Spécialité: user.speciality || "-",
      Téléphone: user.phone || "-",
      Adresse: user.address || "-",
      Statut: this.getStatusDisplay(user),
      "Email vérifié": this.getVerificationStatus(user),
      "Date inscription": this.getFormattedDate(user.createdAt),
      "Date de naissance": user.birthDate ? this.getFormattedDate(user.birthDate) : "-",
      "Âge": user.birthDate ? this.getAge(user.birthDate) : "-"
    }));

    const csv = this.convertToCSV(data);
    this.downloadCSV(csv, `utilisateurs_${new Date().toISOString().split('T')[0]}.csv`);
  }

  private convertToCSV(data: any[]): string {
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(";")];

    for (const row of data) {
      const values = headers.map((header) => {
        const escaped = ("" + row[header]).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(";"));
    }

    return csvRows.join("\n");
  }

  private downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}