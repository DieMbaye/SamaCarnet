import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Doctor, User, Appointment, MedicalRecord } from "../../../models/user.model";
import { UserService } from "../../../services/user.service";
import { AppointmentService } from "../../../services/appointment.service";
import { MedicalRecordService } from "../../../services/medical-record.service";
import { AuthService } from "../../../services/auth.service";

@Component({
  selector: 'app-doctor-patients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-patients.component.html',
  styleUrls: ['./doctor-patients.component.css']
})
export class DoctorPatientsComponent implements OnInit, OnDestroy {
  currentUser: Doctor | null = null;
  
  patients: User[] = [];
  appointments: Appointment[] = [];
  medicalRecords: MedicalRecord[] = [];
  
  searchTerm = '';
  filteredPatients: User[] = [];
  
  // Modal states
  showMedicalRecordModal = false;
  showAppointmentModal = false;
  selectedPatient: User | null = null;
  
  // Loading states
  isLoading = false;

  constructor(
    private userService: UserService,
    private appointmentService: AppointmentService,
    private medicalRecordService: MedicalRecordService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // S'abonner aux changements d'utilisateur
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user as Doctor;
      if (this.currentUser) {
        this.loadPatientsData();
      }
    });
  }

  ngOnDestroy() {
    // Nettoyage si nécessaire
  }

  async loadPatientsData() {
    if (!this.currentUser) return;

    this.isLoading = true;
    try {
      await Promise.all([
        this.loadPatients(),
        this.loadAppointments(),
        this.loadMedicalRecords()
      ]);
      
      this.filterPatients();
    } catch (error) {
      console.error('Erreur lors du chargement des patients:', error);
      this.loadDemoData();
    } finally {
      this.isLoading = false;
    }
  }

  async loadPatients() {
    this.patients = await this.userService.getUsersByRole('patient');
  }

  async loadAppointments() {
    if (!this.currentUser) return;
    
    this.appointments = await this.appointmentService.getAppointmentsByDoctor(
      this.currentUser.uid
    );
  }

  async loadMedicalRecords() {
    if (!this.currentUser) return;
    
    this.medicalRecords = await this.medicalRecordService.getMedicalRecordsByDoctor(
      this.currentUser.uid
    );
  }

  filterPatients() {
    if (!this.searchTerm.trim()) {
      this.filteredPatients = this.patients;
    } else {
      const searchLower = this.searchTerm.toLowerCase();
      this.filteredPatients = this.patients.filter(patient =>
        patient.displayName.toLowerCase().includes(searchLower) ||
        patient.email.toLowerCase().includes(searchLower)
      );
    }
  }

  onSearchChange() {
    this.filterPatients();
  }

  // Patient statistics
  getPatientAppointments(patientId: string): Appointment[] {
    return this.appointments.filter(app => app.patientId === patientId);
  }

  getPatientMedicalRecords(patientId: string): MedicalRecord[] {
    return this.medicalRecords.filter(record => record.patientId === patientId);
  }

  calculatePatientAge(patientId: string): string {
    const patient = this.patients.find(p => p.uid === patientId);
    if (patient && patient.birthDate) {
      const birthDate = new Date(patient.birthDate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age.toString();
    }
    return '?';
  }

  getLastAppointmentDate(patientId: string): string {
    const patientAppointments = this.getPatientAppointments(patientId)
      .filter(app => app.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (patientAppointments.length > 0) {
      return new Date(patientAppointments[0].date).toLocaleDateString('fr-FR');
    }
    return 'Aucun';
  }

  // Modal methods
  showMedicalRecordForm(patient: User) {
    this.selectedPatient = patient;
    this.showMedicalRecordModal = true;
  }

  showAppointmentForm(patient: User) {
    this.selectedPatient = patient;
    this.showAppointmentModal = true;
  }

  closeMedicalRecordModal() {
    this.showMedicalRecordModal = false;
    this.selectedPatient = null;
  }

  closeAppointmentModal() {
    this.showAppointmentModal = false;
    this.selectedPatient = null;
  }

  // Refresh method
  async refreshData() {
    await this.loadPatientsData();
  }

  // Convertir les dates si nécessaire
  private convertToDate(date: any): Date {
    if (date instanceof Date) return date;
    if (date?.toDate) return date.toDate();
    if (typeof date === 'string') return new Date(date);
    return new Date();
  }

  // Demo data
  private loadDemoData() {
    this.patients = [
      {
        uid: 'patient1',
        displayName: 'Marie Dupont',
        email: 'marie@email.com',
        role: 'patient',
        birthDate: new Date('1985-05-15'),
        createdAt: new Date()
      },
      {
        uid: 'patient2',
        displayName: 'Jean Martin',
        email: 'jean@email.com',
        role: 'patient',
        birthDate: new Date('1978-10-22'),
        createdAt: new Date()
      },
      {
        uid: 'patient3',
        displayName: 'Sophie Laurent',
        email: 'sophie@email.com',
        role: 'patient',
        birthDate: new Date('1990-03-08'),
        createdAt: new Date()
      }
    ];

    this.appointments = [
      {
        id: '1',
        patientId: 'patient1',
        doctorId: this.currentUser?.uid || '',
        date: new Date(),
        time: '09:00',
        reason: 'Consultation générale',
        status: 'completed',
        createdAt: new Date()
      },
      {
        id: '2',
        patientId: 'patient2',
        doctorId: this.currentUser?.uid || '',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 semaine avant
        time: '14:30',
        reason: 'Suivi',
        status: 'completed',
        createdAt: new Date()
      }
    ];

    this.medicalRecords = [
      {
        id: '1',
        patientId: 'patient1',
        doctorId: this.currentUser?.uid || '',
        date: new Date(),
        type: 'consultation',
        description: 'Examen de routine',
        notes: 'Patient en bonne santé'
      },
      {
        id: '2',
        patientId: 'patient2',
        doctorId: this.currentUser?.uid || '',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        type: 'consultation',
        description: 'Suivi post-opératoire',
        notes: 'Récupération normale'
      }
    ];

    this.filterPatients();
  }
}