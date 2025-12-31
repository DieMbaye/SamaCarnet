import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Doctor, Appointment, User } from "../../../models/user.model";
import { AppointmentService } from "../../../services/appointment.service";
import { UserService } from "../../../services/user.service";
import { NotificationService } from "../../../services/notification.service";
import { AuthService } from "../../../services/auth.service";

interface SortOption {
  value: string;
  label: string;
  icon: string;
}

@Component({
  selector: "app-doctor-appointments",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./doctor-appointments.component.html",
  styleUrls: ["./doctor-appointments.component.css"],
})
export class DoctorAppointmentsComponent implements OnInit, OnDestroy {
  currentUser: Doctor | null = null;

  // Data
  appointments: Appointment[] = [];
  patients: User[] = [];

  // Filtered appointments
  pendingAppointments: Appointment[] = [];
  confirmedAppointments: Appointment[] = [];
  completedAppointments: Appointment[] = [];
  cancelledAppointments: Appointment[] = []; // NOUVEAU: rendez-vous annulés

  // Sorting and filtering
  sortOption = "date-asc";
  searchTerm = "";

  sortOptions: SortOption[] = [
    {
      value: "date-asc",
      label: "Date (plus ancien)",
      icon: "fas fa-sort-amount-down-alt",
    },
    {
      value: "date-desc",
      label: "Date (plus récent)",
      icon: "fas fa-sort-amount-down",
    },
    {
      value: "patient-asc",
      label: "Patient (A-Z)",
      icon: "fas fa-sort-alpha-down",
    },
    {
      value: "patient-desc",
      label: "Patient (Z-A)",
      icon: "fas fa-sort-alpha-down-alt",
    },
    { value: "urgency", label: "Urgence", icon: "fas fa-exclamation-triangle" },
  ];

  // Modals state
  showNotesModal = false;
  showConfirmationModal = false;
  showRejectionModal = false;
  selectedAppointment: Appointment | null = null;
  appointmentNotes = "";
  doctorNotes = "";
  rejectionReason = "";

  // Modal types
  modalType: "consultation" | "confirmation" | "rejection" = "consultation";

  // Confirmation modal data
  confirmationModal = {
    title: "",
    message: "",
    confirmText: "",
    confirmClass: "",
    action: "" as "confirm" | "reject" | "complete" | "cancel",
  };

  // Loading states
  isLoading = false;
  actionInProgress = false;

  private refreshInterval: any;

