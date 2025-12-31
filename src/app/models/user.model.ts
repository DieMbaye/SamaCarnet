import { FieldValue } from "firebase/firestore";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: "admin" | "medecin" | "patient";
  createdAt?: Date | FieldValue | any; // Ajoutez ? pour rendre optionnel ou utilisez any/FieldValue

  speciality?: string;
  phone?: string;
  address?: string;
  disabled?: boolean;
  birthDate?: Date;
  emailVerified?: boolean; // ✅ AJOUTÉ
}
export interface Patient extends User {
  dateOfBirth: Date;
  medicalHistory: MedicalRecord[];
  appointments: Appointment[];
}

export interface Doctor extends User {
  experienceYears: any;
  speciality: string;
  experience: number;
  schedule: Schedule[];
  patients: string[];
  rating: number;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  date: Date;
  type: string; // type d'antécédent médical
  description: string; // description détaillée
  notes?: string; // notes optionnelles (si besoin)
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: Date;
  time: string;
  reason: string;
  notes?: string; // Notes du patient
  doctorNotes?: string; // Notes du médecin
  status: "pending" | "confirmed" | "completed" | "cancelled";
  createdAt: Date;
  confirmedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  cancelledBy?: string;
  updatedAt?: Date;
}
export interface Schedule {
  day: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "appointment" | "confirmation" | "reminder" | "appointment_cancelled";
  read: boolean;
  createdAt: Date;
  details?: string; // Ajoutez cette ligne
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  date: Date;
  expiryDate?: Date;
  medications: Medication[];
  instructions: string;
  status: "active" | "expired" | "completed" | "cancelled";
  renewalRequested?: boolean;
  renewalRequestDate?: Date;
  createdAt: Date;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}
