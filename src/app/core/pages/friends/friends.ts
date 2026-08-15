import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ApiFriendsGet200Response,
  FriendRequestSummary,
  FriendSummary,
  FriendsService,
  GroupSummary,
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
import { UserStateService } from '@core/services/user-state.service';

interface ActionFeedback {
  error: string | null;
  success: string | null;
}

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
  private readonly fb = inject(FormBuilder);
  private readonly sound = inject(SoundService);
  private readonly userState = inject(UserStateService);

  readonly friends = signal<FriendSummary[]>([]);
  readonly incomingRequests = signal<FriendRequestSummary[]>([]);
  readonly outgoingRequests = signal<FriendRequestSummary[]>([]);
  readonly groups = signal<GroupSummary[]>([]);

  readonly loading = signal(true);
  readonly actionLoading = signal<string | null>(null);
  readonly friendRequestError = signal<string | null>(null);
  readonly friendRequestSuccess = signal<string | null>(null);
  readonly friendsFeedback = signal<ActionFeedback>({ error: null, success: null });
  readonly requestsFeedback = signal<ActionFeedback>({ error: null, success: null });
  readonly groupsFeedback = signal<ActionFeedback>({ error: null, success: null });
  readonly createGroupFeedback = signal<ActionFeedback>({ error: null, success: null });

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
    this.friendsFeedback.set({ error: null, success: null });

    this.friendsService
      .apiFriendsGet()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response: ApiFriendsGet200Response) => {
          this.friends.set(response.friends);
          this.incomingRequests.set(response.incomingRequests);
          this.outgoingRequests.set(response.outgoingRequests);
          this.groups.set(response.groups);
        },
        error: (error) =>
          this.setFeedbackError(this.friendsFeedback, error, 'Unable to load your friends.'),
      });
  }

  sendFriendRequest(): void {
    if (this.friendRequestForm.invalid) {
      this.friendRequestForm.markAllAsTouched();
      return;
    }

    const username = this.friendRequestForm.controls.username.value.trim();
    const currentUsername = this.userState.user()?.username.trim();

    this.friendRequestError.set(null);
    this.friendRequestSuccess.set(null);

    if (currentUsername?.toLocaleLowerCase() === username.toLocaleLowerCase()) {
      this.friendRequestError.set(
        "You can't send a friend request to yourself. Enter another player's username.",
      );
      return;
    }

    if (this.actionLoading()) return;

    this.actionLoading.set('friend-request');
    this.friendsService
      .apiFriendsRequestPost({ username })
      .pipe(finalize(() => this.actionLoading.set(null)))
      .subscribe({
        next: () => {
          this.friendRequestForm.reset();
          this.friendRequestSuccess.set('Friend request sent.');
          this.sound.requestSent();
          this.loadDataAfterAction();
        },
        error: (error) => {
          this.friendRequestError.set(
            error?.error?.error ?? 'Unable to send the friend request. Please try again.',
          );
        },
      });
  }

  acceptRequest(id: string): void {
    this.runAction(
      `accept-${id}`,
      this.friendsService.apiFriendsRequestsIdAcceptPost(id),
      'Friend request accepted.',
      this.requestsFeedback,
      () => this.sound.accepted(),
    );
  }

  declineRequest(id: string): void {
    this.runAction(
      `decline-${id}`,
      this.friendsService.apiFriendsRequestsIdDeclinePost(id),
      'Friend request declined.',
      this.requestsFeedback,
    );
  }

  cancelRequest(id: string): void {
    this.runAction(
      `cancel-${id}`,
      this.friendsService.apiFriendsRequestsIdCancelPost(id),
      'Friend request cancelled.',
      this.requestsFeedback,
    );
  }

  removeFriend(id: string): void {
    this.runAction(
      `remove-friend-${id}`,
      this.friendsService.apiFriendsFriendIdDelete(id),
      'Friend removed.',
      this.friendsFeedback,
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
      this.createGroupFeedback,
      () => this.groupForm.reset(),
    );
  }

  addGroupMember(groupId: string, friendId: string): void {
    if (!friendId) return;

    this.runAction(
      `add-${groupId}-${friendId}`,
      this.friendsService.apiGroupsIdMembersPost(groupId, { friendId }),
      'Friend added to the group.',
      this.groupsFeedback,
    );
  }

  removeGroupMember(groupId: string, friendId: string): void {
    this.runAction(
      `remove-${groupId}-${friendId}`,
      this.friendsService.apiGroupsIdMembersFriendIdDelete(groupId, friendId),
      'Friend removed from the group.',
      this.groupsFeedback,
    );
  }

  deleteGroup(id: string): void {
    this.runAction(
      `delete-group-${id}`,
      this.friendsService.apiGroupsIdDelete(id),
      'Group deleted.',
      this.groupsFeedback,
    );
  }

  availableFriends(group: GroupSummary): FriendSummary[] {
    const memberIds = new Set(group.members.map((member) => member.id));

    return this.friends().filter((friend) => !memberIds.has(friend.id));
  }

  isActionLoading(key: string): boolean {
    return this.actionLoading() === key;
  }

  private runAction(
    key: string,
    request: Observable<unknown>,
    successMessage: string,
    feedback: WritableSignal<ActionFeedback>,
    onSuccess?: () => void,
  ): void {
    if (this.actionLoading()) return;

    this.actionLoading.set(key);
    feedback.set({ error: null, success: null });

    request.pipe(finalize(() => this.actionLoading.set(null))).subscribe({
      next: () => {
        onSuccess?.();
        feedback.set({ error: null, success: successMessage });
        this.loadDataAfterAction(feedback);
      },
      error: (error) => this.setFeedbackError(feedback, error, 'Unable to complete that action.'),
    });
  }

  private loadDataAfterAction(feedback?: WritableSignal<ActionFeedback>): void {
    this.friendsService.apiFriendsGet().subscribe({
      next: (response) => {
        this.friends.set(response.friends);
        this.incomingRequests.set(response.incomingRequests);
        this.outgoingRequests.set(response.outgoingRequests);
        this.groups.set(response.groups);
      },
      error: (error) => {
        if (feedback) this.setFeedbackError(feedback, error, 'Unable to refresh your friends.');
      },
    });
  }

  private setFeedbackError(
    feedback: WritableSignal<ActionFeedback>,
    error: any,
    fallback: string,
  ): void {
    feedback.set({ error: error?.error?.error ?? fallback, success: null });
  }
}
