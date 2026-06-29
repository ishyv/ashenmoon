# Adaptive Player Animation Foundation V1

## Diagnosis

The player renderer previously selected a small set of final animation strings directly from movement and gathering systems. That made animation hard to extend because stamina, injury, wetness, encumbrance, equipped tools, and target type had no shared selection model. The same old player standee was also reused for every actor state, so adding new player art did not have a first-class lookup path.

## Architecture

The foundation is split by ownership:

- `src/lib/domain/animation/player-animation.ts` owns pure clip definitions, priorities, variant rules, gather target classification, encumbrance math, and animation event scheduling.
- `src/lib/core/systems/player-animation/player-animation-system.ts` owns runtime clip application, normalized-time event emission, and compatibility with the existing `AnimatedSprite`.
- Movement and gathering publish animation facts. They do not decide final adaptive clip ids when a `PlayerAnimationResource` is present.
- Pixi asset lookup resolves player clip ids through the render resource cache.

## State Model

`PlayerAnimationResource` stores only presentation facts:

- movement velocity and sprint intent;
- active gathering target kind and target id;
- current selected clip;
- current normalized clip time.

It does not mutate inventory, stamina, wounds, statuses, resources, or combat.

## Adaptive Factors

The selector currently considers:

- action: idle, moving, gathering, or combat;
- movement speed and sprinting;
- stamina ratio;
- encumbrance ratio;
- wetness level;
- injury/exhaustion status ids;
- equipped tool kind;
- gathering target group;
- combat/guard activity.

## Variant Model

Clip priority is explicit and data-driven:

1. combat;
2. gathering;
3. injured movement;
4. encumbered movement;
5. exhausted or wet movement;
6. normal run or walk;
7. idle.

Wetness can be expressed as a lower-priority clip or a procedural modifier, but it does not beat injury or gathering.

## Animation Events

Clip events are normalized between `0..1` and include:

- `footstep`;
- `tool_impact`;
- `gather_pull`;
- `swing_release`.

The core controller emits these through the game event queue with actor id, clip id, normalized time, world position, and optional target id. Feedback routers may play sound or VFX from the event. Gameplay outcomes stay in existing systems.

## Asset Contract

Player clips resolve through `ASHENMOON_PLAYER_ANIMATION_PATHS` and preload via the render resource cache. Missing future variants should fall back only through deliberate manifest aliases or dev placeholders, not by silently inventing runtime sprites.

## Affected Systems

- `core/assets/ashenmoon-assets.ts`: clip-to-SVG manifest and actor frame helpers.
- `core/assets/render-resource-cache.ts`: typed player clip frame caching.
- `core/systems/movement/movement.ts`: movement animation facts.
- `core/systems/interaction/interaction-system.ts`: gathering target facts.
- `core/systems/player-animation/player-animation-system.ts`: runtime controller.
- `core/systems/feedback/feedback-router.ts`: animation event feedback.
- `core/engine.ts`: orchestration only.

## Verification

Useful tests are pure and invariant-focused:

- every rule references an existing clip;
- clip event times are valid;
- priority conflicts resolve deterministically;
- real gatherable and tool definitions route to expected animation groups;
- event scheduling fires crossed events once and handles loops.

Avoid feel tests for exact transforms, screenshots, or frame-perfect timing.

## Manual Checklist

- Player art loads on a new game.
- Walk, run, stop, and turn without sprite snapping.
- Low stamina selects strained or exhausted movement.
- Injury beats wet/exhausted movement.
- Wet movement reads heavier without overriding injury.
- Bare-handed plants, axe trees, pick ore, clay, and water use distinct gathering clips.
- Animation-timed feedback fires without changing gathering yield, depletion, risk, or tool gates.
