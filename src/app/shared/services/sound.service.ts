import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

type Tone = readonly [frequency: number, delay: number, duration: number];

@Injectable({ providedIn: 'root' })
export class SoundService {
  private readonly platformId = inject(PLATFORM_ID);
  private context?: AudioContext;

  notification(): void {
    this.play([
      [660, 0, 0.09],
      [880, 0.1, 0.14],
    ]);
  }

  joined(): void {
    this.play([
      [440, 0, 0.07],
      [550, 0.07, 0.07],
    ]);
  }

  gameStarted(): void {
    this.play([
      [392, 0, 0.08],
      [523, 0.08, 0.08],
      [659, 0.16, 0.16],
    ]);
  }

  score(): void {
    this.play([
      [523, 0, 0.08],
      [659, 0.08, 0.08],
      [784, 0.16, 0.16],
    ]);
  }

  incorrect(): void {
    this.play([
      [220, 0, 0.1],
      [185, 0.1, 0.14],
    ]);
  }

  complete(): void {
    this.play([
      [523, 0, 0.1],
      [659, 0.1, 0.1],
      [784, 0.2, 0.1],
      [1047, 0.3, 0.25],
    ]);
  }

  roundComplete(): void {
    this.play([
      [659, 0, 0.09],
      [880, 0.1, 0.18],
    ]);
  }

  rated(): void {
    this.play([
      [784, 0, 0.07],
      [988, 0.08, 0.14],
    ]);
  }

  accepted(): void {
    this.play([
      [523, 0, 0.08],
      [659, 0.08, 0.08],
      [880, 0.16, 0.18],
    ]);
  }

  declined(): void {
    this.play([
      [392, 0, 0.08],
      [330, 0.08, 0.12],
    ]);
  }

  requestSent(): void {
    this.play([
      [587, 0, 0.07],
      [784, 0.08, 0.14],
    ]);
  }

  victory(): void {
    this.play([
      [523, 0, 0.09],
      [659, 0.09, 0.09],
      [784, 0.18, 0.09],
      [1047, 0.27, 0.18],
      [1319, 0.46, 0.3],
    ]);
  }

  timeout(): void {
    this.play([
      [330, 0, 0.14],
      [262, 0.14, 0.22],
    ]);
  }

  countdown(): void {
    this.play([[880, 0, 0.08]]);
  }

  private play(tones: readonly Tone[]): void {
    const context = this.audioContext();
    if (!context) return;

    void context
      .resume()
      .then(() => {
        const start = context.currentTime;

        for (const [frequency, delay, duration] of tones) {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          const toneStart = start + delay;
          const toneEnd = toneStart + duration;

          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(frequency, toneStart);
          gain.gain.setValueAtTime(0.0001, toneStart);
          gain.gain.exponentialRampToValueAtTime(0.08, toneStart + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, toneEnd);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start(toneStart);
          oscillator.stop(toneEnd);
        }
      })
      .catch(() => undefined);
  }

  private audioContext(): AudioContext | undefined {
    if (!isPlatformBrowser(this.platformId)) return undefined;

    this.context ??= new AudioContext();
    return this.context;
  }
}
