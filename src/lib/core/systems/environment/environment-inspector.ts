/**
 * On-canvas environment signal inspector — debug tool.
 *
 * Renders a small Pixi text panel that follows the cursor (in world space) and
 * shows the EnvironmentSample at the hovered tile plus the nearest contributing
 * emitters. Toggle with the assigned key (engine registers the keybinding).
 *
 * This is a debug surface: it lives on the HUD layer (screen-space container),
 * not the entity layer, so it doesn't scroll with the world.
 */

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE } from "$lib/core/systems/map/map";
import { getItemDef } from "$lib/domain/items";
import { reactionsFor } from "$lib/domain/exposure/placed-reactions";
import { sampleEnvironmentAt } from "$lib/core/systems/environment/environment-signal-system";
import type { WeatherResource } from "$lib/core/systems/weather/weather-system";

const PANEL_W = 200;
const PANEL_PAD = 8;
const LINE_H = 14;
const FONT_SIZE = 11;
const OFFSET_X = 14;
const OFFSET_Y = 14;

const labelStyle = new TextStyle({
  fontFamily: "monospace",
  fontSize: FONT_SIZE,
  fill: 0xd4c9a8,
});

const dimStyle = new TextStyle({
  fontFamily: "monospace",
  fontSize: FONT_SIZE - 1,
  fill: 0x8a7f6c,
});

export class EnvironmentInspector {
  public enabled = false;

  private container: Container;
  private bg: Graphics;
  private lines: Text[] = [];

  constructor(parent: Container) {
    this.container = new Container();
    this.container.visible = false;
    this.container.zIndex = 9999;

    this.bg = new Graphics();
    this.container.addChild(this.bg);

    // Pre-allocate text nodes; we reuse them each frame
    for (let i = 0; i < 18; i++) {
      const t = new Text({ text: "", style: i < 5 ? labelStyle : dimStyle });
      t.x = PANEL_PAD;
      t.y = PANEL_PAD + i * LINE_H;
      this.container.addChild(t);
      this.lines.push(t);
    }

    parent.addChild(this.container);
  }

  toggle(): void {
    this.enabled = !this.enabled;
    if (!this.enabled) this.container.visible = false;
  }

  tick(
    world: World<Entity>,
    weather: WeatherResource,
    cursorWorld: { x: number; y: number },
    cursorScreen: { x: number; y: number },
  ): void {
    if (!this.enabled) return;

    const gx = Math.floor(cursorWorld.x / TILE);
    const gy = Math.floor(cursorWorld.y / TILE);
    const point = { x: gx * TILE + TILE / 2, y: gy * TILE + TILE / 2 };
    const s = sampleEnvironmentAt(world, weather, point);

    // Panel lives on app.stage (canvas/screen space); use screen coords directly.
    this.container.x = cursorScreen.x + OFFSET_X;
    this.container.y = cursorScreen.y + OFFSET_Y;

    // Collect nearby emitter sources for display
    const sources: { signal: string; id: string; dist: number }[] = [];
    for (const entity of world.with("emitter", "position").entities) {
      const ex = entity.position!.x + TILE / 2;
      const ey = entity.position!.y + TILE / 2;
      const dist = Math.hypot(point.x - ex, point.y - ey);
      for (const em of entity.emitter ?? []) {
        if (dist < em.radiusPx) {
          sources.push({ signal: em.signal, id: entity.id, dist });
        }
      }
    }
    sources.sort((a, b) => a.dist - b.dist);

    // Reactions of the nearest placed item on the hovered tile, if any.
    const itemLines = this.hoveredItemLines(world, gx, gy, point);

    // Fill text nodes
    const content = [
      `(${gx},${gy})`,
      `heat    ${s.heat.toFixed(0)}c`,
      `light   ${s.light.toFixed(2)}`,
      `shelter ${s.shelter.toFixed(2)}`,
      `wetness ${s.wetness.toFixed(2)}`,
      ...(sources.length > 0 ? ["---"] : []),
      ...sources.slice(0, 4).map(
        ({ signal, id, dist }) => `${signal} ${id.slice(0, 8)} ${(dist / TILE).toFixed(1)}t`,
      ),
      ...itemLines,
    ];

    const usedLines = Math.min(content.length, this.lines.length);
    for (let i = 0; i < this.lines.length; i++) {
      this.lines[i]!.text = i < usedLines ? (content[i] ?? "") : "";
    }

    // Resize background
    const panelH = PANEL_PAD * 2 + usedLines * LINE_H;
    this.bg.clear();
    this.bg
      .roundRect(0, 0, PANEL_W, panelH, 3)
      .fill({ color: 0x0c0c0c, alpha: 0.82 })
      .stroke({ color: 0x3a3028, width: 1, alpha: 0.9 });

    this.container.visible = true;
  }

  /**
   * Lines describing the nearest placed item on the hovered tile and its
   * reaction progress (e.g. `cook 3.1/8.0s`), or an empty list if none.
   */
  private hoveredItemLines(
    world: World<Entity>,
    gx: number,
    gy: number,
    point: { x: number; y: number },
  ): string[] {
    let nearest: Entity | undefined;
    let nearestDist = Infinity;
    for (const entity of world.with("pickup", "position").entities) {
      const pos = entity.position!;
      if (Math.round(pos.x / TILE) !== gx || Math.round(pos.y / TILE) !== gy) continue;
      const dist = Math.hypot(point.x - (pos.x + TILE / 2), point.y - (pos.y + TILE / 2));
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = entity;
      }
    }
    if (!nearest) return [];

    const pickup = nearest.pickup!;
    const def = getItemDef(pickup.itemId);
    if (!def) return [];

    const reactions = reactionsFor(def);
    if (reactions.length === 0) return [`--- ${def.name.toLowerCase()} ---`];

    const progress = pickup.reactions ?? {};
    return [
      `--- ${def.name.toLowerCase()} ---`,
      ...reactions.map(
        (r) => `${r.id} ${(progress[r.id] ?? 0).toFixed(1)}/${r.thresholdSec.toFixed(1)}s`,
      ),
    ];
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
