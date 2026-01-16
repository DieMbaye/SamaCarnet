// components/doctor/prescriptions/templates/doctor-prescription-templates.component.ts
import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
} from "@angular/forms";
import { Router } from "@angular/router";
import { Subscription } from "rxjs";
import {
  PrescriptionTemplate,
  Medication,
  Doctor,
} from "../../../models/user.model";
import { PrescriptionService } from "../../../services/prescription.service";
import { AuthService } from "../../../services/auth.service";
import { NotificationService } from "../../../services/notification.service";

@Component({
  selector: "app-doctor-prescription-templates",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: "./doctor-prescription-templates.component.html",
  styleUrls: ["./doctor-prescription-templates.component.css"],
})
export class DoctorPrescriptionTemplatesComponent implements OnInit, OnDestroy {
  templates: PrescriptionTemplate[] = [];
  filteredTemplates: PrescriptionTemplate[] = [];

  // États du formulaire
  showCreateTemplate = false;
  isCreating = false;
  isLoading = false;

  // Formulaire de création
  templateForm: FormGroup;
  templateMedications: FormArray;

  // Filtres
  categoryFilter = "all";
  searchTerm = "";

  // Options
  frequencyOptions = [
    "1 fois par jour",
    "2 fois par jour",
    "3 fois par jour",
    "4 fois par jour",
    "Toutes les 6 heures",
    "Toutes les 8 heures",
    "Toutes les 12 heures",
    "Au besoin",
    "Avant les repas",
    "Après les repas",
    "Au coucher",
  ];

  unitOptions = [
    "comprimé(s)",
    "gélule(s)",
    "ml",
    "mg",
    "g",
    "UI",
    "dose(s)",
    "puff(s)",
    "application(s)",
  ];

  routeOptions = [
    "Orale",
    "Sublinguale",
    "Buccale",
    "Inhalée",
    "Nasale",
    "Oculaire",
    "Auriculaire",
    "Cutanée",
    "Transdermique",
    "Injectée (IV)",
    "Injectée (IM)",
    "Injectée (SC)",
    "Rectale",
    "Vaginale",
  ];

  // Médecin connecté
  currentDoctor: Doctor | null = null;
  private subscription: Subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private prescriptionService: PrescriptionService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    // Initialisation du formulaire
    this.templateForm = this.fb.group({
      name: ["", [Validators.required, Validators.minLength(3)]],
      category: [""],
      description: [""],
      instructions: ["", [Validators.required, Validators.minLength(10)]],
      medications: this.fb.array([]),
    });

