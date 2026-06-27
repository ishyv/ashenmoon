# Ashenmoon Sound Revamp Plan

## 1. Current Audio Diagnosis

Ashenmoon already has a useful Web Audio foundation in `src/lib/audio/`. The current engine owns a single `AudioContext`, bus gain nodes, master mute/volume, sample preloading, procedural recipe fallback, pitch jitter, gain jitter, throttling, spatial gain/pan, and ambient scheduling. Existing tests cover settings, manifest recipe validity, sample collection, conditional sound variation, and feedback routing.

The weak points are not "no audio system"; the weak points are vocabulary and ownership:

- Sound IDs still describe generic outcomes such as `craft`, `pickup`, and `gather.strike` more often than physical material events.
- There is no first-class `master` bus type shared across registry/settings APIs.
- There is no public `play`, `playAt`, `startLoop`, or `stopLoop` API yet; callers mostly use `playSound`.
- Layered sound definitions are missing, so tree hits, stone hits, crafting, combat, and ambience collapse into one procedural voice.
- External sample metadata does not exist yet, which is correct while there are no imported audio files, but it must exist before sample sourcing begins.
- Direct `playSound(...)` calls still appear in engine, UI, combat, interaction, building, focused gathering, and RPG state paths. Feedback routers exist, but they are not the only place that owns sound decisions.

## 2. Sound Identity Guide

Ashenmoon sound should be raw, grounded, dry, tactile, dirty, and physical. Sound should tell the player what material moved, broke, struck, stretched, tore, or failed.

Prefer:

- fibrous wood body, bark crack, dry leaf scatter;
- gritty stone cracks, sharp chip transients, gravel debris;
- leathery hide tension, wet meat impact, brittle bone detail;
- clay suction, mud stick, water slosh, fiber pull;
- fire that breathes, sputters, weakens, and catches.

Avoid:

- bright mobile UI clicks;
- glossy fantasy sparkle cues;
- one generic thud for every impact;
- UI sounds louder than world actions;
- procedural-only animal, forest, or fire sounds once samples are available.

## 3. Recommended Audio Tech Choice

Keep native Web Audio as the primary engine for this pass. The current code already uses gain routing, panning, procedural synthesis, and sample decoding without adding dependency weight.

Do not add Howler.js or Tone.js now. Howler can be reconsidered only if asset streaming, sprite management, or cross-browser sample behavior becomes a real problem. Tone can be reconsidered only for music or tonal procedural ambience. For the Milestone 1 feedback pass, Web Audio plus the existing recipe system is the right boring choice. Annoying, yes. Correct, also yes.

## 4. Sound Registry/API Plan

Keep `src/lib/audio/sound-manifest.ts` as the compatibility registry while evolving it into a stronger definition table.

Target concepts:

- `AudioBusId`: `master | music | sfx | ui | ambient | entities`.
- `SoundDefinition`: base one-shot definition with bus, recipe/sample variants, base gain, jitter, cooldown, spatial rules, loop interval, and tags.
- `LayeredSoundDefinition`: definition with ordered child layers, each with delay, gain, pitch, condition overrides, and inherited position.
- `SoundAssetMetadata`: source/license metadata for any external file under `static/audio`.

Target public API:

```ts
audioSystem.play("ui.tab.switch");
audioSystem.playAt("impact.axe.wood.heavy", worldPosition);
audioSystem.startLoop("campfire.loop", "campfire:main", campfirePosition);
audioSystem.stopLoop("campfire:main");
audioSystem.setBusVolume("sfx", 0.8);
audioSystem.getEffectiveVolume({ bus: "sfx", baseVolume: 0.7 });
```

`playSound` remains temporarily as a compatibility shim until direct callers are migrated.

## 5. Audio Bus/Category Plan

Use these buses:

- `master`: final global multiplier and mute gate.
- `music`: future score and danger themes.
- `sfx`: physical player/world actions.
- `ui`: non-diegetic menu and state cues.
- `ambient`: wind, rain, river, fire beds.
- `entities`: creature and NPC vocals/actions.

Volume calculation belongs in the audio layer:

```txt
master * busVolume * soundBaseVolume * requestVolume * distanceFalloff * randomVariation
```

Gameplay, UI, and domain systems should not hand-roll this.

## 6. Procedural Sound Generation Plan

Keep procedural recipes for short cues and fallback layers:

- UI click, tab switch, invalid action;
- recipe discovered;
- small impact accents;
- wood body thud, bark crack, leaf rustle;
- stone crack, grit scatter;
- clay pull, water collect, fiber tension;
- first-pass campfire/rain/wind loop pulses until samples exist.

