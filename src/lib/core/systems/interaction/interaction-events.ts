import type { GameEventQueue } from "$lib/domain/game-event-queue";

export interface PickupInteractionEventInput {
  queue?: GameEventQueue | undefined;
  actorId: string;
  targetId: string;
  itemId: string;
  qty: number;
}

export function enqueuePickupInteractionEvents(input: PickupInteractionEventInput): void {
  const { queue } = input;
  if (!queue) return;

  queue.push({
    type: "item_gained",
    actorId: input.actorId,
    itemId: input.itemId,
    qty: input.qty,
    source: input.targetId,
  });
  queue.push({
    type: "interaction_completed",
    actorId: input.actorId,
    targetId: input.targetId,
    actionId: "pickup",
  });
}

export interface StationProcessCompletedEventInput {
  queue?: GameEventQueue | undefined;
  actorId: string;
  targetId: string;
  processId: string;
  outputItemId: string;
  outputQty: number;
}

export function enqueueStationProcessCompletedEvents(input: StationProcessCompletedEventInput): void {
  const { queue } = input;
  if (!queue) return;

  queue.push({
    type: "item_gained",
    actorId: input.actorId,
    itemId: input.outputItemId,
    qty: input.outputQty,
    source: input.processId,
  });
  queue.push({
    type: "interaction_completed",
    actorId: input.actorId,
    targetId: input.targetId,
    actionId: "process",
  });
}

export interface WorldActionCompletedEventInput {
  queue?: GameEventQueue | undefined;
  actorId: string;
  targetId: string;
  actionId: string;
}

export function enqueueWorldActionCompletedEvent(input: WorldActionCompletedEventInput): void {
  const { queue } = input;
  if (!queue) return;

  queue.push({
    type: "world_action_completed",
    actorId: input.actorId,
    targetId: input.targetId,
    actionId: input.actionId,
  });
}
