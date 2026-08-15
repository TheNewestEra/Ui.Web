import { Component, input } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon';

@Component({
  selector: 'app-error-alert',
  imports: [IconComponent],
  templateUrl: './error.html',
  styleUrl: './error.css',
})
export class ErrorAlertComponent {
  inline = input(false);
}
