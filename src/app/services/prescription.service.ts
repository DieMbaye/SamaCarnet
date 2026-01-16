// services/prescription.service.ts
import { Injectable } from "@angular/core";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  Timestamp,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { FirebaseService } from "./firebase.service";
import {
  Prescription,
  Medication,
  PrescriptionTemplate,
  MedicationLibrary,
  PrescriptionHistory,
  Pharmacy,
  Dispensing,
} from "../models/user.model";

@Injectable({
  providedIn: "root",
})
export class PrescriptionService {
  constructor(private firebaseService: FirebaseService) {}

  private get firestore() {
    return this.firebaseService.firestore;
  }

  private get prescriptionsCollection() {
    return collection(this.firestore, "prescriptions");
  }

  private get templatesCollection() {
    return collection(this.firestore, "prescriptionTemplates");
  }

  private get medicationsCollection() {
    return collection(this.firestore, "medicationLibrary");
  }

  private get pharmaciesCollection() {
    return collection(this.firestore, "pharmacies");
  }

  // ============ PRESCRIPTIONS ============

  async createPrescription(
    prescriptionData: Omit<Prescription, "id">
  ): Promise<string> {
    try {
      const docRef = await addDoc(this.prescriptionsCollection, {
        ...prescriptionData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Ajouter à l'historique
      await this.addPrescriptionHistory(docRef.id, {
        action: "created",
        performedBy: prescriptionData.doctorId,
        performedByName: "Médecin",
        notes: "Ordonnance créée",
        timestamp: undefined,
      });

      return docRef.id;
    } catch (error) {
      console.error("Erreur lors de la création de la prescription:", error);
      throw error;
    }
  }

  async getPrescriptionById(
    prescriptionId: string
  ): Promise<Prescription | null> {
    try {
      const docSnap = await getDoc(
        doc(this.firestore, "prescriptions", prescriptionId)
      );
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as Prescription;
      }
      return null;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération de la prescription:",
        error
      );
      throw error;
    }
  }

