import { Component, AfterViewInit, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

// Import Swiper
import { SwiperContainer } from 'swiper/element';
import { SwiperOptions } from 'swiper/types';
import { register } from 'swiper/element/bundle';

// Register Swiper custom elements
register();

interface HospitalStat {
  number: string;
  label: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  icon: string;
  meta: string[];
  route: string;
}

interface Department {
  id: string;
  name: string;
  services: string[];
  route: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  photo: string;
  badges: string[];
  route: string;
}

interface Technology {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface Testimonial {
  id: string;
  text: string;
  author: string;
  service: string;
  avatar: string;
}

@Component({
  selector: 'app-accueil',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule
  ]
})
export class AccueilComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('servicesSwiper', { static: false }) servicesSwiper!: ElementRef<SwiperContainer>;
  
  contactForm: FormGroup;
  isMobileMenuOpen = false;

  // Configuration Swiper
  swiperConfig: SwiperOptions = {
    slidesPerView: 1,
    spaceBetween: 30,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false,
    },
    pagination: {
      clickable: true,
      dynamicBullets: true,
    },
    navigation: true,
    breakpoints: {
      640: {
        slidesPerView: 2,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 3,
        spaceBetween: 30,
      },
    },
    speed: 600,
    effect: 'slide',
    grabCursor: true,
  };

  hospitalStats: HospitalStat[] = [
    { number: '150+', label: 'Médecins Spécialistes' },
    { number: '50+', label: 'Services Médicaux' },
    { number: '24/7', label: 'Urgences' }
  ];

  services: Service[] = [
    {
      id: 'chirurgie',
      name: 'Chirurgie Générale',
      description: 'Blocs opératoires high-tech avec équipes chirurgicales expérimentées',
      icon: '../../assets/icon/icon-chirurgie.png',
      meta: ['🕒 Urgence 24h/24', '👨‍⚕️ 15 Chirurgiens'],
      route: '/service/chirurgie'
    },
    {
      id: 'cardiologie',
      name: 'Cardiologie',
      description: 'Unité de cardiologie interventionnelle et réanimation cardiaque',
      icon: '../../assets/icon/icon-cardio.png',
      meta: ['🫀 Cathétérisme cardiaque', '👩‍⚕️ 8 Cardiologues'],
      route: '/service/cardiologie'
    },
    {
      id: 'maternite',
      name: 'Maternité & Néonatologie',
      description: 'Suivi grossesse, accouchement et soins intensifs néonatals',
      icon: '../../assets/icon/icon-maternite.png',
      meta: ['👶 2000 naissances/an', '🏥 USIN niveau 3'],
      route: '/service/maternite'
    },
    {
      id: 'pediatrie',
      name: 'Pédiatrie',
      description: 'Service dédié aux enfants avec urgences pédiatriques',
      icon: '../../assets/icon/icon-pediatrie.png',
      meta: ['🧸 Urgences pédiatriques', '👨‍⚕️ 12 Pédiatres'],
      route: '/service/pediatrie'
    },
    {
      id: 'imagerie',
      name: 'Imagerie Médicale',
      description: 'IRM, Scanner, Échographie et Radiologie numérique',
      icon: '../../assets/icon/icon-medicale.png',
      meta: ['📊 IRM 3 Tesla', '🕒 7j/7'],
      route: '/service/imagerie'
    },
    {
      id: 'laboratoire',
      name: 'Laboratoire d\'Analyses',
      description: 'Biologie médicale avec résultats sous 24h',
      icon: '../../assets/icon/icon-labo.png',
      meta: ['🧪 Analyses complexes', '⚡ Résultats rapides'],
      route: '/service/laboratoire'
    }
  ];

  departments: Department[] = [
    {
      id: 'cancerologie',
      name: 'Centre de Cancérologie',
      services: ['Chimiothérapie', 'Radiothérapie', 'Oncologie médicale', 'Soins de support'],
      route: '/departement/cancerologie'
    },
    {
      id: 'cardio',
      name: 'Institut du Cœur',
      services: ['Chirurgie cardiaque', 'Rythmologie', 'Rééducation cardiaque', 'Prévention'],
      route: '/departement/cardio'
    },
    {
      id: 'traumatologie',
      name: 'Centre de Traumatologie',
      services: ['Chirurgie orthopédique', 'Médecine du sport', 'Rééducation fonctionnelle', 'Urgence traumatique'],
      route: '/departement/traumatologie'
    },
    {
      id: 'neurosciences',
      name: 'Neurosciences',
      services: ['Neurologie', 'Neurochirurgie', 'Épileptologie', 'Unité AVC'],
      route: '/departement/neurosciences'
    }
  ];

  doctors: Doctor[] = [
    {
      id: 'awa-diallo',
      name: 'Dr. Awa Diallo',
      specialty: 'Chirurgienne Générale',
      experience: '20 ans d\'expérience',
      photo: '../../assets/images/medcin-1.jpg',
      badges: ['👑 Chef de Service', '🏆 Prix d\'Excellence'],
      route: '/medecin/awa-diallo'
    },
    {
      id: 'mamadou-sow',
      name: 'Dr. Mamadou Sow',
      specialty: 'Cardiologue Interventionnel',
      experience: '15 ans d\'expérience',
      photo: 'assets/images/medcin-2.jpg',
      badges: ['💓 Spécialiste Cœur', '📈 1000+ Interventions'],
      route: '/medecin/mamadou-sow'
    },
    {
      id: 'fatou-ba',
      name: 'Dr. Fatou Bâ',
      specialty: 'Pédiatre',
      experience: '12 ans d\'expérience',
      photo: 'assets/images/medcin-2.jpg',
      badges: ['👶 Urgences Pédiatriques', '🌟 Référente Régionale'],
      route: '/medecin/fatou-ba'
    },
    {
      id: 'jean-diop',
      name: 'Dr. Jean Diop',
      specialty: 'Radiologue',
      experience: '18 ans d\'expérience',
      photo: 'assets/images/medcin-1.jpg',
      badges: ['📊 Imagerie Avancée', '🔬 Recherche Clinique'],
      route: '/medecin/jean-diop'
    }
  ];

  technologies: Technology[] = [
    {
      id: 'robotique',
      name: 'Chirurgie Robotique',
      description: 'Robot Da Vinci pour une chirurgie de précision',
      icon: '🤖'
    },
    {
      id: 'irm',
      name: 'IRM 3 Tesla',
      description: 'Imagerie haute résolution pour diagnostics précis',
      icon: '💡'
    },
    {
      id: 'telemedecine',
      name: 'Télémédecine',
      description: 'Consultations à distance avec nos spécialistes',
      icon: '📱'
    },
    {
      id: 'blocs-hybrides',
      name: 'Blocs Hybrides',
      description: 'Salles d\'opération avec imagerie per-opératoire',
      icon: '🏥'
    }
  ];

  testimonials: Testimonial[] = [
    {
      id: 'testimonial-1',
      text: 'L\'équipe de cardiologie m\'a sauvé la vie. Prise en charge exceptionnelle et suivi impeccable. Merci Dr. Sow !',
      author: 'M. Abdoulaye D.',
      service: 'Patient Cardiologie',
      avatar: 'assets/images/patient-1.jpg'
    },
    {
      id: 'testimonial-2',
      text: 'Accouchement magnifiquement accompagné par l\'équipe de maternité. Professionnalisme et humanité remarquables.',
      author: 'Mme. Aminata S.',
      service: 'Maternité',
      avatar: 'assets/images/patient-2.jpg'
    },
    {
      id: 'testimonial-3',
      text: 'Opéré en urgence suite à un accident, l\'équipe de traumatologie a été formidable. Récupération plus rapide que prévu.',
      author: 'M. Ibrahima T.',
      service: 'Traumatologie',
      avatar: 'assets/images/patient-3.jpg'
    }
  ];

  private scrollHandler = () => this.handleScrollAnimation();

  constructor(private fb: FormBuilder) {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      service: ['', Validators.required],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initializeSwiper();
    window.addEventListener('scroll', this.scrollHandler);
    this.handleScrollAnimation();
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.scrollHandler);
  }

  // Initialisation de Swiper
  initializeSwiper(): void {
    if (this.servicesSwiper && this.servicesSwiper.nativeElement) {
      Object.assign(this.servicesSwiper.nativeElement, this.swiperConfig);
      this.servicesSwiper.nativeElement.initialize();
    }
  }

  handleScrollAnimation(): void {
    const scrollElements = document.querySelectorAll('.scroll-reveal');
    scrollElements.forEach((el) => {
      if (this.elementInView(el as HTMLElement, 100)) {
        el.classList.add('visible');
      } else {
        el.classList.remove('visible');
      }
    });
  }

  elementInView(el: HTMLElement, offset = 0): boolean {
    const elementTop = el.getBoundingClientRect().top;
    return elementTop <= (window.innerHeight || document.documentElement.clientHeight) - offset;
  }

  onEmergencyClick(): void {
    const confirmCall = confirm(
      "Appeler les urgences médicales ?\n\nNuméro : 77 123 45 67\n\nAppuyez sur OK pour composer le numéro."
    );
    if (confirmCall) {
      window.location.href = 'tel:+221771234567';
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    const navLinks = document.querySelector('.nav-links') as HTMLElement;
    if (navLinks) {
      if (this.isMobileMenuOpen) {
        navLinks.classList.add('active');
      } else {
        navLinks.classList.remove('active');
      }
    }
  }

  scrollTo(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerHeight = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    
    if (this.isMobileMenuOpen) {
      this.toggleMobileMenu();
    }
  }

  onSubmit(): void {
    if (this.contactForm.valid) {
      alert('Votre demande a été envoyée avec succès ! Nous vous contacterons rapidement.');
      this.contactForm.reset();
    } else {
      Object.keys(this.contactForm.controls).forEach(key => {
        const control = this.contactForm.get(key);
        if (control) {
          control.markAsTouched();
        }
      });
    }
  }

  get name() { return this.contactForm.get('name'); }
  get phone() { return this.contactForm.get('phone'); }
  get email() { return this.contactForm.get('email'); }
  get service() { return this.contactForm.get('service'); }
  get message() { return this.contactForm.get('message'); }
}