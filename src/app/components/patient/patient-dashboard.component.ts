import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { AppointmentService } from '../../services/appointment.service';
import { NotificationService } from '../../services/notification.service';
import { User, Doctor, Appointment, MedicalRecord } from '../../models/user.model';
import { Timestamp } from 'firebase/firestore';
@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-dashboard.component.html',
  styleUrls: ['./patient-dashboard.component.css']
})
export class PatientDashboardComponent implements OnInit {
  medicalRecords: MedicalRecord[] = [];

  currentUser: User | null = null;
  activeTab = 'medical';

  tabs = [
    { id: 'medical', label: 'Dossier médical' },
    { id: 'appointments', label: 'Rendez-vous' }
  ];

  showAddRecordForm = false;
  newRecord = {
    date: '',
    type: '',
    description: '',
    notes: ''
  };

  appointments: Appointment[] = [];
  showBookAppointment = false;
  bookingStep = 1;
  specialities = ['Cardiologie', 'Dermatologie', 'Pédiatrie', 'Neurologie', 'Orthopédie', 'Gynécologie', 'Psychiatrie'];
  availableDoctors: Doctor[] = [];
  selectedSpeciality = '';
  selectedDoctor: Doctor | null = null;
  minDate = new Date().toISOString().split('T')[0];

  newAppointment = {
    date: '',
    time: '',
    reason: ''
  };

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private appointmentService: AppointmentService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadPatientData();
      }
    });
  }

async loadPatientData() {
  if (!this.currentUser) return;

  try {
    // Récupération brute des rendez-vous (avec potentiellement des Timestamp Firestore)
    const rawAppointments = await this.appointmentService.getAppointmentsByPatient(this.currentUser.uid);

    // Conversion des Timestamp Firestore en Date JS
    this.appointments = rawAppointments.map(appointment => ({
      ...appointment,
      date: appointment.date instanceof Timestamp ? appointment.date.toDate() : new Date(appointment.date),
      createdAt: appointment.createdAt instanceof Timestamp ? appointment.createdAt.toDate() : new Date(appointment.createdAt)
    }));

    // Exemple de données simulées pour les dossiers médicaux (avec Date JS)
    this.medicalRecords = [
      {
        id: '1',
        patientId: this.currentUser.uid,
        doctorId: 'doctor1',
        date: new Date('2025-07-17'),
        type: 'Vaccination',
        description: 'Vaccination contre la leucemie',
      }
    ]
.map(record => ({
      ...record,
      date: record.date instanceof Timestamp ? record.date.toDate() : new Date(record.date)
    }));

  } catch (error) {
    console.error('Erreur lors du chargement des données:', error);
  }
}

  addMedicalRecord() {
    if (!this.newRecord.date || !this.newRecord.type || !this.newRecord.description) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    if (!this.currentUser) {
      alert('Utilisateur non connecté');
      return;
    }

    const record: MedicalRecord = {
      id: Date.now().toString(),
      patientId: this.currentUser.uid,
      doctorId: '', // À remplir si nécessaire
      date: new Date(this.newRecord.date),
      type: this.newRecord.type,
      description: this.newRecord.description,
      notes: this.newRecord.notes || ''
    };

    this.medicalRecords.unshift(record);
    this.cancelAddRecord();
  }

  cancelAddRecord() {
    this.showAddRecordForm = false;
    this.newRecord = {
      date: '',
      type: '',
      description: '',
      notes: ''
    };
  }

  deleteMedicalRecord(recordId: string) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet antécédent?')) {
      this.medicalRecords = this.medicalRecords.filter(record => record.id !== recordId);
    }
  }

  async selectSpeciality(speciality: string) {
    this.selectedSpeciality = speciality;

    try {
      this.availableDoctors = await this.userService.getDoctorsBySpeciality(speciality);
      this.bookingStep = 2;
    } catch (error) {
      console.error('Erreur lors du chargement des médecins:', error);
    }
  }

  selectDoctor(doctor: Doctor) {
    this.selectedDoctor = doctor;
    this.bookingStep = 3;
  }

  async bookAppointment() {
    if (!this.currentUser || !this.selectedDoctor) return;

    if (!this.newAppointment.date || !this.newAppointment.time || !this.newAppointment.reason) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      const appointmentData = {
        patientId: this.currentUser.uid,
        doctorId: this.selectedDoctor.uid,
        date: new Date(this.newAppointment.date),
        time: this.newAppointment.time,
        reason: this.newAppointment.reason,
        status: 'pending' as const,
        createdAt: new Date()
      };

      await this.appointmentService.createAppointment(appointmentData);

      await this.notificationService.sendAppointmentNotification(
        this.selectedDoctor.uid,
        this.currentUser.displayName,
        new Date(this.newAppointment.date)
      );

      await this.loadPatientData();
      this.cancelBooking();
      alert('Demande de rendez-vous envoyée avec succès!');
    } catch (error) {
      console.error('Erreur lors de la prise de rendez-vous:', error);
      alert('Erreur lors de la prise de rendez-vous');
    }
  }

  cancelBooking() {
    this.showBookAppointment = false;
    this.bookingStep = 1;
    this.selectedSpeciality = '';
    this.selectedDoctor = null;
    this.availableDoctors = [];
    this.newAppointment = {
      date: '',
      time: '',
      reason: ''
    };
  }

  async cancelAppointment(appointmentId: string) {
    if (!confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous?')) return;

    try {
      await this.appointmentService.updateAppointmentStatus(appointmentId, 'cancelled');
      await this.loadPatientData();
    } catch (error) {
      console.error('Erreur lors de l\'annulation:', error);
      alert('Erreur lors de l\'annulation du rendez-vous');
    }
  }

  getSpecialityIcon(speciality: string): string {
    const icons: { [key: string]: string } = {
      'Cardiologie': '❤️',
      'Dermatologie': '🩺',
      'Pédiatrie': '👶',
      'Neurologie': '🧠',
      'Orthopédie': '🦴',
      'Gynécologie': '🏥',
      'Psychiatrie': '💭'
    };
    return icons[speciality] || '🏥';
  }

  getDoctorName(doctorId: string): string {
    const doctor = this.availableDoctors.find(d => d.uid === doctorId);
    return doctor?.displayName || 'Médecin';
  }

  getStatusDisplay(status: string): string {
    switch (status) {
      case 'pending': return 'En attente';
      case 'confirmed': return 'Confirmé';
      case 'cancelled': return 'Annulé';
      case 'completed': return 'Terminé';
      default: return status;
    }
  }
}
