import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartOptions, ChartData } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { Patient } from '../../models/user.model'; // Assure-toi que le chemin est bon

import { AuthService } from '../../services/auth.service';
import { AppointmentService } from '../../services/appointment.service';
import { NotificationService } from '../../services/notification.service';
import { UserService } from '../../services/user.service';
import { User, Appointment } from '../../models/user.model';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule],
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: ['./doctor-dashboard.component.css'],
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

  selectedPatient: User | null = null;

  showNotesModal = false;
  selectedAppointment: Appointment | null = null;
  appointmentNotes = '';

  // Chart.js options and data
  chartOptions: ChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' }
    }
  };

  appointmentStatusChartData: ChartData<'pie', number[], string> = {
    labels: ['En attente', 'Confirmés', 'Terminés'],
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56']
    }]
  };

  reasonsChartData: ChartData<'bar', number[], string> = {
    labels: [],
    datasets: [{
      label: 'Nombre de consultations',
      data: [],
      backgroundColor: '#42A5F5'
    }]
  };

  reasonsChartLabels: string[] = [];

  constructor(
    private authService: AuthService,
    private appointmentService: AppointmentService,
    private notificationService: NotificationService,
    private userService: UserService
  ) { }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadDoctorData();
      }
    });
  }
  getCompletedAppointmentsForSelectedPatient(): Appointment[] {
  if (!this.selectedPatient) return [];
  return this.appointments.filter(a => a.patientId === this.selectedPatient!.uid && a.status === 'completed');
}

  async loadDoctorData() {
    if (!this.currentUser) return;

    try {
      this.appointments = await this.appointmentService.getAppointmentsByDoctor(this.currentUser.uid);
      this.patients = await this.userService.getUsersByRole('patient');

      this.updateCharts();
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  }

  updateCharts() {
    const pending = this.appointments.filter(a => a.status === 'pending').length;
    const confirmed = this.appointments.filter(a => a.status === 'confirmed').length;
    const completed = this.appointments.filter(a => a.status === 'completed').length;

    this.appointmentStatusChartData = {
      labels: ['En attente', 'Confirmés', 'Terminés'],
      datasets: [{
        data: [pending, confirmed, completed],
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56']
      }]
    };

    const reasonsCount: Record<string, number> = {};
    this.appointments.forEach(app => {
      if (app.reason) {
        reasonsCount[app.reason] = (reasonsCount[app.reason] || 0) + 1;
      }
    });
    this.reasonsChartLabels = Object.keys(reasonsCount);
    this.reasonsChartData = {
      labels: this.reasonsChartLabels,
      datasets: [{
        label: 'Nombre de consultations',
        data: Object.values(reasonsCount),
        backgroundColor: '#42A5F5'
      }]
    };
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
      await this.notificationService.sendConfirmationNotification(
        appointment.patientId,
        this.currentUser.displayName,
        appointment.date
      );
      await this.loadDoctorData();
      alert('Rendez-vous confirmé avec succès!');
    } catch (error) {
      console.error('Erreur lors de la confirmation:', error);
      alert('Rendez-vous confirmé avec succès!');
    }
  }

  async rejectAppointment(appointment: Appointment) {
    if (!confirm('Êtes-vous sûr de vouloir refuser ce rendez-vous?')) return;

    try {
      await this.appointmentService.updateAppointmentStatus(appointment.id, 'cancelled');
      await this.notificationService.createNotification({
        userId: appointment.patientId,
        title: 'Rendez-vous refusé',
        message: `Votre rendez-vous du ${new Date(appointment.date).toLocaleDateString()} a été refusé`,
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
      this.selectedAppointment.notes = this.appointmentNotes;
      await this.appointmentService.addNotesToAppointment(this.selectedAppointment.id, this.appointmentNotes);

      this.closeNotesModal();
      alert('Notes sauvegardées avec succès!');
      await this.loadDoctorData();
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

  // Sélectionne un patient pour afficher son dossier
  selectPatient(patient: Patient) {
    this.selectedPatient = patient;
  }
}
