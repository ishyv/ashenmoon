import { json } from "@sveltejs/kit";
import { getBridge, hasBridge } from "$lib/server/bridge";
import { offlinePlayerState } from "$lib/server/offline-store";
import type { RequestHandler } from "./$types";

/** POST /api/rpg/equip — equips a tool from the player's inventory stack. */
export const POST: RequestHandler = async ({ request, locals }) => {
  const userId = locals.session?.userId ?? "mock_user";
  try {
    const { itemId } = await request.json();

    if (!hasBridge()) {
      if (!itemId) {
        offlinePlayerState.profile.loadout.weapon = null;
      } else {
        const slots = offlinePlayerState.inventory.slots;
        const exists = slots[itemId] && ("qty" in slots[itemId] ? (slots[itemId] as any).qty > 0 : true);
        if (!exists) {
          return json({ error: "Item not in inventory" }, { status: 400 });
        }
        offlinePlayerState.profile.loadout.weapon = {
          instanceId: `offline_${itemId}_${Date.now()}`,
          itemId,
          durability: 100,
        };
      }
      return json(offlinePlayerState);
    }

    const bridge = getBridge();
    const result = await bridge.rpgEquipTool(userId, itemId);
    if (result.isErr()) {
      return json({ error: result.error.message }, { status: 400 });
    }
    return json(result.unwrap());
  } catch (err) {
    return json({ error: String(err) }, { status: 500 });
  }
};
