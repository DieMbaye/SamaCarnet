import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Doctor, Appointment, User } from "../../../models/user.model";
import { AppointmentService } from "../../../services/appointment.service";
import { UserService } from "../../../services/user.service";
import { AuthService } from "../../../services/auth.service";

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointments: Appointment[];
  availableSlots: string[];
}

interface TimeSlot {
  time: string;
  isAvailable: boolean;
  appointment?: Appointment;
}

interface Availability {
  dayOfWeek: number; // 0: Sunday, 1: Monday, etc.
  startTime: string;
  endTime: string;
  isActive: boolean;
}

@Component({
  selector: 'app-doctor-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-schedule.component.html',
  styleUrls: ['./doctor-schedule.component.css']
})
export class DoctorScheduleComponent implements OnInit, OnDestroy {
  currentUser: Doctor | null = null;
  
  // Data
  appointments: Appointment[] = [];
  patients: User[] = [];
  
  // Calendar state
  currentDate: Date = new Date();
  currentView: 'month' | 'week' | 'day' = 'week';
  calendarDays: CalendarDay[] = [];
  selectedDate: Date = new Date();
  selectedTimeSlots: TimeSlot[] = [];
  
  // Availability management
  defaultAvailability: Availability[] = [
    { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', isActive: true }, // Monday
    { dayOfWeek: 1, startTime: '14:00', endTime: '18:00', isActive: true },
    { dayOfWeek: 2, startTime: '09:00', endTime: '12:00', isActive: true }, // Tuesday
    { dayOfWeek: 2, startTime: '14:00', endTime: '18:00', isActive: true },
    { dayOfWeek: 3, startTime: '09:00', endTime: '12:00', isActive: true }, // Wednesday
    { dayOfWeek: 3, startTime: '14:00', endTime: '18:00', isActive: true },
    { dayOfWeek: 4, startTime: '09:00', endTime: '12:00', isActive: true }, // Thursday
    { dayOfWeek: 4, startTime: '14:00', endTime: '18:00', isActive: true },
    { dayOfWeek: 5, startTime: '09:00', endTime: '12:00', isActive: true }, // Friday
    { dayOfWeek: 5, startTime: '14:00', endTime: '17:00', isActive: true },
  ];
  
  // Modals
  showAvailabilityModal = false;
  showAppointmentModal = false;
  selectedAppointment: Appointment | null = null;
  
  // Forms
  availabilityForm = {
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '12:00',
    isActive: true
  };
  
  // Loading states
  isLoading = false;
  isSaving = false;

  private refreshInterval: any;

  constructor(
    private appointmentService: AppointmentService,
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // S'abonner aux changements d'utilisateur
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user as Doctor;
      if (this.currentUser) {
        this.loadScheduleData();
        this.startAutoRefresh();
      }
    });
    
