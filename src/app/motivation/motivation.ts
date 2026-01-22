import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

interface Quote {
  title: string;
  content: string;
}

@Component({
  selector: 'app-motivation',
  imports: [CommonModule, HttpClientModule, MatCardModule],
  templateUrl: './motivation.html',
  styleUrls: ['./motivation.scss'],
})
export class Motivation implements OnInit {
  quote: Quote = { title: '', content: '' };

  // Embedded content from daily_reflections.json
  private backupReflections: any[] = [
    {
      "date": "01-01",
      "title": "I AM A MIRACLE",
      "content": "The central fact of our lives today is the absolute certainty that our Creator has entered into our hearts and lives in a way which is indeed miraculous. He has commenced to accomplish those things for us which we could never do by ourselves.\n\nALCOHOLICS ANONYMOUS, p. 25\n\nThis truly is a fact in my life today, and a real miracle. I always believed in God, but could never put that belief meaningfully into my life. Today, because of Alcoholics Anonymous, I now trust and rely on God, as I understand Him; I am sober today because of that! Learning to trust and rely on God was something I could never have done alone. I now believe in miracles because I am one!"
    },
    {
      "date": "01-02",
      "title": "MORNING COFFEE",
      "content": "Every day is a day when we must carry the vision of God's will into all of our activities.\n\nALCOHOLICS ANONYMOUS, p. 85\n\nWhen I sincerely began to ask God to help me to do His will, I had more peace and contentment than I had ever known. I began to see and understand that when I put my will aside, my problems became more manageable. Usually, my problems were of my own making, because I was trying to run the show. When I realized that I am not God, I became more humble and more open to His wondrous grace. My quiet times in the morning are for prayer, meditation and the practice of God-consciousness. The rest of my day is for carrying that vision into all of my activities."
    },
    {
      "date": "01-03",
      "title": "THE KEY IS WILLINGNESS",
      "content": "Once we have come to believe in a Power greater than ourselves, ceased fighting everything and everybody, and decided to rely upon God for guidance, we are on the right track.\n\nALCOHOLICS ANONYMOUS, p. 60\n\nHaving made a decision to turn my will and my life over to the care of God, as I understand Him, I find that the tasks that I face today are being handled. God is providing me with the strength and courage to do what is right. I am learning to not procrastinate, and to take action. This was not the case when I was drinking. My life was stagnated. My desire to drink was all-consuming. There was no room for God. There was no room for a happy and meaningful life. By being willing to have God in my life, I have been given the key to an adventurous life."
    }
  ];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.http.get<Quote>('/api/aa-daily-reflection').pipe(
      timeout(5000), // Timeout after 5 seconds
      catchError(error => {
        console.error('API call timed out or failed, using backup quote from embedded JSON:', error);
        const backupQuote = this.backupReflections[Math.floor(Math.random() * this.backupReflections.length)];
        return of(backupQuote); // Return backup quote as an observable
      })
    ).subscribe(data => {
      this.quote = data;
      this.cdr.detectChanges(); // Manually trigger change detection
    });
  }
}
