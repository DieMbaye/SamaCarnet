// components/doctor/prescriptions/doctor-create-prescription.component.ts
import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PrescriptionService } from '../../../services/prescription.service';
import { UserService } from '../../../services/user.service';
import { NotificationService } from '../../../services/notification.service';
import { Appointment, Doctor, Patient, MedicationLibrary } from '../../../models/user.model';

@Component({
  selector: 'app-doctor-create-prescription',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './doctor-create-prescriptions.component.html',
  styleUrls: ['./doctor-create-prescriptions.component.css']
})
export class DoctorCreatePrescriptionComponent implements OnInit {
  @Input() appointment: Appointment | null = null;
  @Input() patient: Patient | null = null;
  @Input() currentDoctor: Doctor | null = null;

  prescriptionForm: FormGroup;
  medications: FormArray;
  
  // Recherche de médicaments
  searchResults: MedicationLibrary[] = [];
  selectedMedication: MedicationLibrary | null = null;
  showMedicationSearch = false;
  
  // Templates
  templates: any[] = [];
  selectedTemplate: any = null;
  
  // États
  isLoading = false;
  isSubmitting = false;
  showMedicationForm = false;
  
  // Options
  frequencyOptions = [
    '1 fois par jour',
    '2 fois par jour',
    '3 fois par jour',
    '4 fois par jour',
    'Toutes les 6 heures',
    'Toutes les 8 heures',
    'Toutes les 12 heures',
    'Au besoin',
    'Avant les repas',
    'Après les repas',
    'Au coucher'
  ];
  
  durationOptions = [
    '3 jours',
    '5 jours',
    '7 jours',
    '10 jours',
    '14 jours',
    '21 jours',
    '28 jours',
    '1 mois',
    '2 mois',
    '3 mois',
    '6 mois',
    '12 mois',
    'Renouvelable'
  ];
  
  routeOptions = [
    'Orale',
    'Sublinguale',
    'Buccale',
    'Inhalée',
    'Nasale',
    'Oculaire',
    'Auriculaire',
    'Cutanée',
    'Transdermique',
    'Injectée (IV)',
    'Injectée (IM)',
    'Injectée (SC)',
    'Rectale',
    'Vaginale'
  ];
  
  unitOptions = [
    'comprimé(s)',
    'gélule(s)',
    'ml',
    'mg',
    'g',
    'UI',
    'dose(s)',
    'puff(s)',
    'application(s)'
  ];

  constructor(
    private fb: FormBuilder,
    private prescriptionService: PrescriptionService,
    private userService: UserService,
    private notificationService: NotificationService
  ) {
    this.prescriptionForm = this.fb.group({
      patientId: ['', Validators.required],
      doctorId: ['', Validators.required],
      appointmentId: [''],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      expiryDate: ['', Validators.required],
      instructions: ['', Validators.required],
      medications: this.fb.array([]),
      notes: ['']
    });

    this.medications = this.prescriptionForm.get('medications') as FormArray;
  }

  async ngOnInit() {
    if (this.appointment && this.patient && this.currentDoctor) {
      this.prescriptionForm.patchValue({
        patientId: this.patient.uid,
        doctorId: this.currentDoctor.uid,
        appointmentId: this.appointment.id,
        date: new Date().toISOString().split('T')[0],
        expiryDate: this.getDefaultExpiryDate()
      });
    }

    await this.loadTemplates();
  }

