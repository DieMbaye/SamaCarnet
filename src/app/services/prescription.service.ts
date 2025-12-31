// services/prescription.service.ts
import { Injectable } from '@angular/core';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  doc,
  Timestamp,
  orderBy,
  addDoc 
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { Prescription } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class PrescriptionService {
  constructor(private firebaseService: FirebaseService) {}

  private get prescriptionsCollection() {
    return collection(this.firebaseService.firestore, 'prescriptions');
  }

  // Récupérer les prescriptions par patient
  async getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
    try {
      const q = query(
        this.prescriptionsCollection, 
        where('patientId', '==', patientId),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as Prescription[];
    } catch (error) {
      console.error('Erreur lors de la récupération des prescriptions:', error);
      throw error;
    }
  }

  // Demander un renouvellement
  async requestRenewal(prescriptionId: string): Promise<void> {
    try {
      const prescriptionRef = doc(this.firebaseService.firestore, 'prescriptions', prescriptionId);
      await updateDoc(prescriptionRef, {
        renewalRequested: true,
        renewalRequestDate: Timestamp.now()
      });
    } catch (error) {
      console.error('Erreur lors de la demande de renouvellement:', error);
      throw error;
    }
  }

  // Créer une prescription (optionnel)
  async createPrescription(prescriptionData: Omit<Prescription, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(
        this.prescriptionsCollection,
        {
          ...prescriptionData,
          createdAt: Timestamp.now()
        }
      );
      return docRef.id;
    } catch (error) {
      console.error('Erreur lors de la création de la prescription:', error);
      throw error;
    }
  }

  // Mettre à jour le statut d'une prescription
  async updatePrescriptionStatus(prescriptionId: string, status: Prescription['status']): Promise<void> {
    try {
      const prescriptionRef = doc(this.firebaseService.firestore, 'prescriptions', prescriptionId);
      await updateDoc(prescriptionRef, { status });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      throw error;
    }
  }
}