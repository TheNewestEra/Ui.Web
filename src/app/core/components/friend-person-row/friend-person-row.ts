import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-friend-person-row',
  standalone: true,
  templateUrl: './friend-person-row.html',
  styleUrl: './friend-person-row.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FriendPersonRowComponent {
  name = input.required<string>();
  color = input.required<string>();
  subtitle = input<string>();
}
