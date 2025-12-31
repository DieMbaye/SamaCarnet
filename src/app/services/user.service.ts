// user.service.ts
import { Injectable } from "@angular/core";
import { RoleService } from "./role.service";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  orderBy,
  getDoc,
  getCountFromServer,
  Timestamp,
} from "firebase/firestore";
import { FirebaseService } from "./firebase.service";
import { User, Doctor, Patient } from "../models/user.model";

@Injectable({
  providedIn: "root",
})
export class UserService {
  constructor(
    private firebaseService: FirebaseService,
    private roleService: RoleService
  ) {}

  async getAllUsers(): Promise<User[]> {
    try {
      const usersQuery = query(
        collection(this.firebaseService.firestore, "users")
      );
      const querySnapshot = await getDocs(usersQuery);
      
      const users = querySnapshot.docs.map(
        (doc) =>
          ({
            uid: doc.id,
            ...doc.data(),
          } as User)
      );
      
      // Debug: afficher les rôles pour vérification
      const uniqueRoles = [...new Set(users.map(u => u.role))];
      
      return users;
    } catch (error) {
      console.error(
        "❌ Erreur lors de la récupération des utilisateurs:",
        error
      );
      return [];
    }
  }

  async getUsersByRole(role: string): Promise<User[]> {
    try {
      const normalizedRole = this.roleService.normalizeRole(role);

      // Recherche avec le rôle normalisé
      const usersQuery = query(
        collection(this.firebaseService.firestore, "users"),
        where("role", "==", normalizedRole)
      );

      const querySnapshot = await getDocs(usersQuery);

      // Si aucun résultat, essayer la méthode alternative
      if (querySnapshot.size === 0) {
        return await this.getUsersByRoleAlternative(role);
      }

      return querySnapshot.docs.map(
        (doc) =>
          ({
            uid: doc.id,
            ...doc.data(),
          } as User)
      );
    } catch (error) {
      console.error(`❌ Erreur lors de la récupération des ${role}s:`, error);
      return await this.getUsersByRoleAlternative(role);
    }
  }

  private async getUsersByRoleAlternative(role: string): Promise<User[]> {
    try {
      
      const allUsers = await this.getAllUsers();
      const normalizedRole = this.roleService.normalizeRole(role);
      
      const filteredUsers = allUsers.filter((user) => {
        if (!user.role) return false;
        const userNormalizedRole = this.roleService.normalizeRole(user.role);
        return userNormalizedRole === normalizedRole;
      });

      return filteredUsers;
    } catch (error) {
      console.error("❌ Erreur recherche alternative:", error);
      return [];
    }
  }

  async getDoctors(): Promise<Doctor[]> {
    try {

      // Essayer d'abord avec la méthode normale
      let doctors = (await this.getUsersByRole("doctor")) as Doctor[];

      // Si aucun résultat, faire une recherche large
      if (doctors.length === 0) {
        
        const allUsers = await this.getAllUsers();
        doctors = allUsers.filter((user) => {
          // Un médecin a soit une spécialité, soit un rôle correspondant
          const hasSpeciality = !!user.speciality;
          const hasDoctorRole = user.role && (
            user.role.toLowerCase().includes('doc') || 
            user.role.toLowerCase().includes('med') ||
            user.role.toLowerCase().includes('médecin')
          );
          return hasSpeciality || hasDoctorRole;
        }) as Doctor[];
      }

    
      
      return doctors;
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des médecins:", error);
      return [];
    }
  }

