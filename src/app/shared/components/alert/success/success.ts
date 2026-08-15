import { Component, input } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon';

@Component({
  selector: 'app-success-alert',
  imports: [IconComponent],
  templateUrl: './success.html',
  styleUrl: './success.css',
})
export class SuccessAlertComponent {
  inline = input(false);
}
