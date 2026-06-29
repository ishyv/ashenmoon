# Ashenmoon Combat Design Contract

**Status:** Milestone A design spine. This document is the contract for the combat refactor before enemy-attack implementation starts.

**Purpose:** Replace the current poor-feeling combat with a readable, skill-dependent survival combat language. Code complexity does not count as depth. If the player cannot read, decide, act, and learn, the mechanic is not done.

---

## 1. North Star

Ashenmoon combat is a survival-duel system built around readable enemy intent, weapon-specific answers, stamina commitment, and lasting injury.

Enemies control space and timing. The player wins by reading, positioning, committing at the right moment, and surviving the consequences after the fight.

Combat should feel:

- deliberate;
- physical;
- risky;
- readable;
- grounded in the world;
- connected to survival preparation and aftermath.

Combat should not feel:

- like clicking until an HP bar empties;
- like invisible stat math;
- like global combo soup;
- like MMO ability rotation;
- like enemies are decorative bags of meat. We have enough tragic meat already.

---

## 2. Canonical Player Combat Grammar

The canonical player combat spine is **weapon-driven**.

```txt
aim -> choose weapon gesture -> commit -> active threat -> recovery -> reposition
```

Player inputs describe intent. The equipped weapon decides what that intent means.

### Supported player intents

| Intent | Meaning | Design role |
| --- | --- | --- |
| tap | quick attack | low commitment, interrupt/finish pressure |
| hold | committed/heavy attack | high damage/stagger, punish windows |
| swipe | directional attack | weapon-specific slash/thrust/drag expression |
| stance held | guard / brace / weapon posture | defensive commitment and matchup answer |
| stance + tap/hold/swipe | weapon-specific technique | advanced expression without new button soup |
| evade/step | reposition | leave lanes, control spacing, escape pressure |

### Starter weapon identities

#### Knife

Fantasy: close, ugly, fast, dirty survival weapon.

- Good at: quick cuts, bleed, disengage, punishing committed lunges.
- Bad at: frontal charge control, groups, armored targets, reach contests.
- Skill pattern: `bait -> slip inside -> cut -> disengage`.

#### Spear

Fantasy: keep the nightmare away from your body.

- Good at: reach, lane control, bracing, interrupting animal charges.
- Bad at: crowded close range, flanks, tight terrain, enemies already inside point range.
- Skill pattern: `maintain distance -> aim point -> intercept -> backstep`.

#### Axe

Fantasy: heavy, brutal, decisive, risky.

- Good at: stagger, recovery punishment, armor/wood/structure damage.
- Bad at: panic trades, fast enemies, whiff recovery, stamina discipline.
- Skill pattern: `wait -> bait -> avoid/guard -> punish recovery hard`.

#### Unarmed

Fantasy: desperation.

- Good at: maybe shoving a staggered thing later.
- Bad at: everything else.
- Skill pattern: `find a weapon, genius`.

---

## 3. Canonical Enemy Combat Grammar

Enemies are the pressure system. Each enemy exists to force a particular player behavior.

```txt
choose pressure goal -> telegraph -> commit -> resolve -> recover -> reset/escalate
```

Every authored enemy attack must define:

- intent / role;
- windup duration;
- active duration;
- recovery duration;
- hit shape;
- tracking / turn lock behavior;
- damage and knockback;
- stamina or status pressure;
- feedback contract;
- punish window.

### First 20-minute enemy roles

| Role | Example | Question it asks the player |
| --- | --- | --- |
| prey | rabbit/deer | Can you approach a living world without treating everything as a target dummy? |
| charger | boar | Can you read the lane and punish commitment? |
| stalker | wolf | Can you avoid panic-whiffing and keep danger in front? |
| duelist/brute | husk/woodsman/cultist | Can you respect windup/recovery and guard/counter timing? |
| pair/pack pressure | wolves/scavengers | Can you position, retreat, and survive consequences? |

---

## 4. Enemy Control Axes

A good Ashenmoon enemy controls the player through at least one of these axes.

### Spacing control

The enemy changes where it is safe to stand.

Examples:
- boar owns a straight charge lane;
- wolf hovers outside short-weapon range and punishes whiffs;
- brute owns frontal space but has slow recovery.

### Timing control

The enemy changes when it is safe to act.

