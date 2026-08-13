import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { InvitesService } from '@thenewestera/friends-ng';
import { PushableNotification } from '@core/models/notification.model';
import { ToastService } from '@shared/services/toast.service';
import { NotificationsService } from './notifications.service';

@Injectable({
  providedIn: 'root',
})
export class InviteResponseService {
  private readonly invitesService = inject(InvitesService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  accept(notification: PushableNotification): void {
    this.clear(notification);

    this.invitesService.apiInvitesIdAcceptPost(notification.id).subscribe({
      next: ({ playUrl }) => {
        if (/^https?:\/\//.test(playUrl)) window.location.assign(playUrl);
        else void this.router.navigateByUrl(playUrl);
      },
      error: () => undefined,
    });
  }

  decline(notification: PushableNotification): void {
    this.clear(notification);
    this.invitesService
      .apiInvitesIdDeclinePost(notification.id)
      .subscribe({ error: () => undefined });
  }

  private clear(notification: PushableNotification): void {
    this.toastService.dismiss(notification.id);
    this.notificationsService.dismiss(notification);
  }
}
