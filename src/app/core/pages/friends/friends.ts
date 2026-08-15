import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ApiFriendsGet200Response,
  FriendRequestSummary,
  FriendSummary,
  FriendsService,
  GroupSummary,
  InviteSummary,
  InvitesService,
} from '@thenewestera/friends-ng';
import { finalize, Observable } from 'rxjs';
import { PageLayoutComponent } from '@layout/page-layout/page-layout';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header';
import { CardComponent } from '@shared/components/card/card';
import { ButtonComponent } from '@shared/components/button/button';
import { InputComponent } from '@shared/components/form/input/input';
import { FormFieldComponent } from '@shared/components/form/form-field/form-field';
import { ErrorAlertComponent } from '@shared/components/alert/error/error';
import { IconComponent } from '@shared/ui/icon/icon';
import { FriendPersonRowComponent } from '@core/components/friend-person-row/friend-person-row';
import { SuccessAlertComponent } from '@shared/components/alert/success/success';
import { SoundService } from '@shared/services/sound.service';

@Component({
  selector: 'app-friends',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    PageLayoutComponent,
    PageHeaderComponent,
    CardComponent,
    ButtonComponent,
    InputComponent,
    FormFieldComponent,
    ErrorAlertComponent,
    IconComponent,
    FriendPersonRowComponent,
    SuccessAlertComponent,
  ],
  templateUrl: './friends.html',
  styleUrl: './friends.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FriendsPage {
  private readonly friendsService = inject(FriendsService);
  private readonly invitesService = inject(InvitesService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly sound = inject(SoundService);

  readonly friends = signal<FriendSummary[]>([]);
  readonly incomingRequests = signal<FriendRequestSummary[]>([]);
  readonly outgoingRequests = signal<FriendRequestSummary[]>([]);
  readonly groups = signal<GroupSummary[]>([]);
  readonly invites = signal<InviteSummary[]>([]);

  readonly loading = signal(true);
  readonly actionLoading = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly friendRequestForm = this.fb.nonNullable.group({
    username: ['', Validators.required],
  });

  readonly groupForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.friendsService
      .apiFriendsGet()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response: ApiFriendsGet200Response) => {
          this.friends.set(response.friends);
          this.incomingRequests.set(response.incomingRequests);
          this.outgoingRequests.set(response.outgoingRequests);
          this.groups.set(response.groups);
          this.invites.set(response.invites);
          this.loadPendingInvites();
        },
        error: (error) => this.handleError(error, 'Unable to load your friends.'),
      });
  }

  sendFriendRequest(): void {
    if (this.friendRequestForm.invalid) {
      this.friendRequestForm.markAllAsTouched();
      return;
    }

    const { username } = this.friendRequestForm.getRawValue();

    this.runAction(
      'friend-request',
      this.friendsService.apiFriendsRequestPost({ username }),
      'Friend request sent.',
      () => {
        this.friendRequestForm.reset();
        this.sound.requestSent();
      },
    );
  }

  acceptRequest(id: string): void {
    this.runAction(
      `accept-${id}`,
      this.friendsService.apiFriendsRequestsIdAcceptPost(id),
      'Friend request accepted.',
      () => this.sound.accepted(),
    );
  }

  declineRequest(id: string): void {
    this.runAction(
      `decline-${id}`,
      this.friendsService.apiFriendsRequestsIdDeclinePost(id),
      'Friend request declined.',
    );
  }

  cancelRequest(id: string): void {
    this.runAction(
      `cancel-${id}`,
      this.friendsService.apiFriendsRequestsIdCancelPost(id),
      'Friend request cancelled.',
    );
  }

  removeFriend(id: string): void {
    this.runAction(
      `remove-friend-${id}`,
      this.friendsService.apiFriendsFriendIdDelete(id),
      'Friend removed.',
    );
  }

  createGroup(): void {
    if (this.groupForm.invalid) {
      this.groupForm.markAllAsTouched();
      return;
    }

    const { name } = this.groupForm.getRawValue();

    this.runAction(
      'create-group',
      this.friendsService.apiGroupsPost({ name }),
      'Group created.',
      () => this.groupForm.reset(),
    );
  }

  addGroupMember(groupId: string, friendId: string): void {
    if (!friendId) return;

    this.runAction(
      `add-${groupId}-${friendId}`,
      this.friendsService.apiGroupsIdMembersPost(groupId, { friendId }),
      'Friend added to the group.',
    );
  }

  removeGroupMember(groupId: string, friendId: string): void {
    this.runAction(
      `remove-${groupId}-${friendId}`,
      this.friendsService.apiGroupsIdMembersFriendIdDelete(groupId, friendId),
      'Friend removed from the group.',
    );
  }

  deleteGroup(id: string): void {
    this.runAction(
      `delete-group-${id}`,
      this.friendsService.apiGroupsIdDelete(id),
      'Group deleted.',
    );
  }

  acceptInvite(id: string): void {
    this.actionLoading.set(`accept-invite-${id}`);
    this.clearMessages();

    this.invitesService
      .apiInvitesIdAcceptPost(id)
      .pipe(finalize(() => this.actionLoading.set(null)))
      .subscribe({
        next: (response) => {
          this.sound.accepted();
          if (/^https?:\/\//.test(response.playUrl)) window.location.assign(response.playUrl);
          else void this.router.navigateByUrl(response.playUrl);
        },
        error: (error) => this.handleError(error, 'Unable to accept the invite.'),
      });
  }

  declineInvite(id: string): void {
    this.runAction(
      `decline-invite-${id}`,
      this.invitesService.apiInvitesIdDeclinePost(id),
      'Invite  declined.',
      () => this.sound.declined(),
    );
  }

  availableFriends(group: GroupSummary): FriendSummary[] {
    const memberIds = new Set(group.members.map((member) => member.id));

    return this.friends().filter((friend) => !memberIds.has(friend.id));
  }

  isActionLoading(key: string): boolean {
    return this.actionLoading() === key;
  }

  private loadPendingInvites(): void {
    this.invitesService.apiInvitesPendingGet().subscribe({
      next: (response) => this.invites.set(response.invites),
      error: (error) => this.handleError(error, 'Unable to load game invites.'),
    });
  }

  private runAction(
    key: string,
    request: Observable<unknown>,
    successMessage: string,
    onSuccess?: () => void,
  ): void {
    if (this.actionLoading()) return;

    this.actionLoading.set(key);
    this.clearMessages();

    request.pipe(finalize(() => this.actionLoading.set(null))).subscribe({
      next: () => {
        onSuccess?.();
        this.successMessage.set(successMessage);
        this.loadDataAfterAction();
      },
      error: (error) => this.handleError(error, 'Unable to complete that action.'),
    });
  }

  private loadDataAfterAction(): void {
    this.friendsService.apiFriendsGet().subscribe({
      next: (response) => {
        this.friends.set(response.friends);
        this.incomingRequests.set(response.incomingRequests);
        this.outgoingRequests.set(response.outgoingRequests);
        this.groups.set(response.groups);
        this.invites.set(response.invites);
      },
      error: (error) => this.handleError(error, 'Unable to refresh your friends.'),
    });
  }

  private clearMessages(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  private handleError(error: any, fallback: string): void {
    this.errorMessage.set(error?.error?.error ?? fallback);
  }
}
