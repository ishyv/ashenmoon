import { Container, Graphics } from "pixi.js";
import { TIME_WEATHER_CONFIG } from "$lib/domain/weather/time-config";

interface RainDrop {
  x: number;
  y: number;
  length: number;
  speed: number;
}

interface RainSplash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export class RainEffectSystem {
  public readonly layer = new Container();
  private readonly g = new Graphics();
  private drops: RainDrop[] = [];
  private splashes: RainSplash[] = [];
  private intensity = 0; // 0..1 transition factor

  constructor() {
    this.layer.eventMode = "none";
    this.layer.addChild(this.g);
  }

  public tick(
    dt: number,
    isRaining: boolean,
    screen: { width: number; height: number }
  ): void {
    const { width: sw, height: sh } = screen;

    // Fade rain intensity in/out smoothly
    if (isRaining) {
      this.intensity = Math.min(1.0, this.intensity + dt * 0.4);
    } else {
      this.intensity = Math.max(0.0, this.intensity - dt * 0.5);
    }

    this.g.clear();

    if (this.intensity <= 0) {
      this.drops = [];
      this.splashes = [];
      return;
    }

    const targetDropCount = Math.floor(TIME_WEATHER_CONFIG.rainMaxParticles * this.intensity);

    // Initialize or adjust drops pool size
    while (this.drops.length < targetDropCount) {
      this.drops.push({
        x: Math.random() * sw,
        y: Math.random() * sh - sh, // Spawn above screen or scattered
        length: 12 + Math.random() * 16,
        speed: 0.85 + Math.random() * 0.3,
      });
    }
    if (this.drops.length > targetDropCount) {
      this.drops.length = targetDropCount;
    }

    const windX = TIME_WEATHER_CONFIG.rainWindStrength;
    const fallY = TIME_WEATHER_CONFIG.rainFallSpeed;

    // Update Rain Drops
    for (const drop of this.drops) {
      // Apply speeds scaled by dt
      const dx = windX * drop.speed * dt;
      const dy = fallY * drop.speed * dt;

      drop.x += dx;
      drop.y += dy;

      // Draw the raindrop streak line
      const streakLengthFraction = drop.length;
      const angle = Math.atan2(dy, dx);
      const endX = drop.x + Math.cos(angle) * streakLengthFraction;
      const endY = drop.y + Math.sin(angle) * streakLengthFraction;

      this.g.moveTo(drop.x, drop.y)
            .lineTo(endX, endY)
            .stroke({ color: 0x7aa7c7, width: 1.2, alpha: 0.45 * this.intensity });

      // Check boundary and wrap / trigger splash
      if (drop.y > sh || drop.x < -50 || drop.x > sw + 50) {
        // Trigger splash occasionally at the bottom bounds or randomly near the screen bottom
        if (Math.random() < 0.28 && drop.x > 0 && drop.x < sw) {
          this.splashes.push({
            x: drop.x,
            y: sh - Math.random() * 80, // splash in the lower portion of screen representing ground hits
            radius: 1,
            maxRadius: 4 + Math.random() * 5,
            alpha: 0.65,
          });
        }
        // Reset drop to top boundary
        drop.x = Math.random() * sw;
        drop.y = -drop.length - Math.random() * 40;
      }
    }

    // Update and Draw Splashes
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const splash = this.splashes[i]!;
      splash.radius += dt * 25;
      splash.alpha -= dt * 2.2;

      if (splash.alpha <= 0) {
        this.splashes.splice(i, 1);
        continue;
      }

      this.g.circle(splash.x, splash.y, splash.radius)
            .stroke({ color: 0x7aa7c7, width: 1.0, alpha: splash.alpha * this.intensity });
    }
  }
}