    this.templateMedications = this.templateForm.get(
      "medications"
    ) as FormArray;
  }

  async ngOnInit() {
    // S'abonner à l'utilisateur courant
    this.subscription.add(
      this.authService.currentUser$.subscribe(async (user) => {
        this.currentDoctor = user as Doctor;
        if (this.currentDoctor) {
          await this.loadTemplates();
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  async loadTemplates() {
    if (!this.currentDoctor) return;

    this.isLoading = true;
    try {
      this.templates = await this.prescriptionService.getTemplatesByDoctor(
        this.currentDoctor.uid
      );
      this.filterTemplates();
    } catch (error) {
      console.error("Erreur lors du chargement des templates:", error);
      this.showNotification("Erreur lors du chargement des templates", "error");
    } finally {
      this.isLoading = false;
    }
  }

  filterTemplates() {
    this.filteredTemplates = this.templates.filter((template) => {
      let match = true;

      // Filtre par catégorie
      if (this.categoryFilter !== "all") {
        if (this.categoryFilter === "uncategorized") {
          match =
            match && (!template.category || template.category.trim() === "");
        } else {
          match = match && template.category === this.categoryFilter;
        }
      }

      // Filtre par recherche textuelle
      if (this.searchTerm) {
        const searchLower = this.searchTerm.toLowerCase();
        match =
          match &&
          (template.name.toLowerCase().includes(searchLower) ||
            (template.description &&
              template.description.toLowerCase().includes(searchLower)) ||
            template.instructions.toLowerCase().includes(searchLower) ||
            template.medications.some((med) =>
              med.name.toLowerCase().includes(searchLower)
            ));
      }

      return match;
    });
  }

  addMedication() {
    const medicationForm = this.fb.group({
      id: [this.generateId()],
      name: ["", Validators.required],
      dosage: ["", Validators.required],
      frequency: ["1 fois par jour", Validators.required],
      duration: ["7 jours", Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unit: ["comprimé(s)", Validators.required],
      route: ["Orale", Validators.required],
      notes: [""],
    });

    this.templateMedications.push(medicationForm);
  }

  removeMedication(index: number) {
    this.templateMedications.removeAt(index);
  }

  getMedicationsControls() {
    return this.templateMedications.controls;
  }

  async createTemplate() {
    if (this.templateForm.invalid) {
      this.markFormGroupTouched(this.templateForm);
      this.showNotification(
        "Veuillez remplir tous les champs obligatoires",
        "error"
      );
      return;
    }

    if (!this.currentDoctor) {
      this.showNotification("Vous devez être connecté", "error");
      return;
    }

    try {
      this.isCreating = true;

      const templateData = {
        doctorId: this.currentDoctor.uid,
        name: this.templateForm.value.name,
        category: this.templateForm.value.category || undefined,
        description: this.templateForm.value.description || undefined,
        instructions: this.templateForm.value.instructions,
        medications: this.templateForm.value.medications.map((med: any) => ({
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          quantity: med.quantity,
          unit: med.unit,
          route: med.route,
          notes: med.notes || undefined,
        })),
        categories: this.templateForm.value.category
          ? [this.templateForm.value.category]
          : [],
        createdAt: new Date(), // <-- AJOUTER CE CHAMP
      };

      const templateId = await this.prescriptionService.createTemplate(
        templateData
      );

      this.showNotification("Template créé avec succès", "success");
      await this.loadTemplates();
      this.cancelCreateTemplate();
    } catch (error) {
      console.error("Erreur lors de la création du template:", error);
      this.showNotification("Erreur lors de la création du template", "error");
    } finally {
      this.isCreating = false;
    }
  }
  cancelCreateTemplate() {
    this.showCreateTemplate = false;
    this.templateForm.reset({
      name: "",
      category: "",
      description: "",
      instructions: "",
      medications: [],
    });

    // Vider le tableau des médicaments
    while (this.templateMedications.length !== 0) {
      this.templateMedications.removeAt(0);
    }
  }

  async deleteTemplate(templateId: string) {
    if (
      !confirm(
        "Êtes-vous sûr de vouloir supprimer ce template ? Cette action est irréversible."
      )
    ) {
      return;
    }

    try {
      await this.prescriptionService.deleteTemplate(templateId);
      this.showNotification("Template supprimé avec succès", "success");
      await this.loadTemplates();
    } catch (error) {
      console.error("Erreur lors de la suppression du template:", error);
      this.showNotification(
        "Erreur lors de la suppression du template",
        "error"
      );
    }
  }

  useTemplate(template: PrescriptionTemplate) {
    // Naviguer vers la création d'ordonnance avec ce template
    this.router.navigate(["/doctor/prescriptions/create"], {
      queryParams: { templateId: template.id },
    });
  }

  editTemplate(template: PrescriptionTemplate) {
    // Pré-remplir le formulaire avec les données du template
    this.showCreateTemplate = true;

    // Réinitialiser le formulaire
    this.templateForm.reset({
      name: template.name,
      category: template.category || "",
      description: template.description || "",
      instructions: template.instructions,
    });

    // Vider et remplir le tableau des médicaments
    while (this.templateMedications.length !== 0) {
      this.templateMedications.removeAt(0);
    }

    template.medications.forEach((med: any) => {
      const medicationForm = this.fb.group({
        id: [this.generateId()],
        name: [med.name, Validators.required],
        dosage: [med.dosage, Validators.required],
        frequency: [med.frequency, Validators.required],
        duration: [med.duration, Validators.required],
        quantity: [med.quantity || 1, [Validators.required, Validators.min(1)]],
        unit: [med.unit || "comprimé(s)", Validators.required],
        route: [med.route || "Orale", Validators.required],
        notes: [med.notes || ""],
      });
      this.templateMedications.push(medicationForm);
    });
  }

  duplicateTemplate(template: PrescriptionTemplate) {
    this.showCreateTemplate = true;

    this.templateForm.reset({
      name: `${template.name} (Copie)`,
      category: template.category || "",
      description: template.description || "",
      instructions: template.instructions,
    });

    while (this.templateMedications.length !== 0) {
      this.templateMedications.removeAt(0);
    }

    template.medications.forEach((med: any) => {
      const medicationForm = this.fb.group({
        id: [this.generateId()],
        name: [med.name, Validators.required],
        dosage: [med.dosage, Validators.required],
        frequency: [med.frequency, Validators.required],
        duration: [med.duration, Validators.required],
        quantity: [med.quantity || 1, [Validators.required, Validators.min(1)]],
        unit: [med.unit || "comprimé(s)", Validators.required],
        route: [med.route || "Orale", Validators.required],
        notes: [med.notes || ""],
      });
      this.templateMedications.push(medicationForm);
    });
  }

  getCategories(): string[] {
    const categories = this.templates
      .map((t) => t.category)
      .filter(
        (category): category is string => !!category && category.trim() !== ""
      );

    return [...new Set(categories)];
  }

  clearFilters() {
    this.categoryFilter = "all";
    this.searchTerm = "";
    this.filterTemplates();
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return "Date inconnue";
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString("fr-FR");
  }

  getMedicationSummary(medications: any[]): string {
    if (!medications || medications.length === 0) return "Aucun médicament";
    return medications.map((med) => `${med.name} ${med.dosage}`).join(", ");
  }

  trackByFn(index: number, item: any): any {
    return item.value?.id || index;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private showNotification(
    message: string,
    type: "success" | "error" | "info" = "info"
  ) {
    // Vous pouvez utiliser votre service de notification existant
    this.notificationService
      .createNotification({
        userId: this.currentDoctor?.uid || "",
        title:
          type === "success"
            ? "Succès"
            : type === "error"
            ? "Erreur"
            : "Information",
        message,
        type: "system",
        read: false,
        createdAt: new Date(),
      })
      .catch(console.error);

    // Optionnel : afficher une alerte temporaire
    const alert = document.createElement("div");
    alert.className = `notification ${type}`;
    alert.textContent = message;
    alert.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 9999;
      animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
    `;

    if (type === "success") {
      alert.style.background =
        "linear-gradient(135deg, #6bcf7f 0%, #4caf50 100%)";
    } else if (type === "error") {
      alert.style.background =
        "linear-gradient(135deg, #ef5350 0%, #e53935 100%)";
    } else {
      alert.style.background =
        "linear-gradient(135deg, #42a5f5 0%, #2196f3 100%)";
    }

    document.body.appendChild(alert);

    setTimeout(() => {
      if (document.body.contains(alert)) {
        document.body.removeChild(alert);
      }
    }, 3000);
  }

  // Méthodes pour les statistiques
  getTemplateCount(): number {
    return this.templates.length;
  }

  getMedicationCount(): number {
    return this.templates.reduce(
      (total, template) => total + template.medications.length,
      0
    );
  }

  getCategoryCount(): number {
    return new Set(this.templates.map((t) => t.category).filter(Boolean)).size;
  }

  getMostUsedTemplate(): PrescriptionTemplate | null {
    if (this.templates.length === 0) return null;

    // Pour une implémentation réelle, vous devriez suivre l'utilisation
    return this.templates[0];
  }
}
