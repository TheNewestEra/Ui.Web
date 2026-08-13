import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon';
import { ThemeService } from '@shared/services/theme.service';
import { ButtonComponent } from '@shared/components/button/button';
import { NotificationCenterComponent } from '@core/components/notification-center/notification-center';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [IconComponent, ButtonComponent, NotificationCenterComponent],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  themeIcon = computed(() => {
    switch (this.themeService.theme()) {
      case 'light':
        return 'moon';

      case 'dark':
        return 'trees';

      case 'forest':
        return 'sun';
    }
  });
  constructor(public themeService: ThemeService) {}
}
