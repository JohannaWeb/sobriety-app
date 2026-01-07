import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';

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

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<Quote>('/api/aa-daily-reflection').subscribe(data => {
      this.quote = data;
    });
  }
}
