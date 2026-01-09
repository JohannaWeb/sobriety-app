import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loggedIn = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn = this.loggedIn.asObservable();

  constructor(private http: HttpClient, private router: Router) { }

  private hasToken(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  register(user: any): Observable<any> {
    return this.http.post('/api/auth/register', user);
  }

  login(user: any): Observable<any> {
    return this.http.post<any>('/api/auth/login', user).pipe(
      tap(response => {
        if (response.token) {
          localStorage.setItem('auth_token', response.token);
          this.loggedIn.next(true);
          this.router.navigate(['/']);
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
}
