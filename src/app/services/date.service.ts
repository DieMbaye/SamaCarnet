// services/date.service.ts
import { Injectable } from '@angular/core';
import { Timestamp } from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class DateService {
  
  convertToDate(dateInput: any): Date {
    if (!dateInput) return new Date();
    
    if (dateInput instanceof Date) {
      return dateInput;
    }
    
    if (dateInput && typeof dateInput === 'object' && 'toDate' in dateInput) {
      return (dateInput as Timestamp).toDate();
    }
    
    if (typeof dateInput === 'string') {
      const date = new Date(dateInput);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    
    if (typeof dateInput === 'number') {
      return new Date(dateInput);
    }
    
    console.warn('Format de date non reconnu:', dateInput);
    return new Date();
  }
  
  formatDate(dateInput: any, locale: string = 'fr-FR'): string {
    try {
      const date = this.convertToDate(dateInput);
      return date.toLocaleDateString(locale);
    } catch (error) {
      console.error('Erreur formatage date:', error);
      return 'Date invalide';
    }
  }
  
  formatDateTime(dateInput: any, locale: string = 'fr-FR'): string {
    try {
      const date = this.convertToDate(dateInput);
      return date.toLocaleDateString(locale) + ' ' + date.toLocaleTimeString(locale, { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      console.error('Erreur formatage date/heure:', error);
      return 'Date/heure invalide';
    }
  }
}