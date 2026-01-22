import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterLink, RouterOutlet, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { AuthService } from './auth/auth'; // Import AuthService
import { Subscription } from 'rxjs'; // Import Subscription

@Component({
  selector: 'app-root',
  standalone: true, // Mark as standalone
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, CommonModule], // Add CommonModule
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('sobriety-app');
  isLoggedIn: boolean = false;
  username: string | null = null;
  private authSubscription: Subscription | undefined;

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    this.authSubscription = this.authService.isLoggedIn.subscribe((loggedIn: boolean) => {
      this.isLoggedIn = loggedIn;
      if (loggedIn) {
        const userDetails = this.authService.getUserDetails();
        this.username = userDetails ? userDetails.username : null;
      } else {
        this.username = null;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