Examples:
- boar charge windup invites sidestep/brace, not face trades;
- wolf lunge invites calm punish after commitment;
- brute overhead invites guard/dodge then axe punish.

### Attention control

The enemy changes what the player must watch.

Examples:
- wolf pair flanks;
- harasser later forces target priority;
- wounded predator may howl/call.

### Resource control

The enemy pressures stamina, wounds, equipment, and treatment.

Examples:
- blocking a charge costs stamina;
- bite/gore causes bleeding or injury;
- greedy axe use leaves the player winded.

### Terrain control

The enemy makes the world matter.

Examples:
- boar crashes into trees/rocks;
- wolves respect firelight;
- mud/brush may change future movement risk.

---

## 5. First Vertical Slice: Boar

Boar is the first proof slice because it teaches the system in miniature.

The boar teaches:

```txt
read warning -> respect lane -> dodge/brace -> punish recovery
```

### Boar states

- `graze`
- `alert`
- `threaten`
- `charge_windup`
- `charge`
- `crash`
- `recover`
- `reset`

### Boar required feedback

| State | Player-facing cue |
| --- | --- |
| alert | boar stops/faces player, short snort |
| threaten | head lowers, paw scrape/dust, warning tint/audio |
| charge_windup | visible lane, locked facing, hooves dig in |
| charge | fast committed line, dust trail, no late homing |
| crash | impact burst, camera bump, long vulnerable recovery |
| recover | huffing/low posture, clear punish window |

### Boar weapon matchups

#### Spear vs boar

- Spear can brace/intercept charge if angle, timing, and stamina are correct.
- Wrong angle or low stamina fails.
- Success should feel smart and physical.

#### Axe vs boar

- Axe should not casually stop the charge.
- Axe is best during crash/recovery.
- Heavy punish should feel brutal and risky.

#### Knife vs boar

- Knife can cut/bleed after a sidestep or recovery.
- Knife is bad face-to-face.
- Staying close too long invites gore punish.

#### Unarmed vs boar

- Bad. Emergency only.

### Boar acceptance criteria

Boar is not done until:

- player can tell when it noticed them;
- player can tell when they are too close;
- charge lane matches actual hit path;
- sidestepping works without guessing;
- boar cannot late-home into the player after committing;
- missed/crashed charge creates a real punish window;
- spear, axe, and knife solve the fight differently;
- greedy face-tanking is punished;
- damage/wounds are readable.

---

## 6. Second Vertical Slice: Wolf

Wolf should contrast boar.

The wolf teaches:

```txt
keep it in front -> do not panic-whiff -> punish lunge -> respect wounds/fire
```

### Wolf states

- `stalk`
- `circle`
- `feint`
- `lunge_windup`
- `lunge`
- `retreat`
- `howl_or_call`
- `flee_if_wounded`

### Wolf acceptance criteria

Wolf is not done until:

- it avoids feeling like a smaller boar;
- it pressures facing and whiff discipline;
- it circles or repositions before lunging;
- it backs off after a bite;
- it interacts with fire/fear where appropriate;
- a lone wolf and a pair of wolves feel meaningfully different.

---

## 7. Combat Feedback Definition of Done

No attack is complete without readable feedback.

### Before impact

Required:
- enemy/player intent cue;
- attack direction or danger area when relevant;
- windup timing readable enough to react;
- audio/body cue, not only UI text.

### During impact

Required:
- distinct hit, block, armor, whiff, and wound feedback;
- target reaction;
- sound or VFX appropriate to material/flesh/weapon;
- camera shake only for meaningful impacts.

### After impact

Required:
- recovery/punish window visibility;
- stamina/status consequence visibility;
- death/flee/stagger state clarity;
- no silent status tax.

Floating text is allowed as support. It is not the main language. The main language is body, motion, sound, shape, and consequence.

---

## 8. Legacy Combat Reachability Audit

This audit is based on direct source searches across `src/` before implementation.

### Current reachable / active seams

