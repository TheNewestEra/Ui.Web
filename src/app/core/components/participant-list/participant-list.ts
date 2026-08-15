import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface ParticipantListEntry {
  id: string;
  name: string;
  color: string;
}

@Component({
  selector: 'app-participant-list',
  standalone: true,
  templateUrl: './participant-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticipantListComponent {
  readonly participants = input.required<ParticipantListEntry[]>();
  readonly currentId = input<string | null>(null);
  readonly currentName = input<string | null>(null);
  readonly heading = input('Participants');
  readonly variant = input<'chips' | 'list'>('list');
  readonly activity = input<Readonly<Record<string, string>>>({});

  isCurrent(participant: ParticipantListEntry): boolean {
    return participant.id === this.currentId() || participant.name === this.currentName();
  }
}
