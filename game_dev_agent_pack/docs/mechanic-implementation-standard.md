# Mechanic Implementation Standard

Use this standard before implementing any gameplay mechanic.

## 1. Define the Player Goal

Write the mechanic in player language.

Bad:

```text
Implement resource tick handler.
```

Better:

```text
The player can gather wood from trees, see progress, receive wood in inventory, and see the tree become depleted.
```

## 2. Define the State

Identify:

- what data changes;
- who owns that data;
- which entities are involved;
- which components are required;
- what events are emitted;
- what UI observes.

## 3. Define the Feedback

A mechanic needs feedback.

At minimum, identify:

- start feedback;
- progress feedback;
- success feedback;
- failure feedback;
- world-state feedback;
- UI feedback.

## 4. Define Reuse

Ask:

- Can this mechanic be reused by other entities?
- Which parts are data/config?
- Which parts are hardcoded?
- Which parts should be generic systems?
- Which parts are specific presentation?

## 5. Define Failure States

Common failure states:

- missing required component;
- invalid target;
- out of range;
- blocked by cooldown;
- missing required item/tool;
- insufficient resources;
- inventory full;
- entity destroyed during action;
- interrupted action;
- invalid config.

Each failure should either be safely ignored, logged, or shown to the player depending on importance.

## 6. Define Verification

Every mechanic should include manual or automated verification.

Example for gathering:

- player can target a gatherable node;
- interaction prompt appears;
- action starts;
- progress feedback appears;
- moving away interrupts if intended;
- completion adds resources;
- depleted node changes visual state;
- sound/particles trigger;
- invalid node does not crash;
- missing config fails clearly.

## Implementation Shape

Prefer this shape:

```text
components/
  gatherable.ts
  inventory.ts

systems/
  gathering-system.ts
  inventory-system.ts

events/
  gathering-events.ts

feedback/
  gathering-feedback.ts

ui/
  inventory-ui.ts
```

Adjust names to the repo’s actual structure. The point is responsibility separation, not folder cosplay.

## Done Definition

A mechanic is done when:

- the logic works;
- types describe the important contracts;
- the player gets readable feedback;
- edge cases are handled;
- docs explain the design;
- verification steps are written;
- the system can be reused or intentionally marked as one-off.