| Symbol/system | Direct locations | Current contract decision |
| --- | --- | --- |
| `pendingAttack` | `core/input/input.ts`, `core/engine.ts`, `focused-gather-system.ts`, `combat.ts`, `weapon-attack-system.ts`, tests | Still an active input seam. Weapon attack path should remain canonical and should claim/clear this. Audit before deleting any legacy consumer. |
| `pendingFellSweep` | `core/input/input.ts`, `focused-gather-system.ts`, `combat/fell-sweep.ts`, `weapon-attack-system.ts`, tests | Legacy/specialized seam. Do not expand globally. Salvage as axe/weapon technique only if useful. |
| `pendingDrivingThrust` | `core/input/input.ts`, `core/engine.ts`, `combat/driving-thrust.ts`, `weapon-attack-system.ts`, tests | Legacy/specialized seam. Salvage as spear technique/brace/thrust behavior only if useful. |
| `kiteStacks`, `directionalMomentumState` | `combat.ts`, dedicated combo modules/tests, movement/combat-related files | Legacy global combo state. Fence first, salvage only into weapon-specific mastery if it improves feel. |
| `fourfold`, `crosscut` | colors/audio/vfx/domain tests/combat files | Legacy combo presentation and audio still exist. Treat as salvageable feedback/technique assets, not canonical combat grammar. |

### Policy

- Do not delete legacy systems during the boar foundation unless they block the new path.
- Do not add new global combo systems.
- New combat behavior should go through weapon definitions, enemy attack definitions, or focused enemy systems.
- If old mechanics survive, they must be reframed as weapon-specific techniques with clear player-facing purpose.

---

## 9. Layer Ownership

Follow repository architecture rules.

### Domain owns

- weapon definitions;
- enemy attack definitions;
- pure attack timing;
- pure hit shape math;
- pure boar/wolf state transitions where possible;
- status/wound definitions.

No Svelte, Pixi, DOM, or server imports.

### Core owns

- ECS iteration;
- runtime movement;
- collision checks;
- calling shared damage;
- emitting game events;
- Pixi presentation adapters.

Core must not become the source of RPG truth.

### State owns

- player HP/stamina/status persistence;
- profile sync;
- cooldowns or persistent combat state where needed.

State imports domain constants; it does not redefine them.

### UI owns

- displaying player-readable combat state;
- contextual prompts;
- status/wound display.

UI does not decide combat outcomes.

---

## 10. Implementation Order

### Milestone A — Design spine locked

- Create this contract.
- Commit it.
- Use it as the reference for implementation decisions.

### Milestone B — Enemy attack foundation

Create pure enemy combat modules:

- `src/lib/domain/combat/enemies/enemy-attack-types.ts`
- `src/lib/domain/combat/enemies/enemy-attack-runtime.ts`
- `src/lib/domain/combat/enemies/enemy-attack-resolution.ts`

Test first.

### Milestone C — Boar domain slice

Create pure boar combat state/attack rules:

- `src/lib/domain/combat/enemies/boar-combat.ts`
- `src/lib/domain/combat/enemies/boar-combat.test.ts`

Test first.

### Milestone D — Boar runtime/presentation

Wire boar into ECS and presentation:

- `src/lib/core/systems/animals/boar-combat-system.ts`
- `src/lib/core/systems/animals/boar-presentation.ts`
- existing animal bridge/rendering files as needed.

Verify in-game.

### Milestone E — Starter weapon matchup pass

Add spear brace, axe punish tuning, and knife bleed/disengage checks.

### Milestone F — Wolf contrast slice

Add wolf stalk/circle/lunge/flee/fire behavior after boar feels good.

---

## 11. Verification Rules

For each code milestone:

1. Write failing test first for pure behavior.
2. Run the focused test and confirm expected failure.
3. Implement minimal code.
4. Run focused test and confirm pass.
5. Run relevant nearby tests.
6. Run `bun run check` before milestone commit.
7. For player-facing runtime slices, open the game and visually verify behavior.

Baseline commands:

```bash
bun run test:unit -- <focused test files>
bun run check
bun run build
```

Known existing issue: Pixi/jsdom may print `HTMLCanvasElement.prototype.getContext` warnings during tests. If exit code is 0, report it separately rather than treating it as a new combat failure.

---

## 12. Refactor Guardrails

- Work on `main`, as requested.
- Commit per milestone.
- Keep changes surgical.
- Do not rewrite `combat.ts` wholesale until replacement behavior is proven.
- Do not touch unrelated dirty work without explicit reason.
- Do not reintroduce `src/lib/game/` or `src/lib/rpg/` layouts.
- Do not let `GameEngine` become a combat dumping ground.
- If a mechanic has no readable feedback, it is not finished.
