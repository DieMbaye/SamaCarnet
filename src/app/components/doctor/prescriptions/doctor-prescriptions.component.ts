// components/doctor/prescriptions/doctor-prescriptions.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Prescription, Doctor, User } from '../../../models/user.model';
import { PrescriptionService } from '../../../services/prescription.service';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-doctor-prescriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-prescriptions.component.html',
  styleUrls: ['./doctor-prescriptions.component.css']
})
export class DoctorPrescriptionsComponent implements OnInit, OnDestroy {
downloadPrescription(arg0: string) {
throw new Error('Method not implemented.');
}
  prescriptions: Prescription[] = [];
  filteredPrescriptions: Prescription[] = [];
  patients: User[] = [];
  renewalRequests: Prescription[] = [];
  
  // Filtres
  statusFilter = 'all';
  patientFilter = '';
  dateFromFilter = '';
  dateToFilter = '';
  searchTerm = '';
  
  // Modals
  selectedPrescription: Prescription | null = null;
  selectedPatient: User | null = null;
  showDetailsModal = false;
  showRenewalModal = false;
  showTemplateModal = false;
  
  // Templates
  templates: any[] = [];
  
  // États
  isLoading = false;
  currentDoctor: Doctor | null = null;
  
  private subscription: Subscription = new Subscription();

  constructor(
    private prescriptionService: PrescriptionService,
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.subscription.add(
      this.authService.currentUser$.subscribe(async (user) => {
        this.currentDoctor = user as Doctor;
        if (this.currentDoctor) {
          await Promise.all([
            this.loadPrescriptions(),
            this.loadPatients(),
            this.loadTemplates()
          ]);
          this.checkRenewalRequests();
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  async loadPrescriptions() {
    if (!this.currentDoctor) return;
    
    this.isLoading = true;
    try {
      this.prescriptions = await this.prescriptionService.getPrescriptionsByDoctor(this.currentDoctor.uid);
      this.filterPrescriptions();
    } catch (error) {
      console.error('Erreur lors du chargement des prescriptions:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadPatients() {
    try {
      this.patients = await this.userService.getUsersByRole('patient');
    } catch (error) {
      console.error('Erreur lors du chargement des patients:', error);
    }
  }

  async loadTemplates() {
    if (!this.currentDoctor) return;
    
    try {
      this.templates = await this.prescriptionService.getTemplatesByDoctor(this.currentDoctor.uid);
    } catch (error) {
      console.error('Erreur lors du chargement des templates:', error);
    }
  }

  filterPrescriptions() {
    this.filteredPrescriptions = this.prescriptions.filter(prescription => {
      let match = true;
      
      // Filtre par statut
      if (this.statusFilter !== 'all') {
        match = match && prescription.status === this.statusFilter;
      }
      
      // Filtre par patient
      if (this.patientFilter) {
        match = match && prescription.patientId === this.patientFilter;
      }
      
      // Filtre par recherche textuelle
      if (this.searchTerm) {
        const searchLower = this.searchTerm.toLowerCase();
        match = match && (
          prescription.instructions.toLowerCase().includes(searchLower) ||
          prescription.medications.some(med => 
            med.name.toLowerCase().includes(searchLower)
          )
        );
      }
      
      // Filtre par date
      if (this.dateFromFilter) {
        const prescriptionDate = new Date(prescription.date).getTime();
        const fromDate = new Date(this.dateFromFilter).getTime();
        match = match && prescriptionDate >= fromDate;
      }
      
      if (this.dateToFilter) {
        const prescriptionDate = new Date(prescription.date).getTime();
        const toDate = new Date(this.dateToFilter).getTime();
        match = match && prescriptionDate <= toDate;
      }
      
      return match;
    });
  }

  checkRenewalRequests() {
    this.renewalRequests = this.prescriptions.filter(p => 
      p.renewalRequested && p.status === 'active'
    );
  }

  showPrescriptionDetails(prescription: Prescription) {
    this.selectedPrescription = prescription;
    this.showDetailsModal = true;
    
    // Trouver le patient correspondant
    this.selectedPatient = this.patients.find(p => p.uid === prescription.patientId) || null;
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedPrescription = null;
    this.selectedPatient = null;
  }

  async approveRenewal(prescription: Prescription) {
    const newExpiryDate = prompt('Nouvelle date d\'expiration (AAAA-MM-JJ):', 
      new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0]);
    
    if (!newExpiryDate) return;
    
    try {
      await this.prescriptionService.approveRenewal(prescription.id, new Date(newExpiryDate));
      await this.loadPrescriptions();
      alert('Renouvellement approuvé avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'approbation du renouvellement:', error);
      alert('Erreur lors de l\'approbation du renouvellement');
    }
  }

  async rejectRenewal(prescriptionId: string) {
    if (!confirm('Refuser cette demande de renouvellement ?')) return;
    
    try {
      await this.prescriptionService.updatePrescription(prescriptionId, {
        renewalRequested: false,
        renewalRequestDate: undefined
      });
      await this.loadPrescriptions();
      alert('Demande de renouvellement refusée');
    } catch (error) {
      console.error('Erreur lors du refus du renouvellement:', error);
      alert('Erreur lors du refus du renouvellement');
    }
  }

  async cancelPrescription(prescriptionId: string) {
    if (!confirm('Annuler cette prescription ?')) return;
    
    try {
      await this.prescriptionService.updatePrescriptionStatus(prescriptionId, 'cancelled');
      await this.loadPrescriptions();
      alert('Prescription annulée');
    } catch (error) {
      console.error('Erreur lors de l\'annulation:', error);
      alert('Erreur lors de l\'annulation');
    }
  }

  navigateToCreate() {
    this.router.navigate(['/doctor/prescriptions/create']);
  }

  navigateToTemplates() {
    this.router.navigate(['/doctor/prescriptions/templates']);
  }

  getPatientName(patientId: string): string {
    const patient = this.patients.find(p => p.uid === patientId);
    return patient?.displayName || 'Patient inconnu';
  }

  getStatusDisplay(status: string): string {
    const statusMap: { [key: string]: string } = {
      'active': 'Active',
      'expired': 'Expirée',
      'completed': 'Terminée',
      'cancelled': 'Annulée'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  isExpiringSoon(prescription: Prescription): boolean {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return prescription.status === 'active' && 
           new Date(prescription.expiryDate) < nextWeek;
  }

  clearFilters() {
    this.statusFilter = 'all';
    this.patientFilter = '';
    this.dateFromFilter = '';
    this.dateToFilter = '';
    this.searchTerm = '';
    this.filterPrescriptions();
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }

  getMedicationSummary(medications: any[]): string {
    if (medications.length === 0) return 'Aucun médicament';
    if (medications.length === 1) return `${medications[0].name} ${medications[0].dosage}`;
    return `${medications[0].name} + ${medications.length - 1} autre(s)`;
  }

  async refreshData() {
    await this.loadPrescriptions();
  }

  // Statistiques
  getActiveCount(): number {
    return this.prescriptions.filter(p => p.status === 'active').length;
  }

  getRenewalRequestCount(): number {
    return this.renewalRequests.length;
  }

  getExpiringSoonCount(): number {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return this.prescriptions.filter(p => 
      p.status === 'active' && 
      new Date(p.expiryDate) < nextWeek
    ).length;
  }
}