import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { PostsService } from '../../service/posts.service';
import { MatDialog } from '@angular/material/dialog';
import { CreatePost } from '../create-post/create-post';
import { BandeauInfoService } from '../../service/bandeau-info.service';
import { AuthService } from '../../service/auth.service';
import { WebSocketService } from '../../service/websocket.service';
import { SharePost } from '../share-post/share-post';

@Component({
  selector: 'app-home',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatDividerModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private dialog = inject(MatDialog);
  protected postsService = inject(PostsService);
  private bandeauInfoService = inject(BandeauInfoService);
  protected authService = inject(AuthService);
  private webSocketService = inject(WebSocketService);

  protected loading = false;

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.chargerPosts();
    }

    // Ecoute les likes en temps réel
    this.webSocketService.listen('like').subscribe((data) => {
      this.postsService.ajouterLikeLocalement(data.postId, data.userId);
    });

    this.webSocketService.listen('partage').subscribe((data) => {
      this.bandeauInfoService.notifier(`${data.pseudo} a partagé un post !`, 'success');
    });
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (this.loading) return;

    const pos =
      (document.documentElement.scrollTop || document.body.scrollTop) +
      document.documentElement.offsetHeight;
    const max = document.documentElement.scrollHeight;

    if (pos > max - 200) {
      // Grace au calcul de la position c'est uniquement lors d'un scroll assez descendant que la fonction charger sera appelé
      this.chargerPosts();
    }
  }

  chargerPosts() {
    this.loading = true; // On affiche le loading via cette variable ( un petit spinner assez sympa )
    this.postsService.getPosts(this.postsService.skip, this.postsService.limit).subscribe({
      next: (nouveauxPosts) => {
        // on appelle getPosts depuis le service et on insère les nouveaux posts dans la variable
        if (nouveauxPosts.length > 0) {
          this.postsService.posts.update((current) => [...current, ...nouveauxPosts]); // On garde les ancien posts également
          this.postsService.skip += this.postsService.limit;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  openCreateDialog() {
    const dialogRef = this.dialog.open(CreatePost, { width: '500px' }); // On open la dialog de création de publication

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Après avoir été fermé on notifie l'utilisateur et on refresh les données de la page

        this.bandeauInfoService.notifier(`Publication crée !`, 'success');
        this.postsService.viderPosts();
        this.chargerPosts();

        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  commenter(postId: string, texte: string) {
    if (!texte.trim()) return;

    this.postsService.commenter(postId, texte).subscribe({
      next: (res) => {
        this.postsService.ajouterCommentaireLocalement(postId, res.comment);
        this.bandeauInfoService.notifier('Commentaire posté !', 'success');
      },
      error: () => {
        this.bandeauInfoService.notifier('Erreur lors du commentaire', 'error');
      },
    });
  }

  trierPosts(tri: string) {
    this.postsService.triActif.set(tri);
    this.postsService.viderPosts();
    this.chargerPosts();
  }

  changerOrdre() {
    this.postsService.ordreActif.update((ordre) => (ordre === -1 ? 1 : -1));
    this.postsService.viderPosts();
    this.chargerPosts();
  }

  filtrerPosts(filtre: string) {
    this.postsService.filtreActif.set(filtre);
    this.postsService.viderPosts();
    this.chargerPosts();
  }

  protected afficherRechercheHashtag = signal<boolean>(false);

  toggleRechercheHashtag() {
    this.afficherRechercheHashtag.update((v) => !v);
    if (!this.afficherRechercheHashtag()) {
      // Si on ferme, on reset le filtre hashtag
      this.postsService.hashtagsActifs.set([]);
      this.postsService.viderPosts();
      this.chargerPosts();
    }
  }

  ajouterHashtag(hashtag: string) {
    if (!hashtag.trim()) return;
    const tag = hashtag.startsWith('#') ? hashtag : '#' + hashtag;
    if (!this.postsService.hashtagsActifs().includes(tag)) {
      this.postsService.hashtagsActifs.update((tags) => [...tags, tag]);
      this.appliquerHashtags();
    }
  }

  supprimerHashtag(hashtag: string) {
    this.postsService.hashtagsActifs.update((tags) => tags.filter((t) => t !== hashtag));
    this.appliquerHashtags();
  }

  appliquerHashtags() {
    this.postsService.viderPosts();
    this.chargerPosts();
  }

  liker(postId: string) {
    this.webSocketService.emit('like', {
      postId,
      pseudo: this.authService.currentUser(),
      userId: this.authService.currentUserId(),
    });
  }

  ouvrirPartage(post: any) {
    const dialogRef = this.dialog.open(SharePost, {
      width: '500px',
      data: post, // On passe le post original
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.bandeauInfoService.notifier('Post partagé !', 'success');
        this.postsService.viderPosts();
        this.chargerPosts();
      }
    });
  }
}
