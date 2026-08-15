import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { InvitesService } from '@thenewestera/friends-ng';
import { PushableNotification } from '@core/models/notification.model';
import { ToastService } from '@shared/services/toast.service';
import { NotificationsService } from '@core/services/notifications.service';
import { SoundService } from '@shared/services/sound.service';

@Injectable({
  providedIn: 'root',
})
export class InviteResponseService {
  private readonly invitesService = inject(InvitesService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly sound = inject(SoundService);

  accept(notification: PushableNotification): void {
    this.invitesService.apiInvitesIdAcceptPost(notification.id).subscribe({
      next: ({ playUrl }) => {
        this.sound.accepted();
        this.clear(notification);
        void this.navigateToGame(playUrl);
      },
      error: (error) => {
        this.toastService.show({
          id: `invite-accept-error-${notification.id}`,
          title: 'Unable to accept invite',
          body: error?.error?.error ?? 'Please try again.',
        });
      },
    });
  }

  decline(notification: PushableNotification): void {
    this.clear(notification);
    this.invitesService.apiInvitesIdDeclinePost(notification.id).subscribe({
      next: () => this.sound.declined(),
      error: () => undefined,
    });
  }

  private clear(notification: PushableNotification): void {
    this.toastService.dismiss(notification.id);
    this.notificationsService.dismiss(notification);
  }

  private async navigateToGame(playUrl: string): Promise<void> {
    const url = new URL(playUrl, window.location.origin);
    const routeUrl = `${url.pathname}${url.search}${url.hash}`;

    if (url.pathname.startsWith('/games/')) {
      const navigated = await this.router.navigateByUrl(routeUrl);
      if (!navigated) window.location.assign(routeUrl);
      return;
    }

    if (url.origin === window.location.origin) {
      const navigated = await this.router.navigateByUrl(routeUrl);
      if (!navigated) window.location.assign(routeUrl);
      return;
    }

    window.location.assign(url.href);
  }
}
