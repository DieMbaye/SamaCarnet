import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { User, Appointment, Doctor } from "../../../models/user.model";
import { AppointmentService } from "../../../services/appointment.service";
import { UserService } from "../../../services/user.service";
import { PatientDataService } from "../../../services/patient-data.service";
import { Subscription } from "rxjs";
import { NotificationService } from "../../../services/notification.service";

@Component({
  selector: "app-patient-appointments",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./patient-appointments.component.html",
  styleUrls: ["./patient-appointments.component.css"],
})
export class PatientAppointmentsComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = [];
  doctors: Doctor[] = [];

  // Filtres
  statusFilter = "all";
  dateFilter = "";
  doctorFilter = "";

  // Pour la prise de RDV
  showBookingForm = false;
  bookingStep = 1;
  specialities = [
    "Cardiologie",
    "Dermatologie",
    "Pédiatrie",
    "Neurologie",
    "Orthopédie",
    "Gynécologie",
    "Psychiatrie",
    "Généraliste",
  ];
  selectedSpeciality = "";
  availableDoctors: Doctor[] = [];
  selectedDoctor: Doctor | null = null;

  newAppointment = {
    date: "",
    time: "",
    reason: "",
    notes: "",
  };

  // Pour afficher les détails d'un rendez-vous
  showDetailsModal = false;
  selectedAppointmentDetails: Appointment | null = null;

  // États de chargement
  isLoading = false;
  isLoadingDoctors = false;

  // Abonnements
  private userSubscription: Subscription | null = null;
  private appointmentsSubscription: Subscription | null = null;
  private doctorsSubscription: Subscription | null = null;

  // Pour le rafraîchissement automatique
  private refreshInterval: any;

  constructor(
    private appointmentService: AppointmentService,
    private userService: UserService,
    private patientDataService: PatientDataService,
    private notificationService: NotificationService
  ) {}

  async ngOnInit() {
    // S'abonner à l'utilisateur
    this.userSubscription = this.patientDataService.currentUser$.subscribe({
      next: (user) => {
        this.currentUser = user;
        if (!user) {
          console.warn("Aucun utilisateur patient connecté");
          this.clearAllData();
        }
      },
      error: (error) => {
        console.error("Erreur lors de la récupération de l'utilisateur:", error);
      },
    });

    // S'abonner aux rendez-vous
    this.appointmentsSubscription = this.patientDataService.appointments$.subscribe({
      next: (appointments) => {
        this.appointments = appointments;
        this.filterAppointments();
      },
      error: (error) => {
        console.error("Erreur lors de la récupération des rendez-vous:", error);
      },
    });

    // S'abonner aux médecins
    this.doctorsSubscription = this.patientDataService.doctors$.subscribe({
      next: (doctors) => {
        this.doctors = doctors;
      },
      error: (error) => {
        console.error("Erreur lors de la récupération des médecins:", error);
      },
    });

    // Charger les médecins une fois
    await this.loadDoctors();

    // Rafraîchissement automatique
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    // Nettoyer les abonnements
    if (this.userSubscription) this.userSubscription.unsubscribe();
    if (this.appointmentsSubscription) this.appointmentsSubscription.unsubscribe();
    if (this.doctorsSubscription) this.doctorsSubscription.unsubscribe();

    // Arrêter le rafraîchissement automatique
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  // Charger les médecins
  async loadDoctors() {
    this.isLoadingDoctors = true;
    try {
      const doctors = (await this.userService.getUsersByRole("doctor")) as Doctor[];
      this.doctors = doctors;
    } catch (error) {
      console.error("Erreur lors du chargement des médecins:", error);
    } finally {
      this.isLoadingDoctors = false;
    }
  }

  // Méthodes pour les statistiques
  getPendingCount(): number {
    return this.appointments.filter((a) => a.status === "pending").length;
  }

  getConfirmedCount(): number {
    return this.appointments.filter((a) => a.status === "confirmed").length;
  }

  getCompletedCount(): number {
    return this.appointments.filter((a) => a.status === "completed").length;
  }

  getCancelledCount(): number {
    return this.appointments.filter((a) => a.status === "cancelled").length;
  }

  // Convertir les dates
  private convertToDate(dateInput: any): Date {
    if (!dateInput) return new Date();
    if (dateInput instanceof Date) return dateInput;
    if (dateInput && typeof dateInput === "object" && "toDate" in dateInput) {
      return dateInput.toDate();
    }
    if (typeof dateInput === "string" || typeof dateInput === "number") {
      const date = new Date(dateInput);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    return new Date();
  }

  // Filtrer les rendez-vous
  filterAppointments() {
    this.filteredAppointments = this.appointments.filter((app) => {
      let match = true;

      if (this.statusFilter !== "all") {
        match = match && app.status === this.statusFilter;
      }

      if (this.dateFilter) {
        const appDate = this.convertToDate(app.date).toISOString().split("T")[0];
        const filterDate = new Date(this.dateFilter).toISOString().split("T")[0];
        match = match && appDate === filterDate;
      }

      if (this.doctorFilter) {
        match = match && app.doctorId === this.doctorFilter;
      }

      return match;
    });
  }

  // Rafraîchissement automatique
  private startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      if (this.currentUser && !this.isLoading) {
        this.patientDataService.refreshData();
      }
    }, 300000); // 5 minutes
  }

  clearAllData() {
    this.appointments = [];
    this.filteredAppointments = [];
    this.doctors = [];
  }

  async loadAllData() {
    try {
      await Promise.all([this.loadAppointments(), this.loadDoctors()]);
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
    }
  }

  async loadAppointments() {
    if (!this.currentUser) {
      console.error("Utilisateur courant non défini");
      return;
    }

    this.isLoading = true;
    try {
      const appointments = await this.appointmentService.getAppointmentsByPatient(
        this.currentUser.uid
      );

      // Convertir les dates si nécessaire
      this.appointments = appointments.map((app) => ({
        ...app,
        date: this.convertToDate(app.date),
        createdAt: this.convertToDate(app.createdAt),
        confirmedAt: app.confirmedAt ? this.convertToDate(app.confirmedAt) : undefined,
        cancelledAt: app.cancelledAt ? this.convertToDate(app.cancelledAt) : undefined,
        completedAt: app.completedAt ? this.convertToDate(app.completedAt) : undefined,
      }));

      this.filterAppointments();
    } catch (error) {
      console.error("Erreur détaillée lors du chargement des rendez-vous:", error);
      setTimeout(() => this.loadAppointments(), 3000);
    } finally {
      this.isLoading = false;
    }
  }

  // Méthodes pour la gestion des rendez-vous
  clearFilters() {
    this.statusFilter = "all";
    this.dateFilter = "";
    this.doctorFilter = "";
    this.filterAppointments();
  }

  async selectSpeciality(speciality: string) {
    this.selectedSpeciality = speciality;
    this.availableDoctors = this.doctors.filter((d) => {
      if (!d.speciality) return false;
      const doctorSpeciality = d.speciality.toLowerCase().trim();
      const searchSpeciality = speciality.toLowerCase().trim();
      return (
        doctorSpeciality === searchSpeciality ||
        doctorSpeciality.includes(searchSpeciality) ||
        searchSpeciality.includes(doctorSpeciality)
      );
    });
    this.bookingStep = 2;
  }

  getSpecialityIcon(speciality: string): string {
    const icons: { [key: string]: string } = {
      Cardiologie: "❤️",
      Dermatologie: "🩺",
      Pédiatrie: "👶",
      Neurologie: "🧠",
      Orthopédie: "🦴",
      Gynécologie: "🏥",
      Psychiatrie: "💭",
      Généraliste: "👨‍⚕️",
    };
    return icons[speciality] || "🏥";
  }

  getInitials(name: string): string {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  }

  getMinDate(): string {
    const today = new Date();
    return today.toISOString().split("T")[0];
  }

  isFormValid(): boolean {
    return !!(
      this.newAppointment.date &&
      this.newAppointment.time &&
      this.newAppointment.reason &&
      this.selectedDoctor
    );
  }

  async bookAppointment() {
    if (!this.currentUser || !this.selectedDoctor) {
      console.error("Données manquantes pour la prise de RDV");
      return;
    }

    if (!this.isFormValid()) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      const appointmentDate = new Date(this.newAppointment.date);
      const appointmentData = {
        patientId: this.currentUser.uid,
        doctorId: this.selectedDoctor.uid,
        date: appointmentDate,
        time: this.newAppointment.time,
        reason: this.newAppointment.reason,
        notes: this.newAppointment.notes,
        status: "pending" as const,
        createdAt: new Date(),
      };

      await this.appointmentService.createAppointment(appointmentData);
      await this.notificationService.sendAppointmentNotification(
        this.selectedDoctor.uid,
        this.currentUser.displayName || "Patient",
        appointmentDate
      );

      await this.loadAppointments();
      this.patientDataService.refreshData();
      this.cancelBooking();
      alert("Rendez-vous demandé avec succès! Le médecin a été notifié.");
    } catch (error) {
      console.error("Erreur lors de la prise de rendez-vous:", error);
      alert("Erreur lors de la prise de rendez-vous. Veuillez réessayer.");
    }
  }

  cancelBooking() {
    this.showBookingForm = false;
    this.bookingStep = 1;
    this.selectedSpeciality = "";
    this.selectedDoctor = null;
    this.availableDoctors = [];
    this.newAppointment = { date: "", time: "", reason: "", notes: "" };
  }

  // Afficher les détails complets d'un rendez-vous
  showAppointmentDetails(appointment: Appointment) {
    this.selectedAppointmentDetails = appointment;
    this.showDetailsModal = true;
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedAppointmentDetails = null;
  }

  async cancelAppointment(appointmentId: string) {
    if (!confirm("Êtes-vous sûr de vouloir annuler ce rendez-vous?")) return;

    try {
      const appointment = this.appointments.find((a) => a.id === appointmentId);
      if (!appointment) {
        alert("Rendez-vous non trouvé");
        return;
      }

      await this.appointmentService.updateAppointmentStatus(appointmentId, "cancelled");

      if (appointment.doctorId && this.currentUser) {
        const appointmentDate = this.convertToDate(appointment.date);
        const formattedDate = appointmentDate.toLocaleDateString("fr-FR");

        await this.notificationService.createNotification({
          userId: appointment.doctorId,
          title: "Rendez-vous annulé",
          message: `${this.currentUser.displayName || "Un patient"} a annulé le rendez-vous prévu le ${formattedDate} à ${appointment.time}`,
          type: "appointment_cancelled",
          read: false,
          createdAt: new Date(),
        });
      }

      await this.loadAppointments();
      this.patientDataService.refreshData();
      alert("Rendez-vous annulé avec succès. Le médecin a été notifié.");
    } catch (error) {
      console.error("Erreur lors de l'annulation:", error);
      alert("Erreur lors de l'annulation du rendez-vous");
    }
  }

  async rescheduleAppointment(appointmentId: string) {
    const appointment = this.appointments.find((a) => a.id === appointmentId);
    if (!appointment) return;

    const newDate = prompt("Nouvelle date (AAAA-MM-JJ):");
    if (!newDate) return;

    try {
      await this.appointmentService.updateAppointmentStatus(appointmentId, "cancelled");

      const newAppointmentData = {
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        date: new Date(newDate),
        time: appointment.time,
        reason: appointment.reason,
        notes: appointment.notes,
        status: "pending" as const,
        createdAt: new Date(),
      };

      await this.appointmentService.createAppointment(newAppointmentData);
      await this.loadAppointments();
      this.patientDataService.refreshData();
      alert("Rendez-vous reporté avec succès");
    } catch (error) {
      console.error("Erreur lors du report:", error);
      alert("Erreur lors du report du rendez-vous");
    }
  }

  // Dupliquer un rendez-vous
  duplicateAppointment(appointment: Appointment) {
    this.showBookingForm = true;
    this.bookingStep = 3;
    
    // Trouver le médecin correspondant
    const doctor = this.doctors.find(d => d.uid === appointment.doctorId);
    if (doctor) {
      this.selectedDoctor = doctor;
      this.selectedSpeciality = doctor.speciality || "";
    }
    
    // Pré-remplir les champs
    const appointmentDate = this.convertToDate(appointment.date);
    this.newAppointment = {
      date: appointmentDate.toISOString().split('T')[0],
      time: appointment.time,
      reason: appointment.reason,
      notes: appointment.notes || ""
    };
    
    // Scroller vers le formulaire
    setTimeout(() => {
      document.querySelector('.booking-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  // Méthodes utilitaires
  getDoctorName(doctorId: string): string {
    const doctor = this.doctors.find((d) => d.uid === doctorId);
    return doctor ? `Dr. ${doctor.displayName}` : "Médecin inconnu";
  }

  getDoctorSpeciality(doctorId: string): string {
    const doctor = this.doctors.find((d) => d.uid === doctorId);
    return doctor?.speciality || "Spécialité non spécifiée";
  }

  getStatusDisplay(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending: "En attente",
      confirmed: "Confirmé",
      cancelled: "Annulé",
      completed: "Terminé",
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending: "pending",
      confirmed: "confirmed",
      cancelled: "cancelled",
      completed: "completed",
    };
    return statusMap[status] || "default";
  }

  formatDate(date: any): string {
    const dateObj = this.convertToDate(date);
    return dateObj.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  formatDateTime(date: any, time: string): string {
    const dateObj = this.convertToDate(date);
    return `${this.formatDate(dateObj)} à ${time}`;
  }

  getMonthAbbr(date: any): string {
    const dateObj = this.convertToDate(date);
    return dateObj.toLocaleDateString("fr-FR", { month: "short" });
  }

  getDay(date: any): string {
    const dateObj = this.convertToDate(date);
    return dateObj.getDate().toString().padStart(2, "0");
  }

  // Format complet pour les détails
  formatFullDate(date: any): string {
    const dateObj = this.convertToDate(date);
    return dateObj.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  // Obtenir la raison du refus
  getCancellationReason(appointment: Appointment): string {
    return appointment.cancellationReason || "Aucune raison spécifiée";
  }

  // Obtenir les notes du médecin
  getDoctorNotes(appointment: Appointment): string {
    return appointment.doctorNotes || "Aucune note de consultation";
  }

  // Rafraîchir manuellement
  async refreshData() {
    if (this.currentUser && !this.isLoading) {
      await this.loadAppointments();
    }
  }
}