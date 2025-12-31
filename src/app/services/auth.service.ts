import { Injectable } from "@angular/core";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  UserCredential,
  sendPasswordResetEmail, // Ajoutez cette importation
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { BehaviorSubject } from "rxjs";
import { FirebaseService } from "./firebase.service";
import { User } from "../models/user.model";
import { Router } from "@angular/router";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  sendEmailVerification(uid: string) {
    throw new Error("Method not implemented.");
  }
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private authCheckedSubject = new BehaviorSubject<boolean>(false);
  public authChecked$ = this.authCheckedSubject.asObservable();

  constructor(
    private firebaseService: FirebaseService,
    private router: Router   // 👈 AJOUT OBLIGATOIRE
) {
    this.initAuthListener();
  }

  private initAuthListener() {
    onAuthStateChanged(this.firebaseService.auth, async (firebaseUser) => {

      if (firebaseUser) {
        try {
          const userDoc = await getDoc(
            doc(this.firebaseService.firestore, "users", firebaseUser.uid)
          );

          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            this.currentUserSubject.next(userData);
          } else {
            this.currentUserSubject.next(null);
          }
        } catch (error) {
          this.currentUserSubject.next(null);
        }
      } else {
        this.currentUserSubject.next(null);

        // 🚀 REDIRECTION ICI
        this.router.navigate(["/login"]);
      }

      this.authCheckedSubject.next(true);
    });
  }

  async signIn(email: string, password: string): Promise<User> {
    try {
      const credential = await signInWithEmailAndPassword(
        this.firebaseService.auth,
        email,
        password
      );
      const userRef = doc(
        this.firebaseService.firestore,
        "users",
        credential.user.uid
      );
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error("Utilisateur non trouvé dans Firestore.");
      }

      const userData = userDoc.data() as User;
      this.currentUserSubject.next(userData);
      return userData;
    } catch (error) {
      console.error("Erreur lors de la connexion :", error);
      throw error;
    }
  }

  async signUp(
    email: string,
    password: string,
    userData: Partial<User>,
    setAsCurrentUser = true
  ): Promise<User> {
    try {
      const userCredential: UserCredential =
        await createUserWithEmailAndPassword(
          this.firebaseService.auth,
          email,
          password
        );

      const uid = userCredential.user.uid;

      const newUser: User = {
        uid,
        email,
        displayName: userData.displayName || "",
        role: userData.role || "patient",
        createdAt: serverTimestamp(),
        ...userData,
      };

      const userRef = doc(this.firebaseService.firestore, "users", uid);
      await setDoc(userRef, newUser);

      if (setAsCurrentUser) {
        this.currentUserSubject.next(newUser);
      }

      return newUser;
    } catch (error) {
      console.error("Erreur lors de la création d'utilisateur :", error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      await signOut(this.firebaseService.auth);
      this.currentUserSubject.next(null);
    } catch (error) {
      console.error("Erreur lors de la déconnexion :", error);
      throw error;
    }
  }

  // AJOUTEZ CETTE MÉTHODE POUR RÉINITIALISER LE MOT DE PASSE
  async resetUserPassword(email: string): Promise<void> {
    try {
      if (!email) {
        throw new Error(
          "L'email est requis pour réinitialiser le mot de passe"
        );
      }

      await sendPasswordResetEmail(this.firebaseService.auth, email);
    } catch (error) {
      console.error(
        "Erreur lors de la réinitialisation du mot de passe:",
        error
      );
      throw error;
    }
  }

  // Méthode pour réinitialiser le mot de passe par userId (nécessite d'abord récupérer l'email)
  async resetUserPasswordById(userId: string): Promise<void> {
    try {
      // Récupérer l'utilisateur depuis Firestore pour obtenir son email
      const userDoc = await getDoc(
        doc(this.firebaseService.firestore, "users", userId)
      );

      if (!userDoc.exists()) {
        throw new Error("Utilisateur non trouvé");
      }

      const userData = userDoc.data() as User;
      const email = userData.email;

      if (!email) {
        throw new Error("Email non trouvé pour cet utilisateur");
      }

      await this.resetUserPassword(email);
    } catch (error) {
      console.error(
        "Erreur lors de la réinitialisation du mot de passe par ID:",
        error
      );
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
      const adminQuery = query(
        collection(this.firebaseService.firestore, "users"),
        where("role", "==", "admin")
      );

      const adminDocs = await getDocs(adminQuery);

      if (adminDocs.empty) {
        await this.signUp(
          "diem63977@gmail.com",
          "diem63977@gmail.com",
          {
            displayName: "Administrateur",
            role: "admin",
          },
          false
        );
      }
    } catch (error) {
    }
  }
  async logout(): Promise<void> {
    return this.signOut();
    this.currentUserSubject.next(null);
  }
}
