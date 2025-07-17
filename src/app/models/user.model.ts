import { FieldValue } from "firebase/firestore";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'medecin' | 'patient';
  createdAt: Date | FieldValue; // ✅ Autorise les deux types
  speciality?: string; // Pour les médecins
  phone?: string;
  address?: string;
}

export interface Patient extends User {
  dateOfBirth: Date;
  medicalHistory: MedicalRecord[];
  appointments: Appointment[];
}

export interface Doctor extends User {
  speciality: string;
  experience: number;
  schedule: Schedule[];
  patients: string[];
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  date: Date;
  type: string;          // type d'antécédent médical
  description: string;   // description détaillée
  notes?: string;        // notes optionnelles (si besoin)
}


export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: Date;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  reason: string;
  notes?: string;
  createdAt: Date;
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
  type: 'appointment' | 'confirmation' | 'reminder';
  read: boolean;
  createdAt: Date;
}