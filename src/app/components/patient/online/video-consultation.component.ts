import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { VideoConsultationService, Consultation } from '../../../services/video-consultation.service';
import { User } from '../../../models/user.model';
import { PatientDataService } from '../../../services/patient-data.service';
import { AppointmentService } from '../../../services/appointment.service';
import { Subject, takeUntil, interval } from 'rxjs';

@Component({
  selector: 'app-video-consultation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './video-consultation.component.html',
  styleUrls: ['./video-consultation.component.css']
})
export class VideoConsultationComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  
  currentUser: User | null = null;
  consultationId: string = '';
  consultation?: Consultation;
  appointmentId: string = '';
  
  // États
  isJoined = false;
  isLoading = false;
  isCalling = false;
  isScreenSharing = false;
  isRecording = false;
  isAudioMuted = false;
  isVideoOff = false;
  isChatOpen = true;
  
  // Chat
  messages: any[] = [];
  newMessage = '';
  chatUsers: Map<string, string> = new Map();
  
  // Présence
  participants: string[] = [];
  consultationDuration = 0;
  private durationTimer?: any;
  
  // Outils
  showTools = false;
  selectedTool: 'prescription' | 'notes' | 'files' | 'whiteboard' | null = null;
  
  // Prescription
  prescriptionData = {
    medications: [] as any[],
    instructions: '',
    duration: ''
  };
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private consultationService: VideoConsultationService,
    private patientDataService: PatientDataService,
    private appointmentService: AppointmentService
  ) {}

  async ngOnInit() {
    this.consultationId = this.route.snapshot.paramMap.get('id') || '';
    this.appointmentId = this.route.snapshot.queryParamMap.get('appointmentId') || '';
    
    if (!this.consultationId) {
      this.router.navigate(['/patient/appointments']);
      return;
    }

    this.patientDataService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });

    await this.loadConsultation();
    await this.joinConsultation();
  }

  ngAfterViewInit() {
    this.setupVideoElements();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.leaveConsultation();
    this.cleanupTimers();
  }

  async loadConsultation() {
    this.isLoading = true;
    try {
      // Charger les détails de la consultation
      // À implémenter selon votre structure
      this.consultation = {
        id: this.consultationId,
        appointmentId: this.appointmentId,
        patientId: this.currentUser?.uid || '',
        doctorId: '',
        status: 'active',
        roomId: '',
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Erreur chargement consultation:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async joinConsultation() {
    if (!this.currentUser) return;
    
    this.isLoading = true;
    try {
      const success = await this.consultationService.joinConsultation(
        this.consultationId, 
        this.currentUser.uid
      );
      
      if (success) {
        this.isJoined = true;
        this.isCalling = true;
        this.startDurationTimer();
        this.setupEventListeners();
      }
    } catch (error) {
      console.error('Erreur rejoindre consultation:', error);
      alert('Impossible de rejoindre la consultation');
    } finally {
      this.isLoading = false;
    }
  }

  setupVideoElements() {
    // Attacher les flux vidéo aux éléments HTML
    const checkStream = () => {
      const localStream = this.consultationService.getLocalStream();
      const remoteStream = this.consultationService.getRemoteStream();
      
      if (localStream && this.localVideo.nativeElement) {
        this.localVideo.nativeElement.srcObject = localStream;
      }
      
      if (remoteStream && this.remoteVideo.nativeElement) {
        this.remoteVideo.nativeElement.srcObject = remoteStream;
      }
      
      if (!remoteStream && this.isJoined) {
        setTimeout(checkStream, 1000);
      }
    };
    
    checkStream();
  }

  setupEventListeners() {
    // Écouter les événements WebRTC
    // À implémenter selon vos besoins
  }

  async leaveConsultation() {
    if (this.consultationId) {
      try {
        await this.consultationService.endConsultation(this.consultationId, 'Consultation terminée');
      } catch (error) {
        console.error('Erreur fin consultation:', error);
      }
    }
    
    this.isJoined = false;
    this.isCalling = false;
    this.cleanupTimers();
  }

  async toggleAudio() {
    this.isAudioMuted = !this.consultationService.toggleAudio();
  }

  async toggleVideo() {
    this.isVideoOff = !this.consultationService.toggleVideo();
  }

  async toggleScreenShare() {
    if (!this.isScreenSharing) {
      this.isScreenSharing = await this.consultationService.shareScreen();
    } else {
      await this.consultationService.stopScreenShare();
      this.isScreenSharing = false;
    }
  }

  async toggleRecording() {
    this.isRecording = !this.isRecording;
    if (this.isRecording) {
      // Démarrer l'enregistrement
    } else {
      // Arrêter l'enregistrement
    }
  }

  async sendMessage() {
    if (!this.newMessage.trim() || !this.currentUser) return;
    
    const message = {
      id: Date.now().toString(),
      content: this.newMessage,
      senderId: this.currentUser.uid,
      senderName: this.currentUser.displayName,
      timestamp: new Date(),
      type: 'text'
    };
    
    this.messages.push(message);
    this.consultationService.sendChatMessage(this.newMessage, this.currentUser.uid);
    this.newMessage = '';
    
    this.scrollChatToBottom();
  }

  sendPrescription() {
    if (!this.currentUser || !this.consultation) return;
    
    this.consultationService.sendPrescription(
      this.prescriptionData,
      this.consultationId,
      this.currentUser.uid
    );
    
    this.selectedTool = null;
  }

  toggleChat() {
    this.isChatOpen = !this.isChatOpen;
    if (this.isChatOpen) {
      setTimeout(() => this.scrollChatToBottom(), 100);
    }
  }

  toggleTools() {
    this.showTools = !this.showTools;
  }

  selectTool(tool: 'prescription' | 'notes' | 'files' | 'whiteboard') {
    this.selectedTool = tool;
    this.showTools = false;
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatMessageTime(date: Date): string {
    return new Date(date).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  isMyMessage(message: any): boolean {
    return message.senderId === this.currentUser?.uid;
  }

  private startDurationTimer() {
    this.durationTimer = setInterval(() => {
      this.consultationDuration++;
    }, 1000);
  }

  private cleanupTimers() {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
    }
  }

  private scrollChatToBottom() {
    setTimeout(() => {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = 
          this.chatContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }
}