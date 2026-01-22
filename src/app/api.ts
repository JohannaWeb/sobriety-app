import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { JournalEntry } from './journal/journal';
import { Post } from './forum/forum';
import { MeetingRoom, Message, QueueEntry } from './meetings/meetings.model';
import { environment } from '../environments/environment';
import { ChangesResponse, IdResponse } from './models/api.model';

@Injectable({
  providedIn: 'root',
})
export class Api {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getJournalEntries(): Observable<{ entries: JournalEntry[] }> {
    return this.http.get<{ entries: JournalEntry[] }>(`${this.apiUrl}/journal`);
  }

  addJournalEntry(entry: { date: string, content: string, mood: string }): Observable<IdResponse> {
    return this.http.post<IdResponse>(`${this.apiUrl}/journal`, entry);
  }

  updateJournalEntry(id: number, content: string, mood: string): Observable<ChangesResponse> {
    return this.http.put<ChangesResponse>(`${this.apiUrl}/journal/${id}`, { content, mood });
  }

  deleteJournalEntry(id: number): Observable<ChangesResponse> {
    return this.http.delete<ChangesResponse>(`${this.apiUrl}/journal/${id}`);
  }

  getSobrietyDate(): Observable<{ sobriety_start_date: string }> {
    return this.http.get<{ sobriety_start_date: string }>(`${this.apiUrl}/sobriety-date`);
  }

  updateSobrietyDate(date: string): Observable<ChangesResponse> {
    return this.http.put<ChangesResponse>(`${this.apiUrl}/sobriety-date`, { sobriety_start_date: date });
  }

  getPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.apiUrl}/posts`);
  }

  createPost(post: { title: string, content: string }): Observable<IdResponse> {
    return this.http.post<IdResponse>(`${this.apiUrl}/posts`, post);
  }

  createComment(postId: number, content: string): Observable<IdResponse> {
    return this.http.post<IdResponse>(`${this.apiUrl}/posts/${postId}/comments`, { content });
  }

  getMeetingRooms(): Observable<{ rooms: MeetingRoom[] }> {
    return this.http.get<{ rooms: MeetingRoom[] }>(`${this.apiUrl}/meeting-rooms`);
  }

  getMessages(roomId: number): Observable<{ messages: Message[] }> {
    return this.http.get<{ messages: Message[] }>(`${this.apiUrl}/meeting-rooms/${roomId}/messages`);
  }

  sendMessage(roomId: number, content: string, author?: string): Observable<Message> {
    // Author is handled by backend token
    return this.http.post<Message>(`${this.apiUrl}/meeting-rooms/${roomId}/messages`, { content });
  }

  joinQueue(roomId: number, author?: string): Observable<IdResponse> {
    return this.http.post<IdResponse>(`${this.apiUrl}/meeting-rooms/${roomId}/queue`, {});
  }

  leaveQueue(roomId: number, author: string): Observable<ChangesResponse> {
    return this.http.delete<ChangesResponse>(`${this.apiUrl}/meeting-rooms/${roomId}/queue/${author}`);
  }

  getQueue(roomId: number): Observable<{ queue: QueueEntry[] }> {
    return this.http.get<{ queue: QueueEntry[] }>(`${this.apiUrl}/meeting-rooms/${roomId}/queue`);
  }

  joinVoiceCall(roomId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/meeting-rooms/${roomId}/voice-call/join`, {});
  }

  getFourthStepInventory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/fourth-step`);
  }

  addFourthStepItem(item: any): Observable<IdResponse> {
    return this.http.post<IdResponse>(`${this.apiUrl}/fourth-step`, item);
  }

  deleteFourthStepItem(id: number): Observable<ChangesResponse> {
    return this.http.delete<ChangesResponse>(`${this.apiUrl}/fourth-step/${id}`);
  }

  getOpenViduToken(roomId: string): Observable<string> {
    return this.http.post(`${this.apiUrl}/openvidu/sessions`, { customSessionId: roomId }, { responseType: 'text' }).pipe(
      switchMap((sessionId: string) => {
        return this.http.post(`${this.apiUrl}/openvidu/sessions/${sessionId}/connections`, {}, { responseType: 'text' });
      })
    );
  }
}
