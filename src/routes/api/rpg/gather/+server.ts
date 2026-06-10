import { json } from "@sveltejs/kit";
import { getBridge, hasBridge } from "$lib/server/bridge";
import { offlinePlayerState } from "$lib/server/offline-store";
import type { RequestHandler } from "./$types";

/** POST /api/rpg/gather — triggers a gathering tick (reducing node durability, adding items to stash). */
export const POST: RequestHandler = async ({ request, locals }) => {
  const userId = locals.session?.userId ?? "mock_user";
  try {
    const body = await request.json();
    const { action, locationId, pickupId } = body;
    if (!action || !locationId) {
      return json({ error: "Missing action or locationId parameter" }, { status: 400 });
    }
    if (action !== "mine" && action !== "forest" && action !== "pickup" && action !== "refuel") {
      return json({ error: "Invalid action. Must be 'mine', 'forest', 'pickup', or 'refuel'" }, { status: 400 });
    }

    // Offline dev mode: bridge not running, return a plausible local gather result.
    if (!hasBridge()) {
      if (action === "pickup") {
        const drop = locationId; // e.g. "oak_wood" or "stone"
        const slots = { ...offlinePlayerState.inventory.slots };
        const existing = slots[drop];
        const currentQty = existing && "qty" in existing ? existing.qty : 0;
        slots[drop] = { qty: currentQty + 1 };
        
        offlinePlayerState.inventory = { slots };

        if (pickupId) {
          if (!offlinePlayerState.profile.gatheredPickups) {
            offlinePlayerState.profile.gatheredPickups = [];
          }
          if (!offlinePlayerState.profile.gatheredPickups.includes(pickupId)) {
            offlinePlayerState.profile.gatheredPickups = [
              ...offlinePlayerState.profile.gatheredPickups,
              pickupId,
            ];
          }
        }

        return json({
          materialsGained: [{ id: drop, quantity: 1 }],
          toolBroken: false,
          playerState: offlinePlayerState,
        });
      }

      if (action === "refuel") {
        const slots = { ...offlinePlayerState.inventory.slots };
        const woodQty = slots.oak_wood && "qty" in slots.oak_wood ? slots.oak_wood.qty : 0;
        if (woodQty >= 5) {
          const newWood = woodQty - 5;
          if (newWood <= 0) {
            delete slots.oak_wood;
          } else {
            slots.oak_wood = { qty: newWood };
          }
        }
        offlinePlayerState.inventory = { slots };

        return json({
          materialsGained: [],
          toolBroken: false,
          playerState: offlinePlayerState,
        });
      }

      const drop = action === "forest" ? "oak_wood" : "stone";
      
      const slots = { ...offlinePlayerState.inventory.slots };
      const existing = slots[drop];
      const currentQty = existing && "qty" in existing ? existing.qty : 0;
      slots[drop] = { qty: currentQty + 1 };
      
      offlinePlayerState.inventory = { slots };

      let toolBroken = false;
      const weapon = offlinePlayerState.profile.loadout.weapon;
      if (weapon && typeof weapon === "object" && "durability" in weapon) {
        const newDurability = weapon.durability - 5;
        if (newDurability <= 0) {
          toolBroken = true;
          offlinePlayerState.profile = {
            ...offlinePlayerState.profile,
            loadout: {
              ...offlinePlayerState.profile.loadout,
              weapon: null
            }
          };
        } else {
          offlinePlayerState.profile = {
            ...offlinePlayerState.profile,
            loadout: {
              ...offlinePlayerState.profile.loadout,
              weapon: {
                ...weapon,
                durability: newDurability
              }
            }
          };
        }
      }

      return json({
        materialsGained: [{ id: drop, quantity: 1 }],
        toolBroken,
        playerState: offlinePlayerState,
      });
    }

    const result = await getBridge().rpgGather(userId, action, locationId);
    if (result.isErr()) {
      return json({ error: result.error.message }, { status: 400 });
    }
    return json(result.unwrap());
  } catch (err) {
    return json({ error: String(err) }, { status: 500 });
  }
};
