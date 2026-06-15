# Ashenmoon Alpha 0.1 Plan

## 1. Alpha Promise

A new player drops into a dark forest with nothing. Within 30 minutes they have:
gathered stone and fiber, built a fire, boiled and drunk clean water, killed or
scavenged an animal, cooked meat, and crafted their first meaningful upgrade.
They will have seen wolves threaten from the treeline, discovered a ruined
landmark that implies something larger, and felt the game reward patient,
curious play.

The alpha is not a feature list. It is a proof that the survival game loop is
legible without a developer in the room.

---

## 2. First 30-Minute Player Flow

### Minute 0-3: Orientation

Player spawns in a forest clearing with empty hands and full thirst. The intro
overlay runs its typewriter message, then clears. The HUD shows a thirst bar
that is already visibly draining. No enemies are nearby. The first quest
"Lost in the Woods" activates automatically: boil water, drink it, tend a fire.

The player looks around. There is a shimmer to the east that suggests water.
Loose stones and sticks are visible. The world communicates: I need water, fire,
and safety.

### Minute 3-8: First Gather and Build

The player gathers sticks, stones, flint shards, and grass fiber from the
clearing and nearby rocky patch. They open the crafting tab and see the campfire
recipe in the build panel (always known, no prior unlock needed). They place a
campfire and ignite it. It begins to glow.

Thirst is now roughly 60-70. The cold bar shows a small amount. The fire pushes
back both.

### Minute 8-12: Water and Food First Contact

Player finds the pond (dark pond landmark to the east, visible from spawn
radius). They interact with the water source and receive dirty_water. Returning
to the campfire, they open the station panel and boil dirty_water over the fire
until it becomes boiled_water. They drink it. The first quest objective
completes.

Nearby they find berry bushes in the clearing. Eating berries partially restores
HP. The player discovers there is a food dimension they have not yet solved.

### Minute 12-18: Flint Axe and First Trees

The second quest "Scavenger's Tools" auto-activates. It asks for a flint axe.
The player has already gathered the components. They craft it: flint shard + stick
+ grass fiber. The axe equips.

With the axe they approach the oak trees. Chopping produces wood, bark, and oak
bark. The first chop shows tree-fall particles and a crack sound. They learn that
bark strips become rope, wood feeds the fire. They refuel the campfire.

### Minute 18-22: Animal Encounter

The player hears a distant rustle. Rabbits scatter from the clearing. Deer bolt
from the grazing zone. A wolf howl fires from beyond the treeline: a feedback
message appears: "a distant howl answers the scent of camp." The wolves do not
attack yet. But the player understands nightfall will change this.

The player pursues a rabbit. It is fast and requires prediction. Eventually they
land a hit. The rabbit dies. A carcass appears with an interact prompt.

### Minute 22-26: Carcass Processing

The carcass panel opens. The player chooses "butcher." They receive raw_meat,
bone_fragments, and raw_hide. The panel tells them the yield.

They bring raw_meat to the fire. The cooked_meat recipe appears in the station
panel. After a short duration, cooked_meat is ready. They eat it. HP refills.
The bones suggest something: the player crafts a bone_needle. The
primitive_work_surface build recipe appears.

### Minute 26-30: First Meaningful Upgrade and Landmark

Player builds a primitive work surface. With dried hide, bone_needle, and grass
cord, they craft hide_footwraps. The cold bar drops noticeably. The upgrade felt
earned.

While exploring west, the player sees a stone arch and collapsed cart: the
burned_cart landmark. They interact. A brief examine text: "an iron wheel,
scorched. whatever came from this road did not make it far." No quest. Just a
hook.

Night is falling. Wolves are circling. The player knows to tend the fire.

---

## 3. Required Content

### Starting State

- Player inventory: empty
- Player HP: 100
- Player thirst: 100 (draining at ~1.5/sec idle, ~4.5/sec working)
- Player equipped: nothing
- Quest: "Lost in the Woods" auto-activated on game start

