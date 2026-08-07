import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon';
import { ThemeService, Theme } from '@shared/services/theme.service';
import { ButtonComponent } from '@shared/components/button/button';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [IconComponent, ButtonComponent],
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
