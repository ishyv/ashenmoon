import { Container, Graphics } from "pixi.js";

interface FogWisp {
  g: Graphics;
  vx: number;
  vy: number;
  baseAlpha: number;
  radius: number;
}

const WISP_COUNT = 28;
const WORLD_W = 100 * 64;
const WORLD_H = 100 * 64;

export class FogSystem {
  public readonly layer = new Container();
  private wisps: FogWisp[] = [];

  init(): void {
    this.layer.eventMode = "none";
    for (let i = 0; i < WISP_COUNT; i++) {
      const radius = 80 + Math.random() * 140;
      const g = new Graphics();
      const alpha = 0.04 + Math.random() * 0.06;
      g.ellipse(0, 0, radius, radius * 0.45).fill({ color: 0xd4dce8, alpha });
      g.x = Math.random() * WORLD_W;
      g.y = Math.random() * WORLD_H;
      this.layer.addChild(g);

      const angle = Math.random() * Math.PI * 2;
      const speed = 6 + Math.random() * 10;
      this.wisps.push({
        g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.3,
        baseAlpha: alpha,
        radius,
      });
    }
  }

  tick(
    dt: number,
    timeOfDay: number,
    isRaining: boolean,
    campfirePositions: { x: number; y: number; heatRadius: number }[],
  ): void {
    // Opacity envelope
    let envelope = 0.35;
    const isDawnDusk =
      (timeOfDay >= 0.15 && timeOfDay <= 0.25) ||
      (timeOfDay >= 0.65 && timeOfDay <= 0.75);
    const isNight = timeOfDay > 0.75 || timeOfDay < 0.18;
    if (isDawnDusk) envelope += 0.25;
    else if (isNight) envelope += 0.15;
    if (isRaining) envelope += 0.20;
    envelope = Math.min(1, envelope);

    for (const wisp of this.wisps) {
      wisp.g.x = (wisp.g.x + wisp.vx * dt + WORLD_W) % WORLD_W;
      wisp.g.y = (wisp.g.y + wisp.vy * dt + WORLD_H) % WORLD_H;

      // Reduce alpha near any lit campfire
      let fireReduce = 0;
      for (const cf of campfirePositions) {
        const dx = wisp.g.x - cf.x;
        const dy = wisp.g.y - cf.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radiusPx = cf.heatRadius * 64;
        if (dist < radiusPx) {
          fireReduce = Math.max(fireReduce, 0.6 * (1 - dist / radiusPx));
        }
      }

      wisp.g.alpha = wisp.baseAlpha * envelope * (1 - fireReduce);
    }
  }
}
