import { Injectable } from '@angular/core';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { User, Doctor, Patient } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private firebaseService: FirebaseService) {}

  async getAllUsers(): Promise<User[]> {
    try {
      const usersQuery = query(collection(this.firebaseService.firestore, 'users'));
      const querySnapshot = await getDocs(usersQuery);
      return querySnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User));
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      throw error;
    }
  }

  async getUsersByRole(role: string): Promise<User[]> {
    try {
      const usersQuery = query(
        collection(this.firebaseService.firestore, 'users'),
        where('role', '==', role)
      );
      const querySnapshot = await getDocs(usersQuery);
      return querySnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User));
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs par rôle:', error);
      throw error;
    }
  }

  async getDoctorsBySpeciality(speciality: string): Promise<Doctor[]> {
    try {
      const doctorsQuery = query(
        collection(this.firebaseService.firestore, 'users'),
        where('role', '==', 'medecin'),
        where('speciality', '==', speciality)
      );
      const querySnapshot = await getDocs(doctorsQuery);
      return querySnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as Doctor));
    } catch (error) {
      console.error('Erreur lors de la récupération des médecins:', error);
      throw error;
    }
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<void> {
    try {
      await updateDoc(doc(this.firebaseService.firestore, 'users', userId), userData);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.firebaseService.firestore, 'users', userId));
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      throw error;
    }
  }

  async getStatistics(): Promise<{
    totalUsers: number;
    totalDoctors: number;
    totalPatients: number;
    specialities: { [key: string]: number };
  }> {
    try {
      const users = await this.getAllUsers();
      const doctors = users.filter(user => user.role === 'medecin');
      const patients = users.filter(user => user.role === 'patient');
      
      const specialities: { [key: string]: number } = {};
      doctors.forEach(doctor => {
        if (doctor.speciality) {
          specialities[doctor.speciality] = (specialities[doctor.speciality] || 0) + 1;
        }
      });

      return {
        totalUsers: users.length,
        totalDoctors: doctors.length,
        totalPatients: patients.length,
        specialities
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }
}