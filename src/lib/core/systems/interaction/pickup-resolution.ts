export interface PickupTargetSnapshot {
  pickup?: {
    itemId: string;
    qty: number;
    gatherableId?: string;
  };
  resource?: {
    drop: string;
    gatherableId?: string;
  };
}

export interface PickupResolution {
  itemId: string | null;
  qty: number;
  gatherableId: string | null;
}

/**
 * Resolves the item fact advertised by a pickup-style target.
 *
 * Runtime systems own persistence, feedback, hazards, and depletion. This
 * helper only answers which item stack the interaction should attempt to grant.
 */
export function resolvePickupTarget(target: PickupTargetSnapshot): PickupResolution {
  const itemId = target.pickup?.itemId ?? target.resource?.drop ?? null;
  const qty = target.pickup ? target.pickup.qty : 1;
  const gatherableId = target.pickup?.gatherableId ?? target.resource?.gatherableId ?? null;

  return { itemId, qty, gatherableId };
}
