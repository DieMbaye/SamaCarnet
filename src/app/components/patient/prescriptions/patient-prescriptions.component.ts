// components/patient/prescriptions/patient-prescriptions.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Prescription, User } from '../../../models/user.model';
import { PrescriptionService } from '../../../services/prescription.service';

@Component({
  selector: 'app-patient-prescriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-prescriptions.component.html',
  styleUrls: ['./patient-prescriptions.component.css']
})
export class PatientPrescriptionsComponent implements OnInit {
  @Input() currentUser: User | null = null;
  @Output() refresh = new EventEmitter<void>();

  prescriptions: Prescription[] = [];
  filteredPrescriptions: Prescription[] = [];
  
  // Filtres
  statusFilter = 'all';
  dateFromFilter = '';
  dateToFilter = '';
  
  isLoading = false;

  constructor(
    private prescriptionService: PrescriptionService
  ) {}

  async ngOnInit() {
    if (this.currentUser) {
      await this.loadPrescriptions();
    }
  }

  async loadPrescriptions() {
    if (!this.currentUser) return;
    
    this.isLoading = true;
    try {
      this.prescriptions = await this.prescriptionService.getPrescriptionsByPatient(this.currentUser.uid);
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
      
      if (this.statusFilter !== 'all') {
        match = match && prescription.status === this.statusFilter;
      }
      
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

  getStatusDisplay(status: string): string {
    const statusMap: { [key: string]: string } = {
      'active': 'Active',
      'expired': 'Expirée',
      'completed': 'Terminée',
      'cancelled': 'Annulée'
    };
    return statusMap[status] || status;
  }

  isPrescriptionValid(prescription: Prescription): boolean {
    if (!prescription.expiryDate) return true;
    const expiryDate = new Date(prescription.expiryDate);
    return expiryDate > new Date();
  }

  async requestRenewal(prescriptionId: string) {
    if (!confirm('Demander le renouvellement de cette ordonnance?')) return;
    
    try {
      await this.prescriptionService.requestRenewal(prescriptionId);
      await this.loadPrescriptions();
      alert('Demande de renouvellement envoyée');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la demande de renouvellement');
    }
  }

  downloadPrescription(prescription: Prescription) {
    // Logique de téléchargement
  }
}