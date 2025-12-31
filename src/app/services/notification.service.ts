// notification.service.ts
import { Injectable } from '@angular/core';
import { 
  collection, query, where, getDocs, doc, addDoc, updateDoc, orderBy, 
  Timestamp // ← Ajoutez cette importation
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { Notification } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(private firebaseService: FirebaseService) {}

  async createNotification(notificationData: Omit<Notification, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(this.firebaseService.firestore, 'notifications'), {
        ...notificationData,
        createdAt: Timestamp.fromDate(new Date()) // ← Utilisez Timestamp
      });
      return docRef.id;
    } catch (error) {
      console.error('Erreur lors de la création de la notification:', error);
      throw error;
    }
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    try {
      const notificationsQuery = query(
        collection(this.firebaseService.firestore, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(notificationsQuery);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convertir Timestamp en Date
          createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt'])
        } as Notification;
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(this.firebaseService.firestore, 'notifications', notificationId), {
        read: true,
        readAt: Timestamp.fromDate(new Date()) // ← Utilisez Timestamp
      });
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
      throw error;
    }
  }

  async sendAppointmentNotification(doctorId: string, patientName: string, appointmentDate: Date): Promise<void> {
    await this.createNotification({
      userId: doctorId,
      title: 'Nouvelle demande de rendez-vous',
      message: `${patientName} souhaite prendre un rendez-vous le ${appointmentDate.toLocaleDateString()}`,
      type: 'appointment',
      read: false,
      createdAt: new Date()
    });
  }

  async sendConfirmationNotification(patientId: string, doctorName: string, appointmentDate: Date): Promise<void> {
    await this.createNotification({
      userId: patientId,
      title: 'Rendez-vous confirmé',
      message: `Votre rendez-vous avec Dr. ${doctorName} le ${appointmentDate.toLocaleDateString()} a été confirmé`,
      type: 'confirmation',
      read: false,
      createdAt: new Date()
    });
  }
}