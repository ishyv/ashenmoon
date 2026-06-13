/**
 * Draws the Focused Gathering target marks onto the world layer. Readability is
 * the whole point of this minigame, so each mark is a high-contrast sigil: a
 * dark halo + dark core that reads over busy terrain, a bright rim, the next
 * target pulsing with a shrinking timer arc, and queued targets numbered so the
 * player can read the order. Rendered above sprites and floating text via a
 * very high zIndex (the layer is sortable).
 *
 * Positions come from `targetCurrentPosition`, the same function the hit-test
 * uses, so the mark you click is the mark you see.
 */

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Colors } from "$lib/utils/colors";
import {
  expectedTarget,
  targetCurrentPosition,
  targetCurrentRadius,
} from "$lib/domain/gathering/focused-gather/focused-gather-session";
import type { FocusedGatherResource, FocusedTargetSprite } from "./focused-gather-system";

// Above sprites (y-sorted, ~thousands) and floating text (100_000); below the
// collision debug overlay (120_000).
const FOCUS_TARGET_Z = 110_000;

const LABEL_STYLE = new TextStyle({
  fontFamily: ["monospace", "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "sans-serif"],
  fontSize: 13,
  fontWeight: "bold",
  fill: Colors.ui.white,
  stroke: { color: Colors.ui.stroke, width: 3 },
});

function createSprite(entityLayer: Container): FocusedTargetSprite {
  const container = new Container();
  container.zIndex = FOCUS_TARGET_Z;
  const ring = new Graphics();
  const label = new Text({ text: "", style: LABEL_STYLE });
  label.anchor.set(0.5, 0.5);
  container.addChild(ring);
  container.addChild(label);
  entityLayer.addChild(container);
  return { container, ring, label };
}

export function renderFocusedGatherSystem(
  focused: FocusedGatherResource,
  entityLayer: Container,
): void {
  const session = focused.session;
  if (session === null) return;

  const now = performance.now();
  const elapsed = now - session.startedAtMs;
  const expected = expectedTarget(session);

  for (const target of session.targets) {
    let sprite = focused.sprites.get(target.id);
    if (!sprite) {
      sprite = createSprite(entityLayer);
      focused.sprites.set(target.id, sprite);
    }
    const { container, ring, label } = sprite;

    // Hidden before it spawns and once it has resolved as a hit.
    if (target.state === "pending" || target.state === "hit") {
      container.visible = false;
      continue;
    }
    container.visible = true;

    const pos = targetCurrentPosition(target, session, now);
    const radius = targetCurrentRadius(target, session, now);
    container.x = pos.x;
    container.y = pos.y;
    ring.clear();
    label.visible = false;

    if (target.state === "missed") {
      ring.circle(0, 0, radius).stroke({ color: Colors.ui.error, width: 2, alpha: 0.3 });
      continue;
    }

    const isExpected = expected !== null && expected.id === target.id;
    const pulse = 0.5 + 0.5 * Math.sin(now / 180 + target.orderIndex);

    // Dark contrast halo + dark core: keeps the mark legible over any terrain.
    ring.circle(0, 0, radius + (isExpected ? 7 : 5)).stroke({
      color: Colors.ui.stroke,
      width: isExpected ? 6 : 4,
      alpha: isExpected ? 0.5 : 0.45,
    });
    ring.circle(0, 0, radius * 0.8).fill({ color: Colors.ui.stroke, alpha: isExpected ? 0.4 : 0.35 });

    if (isExpected) {
      // Bright pulsing rim + crisp inner ring + center dot.
      ring.circle(0, 0, radius + 2).stroke({
        color: Colors.vfx.focusedGather,
        width: 2,
        alpha: 0.5 + 0.4 * pulse,
      });
      ring.circle(0, 0, radius).stroke({ color: Colors.ui.white, width: 3, alpha: 1 });
      ring.circle(0, 0, 2.5 + pulse * 1.5).fill({ color: Colors.vfx.focusedGather, alpha: 0.95 });

      // Shrinking timer arc just outside the ring.
      const lifetime = Math.max(1, target.expiresAtMs - target.spawnAtMs);
      const progress = Math.max(0, (target.expiresAtMs - elapsed) / lifetime);
      if (progress > 0.01) {
        const start = -Math.PI / 2;
        ring.arc(0, 0, radius + 5, start, start + progress * Math.PI * 2);
        ring.stroke({ color: Colors.vfx.focusedGather, width: 3.5, alpha: 0.95 });
      }
    } else {
      // Queued target: dimmer ring, numbered so the order reads at a glance.
      ring.circle(0, 0, radius).stroke({ color: Colors.vfx.focusedGather, width: 2, alpha: 0.6 });
      label.text = String(target.orderIndex + 1);
      label.visible = true;
    }
  }
}
