import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { AppointmentService } from '../../../services/appointment.service';
import { Appointment, User, Patient, Doctor } from '../../../models/user.model';

interface AppointmentWithDetails extends Appointment {
  patientName: string;
  patientEmail: string;
  doctorName: string;
  doctorSpeciality: string;
  formattedDate: string;
  isPast: boolean;
}

@Component({
  selector: 'app-appointments-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointments-management.component.html',
  styleUrls: ['./appointments-management.component.css']
})
export class AppointmentsManagementComponent implements OnInit {
  // Données principales
  appointments: Appointment[] = [];
  appointmentsWithDetails: AppointmentWithDetails[] = [];
  filteredAppointments: AppointmentWithDetails[] = [];
  
  // Utilisateurs
  patients: Patient[] = [];
  doctors: Doctor[] = [];
  
  // Filtres
  searchTerm: string = '';
  selectedStatus: string = '';
  selectedDoctor: string = '';
  selectedDate: string = '';
  dateRange = { start: '', end: '' };
  
  // Tri et affichage
  sortBy: string = 'date';
  sortOrder: 'asc' | 'desc' = 'asc';
  viewMode: 'table' | 'card' = 'table';
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  
  // État
  isLoading: boolean = false;
  showFilters: boolean = false;
  showNotesModal: boolean = false;
  selectedAppointment: Appointment | null = null;
  notesText: string = '';
  
  // Statistiques
  appointmentStats = {
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    today: 0
  };

  statuses = [
    { value: 'pending', label: 'En attente' },
    { value: 'confirmed', label: 'Confirmé' },
    { value: 'completed', label: 'Terminé' },
    { value: 'cancelled', label: 'Annulé' }
  ];

  Math = Math;

  constructor(
    private userService: UserService,
    private appointmentService: AppointmentService
  ) {}

  async ngOnInit() {
    await this.loadAllData();
    this.calculateStats();
  }

  async loadAllData() {
    this.isLoading = true;
    try {
      // Charger tous les utilisateurs
      const allUsers = await this.userService.getAllUsers();
      this.patients = allUsers.filter(user => user.role === 'patient') as Patient[];
      this.doctors = allUsers.filter(user => user.role === 'medecin') as Doctor[];

      // Charger tous les rendez-vous
      const allAppointments: Appointment[] = [];
      for (const doctor of this.doctors) {
        try {
          const doctorAppointments = await this.appointmentService.getAppointmentsByDoctor(doctor.uid);
          allAppointments.push(...doctorAppointments);
        } catch (error) {
          console.error(`Error loading appointments for doctor ${doctor.uid}:`, error);
        }
      }
      
      this.appointments = allAppointments;
      this.enrichAppointmentsWithDetails();
      this.filterAppointments();
      
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      this.isLoading = false;
    }
  }

  enrichAppointmentsWithDetails() {
    this.appointmentsWithDetails = this.appointments.map(appointment => {
      const patient = this.patients.find(p => p.uid === appointment.patientId);
      const doctor = this.doctors.find(d => d.uid === appointment.doctorId);
      
      return {
        ...appointment,
        patientName: patient?.displayName || 'Patient inconnu',
        patientEmail: patient?.email || 'Email inconnu',
        doctorName: doctor?.displayName || 'Médecin inconnu',
        doctorSpeciality: doctor?.speciality || 'Spécialité inconnue',
        formattedDate: this.getFormattedDate(appointment.date),
        isPast: this.isPastAppointment(appointment)
      };
    });
  }

