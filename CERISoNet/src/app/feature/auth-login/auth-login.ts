import { Component, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../service/auth.service';
import { BandeauInfoService } from '../../service/bandeau-info.service';
import { PostsService } from '../../service/posts.service';

@Component({
  selector: 'app-auth-login',
  imports: [ReactiveFormsModule],
  standalone: true,
  templateUrl: './auth-login.html',
  styleUrl: './auth-login.css',
})
export class AuthLogin {
  // Injection des outils nécessaires
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private dialogRef = inject(MatDialogRef<AuthLogin>);
  private authService = inject(AuthService);
  private bandeauInfoService = inject(BandeauInfoService);
  private postsService = inject(PostsService);

  API_URL = 'https://pedago.univ-avignon.fr:3115';
  errorMessage: string | null = null; // Stocke l'erreur pour l'affichage HTML

  // Configuration des champs et validations
  loginForm: FormGroup = this.fb.group({
    mail: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(3)]],
  });

  onSubmit() {
    if (this.loginForm.valid) {
      this.errorMessage = null; // Reset de l'erreur avant de tester

      // Envoi des identifiants au serveur Node
      this.http
        .post<any>(`${this.API_URL}/login`, this.loginForm.value, { withCredentials: true })
        .subscribe({
          next: (res) => {
            if (res) {
              const maintenant = new Date();

              // Mise à jour de l'état global
              this.authService.isLoggedIn.set(true);
              this.authService.currentUser.set(res.user);

              // Sauvegarde locale de la date et l'heure
              localStorage.setItem('dateConnexion', maintenant.toLocaleDateString());
              localStorage.setItem('heureConnexion', maintenant.toLocaleTimeString());

              this.bandeauInfoService.notifier(`Connexion réussie !`, 'success');
              this.postsService.initialiserPosts(); // Permer d'initialiser es posts lors de la connexion
              this.dialogRef.close(true); // Fermeture de la modale
            }
          },
          error: (err) => {
            // Gestion de l'erreur en local dans la modale
            // Utilisation d'un autre type de bandeau de notification car le toaster de Notyf avais des
            // problème d'apparition depuis une modale
            this.errorMessage = 'Identifiants incorrects ou serveur injoignable.';
            this.loginForm.get('password')?.patchValue(''); // Vide le champ mot de passe
          },
        });
    }
  }
}