### World Layout (from `src/lib/domain/worldgen/first-camp-layout.ts`)

Already defined and seeded via `FIRST_CAMP_RELATIVE_LAYOUT`:
- Pond water source at dx:10, dy:2 from spawn
- Flint shards + loose stone at rocky_patch dx:-9, dy:4
- Berry bush at clearing dx:4, dy:8
- Grass patch + bark strip in forest
- Rabbit burrow dx:5, dy:8; deer grazing dx:8, dy:6; boar dx:-10, dy:-4
- Wolf territory dx:18, dy:-12 (safe starting distance)
- Landmarks: fallen_tree, old_stump, pond, huge_dead_tree, ruined_watch_post,
  old_road, burned_cart, wolf_den, river_crossing, deer_grazing_area

### Items Required (all defined in `src/lib/domain/definitions/items/`)

- `stick`, `stone`, `flint_shard`, `grass_fiber` - starting gather materials
- `dirty_water`, `boiled_water` - water chain
- campfire structure - fire anchor
- `raw_meat`, `bone_fragments`, `raw_hide`, `tendon` - animal yield
- `cooked_meat` - food from fire
- `bone_needle` - crafting pivot item
- `grass_cord` - binding material
- `hide_footwraps` - first meaningful clothing upgrade
- `wood`, `bark` - tree yield

### Structures Required (in `src/lib/domain/building-specs.ts`)

- campfire - already defined
- primitive_work_surface - already defined
- storage_pile - already defined
- drying_rack - needed for hide_footwraps chain

### Recipes Required for the Loop

All currently defined in `src/lib/domain/definitions/recipes/`:
- campfire build recipe
- `boil_dirty_water` (campfire context) - dirty_water to boiled_water
- `flint_axe` - flint_shard + stick + grass_fiber
- `cooked_meat` (campfire context) - raw_meat to cooked_meat
- `twist_grass_cord` - grass_fiber x3 to grass_cord
- `bone_needle` - from bone_fragments (must verify existence)
- `dry_raw_hide` (drying_rack context) - raw_hide to dried_hide
- `hide_footwraps` (primitive_work_surface context) - dried_hide + grass_cord + bone_needle

### Animals Required (all in `src/lib/domain/animals/animal-behavior.ts`)

- Rabbit (fearful, fast, 8 HP) - rabbit_burrow zone
- Deer (timid, 20 HP) - deer_grazing zone
- Wolf (predator, 45 HP, howls at night) - wolf_territory zone (distant)
- Boar (territorial, 35 HP, charges) - boar_rooting zone

---

## 4. Existing Systems That Can Be Reused As-Is

| System | File | Notes |
|--------|------|-------|
| Worldgen + first camp layout | `src/lib/domain/worldgen/first-camp-layout.ts` | Ready |
| Gathering (axe/bare hand) | `src/lib/core/systems/interaction/interaction-system.ts` | Ready |
| Crafting rules | `src/lib/domain/crafting/crafting-system.ts` | Ready |
| Campfire station processing | `src/lib/core/systems/camp/campfire-runtime-system.ts` | Ready |
| Animal behavior + ecology | `src/lib/core/systems/animals/animal-ecology-system.ts` | Ready |
| Carcass processing | `src/lib/domain/animals/carcass-processing.ts` | Ready |
| Carcass panel | `src/lib/ui/panels/CarcassPanel.svelte` | Ready |
| Thirst drain + survival | `src/lib/state/rpg/survival.svelte.ts` | Ready (~11 min idle to parched) |
| Cold exposure + warmth | `src/lib/state/rpg/wetness.svelte.ts` + weather system | Ready |
| Status effects + wounds | `src/lib/state/rpg/status-effects.svelte.ts` | Ready |
| Wolf camp threat events | `src/lib/domain/threats/wolf-camp-threat.ts` | Ready, event-driven |
| FeedbackRouter | `src/lib/core/systems/feedback/feedback-router.ts` | Ready |
| Quest system | `src/lib/domain/quests/quest-definitions.ts` | Ready, needs wiring |
| HUD: thirst, HP, status | `src/lib/ui/hud/ConditionPanel.svelte` | Ready |
| Inventory / crafting panel | `src/lib/ui/panels/InventoryGrid.svelte` | Ready |
| Station panel | `src/lib/ui/panels/StationPanel.svelte` | Ready |
| Building placement | `src/lib/core/systems/building/building-system.ts` | Ready |
| Intro overlay | `src/lib/ui/elements/IntroOverlay.svelte` | Ready |
| Day/night cycle | `src/lib/core/systems/weather/weather-system.ts` | Ready |

