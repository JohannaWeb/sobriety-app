import Peer from 'simple-peer';

export interface MeetingRoom {
  id: number;
  name: string;
  description: string;
}

export interface Message {
  id?: number;
  room_id: number;
  author: string;
  content: string;
  timestamp: string;
}

export interface QueueEntry {
  id?: number;
  room_id: number;
  author: string;
  timestamp: string;
}

export interface ConnectedPeer {
  author: string;
  peer: Peer.Instance;
  stream?: MediaStream;
}
