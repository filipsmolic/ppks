import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _userIdSubject = new BehaviorSubject<string | null>(null);
  private _userNameSubject = new BehaviorSubject<string | null>(null);

  get userId() {
    return this._userIdSubject.asObservable();
  }

  get userName() {
    return this._userNameSubject.asObservable();
  }

  constructor() {
    const userId = localStorage.getItem('user_id');
    const userName = localStorage.getItem('user_name');
    if (userId && userName) {
      this._userIdSubject.next(userId);
      this._userNameSubject.next(userName);
    }
  }

  setUserData(userId: string, userName: string) {
    this._userIdSubject.next(userId);
    this._userNameSubject.next(userName);

    console.log('Setting user data:', { userId, userName });
    localStorage.setItem('user_id', userId);
    localStorage.setItem('user_name', userName);
  }

  clearUserData() {
    this._userIdSubject.next(null);
    this._userNameSubject.next(null);

    localStorage.removeItem('user_id');
    localStorage.removeItem('user_name');
  }
}