---

## 5. Missing Systems or Blockers

### Blocker A: No campfire or NPC spawned in the base world

**File:** `src/lib/core/engine.ts` line 1156

```ts
const wantCamp = scenario?.camp === true;
```

When no scenario is active (`scenario = null`), `scenario?.camp` is `undefined`,
so `wantCamp` is `false`. Neither the campfire nor Commander Vane spawn. For the
alpha this is intentional: the player builds their own campfire. But it means the
alpha must be delivered as an `alpha_start` scenario (with `camp: false`) or the
engine init must set `currentQuestId` without requiring Vane.

### Blocker B: Quest activation requires Commander Vane

**File:** `src/lib/state/rpg/quests.svelte.ts` line 9

`currentQuestId` starts as `null`. The only activation path is Vane's dialogue
(`vane-dialogue.ts` action type `accept_quest`). Vane does not spawn in the
alpha (player builds their own camp). Quests must activate automatically.

**Fix:** On game start (or when the alpha scenario loads), set
`currentQuestId = "lost_in_woods"` if no current quest exists. Each subsequent
quest auto-chains on completion.

### Blocker C: `bone_needle` recipe may not exist

**File:** `src/lib/domain/definitions/recipes/tools.ts`

The alpha's first meaningful crafting pivot (bone_needle -> clothing) depends on
this recipe. Must verify and add if missing:
`{ id: "bone_needle", context: "hand", costs: [bone_fragments x2], durationSec: 8 }`

### Gap D: Vane dialogue objectives cannot complete without Vane

**File:** `src/lib/domain/quests/quest-definitions.ts`

Quests 2-5 each have a `talk_vane_N` objective as the final step. Without Vane
these quests stall. For alpha: remove the talk_vane objectives. Quests
auto-complete when all other objectives are met.

### Gap E: No alpha-specific scenario

The current scenarios (`all-gatherables`, `collision-lab`, `all-landmarks`) are
dev tools. A controlled `alpha_start` scenario is needed that:
- Places the player in the center of the first-camp layout
- Does NOT spawn a pre-built campfire
- Activates `lost_in_woods` on load
- Has decorations, guaranteed spawns, and all animal zones

### Gap F: No contextual hint for first interaction

When the player first approaches a gatherable or animal, no hint shows what key
to press. Verify the interaction prompt in the HUD is visible without prior
knowledge of the control scheme.

---

## 6. Implementation Phases

### Phase 1 - Fix Quest Activation (0.5 days)

- Auto-activate `lost_in_woods` when `currentQuestId` is null on game start.
  The cleanest place: a `$effect` in `src/routes/game/+page.svelte` that fires
  once on mount, or an engine init hook.
- Remove `talk_vane`, `talk_vane_2`, `talk_vane_3`, `talk_vane_4` from all
  quest objectives in `src/lib/domain/quests/quest-definitions.ts`.
- Verify quest auto-chaining on completion in
  `src/lib/domain/quests/quest-system.ts`.

Files: `src/lib/domain/quests/quest-definitions.ts`,
`src/routes/game/+page.svelte`

### Phase 2 - Alpha Start Scenario (0.5 days)