Do not synthesize the whole forest, animals, fire, and rain forever. That would sound cheap. The procedural layer is a scaffold and accent system, not a replacement for organic samples.

## 7. Sample Sourcing/License Plan

Before importing any external sound, create metadata in `src/lib/audio/sound-assets.ts`.

Allowed initial sources:

- internal/generated;
- CC0 packs;
- Kenney packs;
- OpenGameArt entries with clear licenses;
- Freesound assets with verified license and author attribution;
- ZapSplat only when license terms are checked for the project use.

Every imported sample needs file path, source, author where applicable, license, source URL, modified flag, and notes. If the license is unclear, skip the file. Heroic piracy is still piracy, just wearing a worse hat.

## 8. Material-Aware Sound Event Plan

Gameplay systems should describe the physical event. The audio feedback layer maps it to sound IDs.

Examples:

- `impact + axe + wood + heavy` -> layered wood body, bark crack, leaf debris, tool transient.
- `impact + pickaxe + stone` -> stone crack, grit scatter, tool rebound.
- `impact + knife + flesh` -> wet cut, body hit, optional bone detail later.
- `gather + leaves` -> hand rustle and pluck.
- `gather + clay` -> sticky pull and soft grit.
- `craft + bind` -> fiber pull, wood scrape, tightening creak.
- `craft + crush` -> stone grind and herb crush.

The first implementation should add pure mapping helpers in `src/lib/audio/audio-feedback.ts`. Domain data may provide material tags, but audio modules must not be imported back into pure domain modules.

## 9. First Sound Content List

First-pass procedural/layered definitions:

- UI: button click, tab switch, panel open, panel close, invalid action, recipe discovered.
- Gathering: tree hit, branch snap, leaf gather, stone pickup, stone hit, clay pull, water collect, fiber pull, bark peel.
- Crafting: success, failure, bind fiber, cut material, scrape stone, crush herb, boil water, cook meat, rack placement.
- Combat: light swing, heavy swing, knife flesh hit, spear thrust, axe chop, wood hit, stone hit, flesh hit, miss, glancing hit, player hurt, enemy hurt, death.
- Environment: campfire loop, ignition, low fuel, rain loop, wind loop, river loop, night ambience.
- Entities: wolf howl distant, wolf growl close, boar snort, boar charge, rabbit flee, deer alert.

## 10. Implementation Phases

1. Document and audit the existing audio system.
2. Extend the registry shape for buses, layers, metadata, and validation.
3. Add the new public audio API while keeping compatibility.
4. Add loop handles for ambient/entity/station sounds.
5. Add layered procedural sound definitions for core repeated actions.
6. Add material-aware mapping helpers.
7. Route high-value gameplay feedback through routers and mapping helpers.
8. Add licensed sample metadata before importing any real samples.
9. Playtest mix, repetition, distance, and action readability.
10. Retire direct `playSound` calls once event routing is complete.

## 11. Next 10 Concrete Tasks

1. Add `AudioBusId`, layer definitions, loop metadata, and source metadata types.
2. Add registry validation tests for bus IDs, layer references, and recipe references.
3. Add `play`, `playAt`, `startLoop`, and `stopLoop` wrappers in `audio-engine.ts`.
4. Add generated/layered definitions for tree, stone, clay, water, craft, combat, UI, fire, rain, wolf, and boar.
5. Add `sound-assets.ts` with generated/internal metadata entries and no external files yet.
6. Add `audio-feedback.ts` material mapping helpers for impact, gather, craft, combat, entity, and environment events.
7. Migrate crafting feedback in `rpg-feedback-router.ts` to semantic sound IDs.
8. Migrate core feedback router combat hit/swing selection to semantic mapped IDs.
9. Migrate gathering hit/depletion calls to material-aware mapping where position is known.
10. Playtest and tune bus volumes, gains, cooldowns, and loop intervals in-game.

## 12. Manual Verification Checklist

- UI click, tab, panel open/close, and invalid action are quieter than gameplay.
- Tree hits sound fibrous and heavier than leaf gathering.
- Stone hits sound sharper and grittier than wood.
- Clay and water gathering are distinct from stone and leaf sounds.
- Craft success and failure communicate assembly versus collapse.
- Recipe discovery feels noticeable but not sparkly or loud.
- Combat swing, miss, flesh hit, wood hit, stone hit, and death are distinct.
- Repeating a gathering action ten times does not produce identical pitch/gain spam.
- Campfire and rain loops start and stop without stacking into volume flood.
- Wolf howl reads distant; growl reads close.
- Boar charge is heavier and more urgent than ordinary animal movement.
- Settings sliders and mute affect the correct buses.
- No external audio file exists without metadata and license/source notes.
