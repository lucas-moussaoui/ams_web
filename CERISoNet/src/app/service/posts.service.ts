import { inject, Injectable, signal } from '@angular/core';
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

  public triActif = signal<string>('date');
  public ordreActif = signal<number>(-1); // -1 = décroissant, 1 = croissant

  public filtreActif = signal<string>('tous'); // 'tous' ou 'moi'
  public hashtagsActifs = signal<string[]>([]);

  getPosts(skip: number, limit: number) {
    const hashtags = this.hashtagsActifs();
    const hashtagParam = hashtags.length > 0
      ? '&hashtags=' + hashtags.map((h) => encodeURIComponent(h)).join('|')
        : '';
    const url = `${this.API_URL}/posts?skip=${skip}&limit=${limit}&tri=${this.triActif()}&ordre=${this.ordreActif()}&filtre=${this.filtreActif()}${hashtagParam}`;
    return this.http.get<any[]>(url, { withCredentials: true });
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

  commenter(postId: string, texte: string) {
    return this.http.post<any>(
      `${this.API_URL}/comment`,
      { postId, text: texte },
      { withCredentials: true },
    );
  }

  ajouterCommentaireLocalement(postId: string, commentaire: any) {
    this.posts.update((posts) =>
      posts.map((p) =>
        p._id === postId ? { ...p, comments: [...(p.comments || []), commentaire] } : p,
      ),
    );
  }

  ajouterLikeLocalement(postId: string, userId: number) {
    this.posts.update((posts) =>
      posts.map((p) => {
        if (p._id.toString() === postId) {
          return {
            ...p,
            likes: (p.likes || 0) + 1,
            likedBy: [...(p.likedBy || []), parseInt(userId.toString())],
          };
        }
        return p;
      }),
    );
  }

  partager(postId: string, body: string, imageUrl: string, imageTitle: string) {
    return this.http.post<any>(
      `${this.API_URL}/share`,
      { postId, body, image: { url: imageUrl, title: imageTitle } },
      { withCredentials: true },
    );
  }
}
