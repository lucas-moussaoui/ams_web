import { Injectable } from '@angular/core';
import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';

@Injectable({
  providedIn: 'root',
})
export class BandeauInfoService {
  // Configuration de l'outil Notyf pour les messages d'alerte
  // J'utilise Notyf car c'est un outil que j'apprécie et que j'ai déjà utilisé
  private notyf = new Notyf({
    duration: 4000, // Le message reste affiché 4 secondes
    position: { x: 'center', y: 'top' }, // Centré en haut de l'écran
    types: [
      {
        type: 'success',
        background: '#10b981', // Couleur verte
        dismissible: true,
      },
      {
        // Pas utilisé pour le moments, mais le moment viendra un jour
        type: 'error',
        background: '#ef4444', // Couleur rouge
        dismissible: true,
      },
    ],
  });

  // Méthode qu'on appelle depuis les composants pour afficher un message
  public notifier(message: string, type: 'success' | 'error') {
    if (type === 'success') {
      this.notyf.success(message);
    } else {
      this.notyf.error(message);
    }
  }
}
