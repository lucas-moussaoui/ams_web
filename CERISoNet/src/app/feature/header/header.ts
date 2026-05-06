import { Component, inject, OnInit, signal } from '@angular/core';
import { AuthService } from '../../service/auth.service';
import { WebSocketService } from '../../service/websocket.service';
import { BandeauInfoService } from '../../service/bandeau-info.service';

@Component({
  selector: 'app-header',
  imports: [],
  standalone: true,
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {
  protected authService = inject(AuthService);
  private webSocketService = inject(WebSocketService);
  private bandeauInfoService = inject(BandeauInfoService);

  protected connectes = signal<string[]>([]);
  protected afficherPopup = signal<boolean>(false);

  ngOnInit() {

    // on écoute le web socket pour récupérer la nouvelle liste des user connecté
    this.webSocketService.listen('utilisateursConnectes').subscribe((pseudos) => {
      this.connectes.set(pseudos);
    });

    // on écoute également un web socket pour afficher la notif de connexion et deconnexion
    this.webSocketService.listen('connexionNotif').subscribe((data) => {
      if (!this.authService.isLoggedIn()) return;
      if (data.type === 'connexion') {
        this.bandeauInfoService.notifier(`${data.pseudo} vient de se connecter`, 'success');
      } else {
        this.bandeauInfoService.notifier(`${data.pseudo} vient de se déconnecter`, 'error');
      }
    });
  }
  togglePopup() {
    // popup pour les user connecté
    this.afficherPopup.update((v) => !v);
  }
}
