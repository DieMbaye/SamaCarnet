import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-patient-emergency',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-emergency.component.html',
  styleUrls: ['./patient-emergency.component.css']
})
export class PatientEmergencyComponent {
  emergencyNumbers = [
    { name: 'SAMU', number: '15', description: 'Urgences médicales graves' },
    { name: 'Pompiers', number: '18', description: 'Incendies, accidents' },
    { name: 'Police', number: '17', description: 'Urgences sécurité' },
    { name: 'Urgence européenne', number: '112', description: 'Numéro unique d\'urgence' },
    { name: 'Centre antipoison', number: '01 40 05 48 48', description: 'Intoxications' },
    { name: 'SOS Médecins', number: '36 24', description: 'Médecin à domicile' },
  ];

  nearbyHospitals = [
    { name: 'Hôpital Necker', distance: '2.5 km', phone: '01 44 49 40 00' },
    { name: 'Hôpital Georges Pompidou', distance: '3.1 km', phone: '01 56 09 20 00' },
    { name: 'Hôpital Saint-Antoine', distance: '4.2 km', phone: '01 49 28 20 00' },
  ];

  callEmergency(number: string) {
    if (confirm(`Appeler le ${number} ?`)) {
      window.location.href = `tel:${number}`;
    }
  }

  getLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          alert(`Votre position: ${position.coords.latitude}, ${position.coords.longitude}`);
        },
        (error) => {
          alert('Impossible d\'obtenir votre position');
        }
      );
    }
  }

  shareLocation() {
    if (navigator.share) {
      navigator.share({
        title: 'Ma position d\'urgence',
        text: 'J\'ai besoin d\'aide médicale urgente',
        url: window.location.href
      });
    } else {
      alert('Partage non supporté sur cet appareil');
    }
  }
}