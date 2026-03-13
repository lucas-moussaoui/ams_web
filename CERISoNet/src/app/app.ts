import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from "./feature/header/header"
import { Footer } from "./feature/footer/footer"
import { AuthService } from './service/auth.service';
import { Home } from './feature/home/home';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header, Footer, Home],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private authService = inject(AuthService);

  ngOnInit() {
    // Cette ligne s'exécute quelle que soit l'URL saisie par l'utilisateur
    this.authService.checkStatus();
  }
}
