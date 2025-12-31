import { Injectable } from "@angular/core";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
} from "firebase/firestore";
import { FirebaseService } from "./firebase.service";
import { Appointment } from "../models/user.model";

@Injectable({
  providedIn: "root",
})
export class AppointmentService {
  constructor(private firebaseService: FirebaseService) {}

  // Accès Firestore simplifié
  private get firestore() {
    return this.firebaseService.firestore;
  }

  async createAppointment(
    appointmentData: Omit<Appointment, "id">
  ): Promise<string> {
    try {
      const docRef = await addDoc(
        collection(this.firestore, "appointments"),
        {
          ...appointmentData,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );
      return docRef.id;
    } catch (error) {
      console.error("Erreur lors de la création de rendez-vous:", error);
      throw error;
    }
  }

  async getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
    try {
      const appointmentsQuery = query(
        collection(this.firestore, "appointments"),
        where("patientId", "==", patientId),
        orderBy("date", "desc")
      );
      const querySnapshot = await getDocs(appointmentsQuery);
      return querySnapshot.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id } as Appointment)
      );
    } catch (error) {
      console.error("Erreur lors de la récupération des rendez-vous:", error);
      if (error instanceof Error) {
        console.error("Stack trace:", error.stack);
      }
      throw error;
    }
  }

  async getAllAppointments(): Promise<Appointment[]> {
    try {
      const appointmentsQuery = query(
        collection(this.firestore, "appointments"),
        orderBy("date", "desc")
      );
      const querySnapshot = await getDocs(appointmentsQuery);
      return querySnapshot.docs.map(
        (doc) =>
          ({
            ...doc.data(),
            id: doc.id,
          } as Appointment)
      );
    } catch (error) {
      console.error(
        "Erreur lors de la récupération de tous les rendez-vous:",
        error
      );
      throw error;
    }
  }

  async getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]> {
    try {
      const appointmentsQuery = query(
        collection(this.firestore, "appointments"),
        where("doctorId", "==", doctorId),
        orderBy("date", "desc")
      );
      const querySnapshot = await getDocs(appointmentsQuery);
      return querySnapshot.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id } as Appointment)
      );
    } catch (error) {
      console.error("Erreur lors de la récupération des rendez-vous:", error);
      throw error;
    }
  }

  async updateAppointmentStatus(
    appointmentId: string,
    status: Appointment["status"]
  ): Promise<void> {
    try {
      await updateDoc(
        doc(this.firestore, "appointments", appointmentId),
        {
          status: status,
          updatedAt: new Date(),
        }
      );
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      throw error;
    }
  }

  async deleteAppointment(appointmentId: string): Promise<void> {
    try {
      await deleteDoc(
        doc(this.firestore, "appointments", appointmentId)
      );
    } catch (error) {
      console.error("Erreur lors de la suppression du rendez-vous:", error);
      throw error;
    }
  }

  async getPendingAppointments(): Promise<Appointment[]> {
    try {
      const appointmentsQuery = query(
        collection(this.firestore, "appointments"),
        where("status", "==", "pending"),
        orderBy("date", "asc")
      );
      const querySnapshot = await getDocs(appointmentsQuery);
      return querySnapshot.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id } as Appointment)
      );
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des rendez-vous en attente:",
        error
      );
      throw error;
    }
  }

  async rejectAppointment(
    appointmentId: string,
    reason: string,
    doctorId: string
  ): Promise<void> {
    try {
      const appointmentRef = doc(this.firestore, "appointments", appointmentId);
      await updateDoc(appointmentRef, {
        status: "cancelled",
        cancellationReason: reason,
        cancelledBy: doctorId,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Erreur lors du refus du rendez-vous:", error);
      throw error;
    }
  }

  async confirmAppointment(
    appointmentId: string,
    doctorNotes?: string
  ): Promise<void> {
    try {
      const appointmentRef = doc(this.firestore, "appointments", appointmentId);
      const updates: any = {
        status: "confirmed",
        confirmedAt: new Date(),
        updatedAt: new Date(),
      };

      if (doctorNotes) {
        updates.doctorNotes = doctorNotes;
      }

      await updateDoc(appointmentRef, updates);
    } catch (error) {
      console.error("Erreur lors de la confirmation du rendez-vous:", error);
      throw error;
    }
  }

  async addNotesToAppointment(
    appointmentId: string,
    notes: string,
    type: "doctor" | "patient" = "doctor"
  ): Promise<void> {
    try {
      const appointmentRef = doc(this.firestore, "appointments", appointmentId);

      if (type === "doctor") {
        await updateDoc(appointmentRef, {
          doctorNotes: notes,
          updatedAt: new Date(),
        });
      } else {
        await updateDoc(appointmentRef, {
          notes: notes,
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout des notes:", error);
      throw error;
    }
  }

  async completeAppointment(appointmentId: string): Promise<void> {
    try {
      await updateDoc(
        doc(this.firestore, "appointments", appointmentId),
        {
          status: "completed",
          updatedAt: new Date(),
          completedAt: new Date(),
        }
      );
    } catch (error) {
      console.error("Erreur lors de la complétion du rendez-vous:", error);
      throw error;
    }
  }

  // Méthode pour récupérer un rendez-vous spécifique
  async getAppointmentById(appointmentId: string): Promise<Appointment | null> {
    try {
      const appointmentDoc = await getDocs(
        query(
          collection(this.firestore, "appointments"),
          where("__name__", "==", appointmentId)
        )
      );
      
      if (!appointmentDoc.empty) {
        const doc = appointmentDoc.docs[0];
        return { ...doc.data(), id: doc.id } as Appointment;
      }
      return null;
    } catch (error) {
      console.error("Erreur lors de la récupération du rendez-vous:", error);
      throw error;
    }
  }

  // Méthode pour mettre à jour les notes seulement
  async updateAppointmentNotes(
    appointmentId: string,
    notes: string,
    noteType: 'patient' | 'doctor'
  ): Promise<void> {
    try {
      const appointmentRef = doc(this.firestore, "appointments", appointmentId);
      const fieldName = noteType === 'doctor' ? 'doctorNotes' : 'notes';
      
      await updateDoc(appointmentRef, {
        [fieldName]: notes,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour des notes:", error);
      throw error;
    }
  }

  // Méthode pour récupérer les rendez-vous avec filtres
  async getAppointmentsWithFilters(filters: {
    status?: Appointment["status"];
    doctorId?: string;
    patientId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Appointment[]> {
    try {
      let q = query(collection(this.firestore, "appointments"));
      
      // Ajouter les filtres dynamiquement
      const conditions = [];
      
      if (filters.status) {
        conditions.push(where("status", "==", filters.status));
      }
      
      if (filters.doctorId) {
        conditions.push(where("doctorId", "==", filters.doctorId));
      }
      
      if (filters.patientId) {
        conditions.push(where("patientId", "==", filters.patientId));
      }
      
      if (filters.startDate) {
        conditions.push(where("date", ">=", filters.startDate));
      }
      
      if (filters.endDate) {
        conditions.push(where("date", "<=", filters.endDate));
      }
      
      // Ajouter l'ordre par défaut
      conditions.push(orderBy("date", "desc"));
      
      // Appliquer tous les filtres
      q = query(q, ...conditions);
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id } as Appointment)
      );
    } catch (error) {
      console.error("Erreur lors de la récupération filtrée des rendez-vous:", error);
      throw error;
    }
  }
}