    this.generateCalendar();
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      if (this.currentUser) {
        this.loadScheduleData();
      }
    }, 300000); // Refresh every 5 minutes
  }

  async loadScheduleData() {
    if (!this.currentUser) return;

    this.isLoading = true;
    try {
      await Promise.all([
        this.loadAppointments(),
        this.loadPatients()
      ]);
      
      this.generateCalendar();
      this.generateTimeSlots();
    } catch (error) {
      console.error('Erreur lors du chargement du planning:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadAppointments() {
    if (!this.currentUser) return;
    
    this.appointments = await this.appointmentService.getAppointmentsByDoctor(
      this.currentUser.uid
    );
    
    // Convert dates
    this.appointments = this.appointments.map(app => ({
      ...app,
      date: this.convertToDate(app.date),
      createdAt: this.convertToDate(app.createdAt)
    }));
  }

  async loadPatients() {
    this.patients = await this.userService.getUsersByRole('patient');
  }

  private convertToDate(date: any): Date {
    if (date instanceof Date) return date;
    if (date?.toDate) return date.toDate();
    if (typeof date === 'string') return new Date(date);
    return new Date();
  }

  // Calendar generation
  generateCalendar() {
    this.calendarDays = [];
    
    if (this.currentView === 'month') {
      this.generateMonthView();
    } else if (this.currentView === 'week') {
      this.generateWeekView();
    } else {
      this.generateDayView();
    }
  }

  generateMonthView() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayAppointments = this.getAppointmentsForDate(currentDate);
      
      this.calendarDays.push({
        date: new Date(currentDate),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: currentDate.toDateString() === new Date().toDateString(),
        appointments: dayAppointments,
        availableSlots: this.getAvailableSlotsForDate(currentDate)
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  generateWeekView() {
    const startOfWeek = new Date(this.currentDate);
    startOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay() + 1); // Start from Monday
    
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);
      
      const dayAppointments = this.getAppointmentsForDate(currentDate);
      
      this.calendarDays.push({
        date: new Date(currentDate),
        isCurrentMonth: true,
        isToday: currentDate.toDateString() === new Date().toDateString(),
        appointments: dayAppointments,
        availableSlots: this.getAvailableSlotsForDate(currentDate)
      });
    }
  }

  generateDayView() {
    const dayAppointments = this.getAppointmentsForDate(this.currentDate);
    
    this.calendarDays = [{
      date: new Date(this.currentDate),
      isCurrentMonth: true,
      isToday: this.currentDate.toDateString() === new Date().toDateString(),
      appointments: dayAppointments,
      availableSlots: this.getAvailableSlotsForDate(this.currentDate)
    }];
  }

  generateTimeSlots() {
    this.selectedTimeSlots = [];
    const dayAvailability = this.defaultAvailability.filter(av => 
      av.dayOfWeek === this.selectedDate.getDay() && av.isActive
    );
    
    if (dayAvailability.length === 0) {
      return;
    }

    // Generate 30-minute slots for the selected day
    for (const availability of dayAvailability) {
      let currentTime = this.parseTime(availability.startTime);
      const endTime = this.parseTime(availability.endTime);
      
      while (currentTime < endTime) {
        const timeString = this.formatTime(currentTime);
        const existingAppointment = this.appointments.find(app => {
          const appDate = new Date(app.date);
          return appDate.toDateString() === this.selectedDate.toDateString() && 
                 app.time === timeString;
        });
        
        this.selectedTimeSlots.push({
          time: timeString,
          isAvailable: !existingAppointment,
          appointment: existingAppointment
        });
        
        currentTime.setMinutes(currentTime.getMinutes() + 30);
      }
    }
  }

  getAppointmentsForHour(date: Date, hour: number): Appointment[] {
    return this.appointments.filter(app => {
      const appDate = new Date(app.date);
      const appHour = parseInt(app.time.split(':')[0]);
      return appDate.toDateString() === date.toDateString() && appHour === hour;
    });
  }

  getAppointmentsForDate(date: Date): Appointment[] {
    return this.appointments.filter(app => {
      const appDate = new Date(app.date);
      return appDate.toDateString() === date.toDateString();
    });
  }

  getUniquePatientsForDate(date: Date): User[] {
    const appointmentsForDate = this.getAppointmentsForDate(date);
    const patientIds = [...new Set(appointmentsForDate.map(app => app.patientId))];
    return this.patients.filter(patient => patientIds.includes(patient.uid));
  }

  // Navigation
  previousPeriod() {
    if (this.currentView === 'month') {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    } else if (this.currentView === 'week') {
      this.currentDate.setDate(this.currentDate.getDate() - 7);
    } else {
      this.currentDate.setDate(this.currentDate.getDate() - 1);
    }
    this.generateCalendar();
  }

  nextPeriod() {
    if (this.currentView === 'month') {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    } else if (this.currentView === 'week') {
      this.currentDate.setDate(this.currentDate.getDate() + 7);
    } else {
      this.currentDate.setDate(this.currentDate.getDate() + 1);
    }
    this.generateCalendar();
  }

  goToToday() {
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.generateCalendar();
    this.generateTimeSlots();
  }

  setView(view: 'month' | 'week' | 'day') {
    this.currentView = view;
    this.generateCalendar();
  }

  selectDate(date: Date) {
    this.selectedDate = date;
    this.generateTimeSlots();
    
    if (this.currentView === 'month') {
      this.setView('day');
    }
  }

  // Availability management
  getAvailableSlotsForDate(date: Date): string[] {
    const dayAvailability = this.defaultAvailability.filter(av => 
      av.dayOfWeek === date.getDay() && av.isActive
    );
    
    const slots: string[] = [];
    
    for (const availability of dayAvailability) {
      let currentTime = this.parseTime(availability.startTime);
      const endTime = this.parseTime(availability.endTime);
      
      while (currentTime < endTime) {
        const timeString = this.formatTime(currentTime);
        const isBooked = this.appointments.some(app => {
          const appDate = new Date(app.date);
          return appDate.toDateString() === date.toDateString() && 
                 app.time === timeString;
        });
        
        if (!isBooked) {
          slots.push(timeString);
        }
        
        currentTime.setMinutes(currentTime.getMinutes() + 30);
      }
    }
    
    return slots;
  }

  showAvailabilitySettings() {
    this.showAvailabilityModal = true;
  }

  addAvailability() {
    this.defaultAvailability.push({ ...this.availabilityForm });
    this.availabilityForm = {
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '12:00',
      isActive: true
    };
    this.generateCalendar();
    this.generateTimeSlots();
  }

  removeAvailability(index: number) {
    this.defaultAvailability.splice(index, 1);
    this.generateCalendar();
    this.generateTimeSlots();
  }

  toggleAvailability(index: number) {
    this.defaultAvailability[index].isActive = !this.defaultAvailability[index].isActive;
    this.generateCalendar();
    this.generateTimeSlots();
  }

  // Utility methods
  private parseTime(timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  private formatTime(date: Date): string {
    return date.toTimeString().slice(0, 5);
  }

  getPatientName(patientId: string): string {
    const patient = this.patients.find(p => p.uid === patientId);
    return patient?.displayName || 'Patient inconnu';
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatShortDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    });
  }

  getDayName(dayOfWeek: number): string {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return days[dayOfWeek];
  }

  getAppointmentStatusBadge(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending: 'warning',
      confirmed: 'success',
      completed: 'info',
      cancelled: 'error'
    };
    return statusMap[status] || 'default';
  }

  // Refresh method
  async refreshData() {
    await this.loadScheduleData();
  }

  // Close modals
  closeAvailabilityModal() {
    this.showAvailabilityModal = false;
  }

  closeAppointmentModal() {
    this.showAppointmentModal = false;
    this.selectedAppointment = null;
  }

  // Get day appointments count
  getDayAppointmentsCount(date: Date): number {
    return this.getAppointmentsForDate(date).length;
  }

  // Check if day has appointments
  hasAppointments(date: Date): boolean {
    return this.getAppointmentsForDate(date).length > 0;
  }

  // Get available slots count for day
  getAvailableSlotsCount(date: Date): number {
    return this.getAvailableSlotsForDate(date).length;
  }
}