- Create `src/lib/domain/scenarios/alpha-start.ts`:
  ```ts
  export const ALPHA_START_SCENARIO: ScenarioConfig = {
    id: "alpha_start",
    label: "alpha: forest start",
    map: "forest",
    camp: false,
    decorations: true,
    spawnPoint: { gx: <center>, gy: <center> },
  };
  ```
- Register in `src/lib/domain/scenarios/index.ts`.
- Load `alpha_start` as the default scenario when no prior save exists,
  OR make it selectable via the scenario panel for testing.

Files: `src/lib/domain/scenarios/alpha-start.ts` (new),
`src/lib/domain/scenarios/index.ts`,
`src/lib/core/engine.ts`

### Phase 3 - Campfire Build Availability (0.5 days)

- Verify campfire is shown in the build tab immediately with stone + stick,
  no knowledge unlock required. Check `src/lib/domain/knowledge/` for any gate.
- If gated, seed campfire build knowledge in the alpha scenario on load.
- Optionally place a scorched ring decoration at the camp candidate point
  (dx:4, dy:5 from spawn) to suggest "build here."

Files: `src/lib/domain/scenarios/alpha-start.ts`,
`src/lib/domain/building-options.ts`

### Phase 4 - Verify and Fix the Hunt Loop (1 day)

- Confirm rabbit spawning in the `rabbit_burrow` zone. Playtest kill flow.
- Confirm carcass panel opens and "butcher" produces `raw_meat`,
  `bone_fragments`, `raw_hide`.
- Confirm `raw_meat -> cooked_meat` works in station panel at campfire.
- Add `bone_needle` recipe if missing in
  `src/lib/domain/definitions/recipes/tools.ts`.
- Verify `drying_rack` is buildable with materials from the alpha start.
- Verify `hide_footwraps` full chain completes (drying_rack + primitive_work_surface).

Files: `src/lib/domain/definitions/recipes/tools.ts`,
`src/lib/core/systems/animals/animal-spawning.ts`,
`src/lib/domain/animals/carcass-processing.ts`

### Phase 5 - Landmark Interactions (0.5 days)

- Confirm `burned_cart` and `ruined_watch_post` landmarks spawn and have
  `examineText` in `src/lib/domain/worldgen/landmark-definitions.ts`.
- Add examine text if absent:
  - burned_cart: "an iron wheel, scorched. whatever came from this road did not make it far."
  - ruined_watch_post: "stone steps descend to nothing. something watched from here once."
- Confirm `wolf_den` has a distinct visual that signals danger without
  requiring interaction.

Files: `src/lib/domain/worldgen/landmark-definitions.ts`

### Phase 6 - UI and Feedback Audit (0.5 days)

- Verify thirst bar, cold bar, HP bar are readable at all fill levels.
  File: `src/lib/ui/hud/ConditionPanel.svelte`.
- Confirm wolf howl `feedback_requested` message displays correctly
  (already routed through FeedbackRouter).
- Confirm recipe discovery text fires when a new recipe unlocks.
  File: `src/lib/state/rpg/rpg-feedback-router.ts`.
- Check campfire interaction prompt is visible and legible.
- Confirm carcass panel opens reliably after kills.

### Phase 7 - Pacing Tuning Pass (0.5 days)

- Measure thirst drain per minute in a test session. Target: hits danger zone
  at minute 8-10 while actively gathering. Tune
  `DEFAULT_THIRST_CONFIG.baseDrainPerSec` in
  `src/lib/domain/systems/thirst-logic.ts` if needed.
- Measure time to first animal encounter. Target: minute 12-18.
- Verify day/night timing: night should arrive around minute 20 as a pressure
  event, not an ambush. Check `ENGINE_CONFIG` night start fraction.
- Verify wolf threat fires at night but attack state is not immediate.
  Check cooldown timers in `src/lib/domain/threats/wolf-camp-threat.ts`.

