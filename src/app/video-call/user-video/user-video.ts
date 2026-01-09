import { Component, Input, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { StreamManager } from 'openvidu-browser';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-video',
  templateUrl: './user-video.html',
  styleUrls: ['./user-video.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class UserVideoComponent implements AfterViewInit {
  @Input() streamManager!: StreamManager;
  @ViewChild('videoElement') videoElement!: ElementRef;

  ngAfterViewInit() {
    this.streamManager.addVideoElement(this.videoElement.nativeElement);
  }
}

