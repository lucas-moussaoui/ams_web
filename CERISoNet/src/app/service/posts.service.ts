import { HostListener, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class PostsService {
  private http = inject(HttpClient);

  private API_URL = 'https://pedago.univ-avignon.fr:3115';

  public posts = signal<any[]>([]); // Liste des Posts récupérer depuis la BDD
  public skip = 0; // Permet de ne charger que les nouveaux posts en skkippant les ancien
  public limit = 10; // Limite de nouveau posts a charger a chaque requète

  getPosts(skip: number, limit: number) {
    return this.http.get<any[]>(`${this.API_URL}/posts?skip=${skip}&limit=${limit}`, {
      withCredentials: true,
    });
  }

  publier(message: string, urlImage: string, titreImage: string) {
    const data = {
      body: message,
      hashtags: this.extraireHashtags(message), // On extrait les hashtag du message
      image: { url: urlImage, title: titreImage },
    };

    return this.http.post<any>(`${this.API_URL}/create-post`, data, { withCredentials: true });
  }

  extraireHashtags(message: string): string[] {
    if (!message) return [];
    const regex = /#(\w+)/g; // g pour global, on récupérère tout les mot apres un #
    const matches = message.match(regex);
    return matches ? matches : [];
  }

  public viderPosts() {
    this.posts.set([]);
    this.skip = 0;
  }

  public initialiserPosts() {
    // Cette fonction est similaire a la fonction CHargerPosts dans home.ts
    // mais celle ci permet d'initialiser les premiers posts lors de la connexion
    this.viderPosts();

    this.getPosts(0, this.limit).subscribe({
      next: (nouveaux) => {
        if (nouveaux.length > 0) {
          this.posts.set(nouveaux);
          this.skip = this.limit;
        }
      },
      error: (err) => console.error('Erreur initialisation', err),
    });
  }
}