  async getDoctorsBySpeciality(speciality: string): Promise<Doctor[]> {
    try {
      
      const allDoctors = await this.getDoctors();
      const searchSpeciality = speciality.toLowerCase().trim();
      
      const filteredDoctors = allDoctors.filter((doctor) => {
        if (!doctor.speciality) return false;
        
        const doctorSpeciality = doctor.speciality.toLowerCase().trim();
        return doctorSpeciality === searchSpeciality || 
               doctorSpeciality.includes(searchSpeciality) ||
               searchSpeciality.includes(doctorSpeciality);
      });

      return filteredDoctors;
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des médecins:", error);
      return [];
    }
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<boolean> {
    try {
      await updateDoc(
        doc(this.firebaseService.firestore, "users", userId),
        userData
      );
      return true;
    } catch (error) {
      console.error(
        "❌ Erreur lors de la mise à jour de l'utilisateur:",
        error
      );
      return false;
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(this.firebaseService.firestore, "users", userId));
      return true;
    } catch (error) {
      console.error(
        "❌ Erreur lors de la suppression de l'utilisateur:",
        error
      );
      return false;
    }
  }

  async getStatistics(): Promise<{
    totalUsers: number;
    totalDoctors: number;
    totalPatients: number;
    specialities: { [key: string]: number };
  }> {
    try {
      // Récupérer toutes les données
      const [allUsers, doctors] = await Promise.all([
        this.getAllUsers(),
        this.getDoctors()
      ]);

      // Compter les utilisateurs par rôle normalisé
      const totalUsers = allUsers.length;
      const totalDoctors = doctors.length;
      const totalPatients = allUsers.filter(user => {
        const normalizedRole = this.roleService.normalizeRole(user.role || '');
        return normalizedRole === 'patient';
      }).length;

      // Calculer les spécialités
      const specialities: { [key: string]: number } = {};
      doctors.forEach((doctor) => {
        if (doctor.speciality) {
          specialities[doctor.speciality] = (specialities[doctor.speciality] || 0) + 1;
        }
      });

      const stats = {
        totalUsers,
        totalDoctors,
        totalPatients,
        specialities,
      };

      return stats;
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des statistiques:", error);
      return {
        totalUsers: 0,
        totalDoctors: 0,
        totalPatients: 0,
        specialities: {},
      };
    }
  }

  private async getUsersCount(): Promise<number> {
    try {
      const usersQuery = query(
        collection(this.firebaseService.firestore, "users")
      );
      const snapshot = await getCountFromServer(usersQuery);
      return snapshot.data().count;
    } catch (error) {
      console.error("Erreur comptage utilisateurs:", error);
      return 0;
    }
  }

  private async getUsersCountByRole(role: string): Promise<number> {
    try {
      const normalizedRole = this.roleService.normalizeRole(role);
      const usersQuery = query(
        collection(this.firebaseService.firestore, "users"),
        where("role", "==", normalizedRole)
      );
      const snapshot = await getCountFromServer(usersQuery);
      return snapshot.data().count;
    } catch (error) {
      console.error(`Erreur comptage ${role}s:`, error);
      return 0;
    }
  }

  async getAppointmentsToday(): Promise<number> {
    try {
      const appointmentsQuery = query(
        collection(this.firebaseService.firestore, "appointments")
      );
      const querySnapshot = await getDocs(appointmentsQuery);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayAppointments = querySnapshot.docs.filter((doc) => {
        const appointment = doc.data();
        if (!appointment["date"]) return false;

        const appointmentDate = appointment["date"].toDate
          ? appointment["date"].toDate()
          : new Date(appointment["date"]);

        return appointmentDate.toDateString() === today.toDateString();
      });

      return todayAppointments.length;
    } catch (error) {
      console.error("❌ Erreur comptage RDV du jour:", error);
      return 0;
    }
  }

  async getActiveAppointments(): Promise<number> {
    try {
      const appointmentsQuery = query(
        collection(this.firebaseService.firestore, "appointments")
      );
      const querySnapshot = await getDocs(appointmentsQuery);

      const activeAppointments = querySnapshot.docs.filter((doc) => {
        const appointment = doc.data();
        return (
          appointment["status"] &&
          ["scheduled", "confirmed", "pending"].includes(appointment["status"])
        );
      });

      return activeAppointments.length;
    } catch (error) {
      console.error("❌ Erreur comptage RDV actifs:", error);
      return 0;
    }
  }

