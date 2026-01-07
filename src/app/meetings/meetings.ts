import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { Api } from '../api'; // Import Api service
import { MeetingRoom, Message, QueueEntry, ConnectedPeer } from './meetings.model'; // Import MeetingRoom, QueueEntry, ConnectedPeer interface
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon'; // Import MatIconModule
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import Peer from 'simple-peer'; // Import simple-peer

interface Meeting {
  name: string;
  time: string;
  address: string;
}

@Component({
  selector: 'app-meetings',
  imports: [CommonModule, HttpClientModule, MatCardModule, MatListModule, MatFormFieldModule, MatInputModule, MatButtonModule, FormsModule, MatIconModule],
  templateUrl: './meetings.html',
  styleUrls: ['./meetings.scss'],
  standalone: true // This component is standalone
})
export class Meetings implements OnInit, OnDestroy {
  meetings: Meeting[] = [];
  meetingRooms: MeetingRoom[] = [];
  selectedMeetingRoom: MeetingRoom | null = null;
  messages: Message[] = [];
  newMessageContent: string = '';
  messageAuthor: string = 'Anonymous'; // Temporary author for messages
  sharingQueue: QueueEntry[] = [];
  currentSharer: QueueEntry | null = null;
  
  // WebRTC specific properties
  ws: WebSocket | null = null;
  localStream: MediaStream | null = null;
  peers = new Map<string, ConnectedPeer>(); // Map<author, ConnectedPeer>
  remoteAudioElements: HTMLAudioElement[] = [];

  private pollingSubscription: Subscription | null = null;

