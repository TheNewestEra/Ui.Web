import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonComponent } from '@shared/components/button/button';
import { ToastService } from '@shared/services/toast.service';
import { InviteToastService } from '@core/services/invite-toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './toast.html',
  styleUrl: './toast.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);

  private readonly inviteToastService = inject(InviteToastService);
}
