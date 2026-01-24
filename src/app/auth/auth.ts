import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import jwtDecode from 'jwt-decode';
import { HttpClient } from '@angular/common/http';
import { StorageService } from '../core/services/storage.service';
import { environment } from '../../environments/environment';
import { DecodedToken, LoginResponse, User } from '../models/user.model';
import { LoggerService } from '../core/services/logger.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private loggedIn!: BehaviorSubject<boolean>;
  isLoggedIn!: Observable<boolean>;

  constructor(
    private router: Router,
    private http: HttpClient,
    private storageService: StorageService,
    private logger: LoggerService
  ) {
    this.loggedIn = new BehaviorSubject<boolean>(this.hasToken());
    this.isLoggedIn = this.loggedIn.asObservable();
  }

  private hasToken(): boolean {
    return !!this.storageService.getItem('auth_token');
  }

  register(user: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, user);
  }

  login(user: any): Observable<LoginResponse | null> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, user).pipe(
      tap(response => {
        if (response.accessToken) {
          this.storageService.setItem('auth_token', response.accessToken);
          if (response.refreshToken) {
            this.storageService.setItem('refresh_token', response.refreshToken);
          }
          this.loggedIn.next(true);
        }
      }),
      catchError(error => {
        this.logger.error('Login failed', error);
        return of(null);
      })
    );
  }

  logout(): void {
    const refreshToken = this.storageService.getItem('refresh_token');
    if (refreshToken) {
      // Best effort logout on server
      this.http.post(`${this.apiUrl}/logout`, { refreshToken }).subscribe({
        error: (err) => this.logger.warn('Logout error', err)
      });
    }

    this.storageService.removeItem('auth_token');
    this.storageService.removeItem('refresh_token');
    this.loggedIn.next(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.storageService.getItem('auth_token');
  }

  getUserDetails(): DecodedToken | null {
    const token = this.getToken();
    if (token) {
      try {
        const decodedToken = jwtDecode<DecodedToken>(token);
        return decodedToken;
      } catch (error) {
        this.logger.error('Error decoding token:', error);
        return null;
      }
    }
    return null;
  }
}