  private getDefaultExpiryDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() + 1); // Expire dans 1 mois par défaut
    return date.toISOString().split('T')[0];
  }

  async loadTemplates() {
    if (!this.currentDoctor) return;
    
    try {
      this.isLoading = true;
      this.templates = await this.prescriptionService.getTemplatesByDoctor(this.currentDoctor.uid);
    } catch (error) {
      console.error('Erreur lors du chargement des templates:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async searchMedications(searchTerm: string) {
    if (searchTerm.length < 2) {
      this.searchResults = [];
      return;
    }

    try {
      this.searchResults = await this.prescriptionService.searchMedications(searchTerm);
      this.showMedicationSearch = true;
    } catch (error) {
      console.error('Erreur lors de la recherche de médicaments:', error);
    }
  }

  selectMedication(medication: MedicationLibrary) {
    this.selectedMedication = medication;
    this.showMedicationSearch = false;
    this.showMedicationForm = true;
    
    // Créer un nouveau formulaire pour ce médicament
    const medicationForm = this.fb.group({
      id: [this.generateId()],
      name: [medication.name, Validators.required],
      dosage: [medication.defaultDosage || '', Validators.required],
      frequency: ['1 fois par jour', Validators.required],
      duration: ['7 jours', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unit: ['comprimé(s)', Validators.required],
      route: [medication.defaultRoute || 'Orale', Validators.required],
      notes: ['']
    });

    this.medications.push(medicationForm);
  }

  addEmptyMedication() {
    const medicationForm = this.fb.group({
      id: [this.generateId()],
      name: ['', Validators.required],
      dosage: ['', Validators.required],
      frequency: ['1 fois par jour', Validators.required],
      duration: ['7 jours', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unit: ['comprimé(s)', Validators.required],
      route: ['Orale', Validators.required],
      notes: ['']
    });

    this.medications.push(medicationForm);
    this.selectedMedication = null;
    this.showMedicationForm = true;
  }

  removeMedication(index: number) {
    this.medications.removeAt(index);
    if (this.medications.length === 0) {
      this.showMedicationForm = false;
    }
  }

  useTemplate(template: any) {
    this.selectedTemplate = template;
    
    // Effacer les médicaments actuels
    while (this.medications.length !== 0) {
      this.medications.removeAt(0);
    }

    // Ajouter les médicaments du template
    template.medications.forEach((med: any) => {
      const medicationForm = this.fb.group({
        id: [this.generateId()],
        name: [med.name, Validators.required],
        dosage: [med.dosage, Validators.required],
        frequency: [med.frequency, Validators.required],
        duration: [med.duration, Validators.required],
        quantity: [med.quantity || 1, [Validators.required, Validators.min(1)]],
        unit: [med.unit || 'comprimé(s)', Validators.required],
        route: [med.route || 'Orale', Validators.required],
        notes: [med.notes || '']
      });
      this.medications.push(medicationForm);
    });

    this.prescriptionForm.patchValue({
      instructions: template.instructions
    });

    this.showMedicationForm = true;
  }

  async submitPrescription() {
    if (this.prescriptionForm.invalid || this.medications.length === 0) {
      alert('Veuillez remplir tous les champs obligatoires et ajouter au moins un médicament');
      return;
    }

    if (!this.patient || !this.currentDoctor) {
      alert('Données patient ou médecin manquantes');
      return;
    }

    try {
      this.isSubmitting = true;

      const prescriptionData = {
        ...this.prescriptionForm.value,
        date: new Date(this.prescriptionForm.value.date),
        expiryDate: new Date(this.prescriptionForm.value.expiryDate),
        medications: this.prescriptionForm.value.medications,
        status: 'active' as const,
        createdAt: new Date()
      };

      const prescriptionId = await this.prescriptionService.createPrescription(prescriptionData);

      // Envoyer une notification au patient
      await this.notificationService.createNotification({
        userId: this.patient.uid,
        title: 'Nouvelle ordonnance disponible',
        message: `Le Dr. ${this.currentDoctor.displayName} vous a prescrit une nouvelle ordonnance.`,
        type: 'prescription',
        read: false,
        createdAt: new Date(),
        details: `Prescription ID: ${prescriptionId}`
      });

      alert('Ordonnance créée avec succès!');
      
      // Réinitialiser le formulaire
      this.resetForm();
      
    } catch (error) {
      console.error('Erreur lors de la création de l\'ordonnance:', error);
      alert('Erreur lors de la création de l\'ordonnance');
    } finally {
      this.isSubmitting = false;
    }
  }

  resetForm() {
    // Effacer tous les médicaments
    while (this.medications.length !== 0) {
      this.medications.removeAt(0);
    }
    
    this.prescriptionForm.reset({
      patientId: this.patient?.uid,
      doctorId: this.currentDoctor?.uid,
      appointmentId: this.appointment?.id,
      date: new Date().toISOString().split('T')[0],
      expiryDate: this.getDefaultExpiryDate(),
      instructions: '',
      notes: ''
    });
    
    this.selectedMedication = null;
    this.selectedTemplate = null;
    this.showMedicationForm = false;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  downloadPrescriptionPreview() {
    // Générer un aperçu de l'ordonnance
    const content = this.generatePrescriptionPreview();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ordonnance_${this.patient?.displayName || 'patient'}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private generatePrescriptionPreview(): string {
    const formValue = this.prescriptionForm.value;
    
    let preview = '=== ORDONNANCE MÉDICALE ===\n\n';
    preview += `Date: ${formValue.date}\n`;
    preview += `Patient: ${this.patient?.displayName || 'Non spécifié'}\n`;
    preview += `Médecin: Dr. ${this.currentDoctor?.displayName || 'Non spécifié'}\n`;
    preview += `Expire le: ${formValue.expiryDate}\n\n`;
    
    preview += '=== MÉDICAMENTS PRESCRITS ===\n';
    formValue.medications.forEach((med: any, index: number) => {
      preview += `${index + 1}. ${med.name} ${med.dosage}\n`;
      preview += `   ${med.quantity} ${med.unit} - ${med.frequency} - ${med.duration}\n`;
      preview += `   Voie: ${med.route}\n`;
      if (med.notes) preview += `   Notes: ${med.notes}\n`;
      preview += '\n';
    });
    
    preview += '=== INSTRUCTIONS ===\n';
    preview += `${formValue.instructions}\n\n`;
    
    if (formValue.notes) {
      preview += '=== NOTES SUPPLÉMENTAIRES ===\n';
      preview += `${formValue.notes}\n\n`;
    }
    
    preview += '=============================\n';
    preview += 'Signature:\n\n\n\n';
    preview += `Dr. ${this.currentDoctor?.displayName || ''}\n`;
    preview += `${this.currentDoctor?.speciality || ''}\n`;
    
    return preview;
  }

  getMedicationsControls() {
    return this.medications.controls;
  }

  trackByFn(index: number, item: any) {
    return item.value.id || index;
  }
}