  // Filtrage et recherche
  filterAppointments() {
    let filtered = this.appointmentsWithDetails;

    // Filtre par statut
    if (this.selectedStatus) {
      filtered = filtered.filter(apt => apt.status === this.selectedStatus);
    }

    // Filtre par médecin
    if (this.selectedDoctor) {
      filtered = filtered.filter(apt => apt.doctorId === this.selectedDoctor);
    }

    // Filtre par date spécifique
    if (this.selectedDate) {
      const filterDate = new Date(this.selectedDate).toDateString();
      filtered = filtered.filter(apt => 
        new Date(apt.date).toDateString() === filterDate
      );
    }

    // Filtre par plage de dates
    if (this.dateRange.start && this.dateRange.end) {
      const startDate = new Date(this.dateRange.start);
      const endDate = new Date(this.dateRange.end);
      filtered = filtered.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate >= startDate && aptDate <= endDate;
      });
    }

    // Filtre par recherche
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(apt => 
        apt.patientName.toLowerCase().includes(term) ||
        apt.doctorName.toLowerCase().includes(term) ||
        apt.doctorSpeciality.toLowerCase().includes(term) ||
        apt.reason.toLowerCase().includes(term)
      );
    }

    // Tri
    this.filteredAppointments = this.sortAppointmentsList(filtered);
    this.currentPage = 1;
  }

  sortAppointmentsList(appointments: AppointmentWithDetails[]): AppointmentWithDetails[] {
    return appointments.sort((a, b) => {
      let valueA: any, valueB: any;

      switch (this.sortBy) {
        case 'patientName':
          valueA = a.patientName.toLowerCase();
          valueB = b.patientName.toLowerCase();
          break;
        case 'doctorName':
          valueA = a.doctorName.toLowerCase();
          valueB = b.doctorName.toLowerCase();
          break;
        case 'doctorSpeciality':
          valueA = a.doctorSpeciality.toLowerCase();
          valueB = b.doctorSpeciality.toLowerCase();
          break;
        case 'date':
          valueA = new Date(a.date).getTime();
          valueB = new Date(b.date).getTime();
          break;
        case 'status':
          valueA = a.status;
          valueB = b.status;
          break;
        case 'reason':
          valueA = a.reason.toLowerCase();
          valueB = b.reason.toLowerCase();
          break;
        default:
          return 0;
      }

      if (valueA < valueB) {
        return this.sortOrder === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return this.sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  sortByField(field: string) {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'asc';
    }
    this.filterAppointments();
  }

  // Actions sur les rendez-vous
  async updateAppointmentStatus(appointment: Appointment, newStatus: Appointment['status']) {
    if (!confirm(`Changer le statut de ce rendez-vous en "${this.getStatusDisplay(newStatus)}" ?`)) {
      return;
    }

    try {
      await this.appointmentService.updateAppointmentStatus(appointment.id, newStatus);
      
      // Mettre à jour localement
      const index = this.appointments.findIndex(a => a.id === appointment.id);
      if (index !== -1) {
        this.appointments[index].status = newStatus;
      }
      
      this.enrichAppointmentsWithDetails();
      this.filterAppointments();
      this.calculateStats();
      
      alert('Statut du rendez-vous mis à jour avec succès');
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert('Erreur lors de la mise à jour du rendez-vous');
    }
  }

  async cancelAppointment(appointment: Appointment) {
    if (!confirm(`Êtes-vous sûr de vouloir annuler ce rendez-vous ?`)) {
      return;
    }

    try {
      await this.appointmentService.updateAppointmentStatus(appointment.id, 'cancelled');
      
      // Mettre à jour localement
      const index = this.appointments.findIndex(a => a.id === appointment.id);
      if (index !== -1) {
        this.appointments[index].status = 'cancelled';
      }
      
      this.enrichAppointmentsWithDetails();
      this.filterAppointments();
      this.calculateStats();
      
      alert('Rendez-vous annulé avec succès');
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      alert('Erreur lors de l\'annulation du rendez-vous');
    }
  }

  async deleteAppointment(appointment: Appointment) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement ce rendez-vous ?`)) {
      return;
    }

    try {
      await this.appointmentService.deleteAppointment(appointment.id);
      
      // Mettre à jour localement
      this.appointments = this.appointments.filter(a => a.id !== appointment.id);
      this.enrichAppointmentsWithDetails();
      this.filterAppointments();
      this.calculateStats();
      
      alert('Rendez-vous supprimé avec succès');
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('Erreur lors de la suppression du rendez-vous');
    }
  }

  async addNotes(appointment: Appointment) {
    this.selectedAppointment = appointment;
    this.notesText = appointment.notes || '';
    this.showNotesModal = true;
  }

  async saveNotes() {
    if (!this.selectedAppointment) return;

    try {
      await this.appointmentService.addNotesToAppointment(this.selectedAppointment.id, this.notesText);
      
      // Mettre à jour localement
      const index = this.appointments.findIndex(a => a.id === this.selectedAppointment!.id);
      if (index !== -1) {
        this.appointments[index].notes = this.notesText;
      }
      
      this.enrichAppointmentsWithDetails();
      this.closeNotesModal();
      alert('Notes ajoutées avec succès');
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Erreur lors de l\'ajout des notes');
    }
  }

  closeNotesModal() {
    this.showNotesModal = false;
    this.selectedAppointment = null;
    this.notesText = '';
  }

  viewAppointmentDetails(appointment: AppointmentWithDetails) {
    const details = `
      Détails du rendez-vous:
      
      Patient: ${appointment.patientName}
      Email: ${appointment.patientEmail}
      Médecin: ${appointment.doctorName}
      Spécialité: ${appointment.doctorSpeciality}
      Date: ${appointment.formattedDate}
      Heure: ${appointment.time}
      Statut: ${this.getStatusDisplay(appointment.status)}
      Motif: ${appointment.reason}
      ${appointment.notes ? `Notes: ${appointment.notes}` : 'Aucune note'}
      Créé le: ${this.getFormattedDate(appointment.createdAt)}
    `;
    
    alert(details);
  }

  // Utilitaires
  calculateStats() {
    const today = new Date().toDateString();
    
    this.appointmentStats = {
      total: this.appointments.length,
      pending: this.appointments.filter(a => a.status === 'pending').length,
      confirmed: this.appointments.filter(a => a.status === 'confirmed').length,
      completed: this.appointments.filter(a => a.status === 'completed').length,
      cancelled: this.appointments.filter(a => a.status === 'cancelled').length,
      today: this.appointments.filter(a => 
        new Date(a.date).toDateString() === today
      ).length
    };
  }

  getStatusDisplay(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'En attente',
      'confirmed': 'Confirmé',
      'completed': 'Terminé',
      'cancelled': 'Annulé'
    };
    return statusMap[status] || status;
  }

  getStatusBadgeClass(status: string): string {
    return `status-${status}`;
  }

  getFormattedDate(date: any): string {
    if (!date) return 'N/A';
    
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return dateObj.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Date invalide';
    }
  }

  isPastAppointment(appointment: Appointment): boolean {
    const appointmentDateTime = new Date(appointment.date);
    return appointmentDateTime < new Date();
  }

  // Pagination
  get paginatedAppointments() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredAppointments.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages() {
    return Math.ceil(this.filteredAppointments.length / this.itemsPerPage);
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

  // Vue
  switchView(mode: 'table' | 'card') {
    this.viewMode = mode;
  }

  // Export et autres fonctionnalités
  exportAppointments() {
    alert('Fonctionnalité d\'export à implémenter');
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedDoctor = '';
    this.selectedDate = '';
    this.dateRange = { start: '', end: '' };
    this.filterAppointments();
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
}