  constructor(private http: HttpClient, private api: Api, @Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    // Existing logic for AA meetings
    const lat = 40.7128;
    const lng = -74.0060;
    this.http.get<any[]>(`/api/aa-meetings?latitude=${lat}&longitude=${lng}`).subscribe(data => {
      this.meetings = data.map(meeting => ({
        name: meeting.name,
        time: meeting.start_time,
        address: meeting.formatted_address
      }));
    });

    this.fetchMeetingRooms();
    if (isPlatformBrowser(this.platformId)) {
      // Prompt for author name once on init
      const storedAuthor = localStorage.getItem('messageAuthor');
      if (storedAuthor) {
        this.messageAuthor = storedAuthor;
      } else {
        let author = prompt('Please enter your name for chat and voice meetings:');
        if (author) {
          this.messageAuthor = author;
          localStorage.setItem('messageAuthor', author);
        } else {
          this.messageAuthor = 'Anonymous';
        }
      }
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.disconnectWebSocket();
    this.leaveVoiceCall(true); // Force cleanup
  }

  get isInQueue(): boolean {
    return this.sharingQueue.some(e => e.author === this.messageAuthor);
  }

  get isInVoiceCall(): boolean {
    return !!this.localStream; // If localStream exists, user is in a voice call
  }

  get activeVoiceParticipants(): string[] {
    const participants = Array.from(this.peers.keys());
    if (this.localStream) {
      participants.unshift(this.messageAuthor);
    }
    return [...new Set(participants)]; // Ensure unique participants
  }

  fetchMeetingRooms() {
    this.api.getMeetingRooms().subscribe(data => {
      this.meetingRooms = data.rooms;
    });
  }

  selectRoom(room: MeetingRoom) {
    this.selectedMeetingRoom = room;
    this.stopPolling(); // Stop polling for previous room if any
    this.disconnectWebSocket(); // Disconnect from previous room's WebSocket if any
    this.leaveVoiceCall(true); // Leave any active voice call
    this.startPolling(); // Start polling for the new room
    this.connectWebSocket(); // Connect WebSocket for the new room
  }

  startPolling() {
    this.stopPolling();
    if (this.selectedMeetingRoom) {
      // Poll for messages
      const messagesPolling$ = interval(3000).pipe(
        startWith(0),
        switchMap(() => this.api.getMessages(this.selectedMeetingRoom!.id))
      );
      this.pollingSubscription = messagesPolling$.subscribe(data => {
        this.messages = data.messages;
      });

      // Poll for queue
      const queuePolling$ = interval(3000).pipe(
        startWith(0),
        switchMap(() => this.api.getQueue(this.selectedMeetingRoom!.id))
      );
      this.pollingSubscription.add(queuePolling$.subscribe(data => {
        this.sharingQueue = data.queue;
        this.currentSharer = this.sharingQueue.length > 0 ? this.sharingQueue[0] : null;
      }));
    }
  }

  stopPolling() {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  // --- WebSocket & WebRTC Methods ---
  connectWebSocket() {
    if (!this.selectedMeetingRoom || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    // Replace with your signaling server URL
    this.ws = new WebSocket(`ws://localhost:3000`); 

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      // Send join room message to signaling server
      this.ws?.send(JSON.stringify({
        type: 'joinRoom',
        roomId: this.selectedMeetingRoom!.id,
        author: this.messageAuthor
      }));
    };

    this.ws.onmessage = async event => {
      const data = JSON.parse(event.data);
      console.log('WebSocket message:', data);

      switch (data.type) {
        case 'userJoined':
          // Another user joined, create an offer for them if we are already in call
          if (data.author !== this.messageAuthor && this.localStream) {
            console.log(`User ${data.author} joined, initiating peer connection`);
            this.createPeer(data.author, true, this.localStream);
          }
          break;
        case 'userLeft':
          // Another user left, remove their peer connection
          if (data.author !== this.messageAuthor) {
            console.log(`User ${data.author} left, removing peer connection`);
            this.removePeer(data.author);
          }
          break;
        case 'signal':
          // Received signaling data (SDP or ICE)
          if (data.sender !== this.messageAuthor) {
            let peer = this.peers.get(data.sender)?.peer;
            if (!peer) {
              // If we don't have a peer for this sender, create one (initiator: false)
              // This happens when we receive an offer from a newly joined peer
              peer = this.createPeer(data.sender, false, this.localStream!);
            }
            peer.signal(data.payload);
          }
          break;
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.peers.forEach(connectedPeer => connectedPeer.peer.destroy());
      this.peers.clear();
      this.remoteAudioElements.forEach(audio => audio.remove());
      this.remoteAudioElements = [];
    };

    this.ws.onerror = error => {
      console.error('WebSocket error:', error);
    };
  }

  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  async getMedia(): Promise<MediaStream | null> {
    try {
      if (!this.localStream) {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        console.log('Got local stream:', this.localStream);
      }
      return this.localStream;
    } catch (err) {
      console.error('Failed to get local media:', err);
      alert('Could not get access to your microphone. Please check permissions.');
      return null;
    }
  }

  createPeer(remoteAuthor: string, initiator: boolean, stream: MediaStream): Peer.Instance {
    const peer = new Peer({
      initiator: initiator,
      trickle: false, 
      stream: stream,
      config: { // Default public STUN servers
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('signal', data => {
      // Send signaling data to the other peer via WebSocket
      this.ws?.send(JSON.stringify({
        type: 'signal',
        roomId: this.selectedMeetingRoom!.id,
        author: this.messageAuthor,
        payload: data // SDP or ICE candidate
      }));
    });

    peer.on('stream', remoteStream => {
      // Play the remote stream
      console.log(`Received remote stream from ${remoteAuthor}`);
      const audio = new Audio();
      audio.srcObject = remoteStream;
      audio.autoplay = true;
      document.body.appendChild(audio); // Append dynamically, later can be placed in specific div
      this.remoteAudioElements.push(audio);
      
      // Update activeVoiceParticipants
      this.updateActiveVoiceParticipants();
    });

    peer.on('connect', () => {
      console.log(`Peer connected with ${remoteAuthor}`);
      this.updateActiveVoiceParticipants();
    });

    peer.on('close', () => {
      console.log(`Peer connection closed with ${remoteAuthor}`);
      this.removePeer(remoteAuthor);
    });

    peer.on('error', err => {
      console.error(`Peer error with ${remoteAuthor}:`, err);
      this.removePeer(remoteAuthor);
    });

    this.peers.set(remoteAuthor, { author: remoteAuthor, peer: peer });
    return peer;
  }

  removePeer(remoteAuthor: string) {
    const connectedPeer = this.peers.get(remoteAuthor);
    if (connectedPeer) {
      connectedPeer.peer.destroy();
      // Remove associated audio element
      const index = this.remoteAudioElements.findIndex(audio => audio.srcObject === connectedPeer.stream);
      if (index > -1) {
        this.remoteAudioElements[index].remove();
        this.remoteAudioElements.splice(index, 1);
      }
      this.peers.delete(remoteAuthor);
      this.updateActiveVoiceParticipants();
    }
  }

  updateActiveVoiceParticipants() {
    // This getter already computes the list dynamically based on localStream and peers map
  }

  // --- End WebSocket & WebRTC Methods ---

  fetchMessages(roomId: number) {
    this.api.getMessages(roomId).subscribe(data => {
      this.messages = data.messages;
    });
  }

  sendMessage() {
    if (this.selectedMeetingRoom && this.newMessageContent.trim()) {
      this.api.sendMessage(this.selectedMeetingRoom.id, this.newMessageContent.trim(), this.messageAuthor)
        .subscribe(message => {
          this.messages.push(message);
          this.newMessageContent = '';
        });
    }
  }

  joinQueue() {
    if (this.selectedMeetingRoom) {
      this.api.joinQueue(this.selectedMeetingRoom.id, this.messageAuthor).subscribe({
        next: () => {
          this.fetchQueue(this.selectedMeetingRoom!.id);
        },
        error: (err) => {
          if (err.status === 409) {
            alert('You are already in the queue.');
          } else {
            console.error('Error joining queue:', err);
          }
        }
      });
    }
  }

  leaveQueue() {
    if (this.selectedMeetingRoom) {
      this.api.leaveQueue(this.selectedMeetingRoom.id, this.messageAuthor).subscribe(() => {
        this.fetchQueue(this.selectedMeetingRoom!.id);
      });
    }
  }

  fetchQueue(roomId: number) {
    this.api.getQueue(roomId).subscribe(data => {
      this.sharingQueue = data.queue;
      this.currentSharer = this.sharingQueue.length > 0 ? this.sharingQueue[0] : null;
    });
  }

  async joinVoiceCall() {
    if (!this.selectedMeetingRoom || this.isInVoiceCall) {
      return;
    }

    const stream = await this.getMedia();
    if (!stream) {
      return;
    }

    // Connect WebSocket first if not already connected (should be from selectRoom)
    this.connectWebSocket(); 

    // Send a message to the signaling server to indicate we are ready for WebRTC
    // The signaling server will then notify other users in the room
    // The actual peer connections will be initiated when 'userJoined' message is received
  }

  leaveVoiceCall(isDestroying: boolean = false) {
    if (!this.isInVoiceCall && !isDestroying) {
      return;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.peers.forEach(connectedPeer => connectedPeer.peer.destroy());
    this.peers.clear();

    this.remoteAudioElements.forEach(audio => audio.remove());
    this.remoteAudioElements = [];

    this.disconnectWebSocket();

    console.log('Left voice call and cleaned up resources.');
  }
}


