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

  readonly messages = this.messageSubject.asObservable();

  connect(gameId: string, player?: string, color?: string): void {
    this.disconnect();

    const url = `${WS_BASE_URL.PUZZLE}/puzzles/${gameId}/ws`;

    this.socket = new WebSocket(url);

    this.socket.addEventListener('open', () => {
      this.connected.set(true);

      if (player) this.send({ type: PuzzleWsJoinRequestTypeEnum.Join, player, color });
    });

    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data) as PuzzleWsMessage;

      this.messageSubject.next(message);
    });

    this.socket.addEventListener('close', () => {
      this.connected.set(false);
    });

    this.socket.addEventListener('error', (error) => {
      console.error('Puzzle WebSocket error', error);
    });
  }

  send(message: PuzzleWsClientMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send puzzle message, socket is not open', message);
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