  constructor(
    private appointmentService: AppointmentService,
    private userService: UserService,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // S'abonner aux changements d'utilisateur
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user as Doctor;
      if (this.currentUser) {
        this.loadAppointmentsData();
        this.startAutoRefresh();
      }
    });
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      if (this.currentUser) {
        this.loadAppointmentsData();
      }
    }, 300000); // Refresh every 5 minutes
  }

  async loadAppointmentsData() {
    if (!this.currentUser) return;

    this.isLoading = true;
    try {
      await Promise.all([this.loadAppointments(), this.loadPatients()]);

      this.filterAndSortAppointments();
    } catch (error) {
      console.error("Erreur lors du chargement des rendez-vous:", error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadAppointments() {
    if (!this.currentUser) return;

    this.appointments = await this.appointmentService.getAppointmentsByDoctor(
      this.currentUser.uid
    );

    // Convert dates if needed
    this.appointments = this.appointments.map((app) => ({
      ...app,
      date: this.convertToDate(app.date),
      createdAt: this.convertToDate(app.createdAt),
      confirmedAt: app.confirmedAt ? this.convertToDate(app.confirmedAt) : undefined,
      cancelledAt: app.cancelledAt ? this.convertToDate(app.cancelledAt) : undefined,
      completedAt: app.completedAt ? this.convertToDate(app.completedAt) : undefined,
    }));
  }

  async loadPatients() {
    this.patients = await this.userService.getUsersByRole("patient");
  }

  private convertToDate(date: any): Date {
    if (date instanceof Date) return date;
    if (date?.toDate) return date.toDate();
    if (typeof date === "string") return new Date(date);
    return new Date();
  }

  // Enhanced filtering and sorting
  filterAndSortAppointments() {
    let filteredAppointments = [...this.appointments];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filteredAppointments = filteredAppointments.filter(
        (app) =>
          this.getPatientName(app.patientId)
            .toLowerCase()
            .includes(searchLower) ||
          app.reason.toLowerCase().includes(searchLower) ||
          (app.notes && app.notes.toLowerCase().includes(searchLower)) ||
          (app.doctorNotes &&
            app.doctorNotes.toLowerCase().includes(searchLower)) ||
          (app.cancellationReason && app.cancellationReason.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    filteredAppointments.sort((a, b) => {
      switch (this.sortOption) {
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "date-desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "patient-asc":
          return this.getPatientName(a.patientId).localeCompare(
            this.getPatientName(b.patientId)
          );
        case "patient-desc":
          return this.getPatientName(b.patientId).localeCompare(
            this.getPatientName(a.patientId)
          );
        case "urgency":
          const aUrgent = this.isUrgentAppointment(a) ? 1 : 0;
          const bUrgent = this.isUrgentAppointment(b) ? 1 : 0;
          if (aUrgent !== bUrgent) return bUrgent - aUrgent;
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        default:
          return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
    });

    // Filter by status
    this.pendingAppointments = filteredAppointments.filter(
      (app) => app.status === "pending"
    );
    this.confirmedAppointments = filteredAppointments.filter(
      (app) => app.status === "confirmed"
    );
    this.completedAppointments = filteredAppointments.filter(
      (app) => app.status === "completed"
    );
    this.cancelledAppointments = filteredAppointments.filter(
      (app) => app.status === "cancelled"
    );
  }

  onSortChange() {
    this.filterAndSortAppointments();
  }

  onSearchChange() {
    this.filterAndSortAppointments();
  }

  // Nouvelle méthode pour voir tous les détails
  showAppointmentDetails(appointment: Appointment) {
    this.selectedAppointment = appointment;
    this.appointmentNotes = appointment.notes || "";
    this.doctorNotes = appointment.doctorNotes || "";
    this.modalType = "consultation";
    this.showNotesModal = true;
  }

  // Confirmation methods
  showConfirmation(
    action: "confirm" | "reject" | "complete" | "cancel",
    appointment: Appointment
  ) {
    if (!this.currentUser) return;

    const config = {
      confirm: {
        title: "Confirmer le rendez-vous",
        message: `Êtes-vous sûr de vouloir confirmer le rendez-vous avec ${this.getPatientName(
          appointment.patientId
        )} ?`,
        confirmText: "Confirmer",
        confirmClass: "btn-primary",
      },
      reject: {
        title: "Refuser le rendez-vous",
        message: `Êtes-vous sûr de vouloir refuser le rendez-vous avec ${this.getPatientName(
          appointment.patientId
        )} ?`,
        confirmText: "Refuser",
        confirmClass: "btn-danger",
      },
      complete: {
        title: "Marquer comme terminé",
        message: `Marquer ce rendez-vous avec ${this.getPatientName(
          appointment.patientId
        )} comme terminé ?`,
        confirmText: "Terminer",
        confirmClass: "btn-success",
      },
      cancel: {
        title: "Annuler le rendez-vous",
        message: `Êtes-vous sûr de vouloir annuler ce rendez-vous avec ${this.getPatientName(
          appointment.patientId
        )} ?`,
        confirmText: "Annuler",
        confirmClass: "btn-danger",
      }
    };

    this.confirmationModal = {
      ...config[action],
      action,
    };
    this.selectedAppointment = appointment;

    if (action === "reject") {
      this.modalType = "rejection";
      this.showRejectionModal = true;
    } else if (action === "confirm") {
      this.modalType = "confirmation";
      this.showConfirmationModal = true;
    } else {
      this.showConfirmationModal = true;
    }
  }

  // Nouvelle méthode pour gérer le refus avec raison
  async rejectWithReason() {
    if (
      !this.selectedAppointment ||
      !this.currentUser ||
      !this.rejectionReason.trim()
    ) {
      this.showNotification(
        "Veuillez saisir une raison pour le refus",
        "error"
      );
      return;
    }

    this.actionInProgress = true;
    try {
      await this.appointmentService.rejectAppointment(
        this.selectedAppointment.id,
        this.rejectionReason.trim(),
        this.currentUser.uid
      );

      // Notification simple sans les détails
      await this.notificationService.createNotification({
        userId: this.selectedAppointment.patientId,
        title: "Rendez-vous refusé",
        message: `Votre rendez-vous a été refusé par le Dr. ${this.currentUser.displayName}. Consultez vos rendez-vous pour plus de détails.`,
        type: "appointment_cancelled",
        read: false,
        createdAt: new Date(),
      });

      await this.loadAppointmentsData();
      this.showNotification("Rendez-vous refusé avec succès", "success");
    } catch (error) {
      console.error("Erreur lors du refus du rendez-vous:", error);
      this.showNotification("Erreur lors du refus du rendez-vous", "error");
    } finally {
      this.actionInProgress = false;
      this.closeRejectionModal();
    }
  }

  async confirmWithNotes() {
    if (!this.selectedAppointment || !this.currentUser) return;

    this.actionInProgress = true;
    try {
      const doctorNotesValue = this.doctorNotes.trim() || undefined;

      await this.appointmentService.confirmAppointment(
        this.selectedAppointment.id,
        doctorNotesValue
      );

      // Notification simple
      await this.notificationService.sendConfirmationNotification(
        this.selectedAppointment.patientId,
        this.currentUser.displayName,
        this.selectedAppointment.date
      );

      await this.loadAppointmentsData();
      this.showNotification("Rendez-vous confirmé avec succès", "success");
    } catch (error) {
      console.error("Erreur lors de la confirmation du rendez-vous:", error);
      this.showNotification("Erreur lors de la confirmation", "error");
    } finally {
      this.actionInProgress = false;
      this.closeConfirmationModal();
    }
  }

  async executeConfirmedAction() {
    if (!this.selectedAppointment || !this.currentUser) return;

    this.actionInProgress = true;
    try {
      switch (this.confirmationModal.action) {
        case "confirm":
          await this.confirmAppointmentAction(this.selectedAppointment);
          break;
        case "reject":
          await this.rejectAppointmentAction(this.selectedAppointment);
          break;
        case "complete":
          await this.completeAppointmentAction(this.selectedAppointment);
          break;
        case "cancel":
          await this.cancelAppointmentAction(this.selectedAppointment);
          break;
      }

      await this.loadAppointmentsData();
      this.showNotification("Action effectuée avec succès!", "success");
    } catch (error) {
      console.error("Erreur lors de l'exécution de l'action:", error);
      this.showNotification("Erreur lors de l'opération", "error");
    } finally {
      this.actionInProgress = false;
      this.closeConfirmationModal();
    }
  }

  private async confirmAppointmentAction(appointment: Appointment) {
    if (!this.currentUser) return;

    await this.appointmentService.confirmAppointment(appointment.id, undefined);

    // Send notification to patient
    await this.notificationService.sendConfirmationNotification(
      appointment.patientId,
      this.currentUser.displayName,
      appointment.date
    );
  }

  private async rejectAppointmentAction(appointment: Appointment) {
    if (!this.currentUser) return;

    await this.appointmentService.rejectAppointment(
      appointment.id,
      "Rendez-vous refusé par le médecin",
      this.currentUser.uid
    );

    // Send notification to patient
    await this.notificationService.createNotification({
      userId: appointment.patientId,
      title: "Rendez-vous refusé",
      message: `Votre rendez-vous du ${new Date(
        appointment.date
      ).toLocaleDateString("fr-FR")} a été refusé par le Dr. ${
        this.currentUser.displayName
      }`,
      type: "appointment_cancelled",
      read: false,
      createdAt: new Date(),
    });
  }

  private async cancelAppointmentAction(appointment: Appointment) {
    if (!this.currentUser) return;

    await this.appointmentService.rejectAppointment(
      appointment.id,
      "Rendez-vous annulé par le médecin",
      this.currentUser.uid
    );

    // Send notification to patient
    await this.notificationService.createNotification({
      userId: appointment.patientId,
      title: "Rendez-vous annulé",
      message: `Votre rendez-vous du ${new Date(
        appointment.date
      ).toLocaleDateString("fr-FR")} a été annulé par le Dr. ${
        this.currentUser.displayName
      }`,
      type: "appointment_cancelled",
      read: false,
      createdAt: new Date(),
    });
  }

  private async completeAppointmentAction(appointment: Appointment) {
    await this.appointmentService.completeAppointment(appointment.id);
  }

  // Notes management
  showNotesForm(appointment: Appointment) {
    this.selectedAppointment = appointment;
    this.appointmentNotes = appointment.notes || "";
    this.doctorNotes = appointment.doctorNotes || "";
    this.modalType = "consultation";
    this.showNotesModal = true;
  }

  async saveNotes() {
    if (!this.selectedAppointment) return;

    if (!this.doctorNotes.trim()) {
      this.showNotification(
        "Veuillez saisir des notes de consultation",
        "info"
      );
      return;
    }

    try {
      await this.appointmentService.addNotesToAppointment(
        this.selectedAppointment.id,
        this.doctorNotes.trim(),
        "doctor"
      );

      this.closeNotesModal();
      this.showNotification(
        "Notes de consultation sauvegardées avec succès!",
        "success"
      );
      await this.loadAppointmentsData();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des notes:", error);
      this.showNotification("Erreur lors de la sauvegarde des notes", "error");
    }
  }

  // Utility methods
  getPatientName(patientId: string): string {
    const patient = this.patients.find((p) => p.uid === patientId);
    return patient?.displayName || "Patient inconnu";
  }

  getPatientInfo(patientId: string): User | undefined {
    return this.patients.find((p) => p.uid === patientId);
  }

  isUrgentAppointment(appointment: Appointment): boolean {
    const now = new Date();
    const appointmentDate = new Date(appointment.date);
    const diffTime = appointmentDate.getTime() - now.getTime();
    const diffHours = diffTime / (1000 * 60 * 60);
    return diffHours <= 24 && appointment.status === "pending";
  }

  formatAppointmentDate(date: Date): string {
    return new Date(date).toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  formatAppointmentTime(date: Date, time: string): string {
    return (
      new Date(date).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) +
      " • " +
      time
    );
  }

  formatShortDate(date: Date): string {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  getAppointmentStatusBadge(status?: string): string {
    const statusMap: { [key: string]: string } = {
      pending: "warning",
      confirmed: "success",
      completed: "info",
      cancelled: "error",
    };
    return status ? statusMap[status] || "default" : "default";
  }

  getAppointmentStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending: "En attente",
      confirmed: "Confirmé",
      completed: "Terminé",
      cancelled: "Annulé",
    };
    return statusMap[status] || status;
  }

  // Get patient contact info
  getPatientContactInfo(patientId: string): string {
    const patient = this.getPatientInfo(patientId);
    if (!patient) return "Information non disponible";
    return patient.email || patient.phone || "Contact non spécifié";
  }

  // Modal close methods
  closeConfirmationModal() {
    this.showConfirmationModal = false;
    this.selectedAppointment = null;
    this.doctorNotes = "";
    this.confirmationModal = {
      title: "",
      message: "",
      confirmText: "",
      confirmClass: "",
      action: "confirm",
    };
  }

  closeRejectionModal() {
    this.showRejectionModal = false;
    this.selectedAppointment = null;
    this.rejectionReason = "";
  }

  closeNotesModal() {
    this.showNotesModal = false;
    this.selectedAppointment = null;
    this.appointmentNotes = "";
    this.doctorNotes = "";
  }

  // Refresh method
  async refreshData() {
    await this.loadAppointmentsData();
  }

  // Reset filters
  resetFilters() {
    this.searchTerm = "";
    this.sortOption = "date-asc";
    this.filterAndSortAppointments();
  }

  private showNotification(
    message: string,
    type: "success" | "error" | "info" = "info"
  ) {
    // Implement toast notification system
    const toast = document.createElement("div");
    toast.className = `notification ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  }

  // Tronquer le texte pour l'affichage en aperçu
  truncateText(text: string, maxLength: number = 80): string {
    if (!text) return "Aucune note";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  // Tronquer spécifiquement les notes du patient pour l'aperçu
  getPatientNotesPreview(notes?: string): string {
    return this.truncateText(notes || "", 60);
  }

  // Tronquer la raison pour l'aperçu
  getReasonPreview(reason: string): string {
    return this.truncateText(reason, 50);
  }

  // Récupérer la raison d'annulation
  getCancellationReason(appointment: Appointment): string {
    return appointment.cancellationReason || "Aucune raison spécifiée";
  }
}