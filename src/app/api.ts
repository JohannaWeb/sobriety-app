import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { JournalEntry } from './journal/journal';
import { Post } from './forum/forum';
import { MeetingRoom, Message, QueueEntry } from './meetings/meetings.model';

@Injectable({
  providedIn: 'root',
})
export class Api {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  getJournalEntries(): Observable<{ entries: JournalEntry[] }> {
    return this.http.get<{ entries: JournalEntry[] }>(`${this.apiUrl}/journal`);
  }

  addJournalEntry(entry: { date: string, content: string, mood: string }): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.apiUrl}/journal`, entry);
  }

  updateJournalEntry(id: number, content: string, mood: string): Observable<{ changes: number }> {
    return this.http.put<{ changes: number }>(`${this.apiUrl}/journal/${id}`, { content, mood });
  }

  deleteJournalEntry(id: number): Observable<{ changes: number }> {
    return this.http.delete<{ changes: number }>(`${this.apiUrl}/journal/${id}`);
  }

  getSobrietyDate(): Observable<{ sobriety_start_date: string }> {
    return this.http.get<{ sobriety_start_date: string }>(`${this.apiUrl}/sobriety-date`);
  }

  updateSobrietyDate(date: string): Observable<{ changes: number }> {
    return this.http.put<{ changes: number }>(`${this.apiUrl}/sobriety-date`, { sobriety_start_date: date });
  }

  getPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.apiUrl}/posts`);
  }

  createPost(post: { title: string, content: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/posts`, post);
  }

  getMeetingRooms(): Observable<{ rooms: MeetingRoom[] }> {
    return this.http.get<{ rooms: MeetingRoom[] }>(`${this.apiUrl}/meeting-rooms`);
  }

  getMessages(roomId: number): Observable<{ messages: Message[] }> {
    return this.http.get<{ messages: Message[] }>(`${this.apiUrl}/meeting-rooms/${roomId}/messages`);
  }

  sendMessage(roomId: number, content: string, author: string): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}/meeting-rooms/${roomId}/messages`, { content, author });
  }

  joinQueue(roomId: number, author: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/meeting-rooms/${roomId}/queue`, { author });
  }

  getQueue(roomId: number): Observable<{ queue: QueueEntry[] }> {
    return this.http.get<{ queue: QueueEntry[] }>(`${this.apiUrl}/meeting-rooms/${roomId}/queue`);
  }

  leaveQueue(roomId: number, author: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/meeting-rooms/${roomId}/queue/${author}`);
  }

  joinVoiceCall(roomId: number, author: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/meeting-rooms/${roomId}/voice-call/join`, { author });
  }

  getFourthStepInventory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/fourth-step`);
  }

  addFourthStepItem(item: any): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.apiUrl}/fourth-step`, item);
  }

  deleteFourthStepItem(id: number): Observable<{ changes: number }> {
    return this.http.delete<{ changes: number }>(`${this.apiUrl}/fourth-step/${id}`);
  }
}
