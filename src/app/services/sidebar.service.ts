import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private isCollapsedSubject = new BehaviorSubject<boolean>(this.getInitialCollapsedState());
  private isMobileOpenSubject = new BehaviorSubject<boolean>(false);
  
  isCollapsed$ = this.isCollapsedSubject.asObservable();
  isMobileOpen$ = this.isMobileOpenSubject.asObservable();
  
  constructor() {}
  
  toggleSidebar() {
    const newValue = !this.isCollapsedSubject.value;
    this.isCollapsedSubject.next(newValue);
    this.saveCollapsedState(newValue);
  }
  
  toggleMobileSidebar() {
    const newValue = !this.isMobileOpenSubject.value;
    this.isMobileOpenSubject.next(newValue);
  }
  
  setCollapsed(value: boolean) {
    this.isCollapsedSubject.next(value);
    this.saveCollapsedState(value);
  }
  
  setMobileOpen(value: boolean) {
    this.isMobileOpenSubject.next(value);
  }
  
  private getInitialCollapsedState(): boolean {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed');
      if (saved !== null) {
        return saved === 'true';
      }
      // Par défaut, collapsed sur mobile
      return window.innerWidth <= 768;
    }
    return false;
  }
  
  private saveCollapsedState(value: boolean) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', value.toString());
    }
  }
}