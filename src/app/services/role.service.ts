// services/role.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  
  normalizeRole(role: string): string {
    const roleMap: { [key: string]: string } = {
      'medecin': 'doctor',
      'médecin': 'doctor',
      'docteur': 'doctor',
      'doctor': 'doctor',
      'admin': 'admin',
      'administrator': 'admin',
      'patient': 'patient',
      'user': 'patient'
    };
    
    return roleMap[role.toLowerCase()] || 'patient';
  }

  getRoleDisplayName(role: string): string {
    const displayNames: { [key: string]: string } = {
      'admin': 'Administrateur',
      'doctor': 'Médecin',
      'medecin': 'Médecin',
      'patient': 'Patient'
    };
    
    const normalizedRole = this.normalizeRole(role);
    return displayNames[normalizedRole] || 'Utilisateur';
  }
}