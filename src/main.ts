import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig).catch(() => {
  const message = document.createElement('div');
  message.setAttribute('role', 'alert');
  message.className = 'm-6 rounded-box bg-error/10 p-6 text-error';
  message.textContent = 'The application could not start. Please refresh the page and try again.';
  document.body.replaceChildren(message);
});
