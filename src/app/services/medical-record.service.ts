// medical-record.service.ts - Version complétée
import { Injectable } from '@angular/core';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc,
  doc,
  orderBy,
  updateDoc
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { MedicalRecord } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class MedicalRecordService {
  constructor(private firebaseService: FirebaseService) {}

  // Créer un dossier médical
  async createMedicalRecord(recordData: Omit<MedicalRecord, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(
        collection(this.firebaseService.firestore, 'medicalRecords'),
        {
          ...recordData,
          createdAt: new Date(),
          createdBy: recordData.patientId // ou l'ID de l'utilisateur connecté
        }
      );
      return docRef.id;
    } catch (error) {
      console.error('Erreur lors de la création du dossier médical:', error);
      throw error;
    }
  }

  // Récupérer par médecin
  async getMedicalRecordsByDoctor(doctorId: string): Promise<MedicalRecord[]> {
    try {
      const recordsQuery = query(
        collection(this.firebaseService.firestore, 'medicalRecords'),
        where('doctorId', '==', doctorId),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(recordsQuery);
      return querySnapshot.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id } as MedicalRecord)
      );
    } catch (error) {
      console.error('Erreur lors de la récupération des dossiers:', error);
      throw error;
    }
  }

  // Récupérer par patient
  async getMedicalRecordsByPatient(patientId: string): Promise<MedicalRecord[]> {
    try {
      const recordsQuery = query(
        collection(this.firebaseService.firestore, 'medicalRecords'),
        where('patientId', '==', patientId),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(recordsQuery);
      return querySnapshot.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id } as MedicalRecord)
      );
    } catch (error) {
      console.error('Erreur lors de la récupération des dossiers:', error);
      throw error;
    }
  }

  // Supprimer un dossier médical (à ajouter si nécessaire)
  async deleteMedicalRecord(recordId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.firebaseService.firestore, 'medicalRecords', recordId));
    } catch (error) {
      console.error('Erreur lors de la suppression du dossier médical:', error);
      throw error;
    }
  }

  // Mettre à jour un dossier médical (optionnel)
  async updateMedicalRecord(recordId: string, data: Partial<MedicalRecord>): Promise<void> {
    try {
      const recordRef = doc(this.firebaseService.firestore, 'medicalRecords', recordId);
      await updateDoc(recordRef, data);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du dossier médical:', error);
      throw error;
    }
  }
}