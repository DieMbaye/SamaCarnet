import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Doctor, User } from '../../../models/user.model';
import { UserService } from '../../../services/user.service';
import { PatientDataService } from '../../../services/patient-data.service';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-patient-find-doctor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './patient-find-doctor.component.html',
  styleUrls: ['./patient-find-doctor.component.css']
})
export class PatientFindDoctorComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  allDoctors: Doctor[] = [];
  filteredDoctors: Doctor[] = [];
  specialities: string[] = [];
  
  // Filtres
  searchTerm = '';
  selectedSpeciality = 'all';
  availabilityFilter = 'all';
  minRating = 0;
  maxDistance = 50; // km
  sortBy = 'name';
  
  // État
  isLoading = false;
  showFilters = false;
  selectedDoctor: Doctor | null = null;
  showDoctorDetails = false;
  
  // Géolocalisation
  userLocation: { lat: number; lng: number } | null = null;
  
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private patientDataService: PatientDataService
  ) {}

  async ngOnInit() {
    this.patientDataService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    // Débounce pour la recherche
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.filterDoctors();
    });

    await this.loadDoctors();
    this.getUserLocation();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadDoctors() {
    this.isLoading = true;
    try {
      this.allDoctors = await this.userService.getDoctors();
      
      // Extraire les spécialités uniques
      const uniqueSpecialities = new Set<string>();
      this.allDoctors.forEach(doctor => {
        if (doctor.speciality) {
          uniqueSpecialities.add(doctor.speciality);
        }
      });
      this.specialities = Array.from(uniqueSpecialities).sort();
      
      this.filteredDoctors = [...this.allDoctors];
    } catch (error) {
      console.error('Erreur chargement médecins:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async getUserLocation() {
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });
        
        this.userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
      } catch (error) {
        console.warn('Géolocalisation non disponible:', error);
      }
    }
  }

  calculateDistance(doctor: Doctor): number | null {
    if (!this.userLocation || !doctor.location) return null;
    
    // Calcul simple de distance (Haversine formula simplifiée)
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.deg2rad(doctor.location.lat - this.userLocation.lat);
    const dLon = this.deg2rad(doctor.location.lng - this.userLocation.lng);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(this.userLocation.lat)) * 
      Math.cos(this.deg2rad(doctor.location.lat)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  onSearchChange() {
    this.searchSubject.next(this.searchTerm);
  }

  filterDoctors() {
    let filtered = [...this.allDoctors];

    // Filtre par recherche texte
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(doctor =>
        doctor.displayName?.toLowerCase().includes(term) ||
        doctor.speciality?.toLowerCase().includes(term) ||
        doctor.address?.toLowerCase().includes(term)
      );
    }

    // Filtre par spécialité
    if (this.selectedSpeciality !== 'all') {
      filtered = filtered.filter(doctor =>
        doctor.speciality === this.selectedSpeciality
      );
    }

    // Filtre par disponibilité
    if (this.availabilityFilter === 'today') {
      filtered = filtered.filter(doctor => this.isDoctorAvailableToday(doctor));
    } else if (this.availabilityFilter === 'thisWeek') {
      filtered = filtered.filter(doctor => this.isDoctorAvailableThisWeek(doctor));
    }

    // Filtre par note
    if (this.minRating > 0) {
      filtered = filtered.filter(doctor =>
        (doctor.rating || 0) >= this.minRating
      );
    }

    // Filtre par distance
    if (this.userLocation && this.maxDistance < 100) {
      filtered = filtered.filter(doctor => {
        const distance = this.calculateDistance(doctor);
        return distance !== null && distance <= this.maxDistance;
      });
    }

    // Tri
    filtered.sort((a, b) => {
      switch (this.sortBy) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'experience':
          return (b.experienceYears || 0) - (a.experienceYears || 0);
        case 'distance':
          const distA = this.calculateDistance(a) || Infinity;
          const distB = this.calculateDistance(b) || Infinity;
          return distA - distB;
        default: // 'name'
          return (a.displayName || '').localeCompare(b.displayName || '');
      }
    });

    this.filteredDoctors = filtered;
  }

  isDoctorAvailableToday(doctor: Doctor): boolean {
    // Logique de vérification de disponibilité
    const today = new Date().getDay();
    const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayMap[today];
    
    // Vérifier si le médecin travaille aujourd'hui
    // À adapter selon votre structure de données
    return true; // Placeholder
  }

  isDoctorAvailableThisWeek(doctor: Doctor): boolean {
    // Logique similaire
    return true; // Placeholder
  }

  viewDoctorDetails(doctor: Doctor) {
    this.selectedDoctor = doctor;
    this.showDoctorDetails = true;
  }

  closeDoctorDetails() {
    this.selectedDoctor = null;
    this.showDoctorDetails = false;
  }

  bookAppointment(doctor: Doctor) {
    // Navigation vers la prise de RDV avec pré-sélection du médecin
    const queryParams = {
      doctorId: doctor.uid,
      speciality: doctor.speciality
    };
    // À implémenter avec votre router
    console.log('Prendre RDV avec:', doctor.displayName);
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedSpeciality = 'all';
    this.availabilityFilter = 'all';
    this.minRating = 0;
    this.maxDistance = 50;
    this.sortBy = 'name';
    this.filterDoctors();
  }

  getDoctorStars(rating: number = 0): number[] {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) stars.push(1);
    if (hasHalfStar) stars.push(0.5);
    while (stars.length < 5) stars.push(0);
    
    return stars;
  }

  getInitials(name: string): string {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
}