import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  ChatService,
  Message,
  Conversation,
} from "../../../services/chat.service";
import { User } from "../../../models/user.model";
import { PatientDataService } from "../../../services/patient-data.service";
import { UserService } from "../../../services/user.service";
import { Subject, takeUntil } from "rxjs";

@Component({
  selector: "app-patient-chat",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./patient-chat.component.html",
  styleUrls: ["./patient-chat.component.css"],
})
export class PatientChatComponent
  implements OnInit, OnDestroy, AfterViewChecked
{
  @ViewChild("messageContainer") private messageContainer!: ElementRef;
  @ViewChild("fileInput") private fileInput!: ElementRef;

  currentUser: User | null = null;
  conversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  messages: Message[] = [];

  newMessage = "";
  isSending = false;
  isLoading = false;

  // Recherche
  searchTerm = "";
  filteredConversations: Conversation[] = [];

  // Fichiers
  selectedFiles: File[] = [];
  isUploading = false;

  // Abonnements
  private messagesUnsubscribe?: () => void;
  private conversationsUnsubscribe?: () => void;
  private destroy$ = new Subject<void>();

  constructor(
    private chatService: ChatService,
    private patientDataService: PatientDataService,
    private userService: UserService
  ) {}

  async ngOnInit() {
    this.patientDataService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (user) => {
        this.currentUser = user;
        if (user) {
          await this.loadConversations();
          this.subscribeToConversations();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.unsubscribeFromConversations();
    this.unsubscribeFromMessages();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  async loadConversations() {
    if (!this.currentUser) return;

    this.isLoading = true;
    try {
      this.conversations = await this.chatService.getConversations(
        this.currentUser.uid
      );
      this.filteredConversations = [...this.conversations];
    } catch (error) {
      console.error("Erreur chargement conversations:", error);
    } finally {
      this.isLoading = false;
    }
  }

  subscribeToConversations() {
    if (!this.currentUser) return;

    this.conversationsUnsubscribe = this.chatService.subscribeToConversations(
      this.currentUser.uid,
      (conversations) => {
        this.conversations = conversations;
        this.filterConversations();
      }
    );
  }

  selectConversation(conversation: Conversation) {
    this.selectedConversation = conversation;
    this.loadMessages(conversation.id);
    this.markAsRead(conversation);
  }

  async loadMessages(conversationId: string) {
    this.unsubscribeFromMessages();
    this.messages = [];

    try {
      this.messages = await this.chatService.getMessages(conversationId);
      this.subscribeToMessages(conversationId);
    } catch (error) {
      console.error("Erreur chargement messages:", error);
    }
  }

  subscribeToMessages(conversationId: string) {
    this.messagesUnsubscribe = this.chatService.subscribeToMessages(
      conversationId,
      (messages) => {
        this.messages = messages;
        if (this.selectedConversation) {
          this.markAsRead(this.selectedConversation);
        }
      }
    );
  }

  async sendMessage() {
    if (!this.newMessage.trim() && this.selectedFiles.length === 0) return;
    if (!this.currentUser || !this.selectedConversation) return;

    this.isSending = true;

    try {
      const attachments: string[] = [];

      // Upload des fichiers si présents
      if (this.selectedFiles.length > 0) {
        this.isUploading = true;
        for (const file of this.selectedFiles) {
          const url = await this.chatService.uploadAttachment(
            file,
            this.selectedConversation.id,
            this.currentUser.uid
          );
          attachments.push(url);
        }
        this.isUploading = false;
      }
      let messageType: "audio" | "image" | "text" | "file" = "text";

      if (attachments.length > 0) {
        const first = attachments[0].toLowerCase();

        if (
          first.endsWith(".jpg") ||
          first.endsWith(".jpeg") ||
          first.endsWith(".png")
        ) {
          messageType = "image";
        } else if (
          first.endsWith(".mp3") ||
          first.endsWith(".wav") ||
          first.endsWith(".ogg")
        ) {
          messageType = "audio";
        } else {
          messageType = "file"; // PDF, docx, etc.
        }
      }

      const messageData = {
        conversationId: this.selectedConversation.id,
        senderId: this.currentUser.uid,
        content: this.newMessage,
        type: messageType,
        attachments: attachments.length > 0 ? attachments : undefined,
        senderName: this.currentUser.displayName,
      };

      await this.chatService.sendMessage(
        this.selectedConversation.id,
        messageData
      );

      this.newMessage = "";
      this.selectedFiles = [];
    } catch (error) {
      console.error("Erreur envoi message:", error);
      alert("Erreur lors de l'envoi du message");
    } finally {
      this.isSending = false;
    }
  }

  async markAsRead(conversation: Conversation) {
    if (!this.currentUser) return;

    try {
      await this.chatService.markMessagesAsRead(
        conversation.id,
        this.currentUser.uid
      );
    } catch (error) {
      console.error("Erreur marquage comme lu:", error);
    }
  }

  filterConversations() {
    if (!this.searchTerm.trim()) {
      this.filteredConversations = [...this.conversations];
      return;
    }

    const term = this.searchTerm.toLowerCase().trim();
    this.filteredConversations = this.conversations.filter(
      (conv) =>
        conv.doctorName.toLowerCase().includes(term) ||
        conv.patientName.toLowerCase().includes(term) ||
        conv.lastMessage?.content.toLowerCase().includes(term)
    );
  }

  selectFiles() {
    this.fileInput.nativeElement.click();
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles = Array.from(input.files);
    }
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  formatDate(date: Date): string {
    const now = new Date();
    const messageDate = new Date(date);

    if (now.toDateString() === messageDate.toDateString()) {
      return messageDate.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (yesterday.toDateString() === messageDate.toDateString()) {
      return (
        "Hier " +
        messageDate.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    }

    return messageDate.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  }

  getOtherParticipantName(conversation: Conversation): string {
    if (!this.currentUser) return "";

    if (conversation.patientId === this.currentUser.uid) {
      return conversation.doctorName;
    } else {
      return conversation.patientName;
    }
  }

  getOtherParticipantId(conversation: Conversation): string {
    if (!this.currentUser) return "";

    if (conversation.patientId === this.currentUser.uid) {
      return conversation.doctorId;
    } else {
      return conversation.patientId;
    }
  }

  isMyMessage(message: Message): boolean {
    return message.senderId === this.currentUser?.uid;
  }

  async deleteMessage(messageId: string) {
    if (!confirm("Supprimer ce message?")) return;

    try {
      await this.chatService.deleteMessage(messageId);
    } catch (error) {
      console.error("Erreur suppression message:", error);
      alert("Erreur lors de la suppression");
    }
  }

  async deleteConversation() {
    if (
      !this.selectedConversation ||
      !confirm("Supprimer toute la conversation?")
    )
      return;

    try {
      await this.chatService.deleteConversation(this.selectedConversation.id);
      this.selectedConversation = null;
      this.messages = [];
      await this.loadConversations();
    } catch (error) {
      console.error("Erreur suppression conversation:", error);
      alert("Erreur lors de la suppression");
    }
  }

  private scrollToBottom(): void {
    try {
      this.messageContainer.nativeElement.scrollTop =
        this.messageContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }

  private unsubscribeFromMessages() {
    if (this.messagesUnsubscribe) {
      this.messagesUnsubscribe();
    }
  }

  private unsubscribeFromConversations() {
    if (this.conversationsUnsubscribe) {
      this.conversationsUnsubscribe();
    }
  }

  getPreview(conv: Conversation): string {
    const content = conv.lastMessage?.content;
    if (!content) return "Aucun message";
    if (content.length <= 40) return content;
    return content.slice(0, 40) + "...";
  }
}
