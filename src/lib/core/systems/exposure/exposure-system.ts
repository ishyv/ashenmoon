import type { World } from "miniplex";
import type { Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { getAmbientEnvironment, TILE, type MapResource } from "$lib/core/systems/map/map";
import { getItemDef } from "$lib/domain/items";
import { learnAbout } from "$lib/state/rpg/knowledge.svelte";
import { learnRecipe } from "$lib/state/rpg/crafting.svelte";
import { spawnEnvFloatingText, spawnEnvParticles, type VFXResource } from "$lib/core/vfx/vfx";
import { Colors } from "$lib/utils/colors";
import { playSound } from "$lib/audio/audio-engine";
import { tickPlacedItemExposure } from "$lib/domain/exposure/placed-exposure";
import { EntityId } from "$lib/domain/game-events";
import { getCampfireHeatAt } from "$lib/core/systems/camp/campfire-runtime-system";

export function tickExposureSystem(
  ecsWorld: World<Entity>,
  map: MapResource,
  dt: number,
  vfx: VFXResource,
  entityLayer: Container,
): void {
  // Foundation pass: per-frame ticking is retained for behaviour compatibility.
  // Migration target: drive reactions from exposure intervals/events once item
  // placement, fire radius changes, and climate changes publish clear events.
  const pickups = ecsWorld.with("pickup", "position").entities;

  for (const entity of pickups) {
    const pickup = entity.pickup!;
    const pos = entity.position!;

    const def = getItemDef(pickup.itemId);
    if (!def) continue;

    const gx = Math.round(pos.x / TILE);
    const gy = Math.round(pos.y / TILE);
    const env = getAmbientEnvironment(map, gx, gy, 0);

    const radiantHeat = getCampfireHeatAt(ecsWorld, { x: pos.x + TILE / 2, y: pos.y + TILE / 2 });

    const ctx = {
      location: "ground" as const,
      ambientTemp: env.temperature,
      radiantHeat,
    };

    const state = {
      itemId: pickup.itemId,
      qty: pickup.qty,
      exposureTimeSec: pickup.exposureTimeSec ?? 0,
      hasWarned: pickup.hasWarned ?? false,
    };

    const res = tickPlacedItemExposure(state, ctx, dt);

    // Sync state back
    pickup.exposureTimeSec = res.next.exposureTimeSec;
    pickup.hasWarned = res.next.hasWarned;

    // Trigger feedback warning
    if (res.warning) {
      spawnEnvFloatingText(vfx, res.warning, Colors.ui.warning, pos, entityLayer);
      if (res.warning === "smoldering...") {
        spawnEnvParticles(vfx, Colors.vfx.smoke, 5, "smoke", pos, entityLayer);
      }
    }

    // Trigger transformation
    if (res.transformedItemId !== null) {
      if (res.transformedItemId.length > 0) {
        pickup.itemId = res.transformedItemId;
        const resultName = getItemDef(res.transformedItemId)?.name.toLowerCase() ?? res.transformedItemId;
        spawnEnvFloatingText(vfx, `transformed: ${resultName}`, Colors.ui.success, pos, entityLayer);
        playSound("craft");

        // Unlock memory
        if (res.learnedProperty) {
          learnAbout(def.id, res.learnedProperty);
        }
        if (res.transformedItemId === "charcoal") {
          learnRecipe("charcoal");
        }
      } else {
        // Destroyed (rotted away / ash residue)
        ecsWorld.remove(entity);
        spawnEnvFloatingText(vfx, "rotted away", Colors.ui.muted, pos, entityLayer);
      }
    }
  }
}

