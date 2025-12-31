import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppointmentService } from './appointment.service';
import { UserService } from './user.service';
import { MedicalRecordService } from './medical-record.service';

@Injectable({
  providedIn: 'root'
})
export class DoctorDataService {
  private appointmentsSubject = new BehaviorSubject<any[]>([]);
  private patientsSubject = new BehaviorSubject<any[]>([]);
  
  appointments$ = this.appointmentsSubject.asObservable();
  patients$ = this.patientsSubject.asObservable();

  constructor(
    private appointmentService: AppointmentService,
    private userService: UserService,
    private medicalRecordService: MedicalRecordService
  ) {}

  async loadDoctorData(doctorId: string) {
    const [appointments, patients] = await Promise.all([
      this.appointmentService.getAppointmentsByDoctor(doctorId),
      this.userService.getUsersByRole('patient')
    ]);

    this.appointmentsSubject.next(appointments);
    this.patientsSubject.next(patients);
  }

  getAppointments() {
    return this.appointmentsSubject.value;
  }

  getPatients() {
    return this.patientsSubject.value;
  }
}