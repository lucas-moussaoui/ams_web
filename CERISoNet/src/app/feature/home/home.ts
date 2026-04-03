import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { PostsService } from '../../service/posts.service';
import { MatDialog } from '@angular/material/dialog';
import { CreatePost } from '../create-post/create-post';
import { BandeauInfoService } from '../../service/bandeau-info.service';

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

  protected loading = false;

  ngOnInit() {
    this.chargerPosts();
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
}
