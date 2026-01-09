import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Publisher, Subscriber } from 'openvidu-browser';
import { UserVideoComponent } from './user-video/user-video';

@Component({
  selector: 'app-video-call',
  templateUrl: './video-call.html',
  styleUrls: ['./video-call.scss'],
  standalone: true,
  imports: [CommonModule, UserVideoComponent]
})
export class VideoCallComponent {
  @Input() publisher: Publisher | undefined;
  @Input() subscribers: Subscriber[] = [];
}
