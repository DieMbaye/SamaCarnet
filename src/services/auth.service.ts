import { Injectable } from '@angular/core';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { FirebaseService } from './firebase.service';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private firebaseService: FirebaseService) {
    this.initAuthListener();
  }

  private initAuthListener() {
    onAuthStateChanged(this.firebaseService.auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(this.firebaseService.firestore, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          this.currentUserSubject.next(userData);
        }
      } else {
        this.currentUserSubject.next(null);
      }
    });
  }

 async signIn(email: string, password: string): Promise<User> {
  try {
    const userCredential = await signInWithEmailAndPassword(this.firebaseService.auth, email, password);
    const uid = userCredential.user.uid;
    const userRef = doc(this.firebaseService.firestore, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data() as User;
      this.currentUserSubject.next(userData);
      return userData;
    } else {
      // ✅ Crée un utilisateur par défaut si Firestore est vide
      const fallbackUser: User = {
        uid,
        email,
        displayName: '',
        role: 'patient',
        createdAt: new Date()
      };

      await setDoc(userRef, fallbackUser);
      this.currentUserSubject.next(fallbackUser);
      return fallbackUser;
    }
  } catch (error: any) {
    console.error('Erreur Firebase:', error.code, error.message);
    throw error;
  }
}



 async signUp(email: string, password: string, userData: Partial<User>, setAsCurrentUser = true): Promise<User> {
  try {
    const userCredential = await createUserWithEmailAndPassword(this.firebaseService.auth, email, password);

    const newUser: User = {
      uid: userCredential.user.uid,
      email,
      displayName: userData.displayName || '',
      role: userData.role || 'patient',
      createdAt: new Date(),
      ...userData
    };

    await setDoc(doc(this.firebaseService.firestore, 'users', newUser.uid), newUser);

    if (setAsCurrentUser) {
      this.currentUserSubject.next(newUser);
    }

    return newUser;
  } catch (error) {
    throw error;
  }
}


  async signOut(): Promise<void> {
    try {
      await signOut(this.firebaseService.auth);
      this.currentUserSubject.next(null);
    } catch (error) {
      throw error;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  async initializeAdmin(): Promise<void> {
    try {
      // Vérifier si l'admin existe déjà
      const adminQuery = query(
        collection(this.firebaseService.firestore, 'users'),
        where('role', '==', 'admin')
      );
      
      const adminDocs = await getDocs(adminQuery);
      
      if (adminDocs.empty) {
        // Créer le compte admin par défaut
        await this.signUp('diem63977@gmail.com', 'diem63977@gmail.com', {
          displayName: 'Administrateur',
          role: 'admin'
        });
      }
    } catch (error) {
      console.log('Admin déjà initialisé ou erreur:', error);
    }
  }
}