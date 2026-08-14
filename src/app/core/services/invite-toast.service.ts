import { inject, Injectable } from '@angular/core';
import { InviteSummary } from '@thenewestera/friends-ng';
import {
  describeInvite,
  NotificationType,
  PushableNotification,
} from '@core/models/notification.model';
import { ToastService } from '@shared/services/toast.service';
import { InviteResponseService } from '@core/services/invite-response.service';
import { NotificationsService } from '@core/services/notifications.service';

const TOAST_DURATION_MS = 15000;

@Injectable({
  providedIn: 'root',
})
export class InviteToastService {
  private readonly notificationsService = inject(NotificationsService);
  private readonly toastService = inject(ToastService);
  private readonly inviteResponse = inject(InviteResponseService);

  constructor() {
    this.notificationsService.live$.subscribe((notification) => {
      if (notification.type !== NotificationType.Invite) return;
      this.showToast(notification);
    });
  }

  private showToast(notification: PushableNotification): void {
    const { title, body } = describeInvite(notification.data as InviteSummary);

    this.toastService.show({
      id: notification.id,
      title,
      body,
      durationMs: TOAST_DURATION_MS,
      actions: [
        {
          label: 'Accept',
          variant: 'primary',
          run: () => this.inviteResponse.accept(notification),
        },
        {
          label: 'Decline',
          variant: 'ghost',
          run: () => this.inviteResponse.decline(notification),
        },
      ],
    });
  }
}
