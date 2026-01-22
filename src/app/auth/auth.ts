import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import jwt_decode from 'jwt-decode';
import { HttpClient } from '@angular/common/http';

interface DecodedToken {
  id: number;
  username: string;
  iat: number; // issued at
  exp: number; // expiration time
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/api';
  private loggedIn = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn = this.loggedIn.asObservable();

  constructor(private router: Router, private http: HttpClient) { }

  private hasToken(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  register(user: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/register`, user);
  }

  login(user: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, user).pipe(
      tap(response => {
        if (response.token) {
          localStorage.setItem('auth_token', response.token);
          this.loggedIn.next(true);
        }
      }),
      catchError(error => {
        // Handle login errors (e.g., show a message)
        console.error('Login failed', error);
        return of(null); // Return a non-error observable
      })
    );
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    this.loggedIn.next(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getUserDetails(): DecodedToken | null {
    const token = this.getToken();
    if (token) {
        try {
            const decodedToken: DecodedToken = jwt_decode(token);
            return decodedToken;
        } catch (Error) {
            console.error('Error decoding token:', Error);
            return null;
        }
    }
    return null;
  }
}
