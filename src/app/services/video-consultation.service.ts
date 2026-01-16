import { Injectable } from "@angular/core";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { FirebaseService } from "./firebase.service";

export interface Consultation {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  status: "scheduled" | "active" | "ended" | "cancelled";
  roomId: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number; // en minutes
  notes?: string;
  recordingUrl?: string;
  createdAt: Date;
}

export type ConsultationSignalType =
  | "join"
  | "leave"
  | "message"
  | "prescription"
  | "screen_share"
  | "offer"
  | "answer"
  | "ice_candidate";

export interface ConsultationSignal {
  type: ConsultationSignalType;
  senderId: string;
  data: any;
  timestamp: Date;
}

@Injectable({
  providedIn: "root",
})
export class VideoConsultationService {
  private peerConnection?: RTCPeerConnection;
  private localStream?: MediaStream;
  private remoteStream?: MediaStream;
  private dataChannel?: RTCDataChannel;

  constructor(private firebaseService: FirebaseService) {}

  private get firestore() {
    return this.firebaseService.firestore;
  }

  // Créer une consultation
  async createConsultation(
    appointmentId: string,
    patientId: string,
    doctorId: string
  ): Promise<string> {
    try {
      const roomId = this.generateRoomId();

      const consultationData = {
        appointmentId,
        patientId,
        doctorId,
        status: "scheduled",
        roomId,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(this.firestore, "consultations"),
        consultationData
      );
      return docRef.id;
    } catch (error) {
      console.error("Erreur création consultation:", error);
      throw error;
    }
  }

  // Rejoindre une consultation
  async joinConsultation(
    consultationId: string,
    userId: string
  ): Promise<boolean> {
    try {
      await updateDoc(doc(this.firestore, "consultations", consultationId), {
        status: "active",
        startTime: serverTimestamp(),
      });

      // Initialiser WebRTC
      await this.initializeWebRTC(consultationId, userId);
      return true;
    } catch (error) {
      console.error("Erreur rejoindre consultation:", error);
      return false;
    }
  }

  // Terminer une consultation
  async endConsultation(consultationId: string, notes?: string): Promise<void> {
    try {
      await updateDoc(doc(this.firestore, "consultations", consultationId), {
        status: "ended",
        endTime: serverTimestamp(),
        notes,
        duration: await this.calculateDuration(consultationId),
      });

      this.cleanup();
    } catch (error) {
      console.error("Erreur fin consultation:", error);
      throw error;
    }
  }

  // Initialiser WebRTC
  private async initializeWebRTC(consultationId: string, userId: string) {
    try {
      // Configuration STUN/TURN servers
      const configuration = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      };

      this.peerConnection = new RTCPeerConnection(configuration);

      // Récupérer le flux média local
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Ajouter les pistes locales
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      // Créer le canal de données pour les messages
      this.dataChannel =
        this.peerConnection.createDataChannel("consultation-data");
      this.setupDataChannel();

      // Gérer les candidats ICE
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignal(consultationId, userId, {
            type: "ice_candidate",
            data: { candidate: event.candidate },
          });
        }
      };

      // Gérer les flux distants
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
      };

      // Créer l'offre
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Envoyer l'offrej
      this.sendSignal(consultationId, userId, {
        type: "offer",
        data: { offer: offer },
      });

      // Écouter les signaux
      this.listenForSignals(consultationId, userId);
    } catch (error) {
      console.error("Erreur initialisation WebRTC:", error);
      throw error;
    }
  }

  // Écouter les signaux en temps réel
  private listenForSignals(consultationId: string, userId: string) {
    const signalsRef = collection(
      this.firestore,
      "consultations",
      consultationId,
      "signals"
    );

    onSnapshot(signalsRef, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added") {
          const signal = change.doc.data() as ConsultationSignal;

          // Ignorer ses propres signaux
          if (signal.senderId === userId) return;

          await this.handleSignal(signal);
        }
      });
    });
  }

  // Traiter les signaux
  private async handleSignal(signal: ConsultationSignal) {
    if (!this.peerConnection) return;

    switch (signal.type) {
      case "offer":
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(signal.data.offer)
        );
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        // Envoyer la réponse
        break;

      case "answer":
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(signal.data.answer)
        );
        break;

      case "ice_candidate":
        await this.peerConnection.addIceCandidate(
          new RTCIceCandidate(signal.data.candidate)
        );
        break;

      case "message":
        this.handleMessage(signal.data);
        break;
    }
  }

  // Envoyer un signal
  private async sendSignal(
    consultationId: string,
    senderId: string,
    signal: Partial<ConsultationSignal>
  ) {
    await addDoc(
      collection(this.firestore, "consultations", consultationId, "signals"),
      {
        ...signal,
        senderId,
        timestamp: serverTimestamp(),
      }
    );
  }

  // Configurer le canal de données
  private setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log("Canal de données ouvert");
    };

    this.dataChannel.onmessage = (event) => {
      this.handleMessage(JSON.parse(event.data));
    };
  }

  // Gérer les messages
  private handleMessage(data: any) {
    // Diffuser les messages via un Observable si nécessaire
    console.log("Message reçu:", data);
  }

  // Envoyer un message via le canal de données
  sendChatMessage(message: string, senderId: string) {
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      this.dataChannel.send(
        JSON.stringify({
          type: "chat_message",
          content: message,
          senderId,
          timestamp: new Date(),
        })
      );
    }
  }

  // Partager l'écran
  async shareScreen(): Promise<boolean> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const screenTrack = screenStream.getVideoTracks()[0];
      const sender = this.peerConnection
        ?.getSenders()
        .find((s) => s.track?.kind === "video");

      if (sender && screenTrack) {
        sender.replaceTrack(screenTrack);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Erreur partage écran:", error);
      return false;
    }
  }

  // Arrêter le partage d'écran
  async stopScreenShare() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      const sender = this.peerConnection
        ?.getSenders()
        .find((s) => s.track?.kind === "video");

      if (sender && videoTrack) {
        sender.replaceTrack(videoTrack);
      }
    }
  }

  // Enregistrer la consultation
  async startRecording(): Promise<string> {
    // À implémenter avec MediaRecorder API
    return "recording_url";
  }

  // Envoyer une prescription
  async sendPrescription(
    prescriptionData: any,
    consultationId: string,
    doctorId: string
  ) {
    await this.sendSignal(consultationId, doctorId, {
      type: "prescription",
      data: prescriptionData,
    });
  }

  // Calculer la durée
  private async calculateDuration(consultationId: string): Promise<number> {
    const consultationDoc = await getDoc(
      doc(this.firestore, "consultations", consultationId)
    );
    const data = consultationDoc.data() as Consultation;
    if (data.startTime && data.endTime) {
      const start = (data.startTime as any).toDate();
      const end = (data.endTime as any).toDate();

      return Math.round((end.getTime() - start.getTime()) / 60000);
    }

    return 0;
  }

  // Nettoyage
  private cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
    }

    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = undefined;
    this.localStream = undefined;
    this.remoteStream = undefined;
    this.dataChannel = undefined;
  }

  // Générer un ID de salle
  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  // Obtenir le flux local
  getLocalStream(): MediaStream | undefined {
    return this.localStream;
  }

  // Obtenir le flux distant
  getRemoteStream(): MediaStream | undefined {
    return this.remoteStream;
  }

  // Vérifier si WebRTC est initialisé
  isInitialized(): boolean {
    return !!this.peerConnection;
  }

  // Muter/désactiver l'audio
  toggleAudio(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  // Muter/désactiver la vidéo
  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }
}
