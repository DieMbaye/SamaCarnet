// components/patient/prescriptions/patient-prescriptions.component.ts
import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Prescription, User } from '../../../models/user.model';
import { PrescriptionService } from '../../../services/prescription.service';
import { PatientDataService } from '../../../services/patient-data.service';

@Component({
  selector: 'app-patient-prescriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-prescriptions.component.html',
  styleUrls: ['./patient-prescriptions.component.css']
})
export class PatientPrescriptionsComponent implements OnInit, OnDestroy {
  @Input() currentUser: User | null = null;

  prescriptions: Prescription[] = [];
  filteredPrescriptions: Prescription[] = [];
  selectedPrescription: Prescription | null = null;
  
  // Filtres
  statusFilter = 'active';
  dateFromFilter = '';
  dateToFilter = '';
  searchTerm = '';
  
  // Modals
  showDetailsModal = false;
  showRenewalModal = false;
  showPharmacyModal = false;
  
  // États
  isLoading = false;
  isDownloading = false;
  
  // Pharmacies
  pharmacies: any[] = [];
  
  private subscription: Subscription = new Subscription();

  constructor(
    private prescriptionService: PrescriptionService,
    private patientDataService: PatientDataService
  ) {}

  async ngOnInit() {
    if (this.currentUser) {
      await this.loadPrescriptions();
    } else {
      // S'abonner au service de données patient
      this.subscription.add(
        this.patientDataService.currentUser$.subscribe(user => {
          if (user) {
            this.currentUser = user;
            this.loadPrescriptions();
          }
        })
      );
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  async loadPrescriptions() {
    if (!this.currentUser) return;
    
    this.isLoading = true;
    try {
      this.prescriptions = await this.prescriptionService.getPrescriptionsByPatient(
        this.currentUser.uid,
        this.statusFilter === 'all' ? undefined : this.statusFilter
      );
      this.filterPrescriptions();
    } catch (error) {
      console.error('Erreur lors du chargement des ordonnances:', error);
    } finally {
      this.isLoading = false;
    }
  }

  filterPrescriptions() {
    this.filteredPrescriptions = this.prescriptions.filter(prescription => {
      let match = true;
      
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

  showPrescriptionDetails(prescription: Prescription) {
    this.selectedPrescription = prescription;
    this.showDetailsModal = true;
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedPrescription = null;
  }

  async requestRenewal(prescriptionId: string) {
    if (!confirm('Demander le renouvellement de cette ordonnance ?')) return;
    
    try {
      await this.prescriptionService.renewPrescription(prescriptionId);
      await this.loadPrescriptions();
      alert('Demande de renouvellement envoyée au médecin');
    } catch (error) {
      console.error('Erreur lors de la demande de renouvellement:', error);
      alert('Erreur lors de la demande de renouvellement');
    }
  }

  async downloadPrescription(prescriptionId: string) {
    this.isDownloading = true;
    try {
      const blob = await this.prescriptionService.exportPrescriptionToPDF(prescriptionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ordonnance_${prescriptionId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      alert('Erreur lors du téléchargement de l\'ordonnance');
    } finally {
      this.isDownloading = false;
    }
  }

  async showPharmacies() {
    this.showPharmacyModal = true;
    this.isLoading = true;
    
    try {
      // Récupérer la localisation de l'utilisateur
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            this.pharmacies = await this.prescriptionService.getPharmaciesNearby(
              position.coords.latitude,
              position.coords.longitude,
              5 // rayon de 5km
            );
            this.isLoading = false;
          },
          (error) => {
            console.error('Erreur de géolocalisation:', error);
            this.isLoading = false;
          }
        );
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des pharmacies:', error);
      this.isLoading = false;
    }
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

  isPrescriptionActive(prescription: Prescription): boolean {
    return prescription.status === 'active' && 
           new Date(prescription.expiryDate) > new Date();
  }

  isExpiringSoon(prescription: Prescription): boolean {
    if (prescription.status !== 'active') return false;
    
    const expiryDate = new Date(prescription.expiryDate);
    const today = new Date();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(today.getDate() + 7);
    
    return expiryDate > today && expiryDate <= oneWeekFromNow;
  }

  getRenewalRequested(prescription: Prescription): boolean {
    return !!prescription.renewalRequested;
  }

  clearFilters() {
    this.statusFilter = 'all';
    this.dateFromFilter = '';
    this.dateToFilter = '';
    this.searchTerm = '';
    this.filterPrescriptions();
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }

  getGoogleMapsUrl(pharmacy: any): string {
    const address = encodeURIComponent(pharmacy.address);
    return `https://www.google.com/maps/search/?api=1&query=${address}`;
  }

  getMedicationSummary(medications: any[]): string {
    return medications.map(med => `${med.name} ${med.dosage}`).join(', ');
  }

  async refreshData() {
    await this.loadPrescriptions();
  }

  // Statistiques
  getActiveCount(): number {
    return this.prescriptions.filter(p => p.status === 'active').length;
  }

  getExpiringSoonCount(): number {
    return this.prescriptions.filter(p => this.isExpiringSoon(p)).length;
  }

  getRenewalRequestedCount(): number {
    return this.prescriptions.filter(p => p.renewalRequested).length;
  }
}