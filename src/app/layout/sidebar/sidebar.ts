import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UserStateService } from '@core/services/user-state.service';
import { IconComponent } from '@shared/ui/icon/icon';

export interface SidebarItem {
  label: string;
  icon: string;
  route: string;
  requiresAuth?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  title = input('Escape AI');

  items = input<SidebarItem[]>([]);

  readonly userState = inject(UserStateService);

  readonly visibleItems = computed(() => {
    const loggedIn = this.userState.isLoggedIn();

    return this.items().filter((item) => !item.requiresAuth || loggedIn);
  });
}
