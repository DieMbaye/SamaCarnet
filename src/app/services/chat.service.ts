import { Injectable } from "@angular/core";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  getDocs,
  getDoc,
  limit,
  startAfter,
} from "firebase/firestore";
import { FirebaseService } from "./firebase.service";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: "text" | "image" | "file" | "audio";
  attachments?: string[];
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  senderName?: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
  patientId: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
}

@Injectable({
  providedIn: "root",
})
export class ChatService {
  constructor(private firebaseService: FirebaseService) {}

  private get firestore() {
    return this.firebaseService.firestore;
  }

  // Créer une conversation
  async createConversation(
    patientId: string,
    doctorId: string,
    patientName: string,
    doctorName: string
  ): Promise<string> {
    try {
      // Vérifier si une conversation existe déjà
      const existingConv = await this.getConversationBetweenUsers(
        patientId,
        doctorId
      );
      if (existingConv) {
        return existingConv.id;
      }

      const conversationData = {
        participants: [patientId, doctorId],
        patientId,
        doctorId,
        patientName,
        doctorName,
        unreadCount: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(
        collection(this.firestore, "conversations"),
        conversationData
      );
      return docRef.id;
    } catch (error) {
      console.error("Erreur création conversation:", error);
      throw error;
    }
  }

  // Envoyer un message
  async sendMessage(
    conversationId: string,
    messageData: Omit<Message, "id" | "createdAt" | "read">
  ): Promise<string> {
    try {
      const message = {
        ...messageData,
        conversationId,
        read: false,
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(
        collection(this.firestore, "messages"),
        message
      );

      // Mettre à jour la conversation
      const conversation = await this.getConversation(conversationId);

      await updateDoc(doc(this.firestore, "conversations", conversationId), {
        lastMessage: message,
        updatedAt: Timestamp.now(),
        unreadCount:
          conversation && messageData.senderId === conversation.patientId
            ? 1
            : 0,
      });

      return docRef.id;
    } catch (error) {
      console.error("Erreur envoi message:", error);
      throw error;
    }
  }

  // Récupérer les conversations d'un utilisateur
  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      const conversationsQuery = query(
        collection(this.firestore, "conversations"),
        where("participants", "array-contains", userId),
        orderBy("updatedAt", "desc")
      );

      const querySnapshot = await getDocs(conversationsQuery);
      return querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Conversation)
      );
    } catch (error) {
      console.error("Erreur récupération conversations:", error);
      return [];
    }
  }

  // Récupérer les messages d'une conversation
  async getMessages(
    conversationId: string,
    limitCount: number = 50
  ): Promise<Message[]> {
    try {
      const messagesQuery = query(
        collection(this.firestore, "messages"),
        where("conversationId", "==", conversationId),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(messagesQuery);

      // Récupérer les noms des expéditeurs
      const messages = querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Message)
      );

      // Inverser pour avoir les plus anciens en premier
      return messages.reverse();
    } catch (error) {
      console.error("Erreur récupération messages:", error);
      return [];
    }
  }

  // Écouter les messages en temps réel
  subscribeToMessages(
    conversationId: string,
    callback: (messages: Message[]) => void
  ): () => void {
    const messagesQuery = query(
      collection(this.firestore, "messages"),
      where("conversationId", "==", conversationId),
      orderBy("createdAt")
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Message)
      );
      callback(messages);
    });

    return unsubscribe;
  }

  // Écouter les conversations en temps réel
  subscribeToConversations(
    userId: string,
    callback: (conversations: Conversation[]) => void
  ): () => void {
    const conversationsQuery = query(
      collection(this.firestore, "conversations"),
      where("participants", "array-contains", userId),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(conversationsQuery, async (snapshot) => {
      const conversations = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data() as any;

          // Récupérer le dernier message si nécessaire
          if (!data.lastMessage) {
            const lastMessage = await this.getLastMessage(doc.id);
            return {
              id: doc.id,
              ...data,
              lastMessage,
            } as Conversation;
          }

          return {
            id: doc.id,
            ...data,
          } as Conversation;
        })
      );
      callback(conversations);
    });

    return unsubscribe;
  }

  // Marquer les messages comme lus
  async markMessagesAsRead(
    conversationId: string,
    userId: string
  ): Promise<void> {
    try {
      // Récupérer les messages non lus
      const unreadQuery = query(
        collection(this.firestore, "messages"),
        where("conversationId", "==", conversationId),
        where("senderId", "!=", userId),
        where("read", "==", false)
      );

      const querySnapshot = await getDocs(unreadQuery);
      const batchPromises = querySnapshot.docs.map((docRef) =>
        updateDoc(doc(this.firestore, "messages", docRef.id), {
          read: true,
          readAt: Timestamp.now(),
        })
      );

      await Promise.all(batchPromises);

      // Mettre à jour le compteur de la conversation
      await updateDoc(doc(this.firestore, "conversations", conversationId), {
        unreadCount: 0,
      });
    } catch (error) {
      console.error("Erreur marquage messages lus:", error);
      throw error;
    }
  }

  // Supprimer un message
  async deleteMessage(messageId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.firestore, "messages", messageId));
    } catch (error) {
      console.error("Erreur suppression message:", error);
      throw error;
    }
  }

  // Supprimer une conversation
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      // Supprimer d'abord tous les messages
      const messagesQuery = query(
        collection(this.firestore, "messages"),
        where("conversationId", "==", conversationId)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      const deletePromises = messagesSnapshot.docs.map((docRef) =>
        deleteDoc(doc(this.firestore, "messages", docRef.id))
      );

      await Promise.all(deletePromises);

      // Puis supprimer la conversation
      await deleteDoc(doc(this.firestore, "conversations", conversationId));
    } catch (error) {
      console.error("Erreur suppression conversation:", error);
      throw error;
    }
  }

  // Rechercher une conversation existante
  async getConversationBetweenUsers(
    userId1: string,
    userId2: string
  ): Promise<Conversation | null> {
    try {
      const conversationsQuery = query(
        collection(this.firestore, "conversations"),
        where("participants", "array-contains", userId1)
      );

      const querySnapshot = await getDocs(conversationsQuery);
      const conversation = querySnapshot.docs.find((doc) => {
        const data = doc.data();
        return data["participants"].includes(userId2);
      });

      return conversation
        ? ({ id: conversation.id, ...conversation.data() } as Conversation)
        : null;
    } catch (error) {
      console.error("Erreur recherche conversation:", error);
      return null;
    }
  }

  // Récupérer une conversation par ID
  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const docRef = doc(this.firestore, "conversations", conversationId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Conversation;
      }
      return null;
    } catch (error) {
      console.error("Erreur récupération conversation:", error);
      return null;
    }
  }

  // Récupérer le dernier message
  private async getLastMessage(
    conversationId: string
  ): Promise<Message | null> {
    try {
      const messagesQuery = query(
        collection(this.firestore, "messages"),
        where("conversationId", "==", conversationId),
        orderBy("createdAt", "desc"),
        limit(1)
      );

      const querySnapshot = await getDocs(messagesQuery);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Message;
      }
      return null;
    } catch (error) {
      console.error("Erreur récupération dernier message:", error);
      return null;
    }
  }

  // Envoyer un fichier/image
  async uploadAttachment(
    file: File,
    conversationId: string,
    senderId: string
  ): Promise<string> {
    // À implémenter avec Firebase Storage
    // Pour l'instant, on simule
    return `https://example.com/files/${file.name}`;
  }
}
