import { computed, effect, inject, Injectable, signal } from '@angular/core';
import {
  NotificationsService as NotificationsApi,
  NotificationWsMessageTypeEnum,
} from '@thenewestera/notifications-ng';
import { Observable, Subject } from 'rxjs';
import { WS_BASE_URL } from '@core/constants/base-urls.constants';
import { NotificationSocketMessage, PushableNotification } from '@core/models/notification.model';
import { UserStateService } from '@core/services/user-state.service';

const RECONNECT_DELAY_MS = 3000;

/** Client for the `notifications` game-worker service — the one shared,
 * general-purpose channel every backend service pushes a user-facing
 * message through. REST (listing/marking read) goes through the generated
 * `@thenewestera/notifications-ng` client, same as every other service;
 * only the WebSocket is still hand-rolled here with a raw `WebSocket`,
 * since that upgrade route isn't representable in OpenAPI and so has no
 * generated equivalent — the same approach `GuessPromptSocketService`
 * already takes for its own game WebSocket.
 *
 * A notification's `type` is never special-cased here — this service only
 * ever carries whatever the server sends, generic `title`/`body`/`data`
 * included. Per-type rendering and actions (e.g. the Accept/Decline
 * buttons a `"friend_request"` gets in NotificationCenterComponent, or the
 * toast an `"invite"` gets via InviteToastService) live elsewhere, built on
 * top of `notifications`/`live$` below, so a brand-new `type` never needs
 * a change in this service. */
@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private readonly api = inject(NotificationsApi);
  private readonly userState = inject(UserStateService);

  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly _notifications = signal<PushableNotification[]>([]);
  readonly notifications = this._notifications.asReadonly();
  readonly count = computed(() => this._notifications().length);

  readonly connected = signal(false);

  private readonly liveNotification = new Subject<PushableNotification>();
  readonly live$: Observable<PushableNotification> = this.liveNotification.asObservable();

  constructor() {
    effect(() => {
      if (this.userState.isLoggedIn()) this.connect();
      else this.disconnect();
    });
  }

  dismiss(notification: PushableNotification): void {
    this._notifications.update((list) => list.filter((n) => n.id !== notification.id));

    if (notification.persisted) {
      this.api.apiNotificationsIdReadPost(notification.id).subscribe({ error: () => undefined }); // local list already updated either way
    }
  }

  private connect(): void {
    if (this.socket) return;

    this.loadPending();

    const socket = new WebSocket(`${WS_BASE_URL.NOTIFICATIONS}/api/notifications/ws`);
    this.socket = socket;

    socket.addEventListener('open', () => this.connected.set(true));

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data as string) as NotificationSocketMessage;
      if (message.type !== NotificationWsMessageTypeEnum.Notification) return;

      this._notifications.update((list) => [
        message.notification,
        ...list.filter((n) => n.id !== message.notification.id),
      ]);
      this.liveNotification.next(message.notification);
    });

    socket.addEventListener('close', () => {
      this.connected.set(false);
      // A `disconnect()`/newer `connect()` already replaced `this.socket`
      // — don't let this stale close event schedule a second reconnect.
      if (this.socket !== socket) return;
      this.socket = null;
      if (this.userState.isLoggedIn()) this.scheduleReconnect();
    });

    socket.addEventListener('error', () => socket.close());
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.userState.isLoggedIn()) this.connect();
    }, RECONNECT_DELAY_MS);
  }

  private disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.socket?.close();
    this.socket = null;
    this.connected.set(false);
    this._notifications.set([]);
  }

  private loadPending(): void {
    this.api.apiNotificationsGet().subscribe({
      next: (response) => {
        const persisted: PushableNotification[] = response.notifications.map((notification) => ({
          ...notification,
          persisted: true,
        }));

        this._notifications.update((list) => {
          const existingIds = new Set(list.map((n) => n.id));
          return [...list, ...persisted.filter((n) => !existingIds.has(n.id))].sort(
            (a, b) => b.createdAt - a.createdAt,
          );
        });
      },
      error: () => undefined, // best-effort — live notifications still arrive over the socket
    });
  }
}
