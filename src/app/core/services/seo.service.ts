import { Injectable, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

const SITE_NAME = 'The Newest Era';
const SITE_URL = 'https://era.ryanb.co.za';
const DEFAULT_DESCRIPTION =
  'Play free multiplayer, AI-generated party games with friends. Guess the hidden prompt behind an AI image or race to rebuild a shuffled puzzle.';
const DEFAULT_IMAGE = `${SITE_URL}/favicon.webp`;

export interface RouteSeoData {
  /** Meta description for this route. Falls back to the site default when omitted. */
  description?: string;
  /** Set true to mark the route noindex (session-specific or private pages). */
  noindex?: boolean;
}

/**
 * Keeps the document description, canonical URL, and Open Graph/Twitter tags in
 * sync with the active route. Route `title` is handled separately by Angular's
 * built-in router title strategy from each route's `title` property.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly meta = inject(Meta);

  init(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => this.deepestRouteSnapshot(this.activatedRoute.snapshot.root)),
      )
      .subscribe((snapshot) => this.applySeo(snapshot));

    this.applySeo(this.deepestRouteSnapshot(this.activatedRoute.snapshot.root));
  }

  private deepestRouteSnapshot(snapshot: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
    let current = snapshot;
    while (current.firstChild) {
      current = current.firstChild;
    }
    return current;
  }

  private applySeo(snapshot: ActivatedRouteSnapshot): void {
    const data = snapshot.data as RouteSeoData;
    const description = data.description ?? DEFAULT_DESCRIPTION;
    const title = snapshot.title ?? SITE_NAME;
    const url = `${SITE_URL}${this.router.url.split('?')[0]}`;

    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({
      name: 'robots',
      content: data.noindex ? 'noindex, nofollow' : 'index, follow',
    });

    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: DEFAULT_IMAGE });

    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: DEFAULT_IMAGE });

    this.updateCanonical(url);
  }

  private updateCanonical(url: string): void {
    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
