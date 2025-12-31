import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Doctor, Appointment, User } from '../../../models/user.model';
import { AppointmentService } from '../../../services/appointment.service';
import { UserService } from '../../../services/user.service';
import { PatientDataService } from '../../../services/patient-data.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-patient-overview',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './patient-overview.component.html',
  styleUrls: ['./patient-overview.component.css']
})
export class PatientOverviewComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  appointments: Appointment[] = [];
  doctors: Doctor[] = [];
  upcomingAppointments: (Appointment & { doctorName: string; doctor?: Doctor })[] = [];
  
  stats = {
    upcomingAppointments: 0,
    medicalRecords: 0,
    activeDoctors: 0
  };
  
  isLoading = true;
  isLoadingData = false;
  
  // Pour le rafraîchissement automatique
  private refreshInterval: any;
  private subscriptions: Subscription[] = [];

  constructor(
    private appointmentService: AppointmentService,
    private userService: UserService,
    private patientDataService: PatientDataService,
    private router: Router
  ) {}

  async ngOnInit() {
    
    // S'abonner aux changements de l'utilisateur
    const userSub = this.patientDataService.currentUser$.subscribe({
      next: (user) => {
        this.currentUser = user;
        if (user) {
          this.loadPatientData(user.uid);
        } else {
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error);
        this.isLoading = false;
      }
    });
    
    this.subscriptions.push(userSub);
    
    // Lancer le rafraîchissement automatique
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    // Nettoyer les abonnements
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Arrêter le rafraîchissement automatique
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  // Charger toutes les données du patient
  async loadPatientData(patientId: string) {
    if (!patientId) {
      console.error('Patient ID manquant');
      this.isLoading = false;
      return;
    }

    this.isLoadingData = true;

    try {
      // Charger les données en parallèle
      const [appointments, doctors] = await Promise.all([
        this.appointmentService.getAppointmentsByPatient(patientId),
        this.userService.getUsersByRole('doctor') as Promise<Doctor[]>
      ]);

      this.appointments = appointments;
      this.doctors = doctors;
      
      // Préparer les données pour l'affichage
      this.prepareDisplayData();
      
    } catch (error) {
      // En cas d'erreur, réessayer après un délai
      setTimeout(() => {
        if (this.currentUser) {
          this.loadPatientData(this.currentUser.uid);
        }
      }, 5000);
    } finally {
      this.isLoading = false;
      this.isLoadingData = false;
    }
  }

  // Préparer les données pour l'affichage
  prepareDisplayData() {
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Convertir et trier tous les rendez-vous
    const allAppointments = this.appointments.map(app => ({
      ...app,
      date: this.convertToDate(app.date)
    })).sort((a, b) => a.date.getTime() - b.date.getTime());

    // Filtrer les rendez-vous à venir
    const upcoming = allAppointments.filter(app => {
      const appDate = app.date;
      return appDate >= today && 
             app.status !== 'cancelled' && 
             app.status !== 'completed';
    });


    // Préparer les 3 prochains rendez-vous avec les infos du médecin
    this.upcomingAppointments = upcoming.slice(0, 3).map(app => {
      const doctor = this.doctors.find(d => d.uid === app.doctorId);
      return {
        ...app,
        doctorName: doctor ? `Dr. ${doctor.displayName}` : 'Médecin inconnu',
        doctor: doctor
      };
    });

    // Calculer les statistiques
    const uniqueDoctorIds = new Set<string>();
    this.appointments.forEach(app => {
      if (app.doctorId) uniqueDoctorIds.add(app.doctorId);
    });

    this.stats = {
      upcomingAppointments: upcoming.length,
      medicalRecords: this.getMedicalRecordsCount(),
      activeDoctors: uniqueDoctorIds.size
    };

  }

  // Convertir n'importe quelle date en Date
  private convertToDate(dateInput: any): Date {
    if (!dateInput) return new Date();
    
    if (dateInput instanceof Date) {
      return dateInput;
    }
    
    if (dateInput && typeof dateInput === 'object' && 'toDate' in dateInput) {
      return dateInput.toDate();
    }
    
    if (typeof dateInput === 'string' || typeof dateInput === 'number') {
      const date = new Date(dateInput);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    
    console.warn('Format de date non reconnu:', dateInput);
    return new Date();
  }

  // Méthode pour obtenir le nombre de documents médicaux (à adapter)
  private getMedicalRecordsCount(): number {
    // À implémenter avec votre service de documents médicaux
    // Pour l'instant, on simule avec un compteur basé sur les rendez-vous
    const completedAppointments = this.appointments.filter(app => 
      app.status === 'completed'
    ).length;
    
    return completedAppointments;
  }

  // Rafraîchissement automatique
  private startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      if (this.currentUser && !this.isLoadingData) {
        this.loadPatientData(this.currentUser.uid);
      }
    }, 300000); // 5 minutes
  }

  // Méthodes de navigation
  navigateToAppointments() {
    this.router.navigate(['/patient/appointments']);
  }

  navigateToMedicalRecords() {
    this.router.navigate(['/patient/medical-records']);
  }

  navigateToFindDoctor() {
    this.router.navigate(['/patient/find-doctor']);
  }

  navigateToPrescriptions() {
    this.router.navigate(['/patient/prescriptions']);
  }

  // Méthode pour afficher le statut
  getStatusDisplay(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'En attente',
      'confirmed': 'Confirmé',
      'cancelled': 'Annulé',
      'completed': 'Terminé'
    };
    return statusMap[status] || status;
  }

  // Rafraîchir manuellement
  async onRefresh() {
    if (!this.currentUser || this.isLoadingData) return;
    
    this.isLoadingData = true;
    await this.loadPatientData(this.currentUser.uid);
  }

  // Formater la date pour l'affichage
  formatDate(date: any): string {
    const dateObj = this.convertToDate(date);
    return dateObj.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // Obtenir l'heure du rendez-vous
  getAppointmentTime(time: string): string {
    if (!time) return '';
    
    // Si le format est HH:MM, le retourner tel quel
    if (time.match(/^\d{1,2}:\d{2}$/)) {
      return time;
    }
    
    // Sinon essayer de parser
    const timeParts = time.split(':');
    if (timeParts.length >= 2) {
      return `${timeParts[0].padStart(2, '0')}:${timeParts[1]}`;
    }
    
    return '--:--';
  }
}