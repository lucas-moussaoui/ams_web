import { Component, inject } from '@angular/core';
import { AuthService } from "../../service/auth.service"


@Component({
  selector: 'app-header',
  imports: [],
  standalone: true,
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  protected authService = inject(AuthService);
}
