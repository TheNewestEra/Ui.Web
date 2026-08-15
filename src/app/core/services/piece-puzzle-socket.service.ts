import { Injectable, signal } from '@angular/core';
import { WS_BASE_URL } from '@core/constants/base-urls.constants';
import {
  PuzzleWsClientMessage,
  PuzzleWsJoinRequestTypeEnum,
  PuzzleWsMessage,
} from '@thenewestera/puzzle-ng';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PiecePuzzleSocketService {
  private socket: WebSocket | null = null;

  readonly connected = signal(false);

  private readonly messageSubject = new Subject<PuzzleWsMessage>();
  private readonly errorSubject = new Subject<string>();

  readonly messages = this.messageSubject.asObservable();
  readonly errors = this.errorSubject.asObservable();

  connect(gameId: string, player?: string, color?: string, joinOnOpen = false): void {
    this.disconnect();

    const url = `${WS_BASE_URL.PUZZLE}/puzzles/${gameId}/ws`;

    this.socket = new WebSocket(url);

    this.socket.addEventListener('open', () => {
      this.connected.set(true);

      if (joinOnOpen || player) this.join(player, color);
    });

    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data) as PuzzleWsMessage;

      this.messageSubject.next(message);
    });

    this.socket.addEventListener('close', () => {
      this.connected.set(false);
    });

    this.socket.addEventListener('error', () => {
      this.errorSubject.next('Connection to the puzzle was lost. Please refresh and try again.');
    });
  }

  join(player?: string, color?: string): boolean {
    return this.send({ type: PuzzleWsJoinRequestTypeEnum.Join, player, color });
  }

  send(message: PuzzleWsClientMessage): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.errorSubject.next('The puzzle connection is not ready. Please try again.');
      return false;
    }

    this.socket.send(JSON.stringify(message));
    return true;
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
    this.connected.set(false);
  }
}
