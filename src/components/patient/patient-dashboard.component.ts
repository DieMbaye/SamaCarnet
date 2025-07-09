import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { AppointmentService } from '../../services/appointment.service';
import { NotificationService } from '../../services/notification.service';
import { User, Doctor, Appointment, MedicalRecord } from '../../models/user.model';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="patient-dashboard">
      <div class="dashboard-header">
        <h1>Bienvenue, {{ currentUser?.displayName }}</h1>
        <p>Gérez vos rendez-vous et votre dossier médical</p>
      </div>

      <div class="dashboard-tabs">
        <button 
          *ngFor="let tab of tabs"
          class="tab-btn"
          [class.active]="activeTab === tab.id"
          (click)="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Section Dossier Médical -->
      <div class="tab-content" *ngIf="activeTab === 'medical'">
        <div class="section-header">
          <h2>Mon dossier médical</h2>
          <button class="add-btn" (click)="showAddRecordForm = true">
            Ajouter un antécédent
          </button>
        </div>

        <!-- Formulaire d'ajout d'antécédent -->
        <div class="add-record-form" *ngIf="showAddRecordForm">
          <h3>Nouvel antécédent médical</h3>
          <form (ngSubmit)="addMedicalRecord()" class="record-form">
            <div class="form-row">
              <div class="form-group">
                <label>Date</label>
                <input 
                  type="date" 
                  [(ngModel)]="newRecord.date"
                  name="date"
                  required
                  class="form-input"
                >
              </div>
              
              <div class="form-group">
                <label>Type</label>
                <select 
                  [(ngModel)]="newRecord.type"
                  name="type"
                  required
                  class="form-select"
                >
                  <option value="Maladie">Maladie</option>
                  <option value="Chirurgie">Chirurgie</option>
                  <option value="Allergie">Allergie</option>
                  <option value="Vaccination">Vaccination</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label>Description</label>
              <textarea 
                [(ngModel)]="newRecord.description"
                name="description"
                required
                class="form-textarea"
                rows="3"
              ></textarea>
            </div>
            
            <div class="form-actions">
              <button type="submit" class="submit-btn">Ajouter</button>
              <button type="button" class="cancel-btn" (click)="cancelAddRecord()">Annuler</button>
            </div>
          </form>
        </div>

        <!-- Liste des antécédents -->
        <div class="medical-records">
          <div *ngFor="let record of medicalRecords" class="record-card">
            <div class="record-header">
              <h4>{{ record.type }}</h4>
              <span class="record-date">{{ record.date | date:'longDate':'fr' }}</span>
            </div>
            <p class="record-description">{{ record.description }}</p>
            <button class="delete-record-btn" (click)="deleteMedicalRecord(record.id)">
              Supprimer
            </button>
          </div>
          
          <div *ngIf="medicalRecords.length === 0" class="no-records">
            <p>Aucun antécédent médical enregistré</p>
          </div>
        </div>
      </div>

      <!-- Section Rendez-vous -->
      <div class="tab-content" *ngIf="activeTab === 'appointments'">
        <div class="section-header">
          <h2>Mes rendez-vous</h2>
          <button class="add-btn" (click)="showBookAppointment = true">
            Prendre rendez-vous
          </button>
        </div>

        <!-- Formulaire de prise de rendez-vous -->
        <div class="book-appointment" *ngIf="showBookAppointment">
          <h3>Prendre un rendez-vous</h3>
          
          <div class="booking-steps">
            <div class="step" [class.active]="bookingStep === 1">
              <div class="step-number">1</div>
              <span>Spécialité</span>
            </div>
            <div class="step" [class.active]="bookingStep === 2">
              <div class="step-number">2</div>
              <span>Médecin</span>
            </div>
            <div class="step" [class.active]="bookingStep === 3">
              <div class="step-number">3</div>
              <span>Date & Heure</span>
            </div>
          </div>

          <!-- Étape 1: Choisir la spécialité -->
          <div class="step-content" *ngIf="bookingStep === 1">
            <h4>Choisissez une spécialité</h4>
            <div class="specialities-grid">
              <div 
                *ngFor="let speciality of specialities"
                class="speciality-option"
                (click)="selectSpeciality(speciality)"
              >
                <div class="speciality-icon">{{ getSpecialityIcon(speciality) }}</div>
                <span>{{ speciality }}</span>
              </div>
            </div>
          </div>

          <!-- Étape 2: Choisir le médecin -->
          <div class="step-content" *ngIf="bookingStep === 2">
            <h4>Choisissez un médecin</h4>
            <div class="doctors-list">
              <div 
                *ngFor="let doctor of availableDoctors"
                class="doctor-card"
                (click)="selectDoctor(doctor)"
              >
                <div class="doctor-info">
                  <h5>Dr. {{ doctor.displayName }}</h5>
                  <p>{{ doctor.speciality }}</p>
                  <span class="doctor-experience">{{ doctor.experience }} ans d'expérience</span>
                </div>
                <button class="select-doctor-btn">Choisir</button>
              </div>
            </div>
          </div>

          <!-- Étape 3: Choisir date et heure -->
          <div class="step-content" *ngIf="bookingStep === 3">
            <h4>Choisissez la date et l'heure</h4>
            <form (ngSubmit)="bookAppointment()" class="appointment-form">
              <div class="form-row">
                <div class="form-group">
                  <label>Date</label>
                  <input 
                    type="date" 
                    [(ngModel)]="newAppointment.date"
                    name="date"
                    required
                    class="form-input"
                    [min]="minDate"
                  >
                </div>
                
                <div class="form-group">
                  <label>Heure</label>
                  <select 
                    [(ngModel)]="newAppointment.time"
                    name="time"
                    required
                    class="form-select"
                  >
                    <option value="09:00">09:00</option>
                    <option value="10:00">10:00</option>
                    <option value="11:00">11:00</option>
                    <option value="14:00">14:00</option>
                    <option value="15:00">15:00</option>
                    <option value="16:00">16:00</option>
                    <option value="17:00">17:00</option>
                  </select>
                </div>
              </div>
              
              <div class="form-group">
                <label>Motif de la consultation</label>
                <textarea 
                  [(ngModel)]="newAppointment.reason"
                  name="reason"
                  required
                  class="form-textarea"
                  rows="3"
                ></textarea>
              </div>
              
              <div class="form-actions">
                <button type="submit" class="submit-btn">Confirmer le rendez-vous</button>
                <button type="button" class="cancel-btn" (click)="cancelBooking()">Annuler</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Liste des rendez-vous -->
        <div class="appointments-list">
          <div *ngFor="let appointment of appointments" class="appointment-card">
            <div class="appointment-header">
              <h4>Dr. {{ getDoctorName(appointment.doctorId) }}</h4>
              <span class="appointment-status" [class]="'status-' + appointment.status">
                {{ getStatusDisplay(appointment.status) }}
              </span>
            </div>
            <div class="appointment-details">
              <p><strong>Date:</strong> {{ appointment.date | date:'longDate':'fr' }}</p>
              <p><strong>Heure:</strong> {{ appointment.time }}</p>
              <p><strong>Motif:</strong> {{ appointment.reason }}</p>
            </div>
            <div class="appointment-actions">
              <button 
                *ngIf="appointment.status === 'pending' || appointment.status === 'confirmed'"
                class="cancel-appointment-btn"
                (click)="cancelAppointment(appointment.id)"
              >
                Annuler
              </button>
            </div>
          </div>
          
          <div *ngIf="appointments.length === 0" class="no-appointments">
            <p>Aucun rendez-vous programmé</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .patient-dashboard {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .dashboard-header {
      text-align: center;
      margin-bottom: 2rem;
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

    .dashboard-tabs {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .tab-btn {
      background: white;
      border: 2px solid #e5e7eb;
      color: #6b7280;
      padding: 1rem 2rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .tab-btn.active {
      background: #2563eb;
      border-color: #2563eb;
      color: white;
    }

    .tab-btn:hover {
      border-color: #2563eb;
    }

    .tab-content {
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

    .add-record-form, .book-appointment {
      background: #f9fafb;
      border-radius: 0.5rem;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .add-record-form h3, .book-appointment h3 {
      color: #1f2937;
      margin-bottom: 1.5rem;
      font-size: 1.2rem;
    }

    .record-form, .appointment-form {
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

    .form-input, .form-select, .form-textarea {
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.5rem;
      font-size: 1rem;
    }

    .form-input:focus, .form-select:focus, .form-textarea:focus {
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

    .submit-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
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

    .medical-records {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .record-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      padding: 1.5rem;
      position: relative;
    }

    .record-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .record-header h4 {
      color: #1f2937;
      margin: 0;
      font-size: 1.1rem;
    }

    .record-date {
      color: #6b7280;
      font-size: 0.9rem;
    }

    .record-description {
      color: #374151;
      line-height: 1.6;
      margin-bottom: 1rem;
    }

    .delete-record-btn {
      background: #ef4444;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
    }

    .delete-record-btn:hover {
      background: #dc2626;
    }

    .booking-steps {
      display: flex;
      justify-content: center;
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      opacity: 0.5;
      transition: opacity 0.2s;
    }

    .step.active {
      opacity: 1;
    }

    .step-number {
      background: #e5e7eb;
      color: #6b7280;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      transition: all 0.2s;
    }

    .step.active .step-number {
      background: #2563eb;
      color: white;
    }

    .step-content {
      margin-top: 1rem;
    }

    .step-content h4 {
      color: #1f2937;
      margin-bottom: 1.5rem;
      font-size: 1.1rem;
    }

    .specialities-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .speciality-option {
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 0.5rem;
      padding: 1.5rem;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }

    .speciality-option:hover {
      border-color: #2563eb;
      transform: translateY(-2px);
    }

    .speciality-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .doctors-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .doctor-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      padding: 1.5rem;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .doctor-card:hover {
      border-color: #2563eb;
      transform: translateY(-1px);
    }

    .doctor-info h5 {
      color: #1f2937;
      margin: 0 0 0.5rem 0;
      font-size: 1.1rem;
    }

    .doctor-info p {
      color: #6b7280;
      margin: 0 0 0.5rem 0;
      font-size: 0.9rem;
    }

    .doctor-experience {
      color: #10b981;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .select-doctor-btn {
      background: #2563eb;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    .select-doctor-btn:hover {
      background: #1d4ed8;
    }

    .appointments-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .appointment-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      padding: 1.5rem;
    }

    .appointment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .appointment-header h4 {
      color: #1f2937;
      margin: 0;
      font-size: 1.1rem;
    }

    .appointment-status {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-pending {
      background: #fef3c7;
      color: #92400e;
    }

    .status-confirmed {
      background: #d1fae5;
      color: #065f46;
    }

    .status-cancelled {
      background: #fee2e2;
      color: #dc2626;
    }

    .status-completed {
      background: #dbeafe;
      color: #1e40af;
    }

    .appointment-details {
      margin-bottom: 1rem;
    }

    .appointment-details p {
      margin: 0.5rem 0;
      color: #374151;
    }

    .cancel-appointment-btn {
      background: #ef4444;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
    }

    .cancel-appointment-btn:hover {
      background: #dc2626;
    }

    .no-records, .no-appointments {
      text-align: center;
      padding: 3rem;
      color: #6b7280;
    }

    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }
      
      .section-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }
      
      .booking-steps {
        flex-direction: column;
        gap: 1rem;
      }
      
      .specialities-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PatientDashboardComponent implements OnInit {
  currentUser: User | null = null;
  activeTab = 'medical';
  
  tabs = [
    { id: 'medical', label: 'Dossier médical' },
    { id: 'appointments', label: 'Rendez-vous' }
  ];

  // Dossier médical
  medicalRecords: {
    id: string;
    date: string;
    type: string;
    description: string;
  }[] = [];
  showAddRecordForm = false;
  newRecord = {
    date: '',
    type: '',
    description: ''
  };

  // Rendez-vous
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
      // Charger les rendez-vous
      this.appointments = await this.appointmentService.getAppointmentsByPatient(this.currentUser.uid);
      
      // Simuler des antécédents médicaux (à remplacer par un vrai service)
      this.medicalRecords = [
        {
          id: '1',
          date: new Date('2024-01-15').toISOString(),
          type: 'Vaccination',
          description: 'Vaccination contre la grippe saisonnière'
        },
        {
          id: '2',
          date: new Date('2023-12-10').toISOString(),
          type: 'Allergie',
          description: 'Allergie aux acariens diagnostiquée'
        }
      ];
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  }

  // Gestion du dossier médical
  addMedicalRecord() {
    if (!this.newRecord.date || !this.newRecord.type || !this.newRecord.description) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    const record = {
      id: Date.now().toString(),
      date: this.newRecord.date,
      type: this.newRecord.type,
      description: this.newRecord.description
    };

    this.medicalRecords.unshift(record);
    this.cancelAddRecord();
  }

  cancelAddRecord() {
    this.showAddRecordForm = false;
    this.newRecord = {
      date: '',
      type: '',
      description: ''
    };
  }

  deleteMedicalRecord(recordId: string) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet antécédent?')) {
      this.medicalRecords = this.medicalRecords.filter(record => record.id !== recordId);
    }
  }

  // Gestion des rendez-vous
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
      
      // Envoyer une notification au médecin
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

  // Utilitaires
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