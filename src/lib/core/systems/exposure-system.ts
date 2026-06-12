import { world } from "../ecs/ecs-miniplex";
import { getAmbientEnvironment, TILE } from "./map";
import { getItemDef } from "$lib/domain/items";
import { learnAbout } from "$lib/domain/knowledge.svelte";
import { learnRecipe } from "$lib/domain/crafting.svelte";
import { spawnEnvFloatingText, spawnEnvParticles } from "../vfx";
import { Colors } from "$lib/utils/colors";
import { playSound } from "$lib/audio/audio-engine";
import { tickPlacedItemExposure } from "$lib/domain/exposure/placed-exposure";
import { EntityId } from "$lib/domain/game-events";

export function tickExposureSystem(
  map: any,
  dt: number,
  vfx: any,
  entityLayer: any
): void {
  // Find campfire
  const campfire = world.with("position").entities.find((e) => e.id === EntityId.Campfire || e.station?.stationId === "campfire");
  
  // Find all pickups on the ground
  const pickups = world.with("pickup", "position").entities;

  for (const entity of pickups) {
    const pickup = entity.pickup!;
    const pos = entity.position!;

    const def = getItemDef(pickup.itemId);
    if (!def) continue;

    // Get climate environment
    const gx = Math.round(pos.x / TILE);
    const gy = Math.round(pos.y / TILE);
    const env = getAmbientEnvironment(map, gx, gy, 0);

    // Campfire proximity check
    let nearFire = false;
    if (campfire?.position) {
      const dx = (campfire.position.x - pos.x) / TILE;
      const dy = (campfire.position.y - pos.y) / TILE;
      if (Math.hypot(dx, dy) <= 3.0) {
        nearFire = true;
      }
    }

    const ctx = {
      location: "ground" as const,
      ambientTemp: env.temperature,
      nearFire,
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
        world.remove(entity);
        spawnEnvFloatingText(vfx, "rotted away", Colors.ui.muted, pos, entityLayer);
      }
    }
  }
}
