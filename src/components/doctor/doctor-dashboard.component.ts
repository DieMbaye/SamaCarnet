import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AppointmentService } from '../../services/appointment.service';
import { NotificationService } from '../../services/notification.service';
import { UserService } from '../../services/user.service';
import { User, Appointment } from '../../models/user.model';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="doctor-dashboard">
      <div class="dashboard-header">
        <h1>Bienvenue, Dr. {{ currentUser?.displayName }}</h1>
        <p>Gérez vos rendez-vous et consultez vos patients</p>
      </div>

      <div class="dashboard-stats">
        <div class="stat-card">
          <div class="stat-icon">📅</div>
          <div class="stat-info">
            <h3>{{ todayAppointments.length }}</h3>
            <p>Rendez-vous aujourd'hui</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">⏰</div>
          <div class="stat-info">
            <h3>{{ pendingAppointments.length }}</h3>
            <p>En attente de confirmation</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <h3>{{ confirmedAppointments.length }}</h3>
            <p>Confirmés</p>
          </div>
        </div>
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

      <!-- Rendez-vous en attente -->
      <div class="tab-content" *ngIf="activeTab === 'pending'">
        <div class="section-header">
          <h2>Rendez-vous en attente de confirmation</h2>
          <span class="count-badge">{{ pendingAppointments.length }}</span>
        </div>

        <div class="appointments-list">
          <div *ngFor="let appointment of pendingAppointments" class="appointment-card pending">
            <div class="appointment-header">
              <h4>{{ getPatientName(appointment.patientId) }}</h4>
              <span class="appointment-date">
                {{ appointment.date | date:'shortDate':'fr' }} à {{ appointment.time }}
              </span>
            </div>
            
            <div class="appointment-details">
              <p><strong>Motif:</strong> {{ appointment.reason }}</p>
              <p><strong>Date de demande:</strong> {{ appointment.createdAt | date:'short':'fr' }}</p>
            </div>
            
            <div class="appointment-actions">
              <button 
                class="confirm-btn"
                (click)="confirmAppointment(appointment)"
              >
                Confirmer
              </button>
              <button 
                class="reject-btn"
                (click)="rejectAppointment(appointment)"
              >
                Refuser
              </button>
            </div>
          </div>
          
          <div *ngIf="pendingAppointments.length === 0" class="no-appointments">
            <p>Aucun rendez-vous en attente</p>
          </div>
        </div>
      </div>

      <!-- Rendez-vous confirmés -->
      <div class="tab-content" *ngIf="activeTab === 'confirmed'">
        <div class="section-header">
          <h2>Rendez-vous confirmés</h2>
          <span class="count-badge">{{ confirmedAppointments.length }}</span>
        </div>

        <div class="appointments-list">
          <div *ngFor="let appointment of confirmedAppointments" class="appointment-card confirmed">
            <div class="appointment-header">
              <h4>{{ getPatientName(appointment.patientId) }}</h4>
              <span class="appointment-date">
                {{ appointment.date | date:'shortDate':'fr' }} à {{ appointment.time }}
              </span>
            </div>
            
            <div class="appointment-details">
              <p><strong>Motif:</strong> {{ appointment.reason }}</p>
              <p *ngIf="appointment.notes"><strong>Notes:</strong> {{ appointment.notes }}</p>
            </div>
            
            <div class="appointment-actions">
              <button 
                class="complete-btn"
                (click)="completeAppointment(appointment)"
              >
                Marquer comme terminé
              </button>
              <button 
                class="notes-btn"
                (click)="showNotesForm(appointment)"
              >
                Ajouter des notes
              </button>
            </div>
          </div>
          
          <div *ngIf="confirmedAppointments.length === 0" class="no-appointments">
            <p>Aucun rendez-vous confirmé</p>
          </div>
        </div>
      </div>

      <!-- Historique -->
      <div class="tab-content" *ngIf="activeTab === 'history'">
        <div class="section-header">
          <h2>Historique des rendez-vous</h2>
          <span class="count-badge">{{ completedAppointments.length }}</span>
        </div>

        <div class="appointments-list">
          <div *ngFor="let appointment of completedAppointments" class="appointment-card completed">
            <div class="appointment-header">
              <h4>{{ getPatientName(appointment.patientId) }}</h4>
              <span class="appointment-date">
                {{ appointment.date | date:'shortDate':'fr' }} à {{ appointment.time }}
              </span>
            </div>
            
            <div class="appointment-details">
              <p><strong>Motif:</strong> {{ appointment.reason }}</p>
              <p *ngIf="appointment.notes"><strong>Notes:</strong> {{ appointment.notes }}</p>
            </div>
            
            <div class="appointment-status">
              <span class="status-badge completed">Terminé</span>
            </div>
          </div>
          
          <div *ngIf="completedAppointments.length === 0" class="no-appointments">
            <p>Aucun rendez-vous terminé</p>
          </div>
        </div>
      </div>

      <!-- Modal pour les notes -->
      <div class="modal-overlay" *ngIf="showNotesModal" (click)="closeNotesModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>Ajouter des notes</h3>
          <p><strong>Patient:</strong> {{ getPatientName(selectedAppointment?.patientId || '') }}</p>
          <p><strong>Date:</strong> {{ selectedAppointment?.date | date:'shortDate':'fr' }}</p>
          
          <div class="form-group">
            <label>Notes de consultation</label>
            <textarea 
              [(ngModel)]="appointmentNotes"
              class="form-textarea"
              rows="4"
              placeholder="Ajoutez vos notes sur la consultation..."
            ></textarea>
          </div>
          
          <div class="modal-actions">
            <button class="submit-btn" (click)="saveNotes()">Enregistrer</button>
            <button class="cancel-btn" (click)="closeNotesModal()">Annuler</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .doctor-dashboard {
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

    .dashboard-stats {
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

    .count-badge {
      background: #2563eb;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .appointments-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .appointment-card {
      border-radius: 0.5rem;
      padding: 1.5rem;
      border-left: 4px solid;
      transition: all 0.2s;
    }

    .appointment-card:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    .appointment-card.pending {
      background: #fef3c7;
      border-left-color: #f59e0b;
    }

    .appointment-card.confirmed {
      background: #d1fae5;
      border-left-color: #10b981;
    }

    .appointment-card.completed {
      background: #dbeafe;
      border-left-color: #2563eb;
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

    .appointment-date {
      color: #6b7280;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .appointment-details {
      margin-bottom: 1rem;
    }

    .appointment-details p {
      margin: 0.5rem 0;
      color: #374151;
    }

    .appointment-actions {
      display: flex;
      gap: 1rem;
    }

    .confirm-btn {
      background: #10b981;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      transition: all 0.2s;
    }

    .confirm-btn:hover {
      background: #059669;
    }

    .reject-btn {
      background: #ef4444;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      transition: all 0.2s;
    }

    .reject-btn:hover {
      background: #dc2626;
    }

    .complete-btn {
      background: #2563eb;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      transition: all 0.2s;
    }

    .complete-btn:hover {
      background: #1d4ed8;
    }

    .notes-btn {
      background: #6b7280;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      transition: all 0.2s;
    }

    .notes-btn:hover {
      background: #4b5563;
    }

    .appointment-status {
      display: flex;
      justify-content: flex-end;
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.completed {
      background: #dbeafe;
      color: #1e40af;
    }

    .no-appointments {
      text-align: center;
      padding: 3rem;
      color: #6b7280;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 1rem;
      padding: 2rem;
      width: 90%;
      max-width: 500px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    }

    .modal-content h3 {
      color: #1f2937;
      margin-bottom: 1rem;
      font-size: 1.2rem;
    }

    .modal-content p {
      color: #6b7280;
      margin-bottom: 0.5rem;
    }

    .form-group {
      margin: 1.5rem 0;
    }

    .form-group label {
      display: block;
      color: #374151;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .form-textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.5rem;
      font-size: 1rem;
      resize: vertical;
    }

    .form-textarea:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .modal-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 1.5rem;
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

    @media (max-width: 768px) {
      .appointment-header {
        flex-direction: column;
        gap: 0.5rem;
        align-items: flex-start;
      }
      
      .appointment-actions {
        flex-direction: column;
      }
      
      .section-header {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
      }
    }
  `]
})
export class DoctorDashboardComponent implements OnInit {
  currentUser: User | null = null;
  activeTab = 'pending';
  
  tabs = [
    { id: 'pending', label: 'En attente' },
    { id: 'confirmed', label: 'Confirmés' },
    { id: 'history', label: 'Historique' }
  ];

  appointments: Appointment[] = [];
  patients: User[] = [];
  
  showNotesModal = false;
  selectedAppointment: Appointment | null = null;
  appointmentNotes = '';

  constructor(
    private authService: AuthService,
    private appointmentService: AppointmentService,
    private notificationService: NotificationService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadDoctorData();
      }
    });
  }

  async loadDoctorData() {
    if (!this.currentUser) return;

    try {
      this.appointments = await this.appointmentService.getAppointmentsByDoctor(this.currentUser.uid);
      this.patients = await this.userService.getUsersByRole('patient');
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  }

  get todayAppointments(): Appointment[] {
    const today = new Date();
    return this.appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      return appointmentDate.toDateString() === today.toDateString() &&
             (appointment.status === 'confirmed' || appointment.status === 'completed');
    });
  }

  get pendingAppointments(): Appointment[] {
    return this.appointments.filter(appointment => appointment.status === 'pending');
  }

  get confirmedAppointments(): Appointment[] {
    return this.appointments.filter(appointment => appointment.status === 'confirmed');
  }

  get completedAppointments(): Appointment[] {
    return this.appointments.filter(appointment => appointment.status === 'completed');
  }

  async confirmAppointment(appointment: Appointment) {
    if (!this.currentUser) return;

    try {
      await this.appointmentService.updateAppointmentStatus(appointment.id, 'confirmed');
      
      // Envoyer notification de confirmation au patient
      const patientName = this.getPatientName(appointment.patientId);
      await this.notificationService.sendConfirmationNotification(
        appointment.patientId,
        this.currentUser.displayName,
        appointment.date
      );

      await this.loadDoctorData();
      alert('Rendez-vous confirmé avec succès!');
    } catch (error) {
      console.error('Erreur lors de la confirmation:', error);
      alert('Erreur lors de la confirmation du rendez-vous');
    }
  }

  async rejectAppointment(appointment: Appointment) {
    if (!confirm('Êtes-vous sûr de vouloir refuser ce rendez-vous?')) return;

    try {
      await this.appointmentService.updateAppointmentStatus(appointment.id, 'cancelled');
      
      // Optionnel: envoyer notification de refus
      await this.notificationService.createNotification({
        userId: appointment.patientId,
        title: 'Rendez-vous refusé',
        message: `Votre rendez-vous du ${appointment.date.toLocaleDateString()} a été refusé`,
        type: 'appointment',
        read: false,
        createdAt: new Date()
      });

      await this.loadDoctorData();
      alert('Rendez-vous refusé');
    } catch (error) {
      console.error('Erreur lors du refus:', error);
      alert('Erreur lors du refus du rendez-vous');
    }
  }

  async completeAppointment(appointment: Appointment) {
    if (!confirm('Marquer ce rendez-vous comme terminé?')) return;

    try {
      await this.appointmentService.updateAppointmentStatus(appointment.id, 'completed');
      await this.loadDoctorData();
      alert('Rendez-vous marqué comme terminé');
    } catch (error) {
      console.error('Erreur lors de la completion:', error);
      alert('Erreur lors de la completion du rendez-vous');
    }
  }

  showNotesForm(appointment: Appointment) {
    this.selectedAppointment = appointment;
    this.appointmentNotes = appointment.notes || '';
    this.showNotesModal = true;
  }

  async saveNotes() {
    if (!this.selectedAppointment) return;

    try {
      // Ici, vous devriez avoir une méthode pour mettre à jour les notes
      // Pour l'instant, nous simulons la sauvegarde
      this.selectedAppointment.notes = this.appointmentNotes;
      
      this.closeNotesModal();
      alert('Notes sauvegardées avec succès!');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde des notes');
    }
  }

  closeNotesModal() {
    this.showNotesModal = false;
    this.selectedAppointment = null;
    this.appointmentNotes = '';
  }

  getPatientName(patientId: string): string {
    const patient = this.patients.find(p => p.uid === patientId);
    return patient?.displayName || 'Patient';
  }
}