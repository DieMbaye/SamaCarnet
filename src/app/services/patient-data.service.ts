// patient-data.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User, Appointment, Doctor } from '../models/user.model';
import { AuthService } from './auth.service';
import { AppointmentService } from './appointment.service';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class PatientDataService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private appointmentsSubject = new BehaviorSubject<Appointment[]>([]);
  private doctorsSubject = new BehaviorSubject<Doctor[]>([]);

  currentUser$ = this.currentUserSubject.asObservable();
  appointments$ = this.appointmentsSubject.asObservable();
  doctors$ = this.doctorsSubject.asObservable();

  constructor(
    private authService: AuthService,
    private appointmentService: AppointmentService,
    private userService: UserService
  ) {
    // S'abonner aux changements d'utilisateur
    this.authService.currentUser$.subscribe(user => {
      if (user?.role === 'patient') {
        this.currentUserSubject.next(user);
        this.loadPatientData(user.uid);
      } else {
        this.currentUserSubject.next(null);
        this.clearData();
      }
    });
  }

  // Charger toutes les données du patient
  async loadPatientData(patientId: string) {
    try {
      const [appointments, doctors] = await Promise.all([
        this.appointmentService.getAppointmentsByPatient(patientId),
        this.userService.getUsersByRole('doctor')
      ]);

      this.appointmentsSubject.next(appointments);
      this.doctorsSubject.next(doctors as Doctor[]);
    } catch (error) {
      console.error('Erreur lors du chargement des données patient:', error);
      this.clearData();
    }
  }

  // Rafraîchir les données
  async refreshData() {
    const currentUser = this.currentUserSubject.value;
    if (currentUser) {
      await this.loadPatientData(currentUser.uid);
    }
  }

  // Obtenir les données actuelles
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getAppointments(): Appointment[] {
    return this.appointmentsSubject.value;
  }

  getDoctors(): Doctor[] {
    return this.doctorsSubject.value;
  }

  // Effacer les données
  private clearData() {
    this.appointmentsSubject.next([]);
    this.doctorsSubject.next([]);
  }
}