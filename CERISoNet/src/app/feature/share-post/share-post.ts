import { Component, inject, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PostsService } from '../../service/posts.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BandeauInfoService } from '../../service/bandeau-info.service';
import { WebSocketService } from '../../service/websocket.service';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-share-post',
  imports: [ReactiveFormsModule],
  templateUrl: './share-post.html',
  styleUrl: './share-post.css',
})
export class SharePost {
  private fb = inject(FormBuilder);
  private postsService = inject(PostsService);
  private bandeauInfoService = inject(BandeauInfoService);
  private webSocketService = inject(WebSocketService);
  private authService = inject(AuthService);
  protected dialogRef = inject(MatDialogRef<SharePost>);

  // Le post original passé depuis home.ts
  constructor(@Inject(MAT_DIALOG_DATA) public postOriginal: any) {}

  shareForm: FormGroup = this.fb.group({
    body: ['', [Validators.required, Validators.minLength(1)]],
    imageUrl: [''],
    imageTitle: [''],
  });

  onPartager() {
    if (this.shareForm.valid) {
      const { body, imageUrl, imageTitle } = this.shareForm.value;
      this.postsService.partager(this.postOriginal._id, body, imageUrl, imageTitle).subscribe({
        next: (res) => {
          if (res.success) {
            this.webSocketService.emit('partage', { pseudo: this.authService.currentUser() });
            this.dialogRef.close(true);
          }
        },
        error: () => {
          this.bandeauInfoService.notifier('Erreur lors du partage', 'error');
        },
      });
    }
  }
}
