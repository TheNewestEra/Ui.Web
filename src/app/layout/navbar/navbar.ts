import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ButtonComponent } from '@shared/components/button/button';
import { IconComponent } from '@shared/ui/icon/icon';
import { AppTheme, ThemeService } from '@shared/services/theme.service';
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
  private readonly document = inject(DOCUMENT);
  readonly themeService = inject(ThemeService);

  readonly themeOptions: ReadonlyArray<{ label: string; value: AppTheme; icon: string }> = [
    { label: 'Light', value: 'light', icon: 'sun' },
    { label: 'Dark', value: 'dark', icon: 'moon' },
    { label: 'Forest', value: 'forest', icon: 'trees' },
  ];

  readonly themeIcon = computed(() => {
    switch (this.themeService.theme()) {
      case 'dark':
        return 'moon';
      case 'forest':
        return 'trees';
      case 'light':
      default:
        return 'sun';
    }
  });

  selectTheme(theme: AppTheme): void {
    this.themeService.setTheme(theme);
    (this.document.activeElement as HTMLElement | null)?.blur();
  }
}