  async getPrescriptionsByPatient(
    patientId: string,
    status?: string
  ): Promise<Prescription[]> {
    try {
      let q;
      if (status && status !== "all") {
        q = query(
          this.prescriptionsCollection,
          where("patientId", "==", patientId),
          where("status", "==", status),
          orderBy("date", "desc")
        );
      } else {
        q = query(
          this.prescriptionsCollection,
          where("patientId", "==", patientId),
          orderBy("date", "desc")
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Prescription[];
    } catch (error) {
      console.error("Erreur lors de la récupération des prescriptions:", error);
      throw error;
    }
  }

  async getPrescriptionsByDoctor(doctorId: string): Promise<Prescription[]> {
    try {
      const q = query(
        this.prescriptionsCollection,
        where("doctorId", "==", doctorId),
        orderBy("date", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Prescription[];
    } catch (error) {
      console.error("Erreur lors de la récupération des prescriptions:", error);
      throw error;
    }
  }

  async updatePrescription(
    prescriptionId: string,
    data: Partial<Prescription>
  ): Promise<void> {
    try {
      const prescriptionRef = doc(
        this.firestore,
        "prescriptions",
        prescriptionId
      );
      await updateDoc(prescriptionRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la prescription:", error);
      throw error;
    }
  }

  async updatePrescriptionStatus(
    prescriptionId: string,
    status: Prescription["status"]
  ): Promise<void> {
    try {
      const prescriptionRef = doc(
        this.firestore,
        "prescriptions",
        prescriptionId
      );
      await updateDoc(prescriptionRef, {
        status,
        updatedAt: Timestamp.now(),
      });

      // 🔥 Création d'une action valide pour l'historique
      let action: PrescriptionHistory["action"];

      switch (status) {
        case "cancelled":
          action = "cancelled";
          break;
        case "completed":
          action = "dispensed";
          break;
        case "expired":
          action = "updated"; // ou 'cancelled' selon ton workflow
          break;
        case "active":
        default:
          action = "updated";
      }

      await this.addPrescriptionHistory(prescriptionId, {
        action,
        performedBy: "system",
        performedByName: "Système",
        notes: `Statut changé à: ${status}`,
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      throw error;
    }
  }

  async deletePrescription(prescriptionId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.firestore, "prescriptions", prescriptionId));
    } catch (error) {
      console.error("Erreur lors de la suppression de la prescription:", error);
      throw error;
    }
  }

  async renewPrescription(prescriptionId: string): Promise<void> {
    try {
      const prescriptionRef = doc(
        this.firestore,
        "prescriptions",
        prescriptionId
      );
      await updateDoc(prescriptionRef, {
        renewalRequested: true,
        renewalRequestDate: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      await this.addPrescriptionHistory(prescriptionId, {
        action: "renewed",
        performedBy: "patient",
        performedByName: "Patient",
        notes: "Renouvellement demandé",
        timestamp: undefined,
      });
    } catch (error) {
      console.error("Erreur lors de la demande de renouvellement:", error);
      throw error;
    }
  }

  async approveRenewal(
    prescriptionId: string,
    newExpiryDate: Date
  ): Promise<void> {
    try {
      const prescriptionRef = doc(
        this.firestore,
        "prescriptions",
        prescriptionId
      );
      await updateDoc(prescriptionRef, {
        renewalRequested: false,
        renewalRequestDate: null,
        expiryDate: newExpiryDate,
        status: "active",
        updatedAt: Timestamp.now(),
      });

      await this.addPrescriptionHistory(prescriptionId, {
        action: "renewed",
        performedBy: "doctor",
        performedByName: "Médecin",
        notes: "Renouvellement approuvé",
        timestamp: undefined,
      });
    } catch (error) {
      console.error("Erreur lors de l'approbation du renouvellement:", error);
      throw error;
    }
  }

  // ============ MÉDICAMENTS ============

  async searchMedications(searchTerm: string): Promise<MedicationLibrary[]> {
    try {
      const q = query(
        this.medicationsCollection,
        where("name", ">=", searchTerm),
        where("name", "<=", searchTerm + "\uf8ff"),
        limit(20)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as MedicationLibrary[];
    } catch (error) {
      console.error("Erreur lors de la recherche de médicaments:", error);
      throw error;
    }
  }

  async getMedicationById(
    medicationId: string
  ): Promise<MedicationLibrary | null> {
    try {
      const docSnap = await getDoc(
        doc(this.firestore, "medicationLibrary", medicationId)
      );
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as MedicationLibrary;
      }
      return null;
    } catch (error) {
      console.error("Erreur lors de la récupération du médicament:", error);
      throw error;
    }
  }

  // ============ TEMPLATES ============

  async createTemplate(
    templateData: Omit<PrescriptionTemplate, "id">
  ): Promise<string> {
    try {
      const docRef = await addDoc(this.templatesCollection, {
        ...templateData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Erreur lors de la création du template:", error);
      throw error;
    }
  }

  async getTemplatesByDoctor(
    doctorId: string
  ): Promise<PrescriptionTemplate[]> {
    try {
      const q = query(
        this.templatesCollection,
        where("doctorId", "==", doctorId),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as PrescriptionTemplate[];
    } catch (error) {
      console.error("Erreur lors de la récupération des templates:", error);
      throw error;
    }
  }

  async deleteTemplate(templateId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.firestore, "prescriptionTemplates", templateId));
    } catch (error) {
      console.error("Erreur lors de la suppression du template:", error);
      throw error;
    }
  }

  // ============ PHARMACIES ============

  async getPharmaciesNearby(
    latitude: number,
    longitude: number,
    radius: number = 10
  ): Promise<Pharmacy[]> {
    try {
      // Note: Firestore n'a pas de recherche géospatiale native
      // Pour une implémentation réelle, utilisez GeoFirestore ou une autre solution
      const q = query(this.pharmaciesCollection, limit(20));
      const snapshot = await getDocs(q);
      const pharmacies = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Pharmacy[];

      // Filtrage simulé par distance
      return pharmacies.filter((pharmacy) => {
        if (!pharmacy.location) return true;
        const distance = this.calculateDistance(
          latitude,
          longitude,
          pharmacy.location.latitude,
          pharmacy.location.longitude
        );
        return distance <= radius;
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des pharmacies:", error);
      throw error;
    }
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    // Calcul de distance simplifié (Haversine formula)
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // ============ HISTORIQUE ============

  async addPrescriptionHistory(
    prescriptionId: string,
    historyData: Omit<PrescriptionHistory, "id" | "prescriptionId">
  ): Promise<void> {
    try {
      await addDoc(collection(this.firestore, "prescriptionHistory"), {
        prescriptionId,
        ...historyData,
        timestamp: Timestamp.now(),
      });
    } catch (error) {
      console.error("Erreur lors de l'ajout à l'historique:", error);
      throw error;
    }
  }

  async getPrescriptionHistory(
    prescriptionId: string
  ): Promise<PrescriptionHistory[]> {
    try {
      const q = query(
        collection(this.firestore, "prescriptionHistory"),
        where("prescriptionId", "==", prescriptionId),
        orderBy("timestamp", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as PrescriptionHistory[];
    } catch (error) {
      console.error("Erreur lors de la récupération de l'historique:", error);
      throw error;
    }
  }

  // ============ MÉTHODES UTILES ============

  async checkForExpiredPrescriptions(): Promise<Prescription[]> {
    try {
      const today = new Date();
      const q = query(
        this.prescriptionsCollection,
        where("status", "==", "active"),
        where("expiryDate", "<", today)
      );
      const snapshot = await getDocs(q);
      const expired = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Prescription[];

      // Mettre à jour le statut des prescriptions expirées
      for (const prescription of expired) {
        await this.updatePrescriptionStatus(prescription.id, "expired");
      }

      return expired;
    } catch (error) {
      console.error(
        "Erreur lors de la vérification des prescriptions expirées:",
        error
      );
      throw error;
    }
  }

  async getActivePrescriptionsCount(patientId: string): Promise<number> {
    try {
      const q = query(
        this.prescriptionsCollection,
        where("patientId", "==", patientId),
        where("status", "==", "active")
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error(
        "Erreur lors du comptage des prescriptions actives:",
        error
      );
      throw error;
    }
  }

  async exportPrescriptionToPDF(prescriptionId: string): Promise<Blob> {
    // Implémentation de génération PDF (utiliser jsPDF ou autre bibliothèque)
    // Retourne un Blob avec le PDF
    const prescription = await this.getPrescriptionById(prescriptionId);
    if (!prescription) throw new Error("Prescription non trouvée");

    // Simuler un PDF (à remplacer par une vraie génération)
    const content = this.generatePrescriptionText(prescription);
    return new Blob([content], { type: "application/pdf" });
  }

  private generatePrescriptionText(prescription: Prescription): string {
    let text = `ORDONNANCE MÉDICALE\n`;
    text += `=====================\n\n`;
    text += `Date: ${prescription.date.toLocaleDateString("fr-FR")}\n`;
    text += `Patient: ${prescription.patientId}\n`;
    text += `Médecin: ${prescription.doctorId}\n\n`;
    text += `MÉDICAMENTS PRESCRITS:\n`;
    text += `=====================\n`;

    prescription.medications.forEach((med, index) => {
      text += `${index + 1}. ${med.name} ${med.dosage}\n`;
      text += `   Posologie: ${med.frequency} pendant ${med.duration}\n`;
      text += `   Voie: ${med.route}\n`;
      if (med.notes) text += `   Notes: ${med.notes}\n`;
      text += `\n`;
    });

    text += `INSTRUCTIONS:\n`;
    text += `=============\n`;
    text += `${prescription.instructions}\n\n`;
    text += `Date d'expiration: ${prescription.expiryDate.toLocaleDateString(
      "fr-FR"
    )}\n`;
    text += `Signature: _________________\n`;

    return text;
  }
}
