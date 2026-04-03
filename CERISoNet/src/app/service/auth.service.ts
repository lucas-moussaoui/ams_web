import { inject, Injectable, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AuthLogin } from '../feature/auth-login/auth-login';
import { HttpClient } from '@angular/common/http';
import { PostsService } from './posts.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private diaolg = inject(MatDialog);
  private http = inject(HttpClient);
  private postsService = inject(PostsService)

  API_URL = 'https://pedago.univ-avignon.fr:3115';

  // Signaux pour suivre l'état de l'utilisateur partout dans l'appli
  isLoggedIn = signal<boolean>(false);
  currentUser = signal<string | null>(null);

  // Ouvre la fenêtre de connexion (la modale)
  public openLoginDialog() {
    this.diaolg.open(AuthLogin, {
      width: '400',
      disableClose: false,
      panelClass: 'custom-dialog-container',
    });
  }

  // Gère la sortie de l'utilisateur
  public deconnexion() {
    // On prévient le serveur qu'on part
    this.http.post<any>(`${this.API_URL}/logout`, {}, { withCredentials: true }).subscribe({
      next: (res) => {
        console.log('Déconnexion réussie côté serveur');

        // On remet tout à zéro proprement (signaux + stockage local + posts)
        this.isLoggedIn.set(false);
        this.currentUser.set(null);
        localStorage.clear();
        this.postsService.viderPosts();
      },
      error: (err) => {
        console.error('Erreur lors du logout', err);
        // Par sécurité, on déconnecte quand même côté client
        this.isLoggedIn.set(false);
        this.currentUser.set(null);
      },
    });
  }

  // Vérifie si une session existe encore au chargement de la page
  public checkStatus() {
    this.http.get<any>(`${this.API_URL}/check-session`, { withCredentials: true }).subscribe({
      next: (res) => {
        // Si le serveur répond OK, on reconnecte l'utilisateur
        this.isLoggedIn.set(true);
        this.currentUser.set(res.user);
      },
      error: () => {
        // Sinon, on s'assure que tout est vide
        this.isLoggedIn.set(false);
        this.currentUser.set(null);
        localStorage.clear();
      },
    });
  }

  // Récupère la date sauvegardée pour l'afficher dans le header
  public getDerniereConnexion() {
    const date = localStorage.getItem('dateConnexion');
    const heure = localStorage.getItem('heureConnexion');
    return date && heure ? `${date} à ${heure}` : null;
  }
}
