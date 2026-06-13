import { gameState } from "$lib/state/game-state.svelte";
import { cooldownsState } from "$lib/state/runtime-ui-state.svelte";
import type { MovementConfig, MovementResource } from "$lib/core/systems/movement/movement";
import type { FocusedGatherResource } from "$lib/core/systems/focused-gather/focused-gather-system";
import type { CombatResource } from "$lib/core/systems/combat/combat";

/**
 * Syncs engine-side cooldowns and resource states to the reactive Svelte layer.
 * This keeps the HUD progress bars updated without the UI needing to poll the engine.
 */
export function syncHudCooldownsSystem(
  movement: MovementResource,
  movementConfig: MovementConfig,
  focusedGather: FocusedGatherResource,
  combat: CombatResource,
): void {
  // 1. Evade Cooldown
  const evadeLevel = gameState.rpg.skills?.evade?.level ?? 1;
  const maxEvadeCd = Math.max(0.5, movementConfig.dashCooldown - (evadeLevel - 1) * 0.05);
  cooldownsState.evade = Math.max(0, movement.dashCooldownTimer);
  cooldownsState.evadeMax = maxEvadeCd;

  // 2. Focused Gather Cooldown
  cooldownsState.focusedGather = Math.max(0, focusedGather.cooldownSec);
  cooldownsState.focusedGatherMax = focusedGather.cooldownMaxSec;

  // 3. Fell Sweep Cooldown & Charge
  const fsLevel = gameState.rpg.skills?.fellSweep?.level ?? 1;
  const maxFsCd = Math.max(4.0, 8.0 - (fsLevel - 1) * 0.4);
  cooldownsState.fellSweep = Math.max(0, combat.fellSweepCooldownTimer);
  cooldownsState.fellSweepMax = maxFsCd;
  cooldownsState.fellSweepCharge = combat.fellSweepChargeState.chargeProgress;

  // 4. Driving Thrust Cooldown
  cooldownsState.drivingThrust = Math.max(0, combat.drivingThrustCooldownTimer);
  cooldownsState.drivingThrustMax = combat.drivingThrustConfig.cooldownMs / 1000;
}
