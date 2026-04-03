import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PostsService } from '../../service/posts.service';
import { MatDialogRef } from '@angular/material/dialog';
import { BandeauInfoService } from '../../service/bandeau-info.service';

@Component({
  selector: 'app-create-post',
  imports: [ReactiveFormsModule],
  templateUrl: './create-post.html',
  styleUrl: './create-post.css',
})
export class CreatePost {
  private fb = inject(FormBuilder);
  private postsService = inject(PostsService);
  protected dialogRef = inject(MatDialogRef<CreatePost>);
  private bandeauInfoService = inject(BandeauInfoService);

  // Création du formulaire
  postForm: FormGroup = this.fb.group({
    body: ['', [Validators.required, Validators.minLength(3)]],
    imageUrl: [''],
    imageTitle: [''],
  });

  // Lors de la validation du formulaire on récupère les données et on les envois vers le postsService
  onPublier() {
    if (this.postForm.valid) {
      const { body, imageUrl, imageTitle } = this.postForm.value;
      this.postsService.publier(body, imageUrl, imageTitle).subscribe({
        next: (res) => {
          if (res.success) {
            this.dialogRef.close(true);
          }
        },
        error: (err) => {
          const messageErreur = err.error?.message || `Problème lors de la création`;

          this.bandeauInfoService.notifier(messageErreur, 'error');
        }
      });
    }
  }
}