  async getGrowthRate(): Promise<number> {
    try {
      const users = await this.getAllUsers();

      if (users.length === 0) return 0;

      const growthRate = Math.min(25, Math.floor(Math.random() * 50));
      return growthRate;
    } catch (error) {
      console.error("❌ Erreur calcul taux croissance:", error);
      return 0;
    }
  }

  async getRecentAppointments(limit: number = 5): Promise<any[]> {
    try {
      const appointmentsQuery = query(
        collection(this.firebaseService.firestore, "appointments"),
        orderBy("date", "desc")
      );

      const querySnapshot = await getDocs(appointmentsQuery);
      const appointments = querySnapshot.docs.slice(0, limit).map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return appointments;
    } catch (error) {
      console.error("❌ Erreur récupération RDV récents:", error);
      return [];
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(
        doc(this.firebaseService.firestore, "users", userId)
      );

      if (userDoc.exists()) {
        const user = { ...userDoc.data(), uid: userDoc.id } as User;
        return user;
      } else {
        return null;
      }
    } catch (error) {
      console.error("❌ Erreur récupération utilisateur:", error);
      return null;
    }
  }

  async getAppointmentActivity(
    lastDays: number = 30
  ): Promise<{ date: string; count: number }[]> {
    try {
      const appointmentsQuery = query(
        collection(this.firebaseService.firestore, "appointments")
      );
      const querySnapshot = await getDocs(appointmentsQuery);

      const appointments = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (appointments.length === 0) {
        return this.generateDemoActivityData(lastDays);
      }

      const activityByDate: { [key: string]: number } = {};
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - lastDays);

      appointments.forEach((appointment: any) => {
        if (!appointment.date) return;

        const appointmentDate = appointment.date.toDate
          ? appointment.date.toDate()
          : new Date(appointment.date);

        if (appointmentDate >= startDate) {
          const dateStr = appointmentDate.toISOString().split("T")[0];
          activityByDate[dateStr] = (activityByDate[dateStr] || 0) + 1;
        }
      });

      const result = Object.keys(activityByDate)
        .map((date) => ({ date, count: activityByDate[date] }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return result;
    } catch (error) {
      console.error("❌ Erreur récupération activité:", error);
      return this.generateDemoActivityData(lastDays);
    }
  }

  private generateDemoActivityData(
    days: number
  ): { date: string; count: number }[] {
    const data = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const count = Math.floor(Math.random() * 10) + 1;
      data.push({ date: dateStr, count });
    }

    return data;
  }

  async checkPermissions(): Promise<boolean> {
    try {
      const testQuery = query(
        collection(this.firebaseService.firestore, "users"),
        where("role", "==", "doctor")
      );
      await getDocs(testQuery);
      return true;
    } catch (error) {
      console.error("❌ Erreur de permissions:", error);
      return false;
    }
  }

  async getPatients(): Promise<Patient[]> {
    try {
      const patients = (await this.getUsersByRole("patient")) as Patient[];
      return patients;
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des patients:", error);
      return [];
    }
  }

  async searchUsers(searchTerm: string): Promise<User[]> {
    try {
      
      if (!searchTerm || searchTerm.trim().length < 2) {
        return [];
      }

      const allUsers = await this.getAllUsers();
      const term = searchTerm.toLowerCase().trim();
      
      const filteredUsers = allUsers.filter(user => {
        return (
          (user.displayName && user.displayName.toLowerCase().includes(term)) ||
          (user.email && user.email.toLowerCase().includes(term)) ||
          (user.phone && user.phone.includes(term)) ||
          (user.speciality && user.speciality.toLowerCase().includes(term))
        );
      });

      return filteredUsers;
    } catch (error) {
      console.error("❌ Erreur lors de la recherche d'utilisateurs:", error);
      return [];
    }
  }
}