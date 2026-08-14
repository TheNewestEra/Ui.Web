// Most of the wire shapes for `apps/notifications` come straight from the
// generated `@thenewestera/notifications-ng` client — including
// `NotificationWsMessage`/`NotificationWsPong`, which that service
// registers on its OpenAPI spec even though the WebSocket upgrade route
// itself isn't representable there (see that package's own doc comments).
// What's left here is purely app-specific: the union of what can actually
// arrive over the socket, and the `data` shape this app knows how to
// render specially for one particular notification `type`.
import type { InviteSummary } from '@thenewestera/friends-ng';
import type { NotificationWsMessage, NotificationWsPong } from '@thenewestera/notifications-ng';

export type { NotificationWsMessageNotification as PushableNotification } from '@thenewestera/notifications-ng';

export type NotificationSocketMessage = NotificationWsMessage | NotificationWsPong;

export const NotificationType = {
  FriendRequest: 'friend_request',
  Invite: 'invite',
} as const;

export interface FriendRequestNotificationData {
  requestId: string;
  username: string;
  color: string;
}

export function describeInvite(invite: InviteSummary): { title: string; body: string } {
  const gameLabel = invite.kind === 'guess' ? 'Guess the Prompt' : 'Piece Puzzle';
  return {
    title: 'Game invite',
    body: `${invite.inviterUsername} invited you to play ${gameLabel}.`,
  };
}
