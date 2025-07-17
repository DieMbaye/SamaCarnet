import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app = initializeApp(environment.firebase);
  public auth = getAuth(this.app);
  public firestore = getFirestore(this.app);
  public messaging = getMessaging(this.app);

  constructor() {}
}