# Composition-First Development

This codebase should prefer composition over monolithic inheritance or one-off behavior.

## Core Idea

A game object should be built from small capabilities.

Instead of:

```text
FireZombieBossWithSpecialGatheringResistance
```

prefer:

```text
Entity
  Health
  Damageable
  Movement
  AggroSensor
  Faction
  AttackPattern
  LootTable
  StatusResistance
  BurnAura
```

This makes behavior reusable across enemies, NPCs, items, resource nodes, and world objects.

## Components

Components should mostly describe data/capability.

Examples:

- `Health`
- `Damageable`
- `Inventory`
- `Gatherable`
- `Interactable`
- `Faction`
- `Movement`
- `AIState`
- `AggroSensor`
- `LootTable`
- `Renderable`
- `AudioEmitter`
- `ParticleEmitter`
- `Cooldowns`

A component should have a clear reason to exist. Avoid components that are just random bags of unrelated fields.

## Systems

Systems should operate on entities with specific components.

Examples:

- `DamageSystem`
- `GatheringSystem`
- `InteractionSystem`
- `AISystem`
- `MovementSystem`
- `LootSystem`
- `FeedbackSystem`
- `UISyncSystem`

Systems should avoid knowing about specific one-off entities unless necessary.

Prefer:

```text
DamageSystem applies damage to all entities with Health + Damageable.
```

Avoid:

```text
DamageSystem has special hardcoded logic for WolfEnemy, SkeletonEnemy, and CrystalTree.
```

## Events

Use events to decouple cause and feedback.

Example:

```text
GatheringSystem emits ResourceGathered
FeedbackSystem listens and spawns particles/sounds
UISystem listens and updates inventory display
```

This keeps gameplay logic separate from presentation, while still making the player experience rich.

## Reuse Standard

Before writing a new system, ask:

1. Can this be represented as data on an existing component?
2. Can an existing system process this behavior?
3. Is this truly a new capability?
4. Will at least two entities/features benefit from this abstraction?
5. Does this make future implementation faster or slower?

If a new abstraction has only one use, it may still be allowed, but the benefit must be clear.

## Anti-Patterns

Avoid:

- one enemy = one AI system;
- one resource = one gathering function;
- one UI panel = completely separate state model;
- one special case = permanent architecture;
- behavior hidden inside rendering;
- gameplay state hidden inside UI;
- effects spawned directly from core logic when an event hook would be clearer.

## Composition Success Criteria

A system is healthy when:

- adding a new enemy mostly means adding data/config;
- adding a new resource node reuses gathering/interactable logic;
- adding a new item reuses inventory/effect logic;
- feedback can be changed without rewriting core mechanics;
- UI can observe state without owning gameplay rules;
- types make invalid states harder to represent.
