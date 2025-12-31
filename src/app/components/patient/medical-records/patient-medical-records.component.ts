// components/patient/medical-records/patient-medical-records.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User, MedicalRecord } from '../../../models/user.model';
import { MedicalRecordService } from '../../../services/medical-record.service';

@Component({
  selector: 'app-patient-medical-records',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-medical-records.component.html',
  styleUrls: ['./patient-medical-records.component.css']
})
export class PatientMedicalRecordsComponent implements OnInit {
  @Input() currentUser: User | null = null;
  @Output() refresh = new EventEmitter<void>();

  medicalRecords: MedicalRecord[] = [];
  filteredRecords: MedicalRecord[] = [];
  
  // Filtres
  typeFilter = 'all';
  dateFromFilter = '';
  dateToFilter = '';
  
  // Formulaire
  showAddForm = false;
  newRecord = {
    date: '',
    type: '',
    description: '',
    notes: ''
    // doctorName n'existe pas dans le modèle
  };

  recordTypes = [
    'Consultation',
    'Examen',
    'Vaccination',
    'Allergie',
    'Chirurgie',
    'Traitement',
    'Autre'
  ];

  isLoading = false;

  constructor(
    private medicalRecordService: MedicalRecordService
  ) {}

  async ngOnInit() {
    if (this.currentUser) {
      await this.loadMedicalRecords();
    }
  }

  async loadMedicalRecords() {
    if (!this.currentUser) return;
    
    this.isLoading = true;
    try {
      this.medicalRecords = await this.medicalRecordService.getMedicalRecordsByPatient(this.currentUser.uid);
      this.filterRecords();
    } catch (error) {
      console.error('Erreur lors du chargement des dossiers:', error);
    } finally {
      this.isLoading = false;
    }
  }

  filterRecords() {
    this.filteredRecords = this.medicalRecords.filter(record => {
      let match = true;
      
      if (this.typeFilter !== 'all') {
        match = match && record.type === this.typeFilter;
      }
      
      if (this.dateFromFilter) {
        const recordDate = new Date(record.date).getTime();
        const fromDate = new Date(this.dateFromFilter).getTime();
        match = match && recordDate >= fromDate;
      }
      
      if (this.dateToFilter) {
        const recordDate = new Date(record.date).getTime();
        const toDate = new Date(this.dateToFilter).getTime();
        match = match && recordDate <= toDate;
      }
      
      return match;
    });
  }

  async addMedicalRecord() {
    if (!this.currentUser) return;
    
    if (!this.newRecord.date || !this.newRecord.type || !this.newRecord.description) {
      alert('Veuillez remplir les champs obligatoires (date, type, description)');
      return;
    }
    
    try {
      const recordData: Omit<MedicalRecord, 'id'> = {
        patientId: this.currentUser.uid,
        doctorId: '', // Vous pouvez laisser vide ou récupérer le médecin si disponible
        date: new Date(this.newRecord.date),
        type: this.newRecord.type,
        description: this.newRecord.description,
        notes: this.newRecord.notes || ''
        // createdAt n'est pas dans votre modèle, mais sera ajouté par Firebase
      };
      
      await this.medicalRecordService.createMedicalRecord(recordData);
      
      await this.loadMedicalRecords();
      this.refresh.emit();
      this.cancelAddForm();
      
      alert('Document médical ajouté avec succès');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'ajout du document');
    }
  }

  cancelAddForm() {
    this.showAddForm = false;
    this.newRecord = { 
      date: '', 
      type: '', 
      description: '', 
      notes: '' 
    };
  }

  async deleteRecord(recordId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document médical?')) return;
    
    try {
      // Note: Votre service actuel n'a pas de méthode deleteMedicalRecord
      alert('Fonctionnalité de suppression à implémenter dans le service');
      // Pour l'instant, rechargez simplement les données
      await this.loadMedicalRecords();
      this.refresh.emit();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  }

  // Méthodes utilitaires pour le template
  clearFilters() {
    this.typeFilter = 'all';
    this.dateFromFilter = '';
    this.dateToFilter = '';
    this.filterRecords();
  }

  getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  isFormValid(): boolean {
    return !!(
      this.newRecord.date && 
      this.newRecord.type && 
      this.newRecord.description
    );
  }

  getRecordTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'Consultation': 'fas fa-stethoscope',
      'Examen': 'fas fa-microscope',
      'Vaccination': 'fas fa-syringe',
      'Allergie': 'fas fa-allergies',
      'Chirurgie': 'fas fa-procedures',
      'Traitement': 'fas fa-prescription-bottle-alt',
      'Autre': 'fas fa-file-medical'
    };
    return icons[type] || 'fas fa-file-medical';
  }

  // Méthode pour obtenir les initiales (utile pour l'affichage)
  getInitials(name?: string): string {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  // Méthode pour obtenir le nombre de médecins uniques
  getUniqueDoctorsCount(): number {
    // Puisque doctorName n'existe pas, utilisez doctorId
    const doctorIds = this.medicalRecords
      .map(record => record.doctorId)
      .filter(id => id && id.trim() !== '');
    return new Set(doctorIds).size;
  }

  getLastRecordDate(): Date {
    if (this.medicalRecords.length === 0) return new Date();
    return new Date(Math.max(...this.medicalRecords.map(r => new Date(r.date).getTime())));
  }

  exportRecords() {
    // Logique d'export (exemple simple)
    const dataStr = JSON.stringify(this.medicalRecords, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'dossier-medical-' + new Date().toISOString().split('T')[0] + '.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  // Méthode pour obtenir le type d'enregistrement
  getRecordType(type: string): string {
    return this.recordTypes.includes(type) ? type : 'Autre';
  }
}