Files: `src/lib/domain/systems/thirst-logic.ts`,
`src/lib/core/engine-config.ts`,
`src/lib/domain/threats/wolf-camp-threat.ts`

---

## 7. Exact Next 10 Tasks

1. **Auto-activate `lost_in_woods` quest on fresh game start.**
   In `src/routes/game/+page.svelte`, after the engine mounts, check:
   if `activeQuests.currentQuestId === null`, set it to `"lost_in_woods"`.
   Guard with a one-time check so reload mid-session does not reset progress.

2. **Remove all `talk_vane_N` objectives from quest definitions.**
   In `src/lib/domain/quests/quest-definitions.ts`, remove the `talk_vane`,
   `talk_vane_2`, `talk_vane_3`, `talk_vane_4` objective entries from each
   quest. Adjust quest descriptions to not reference Vane.

3. **Create `src/lib/domain/scenarios/alpha-start.ts`.**
   Implement the alpha start scenario: `camp: false`, `decorations: true`,
   spawn at center of first-camp layout map. Register it in
   `src/lib/domain/scenarios/index.ts`.

4. **Verify campfire recipe is always visible in the build tab.**
   Trace the build panel population path from
   `src/lib/domain/building-options.ts` to verify no knowledge gate blocks
   campfire. If blocked, seed the campfire build knowledge in the alpha scenario.

5. **Check `bone_needle` recipe in `src/lib/domain/definitions/recipes/tools.ts`.**
   If absent, add it: `id: "bone_needle"`, `context: "hand"`,
   `costs: [{ itemId: "bone_fragments", required: 2 }]`,
   `process: "assemble"`, `durationSec: 8`, `discoverable: true`.

6. **Playtest the water loop end to end on a fresh session.**
   Load the game, gather `dirty_water` from the pond, boil at campfire, drink.
   Confirm `lost_in_woods` objectives complete and `scavenger_tools` activates.
   File any broken event chain.

7. **Playtest the hunt loop end to end on a fresh session.**
   Kill a rabbit, open carcass panel, butcher, cook meat, eat, confirm HP
   restores. Craft bone_needle. Build primitive_work_surface. Confirm
   hide_footwraps can be crafted (may require drying_rack step first).

8. **Confirm and fix landmark examine text.**
   In `src/lib/domain/worldgen/landmark-definitions.ts`, verify `burned_cart`
   and `ruined_watch_post` have `examineText`. Add if missing. Confirm
   the interaction system fires the text when the player examines.

9. **Verify wolf howl message and timing.**
   Run a session, wait until night or leave raw meat near camp. Confirm
   `feedback_requested` event fires with the wolf howl message. Confirm wolves
   do not enter attack state for at least 30 seconds after the howl.

10. **Run `bun run check` and `bun run test:unit` after all changes.**
    Fix any type errors or test failures introduced by quest definition changes,
    new scenario registration, or recipe additions.

---

## 8. What Not To Build Yet

- **Commander Vane as a full NPC.** Cut from alpha 0.1. Quests auto-chain.
  Vane can return when dialogue serves a clear design purpose.

- **Hunger system.** Thirst drives survival pressure. Food is a reward. Do not
  add a hunger bar, starvation status, or calorie tracking for alpha.

- **Tool durability.** Tools do not break. No durability tracking.

- **Traps or fishing.** Direct melee is the only hunt path.

- **Cave or dungeon generation.** Alpha takes place entirely in the open forest.

- **Seasonal transitions.** Rain events and day/night are enough.

- **Multi-save or load-game UI.** Auto-save to browser storage is sufficient.

- **NPC dialogue beyond examine text.** No branching dialogue, no reputation,
  no shop.

- **Minimap or journal.** No map. Discovery is physical.

- **New status effects beyond what exists.** The current set
  (Bleeding, Hypothermia, Exhaustion, Poison, Infected) covers the alpha.

- **Upgrade tiers for structures.** Build once, it stays.

