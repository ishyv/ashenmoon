# Entity and AI Guidelines

Enemies and NPCs should be built from reusable behavior pieces whenever possible.

## AI Philosophy

Avoid building a completely unique AI model for every enemy.

Prefer AI made from reusable capabilities:

- perception;
- target selection;
- movement;
- attack behavior;
- flee behavior;
- idle/wander behavior;
- faction rules;
- cooldowns;
- reactions;
- loot/drop behavior.

Different enemies should often be different configurations of shared logic.

## Example

A zombie-like enemy may use:

```text
Components:
  Health
  Damageable
  Movement
  AggroSensor
  TargetMemory
  MeleeAttack
  LootTable
  Faction

Systems:
  PerceptionSystem
  TargetingSystem
  MovementSystem
  CombatSystem
  LootSystem
  FeedbackSystem
```

A skeleton-like enemy may reuse most of that, but swap `MeleeAttack` for `RangedAttack`.

That is the point. Reuse the behavior model instead of cloning a whole enemy brain.

## AI Component Candidates

Useful reusable components:

- `AggroSensor`
- `TargetMemory`
- `PatrolPath`
- `WanderBehavior`
- `MeleeAttack`
- `RangedAttack`
- `FleeAtLowHealth`
- `Faction`
- `ThreatTable`
- `Cooldowns`
- `StunState`
- `KnockbackState`
- `LootTable`

Names can change. The concept matters more than the spelling.

## Combat Feedback

When an enemy is hit, the player should know.

Consider:

- hit flash;
- hurt animation;
- knockback;
- sound;
- damage number;
- health bar update;
- stagger/stun if relevant;
- death animation/VFX/SFX.

## Enemy Done Definition

An enemy is done when:

- its behavior is understandable;
- its behavior reuses existing systems where possible;
- it has clear damage/death feedback;
- its config is separated from reusable logic;
- edge cases are handled;
- it does not introduce hardcoded branches into generic systems without strong justification.
