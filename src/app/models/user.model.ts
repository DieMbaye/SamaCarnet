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
  location: any;
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
  type: "appointment" | "confirmation" | "reminder" | "appointment_cancelled" | "prescription" | "system";
  read: boolean;
  createdAt: Date;
  details?: string; // Ajoutez cette ligne
}

// Modèles pour le système de prescriptions
export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string; // Lien vers la consultation
  date: Date;
  expiryDate: Date;
  medications: Medication[];
  instructions: string;
  status: "active" | "expired" | "completed" | "cancelled";
  renewalRequested?: boolean;
  renewalRequestDate?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  unit: string;
  route: string; // Oral, injectable, topique, etc.
  notes?: string;
}

export interface PrescriptionTemplate {
  id: string;
  doctorId: string;
  name: string;
  description?: string;
  medications: Omit<Medication, "id">[];
  instructions: string;
  categories: string[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface MedicationLibrary {
  id: string;
  name: string;
  genericName?: string;
  dosageForms: string[];
  defaultDosage: string;
  defaultRoute: string;
  category: string;
  warnings?: string;
  contraindications?: string;
  sideEffects?: string[];
}

export interface PrescriptionHistory {
  id: string;
  prescriptionId: string;
  action: "created" | "updated" | "renewed" | "cancelled" | "dispensed";
  performedBy: string;
  performedByName: string;
  notes?: string;
  timestamp?: Date; // ✔️ RENDRE OPTIONAL
}

export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  openingHours: OpeningHour[];
}

export interface OpeningHour {
  day: string;
  open: string;
  close: string;
  closed?: boolean;
}

export interface Dispensing {
  id: string;
  prescriptionId: string;
  pharmacyId: string;
  dispensedDate: Date;
  dispensedBy: string;
  quantityDispensed: number;
  notes?: string;
}

export interface PrescriptionTemplate {
  id: string;
  doctorId: string;
  name: string;
  description?: string;
  category?: string;
  medications: Omit<Medication, 'id'>[];
  instructions: string;
  categories: string[];
  usageCount?: number; // Nombre d'utilisations
  lastUsed?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  unit: string;
  route: string;
  notes?: string;
}