- **New animal species.** The 4 existing species (rabbit, deer, boar, wolf)
  are sufficient.

---

## 9. Manual Playtest Checklist

Run on a fresh game session (no prior save) before calling alpha done.

### Start
- [ ] Game loads to forest. No pre-built campfire.
- [ ] "Lost in the Woods" quest is active in the quest tracker.
- [ ] Thirst bar is visible and visibly draining.
- [ ] No enemies in the starting area.

### Gathering and First Fire
- [ ] Player gathers sticks, stones, flint shards without a tool.
- [ ] Grass fiber is gatherable from the clearing.
- [ ] Campfire appears in the build tab immediately.
- [ ] Campfire can be placed and lit.
- [ ] Fire warmth reduces cold bar.

### Water Loop
- [ ] Pond is visible within a short walk east of spawn.
- [ ] Interacting with water source gives `dirty_water`.
- [ ] `dirty_water` can be boiled at campfire via station panel.
- [ ] `boiled_water` restores thirst when consumed.
- [ ] Quest objective "drink clean water" completes.
- [ ] "Scavenger's Tools" auto-activates after "Lost in the Woods" completes.

### Crafting
- [ ] Flint axe recipe appears when player has the components.
- [ ] Crafting flint axe succeeds and the axe equips.
- [ ] At least one recipe discovery text fires during the session.
- [ ] Experiment failure gives a hint rather than a blank error.

### Tree Chopping
- [ ] Player with axe can chop oak trees.
- [ ] Trees produce wood, bark, oak bark.
- [ ] Tree-fall VFX and sound fire.
- [ ] Campfire refueling works with wood.

### Hunt Loop
- [ ] Rabbits are present and flee the player.
- [ ] Player can kill a rabbit with the axe.
- [ ] Carcass panel opens on interact.
- [ ] "Butcher" produces raw_meat, bone_fragments, raw_hide.
- [ ] raw_meat can be cooked at campfire.
- [ ] cooked_meat restores HP.
- [ ] bone_needle can be crafted from bone_fragments.

### Upgrade Chain
- [ ] primitive_work_surface can be built.
- [ ] drying_rack can be built with available materials.
- [ ] raw_hide can be dried to dried_hide on drying_rack.
- [ ] hide_footwraps can be crafted at primitive_work_surface.
- [ ] Wearing hide_footwraps reduces cold accumulation.

### Animal Danger
- [ ] Wolf howl message appears at night or when raw meat is left near camp.
- [ ] Wolves do not immediately attack.
- [ ] Fire discourages wolves from entering camp.

### Landmarks
- [ ] burned_cart is reachable and shows examine text.
- [ ] ruined_watch_post is reachable and shows examine text.
- [ ] wolf_den is visible and ominous.

### UI
- [ ] Thirst, HP, cold bars are readable at all levels.
- [ ] Status effects show in the condition panel.
- [ ] Quest tracker shows current objective.
- [ ] No floating text spam during normal play.

---

## 10. Definition of Done

Alpha 0.1 is done when a new player who has not seen the codebase and received
no explanation can:

1. Start a fresh game and understand within 60 seconds that they need water
   and fire.
2. Build a campfire, boil water, and drink it without a tutorial.
3. Gather materials and craft a flint axe.
4. Kill an animal, open the carcass panel, and cook meat.
5. Craft at least one item that makes them feel stronger (hide_footwraps is
   the target rung).
6. Experience a wolf threat event that creates genuine tension without being
   an immediate death.
7. Find at least one landmark that implies the world extends beyond the
   starting clearing.
8. Play for 20-30 minutes without hitting a dead end, soft lock, or
   unexplained failure.

Technical gates:
- `bun run check` — zero type errors
- `bun run test:unit` — all tests pass
- The 9-step manual playtest checklist above completes without failures
- No floating text fires as the primary feedback for crafting success,
  status application, or wolf threat events
