import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.css']
})
export class AdminSettingsComponent {
  settings = {
    siteName: 'MediApp',
    maintenanceMode: false,
    appointmentDuration: 30,
    maxAppointmentsPerDay: 20,
    emailNotifications: true,
    smsNotifications: false
  };

  saveSettings() {
    // Implémentez la sauvegarde des paramètres
    alert('Paramètres sauvegardés avec succès !');
  }

  resetSettings() {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser les paramètres ?')) {
      this.settings = {
        siteName: 'MediApp',
        maintenanceMode: false,
        appointmentDuration: 30,
        maxAppointmentsPerDay: 20,
        emailNotifications: true,
        smsNotifications: false
      };
    }
  }
}