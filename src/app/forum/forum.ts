import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { Api } from '../api';

export interface Post {
  _id: string;
  title: string;
  content: string;
  author: string;
  comments: Comment[];
}

export interface Comment {
  content: string;
  author: string;
}

@Component({
  selector: 'app-forum',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatListModule
  ],
  templateUrl: './forum.html',
  styleUrls: ['./forum.scss'],
})
export class Forum implements OnInit {
  posts: Post[] = [];
  postForm: UntypedFormGroup;

  constructor(private fb: UntypedFormBuilder, private api: Api) {
    this.postForm = this.fb.group({
      title: [''],
      content: ['']
    });
  }

  ngOnInit() {
    this.api.getPosts().subscribe(posts => {
      this.posts = posts;
    });
  }

  createPost() {
    if (this.postForm.valid) {
      this.api.createPost(this.postForm.value).subscribe(() => {
        this.postForm.reset();
        this.ngOnInit(); // Refresh posts
      });
    }
  }
}
