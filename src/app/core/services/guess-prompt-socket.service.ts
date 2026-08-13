import { Injectable, signal } from '@angular/core';
import { WS_BASE_URL } from '@core/constants/base-urls.constants';
import { GameWsClientMessage, GameWsMessage } from '@thenewestera/guess-ng';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GuessPromptSocketService {
  private socket: WebSocket | null = null;

  readonly connected = signal(false);

  private readonly messageSubject = new Subject<GameWsMessage>();

  readonly messages = this.messageSubject.asObservable();

  connect(gameId: string): void {
    this.disconnect();

    const url = `${WS_BASE_URL.GUESS}/games/${gameId}/ws`;

    this.socket = new WebSocket(url);

    this.socket.addEventListener('open', () => {
      this.connected.set(true);
    });

    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data) as GameWsMessage;

      this.messageSubject.next(message);
    });

    this.socket.addEventListener('close', () => {
      this.connected.set(false);
    });

    this.socket.addEventListener('error', (error) => {
      console.error('Guess Prompt WebSocket error', error);
    });
  }

  send(message: GameWsClientMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify(message));
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
    this.connected.set(false);
  }
}
