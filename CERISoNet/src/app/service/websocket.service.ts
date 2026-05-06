import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io } from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket = io('https://pedago.univ-avignon.fr:3115', {
    withCredentials: true,
  });

  // Ecoute un evenement venant du serveur
  listen(eventName: string): Observable<any> {
    return new Observable((subscriber) => {
      this.socket.on(eventName, (data) => {
        subscriber.next(data);
      });
    });
  }

  // Envoie un evenement au serveur
  emit(eventName: string, data: any) {
    this.socket.emit(eventName, data);
  }
}
