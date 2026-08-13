import { Injectable, signal } from '@angular/core';
import { WS_BASE_URL } from '@core/constants/base-urls.constants';
import { GuessPromptSocketMessage } from '@core/models/guess-prompt-socket.interface';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GuessPromptSocketService {
  private socket: WebSocket | null = null;

  readonly connected = signal(false);

  private readonly messageSubject = new Subject<GuessPromptSocketMessage>();
  private readonly errorSubject = new Subject<string>();

  readonly messages = this.messageSubject.asObservable();
  readonly errors = this.errorSubject.asObservable();

  connect(gameId: string): void {
    this.disconnect();

    const url = `${WS_BASE_URL.GUESS}/games/${gameId}/ws`;

    this.socket = new WebSocket(url);

    this.socket.addEventListener('open', () => {
      this.connected.set(true);
    });

    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data) as GuessPromptSocketMessage;

      this.messageSubject.next(message);
    });

    this.socket.addEventListener('close', () => {
      this.connected.set(false);
    });

    this.socket.addEventListener('error', () => {
      this.errorSubject.next('Connection to the game was lost. Please refresh and try again.');
    });
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
    this.connected.set(false);
  }
}
