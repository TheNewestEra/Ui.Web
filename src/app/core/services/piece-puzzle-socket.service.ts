import { Injectable, signal } from '@angular/core';
import { WS_BASE_URL } from '@core/constants/base-urls.constants';
import { PuzzleSocketMessage } from '@core/models/piece-puzzle-socket.interface';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PiecePuzzleSocketService {
  private socket: WebSocket | null = null;

  readonly connected = signal(false);

  private readonly messageSubject = new Subject<PuzzleSocketMessage>();

  readonly messages = this.messageSubject.asObservable();

  connect(gameId: string): void {
    this.disconnect();

    const url = `${WS_BASE_URL.PUZZLE}/puzzles/${gameId}/ws`;

    this.socket = new WebSocket(url);

    this.socket.addEventListener('open', () => {
      this.connected.set(true);
    });

    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data) as PuzzleSocketMessage;

      this.messageSubject.next(message);
    });

    this.socket.addEventListener('close', () => {
      this.connected.set(false);
    });

    this.socket.addEventListener('error', (error) => {
      console.error('Puzzle WebSocket error', error);
    });
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
    this.connected.set(false);
  }
}
