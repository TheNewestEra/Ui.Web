import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FriendsService, InviteSummary } from '@thenewestera/friends-ng';
import { finalize } from 'rxjs';
import { ButtonComponent } from '@shared/components/button/button';
import {
  describeInvite,
  FriendRequestNotificationData,
  NotificationType,
  PushableNotification,
} from '@core/models/notification.model';
import { InviteResponseService } from '@core/services/invite-response.service';
import { NotificationsService } from '@core/services/notifications.service';
import { UserStateService } from '@core/services/user-state.service';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './notification-center.html',
  styleUrl: './notification-center.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationCenterComponent {
  private readonly friendsService = inject(FriendsService);
  private readonly inviteResponse = inject(InviteResponseService);

  readonly notificationsService = inject(NotificationsService);
  readonly userState = inject(UserStateService);

  readonly actionLoading = signal<string | null>(null);

  isFriendRequest = (notification: PushableNotification): boolean =>
    notification.type === NotificationType.FriendRequest;

  friendRequestData = (notification: PushableNotification): FriendRequestNotificationData =>
    notification.data as FriendRequestNotificationData;

  isInvite = (notification: PushableNotification): boolean =>
    notification.type === NotificationType.Invite;

  title = (notification: PushableNotification): string =>
    this.isInvite(notification)
      ? describeInvite(notification.data as InviteSummary).title
      : (notification.title ?? 'Notification');

  body = (notification: PushableNotification): string | null =>
    this.isInvite(notification)
      ? describeInvite(notification.data as InviteSummary).body
      : notification.body;

  dismiss = (notification: PushableNotification): void =>
    this.notificationsService.dismiss(notification);

  acceptFriendRequest(notification: PushableNotification): void {
    const { requestId } = this.friendRequestData(notification);

    this.actionLoading.set(notification.id);
    this.friendsService
      .apiFriendsRequestsIdAcceptPost(requestId)
      .pipe(finalize(() => this.actionLoading.set(null)))
      .subscribe({
        next: () => this.dismiss(notification),
        error: () => this.dismiss(notification),
      });
  }

  declineFriendRequest(notification: PushableNotification): void {
    const { requestId } = this.friendRequestData(notification);

    this.actionLoading.set(notification.id);
    this.friendsService
      .apiFriendsRequestsIdDeclinePost(requestId)
      .pipe(finalize(() => this.actionLoading.set(null)))
      .subscribe({
        next: () => this.dismiss(notification),
        error: () => this.dismiss(notification),
      });
  }

  acceptInvite = (notification: PushableNotification): void =>
    this.inviteResponse.accept(notification);

  declineInvite = (notification: PushableNotification): void =>
    this.inviteResponse.decline(notification);

  isActionLoading = (notification: PushableNotification): boolean =>
    this.actionLoading() === notification.id;
}
