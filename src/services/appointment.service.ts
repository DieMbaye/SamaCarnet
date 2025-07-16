import { Injectable } from '@angular/core';
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { Appointment } from '../models/user.model';
import { Firestore } from '@angular/fire/firestore';


@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  constructor(private firebaseService: FirebaseService) {}

  async createAppointment(appointmentData: Omit<Appointment, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(this.firebaseService.firestore, 'appointments'), {
        ...appointmentData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
  console.error('Erreur lors de la création de rendez-vous:', error);
  throw error;
}

  }

async getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
  try {
    const appointmentsQuery = query(
      collection(this.firebaseService.firestore, 'appointments'),
      where('patientId', '==', patientId),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(appointmentsQuery);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Appointment));
  } catch (error) {
    console.error('Erreur lors de la récupération des rendez-vous:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    throw error; // ou return [];
  }
}



  async getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]> {
    try {
      const appointmentsQuery = query(
        collection(this.firebaseService.firestore, 'appointments'),
        where('doctorId', '==', doctorId),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(appointmentsQuery);
      return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Appointment));
    } catch (error) {
      console.error('Erreur lors de la récupération des rendez-vous:', error);
      throw error;
    }
  }

  async updateAppointmentStatus(appointmentId: string, status: Appointment['status']): Promise<void> {
    try {
      await updateDoc(doc(this.firebaseService.firestore, 'appointments', appointmentId), {
        status: status,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      throw error;
    }
  }

  async deleteAppointment(appointmentId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.firebaseService.firestore, 'appointments', appointmentId));
    } catch (error) {
      console.error('Erreur lors de la suppression du rendez-vous:', error);
      throw error;
    }
  }
  async addNotesToAppointment(id: string, notes: string) {
  const appointmentRef = doc(this.firebaseService.firestore, `appointments/${id}`);
  return updateDoc(appointmentRef, { notes });
}


  async getPendingAppointments(): Promise<Appointment[]> {
    try {
      const appointmentsQuery = query(
        collection(this.firebaseService.firestore, 'appointments'),
        where('status', '==', 'pending'),
        orderBy('date', 'asc')
      );
      const querySnapshot = await getDocs(appointmentsQuery);
      return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Appointment));
    } catch (error) {
      console.error('Erreur lors de la récupération des rendez-vous en attente:', error);
      throw error;
    }
  }
}