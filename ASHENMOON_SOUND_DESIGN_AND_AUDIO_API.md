# Ashenmoon Sound Design Guidelines & Audio API

This document establishes the sound identity, category structure, and placement rules for **Ashenmoon**, serving as a foundation for all future audio work and sound design decisions.

---

## 1. Sound Identity

Ashenmoon is a dark-fantasy survival sandbox RPG. To match its grim atmosphere, the soundscape must feel:

- **Grounded & Organic:** Avoid clean, clinical synthesized waveforms or standard arcade sound libraries. Every sound should sound like it was recorded in a damp forest, an ancient ruin, or a cold mountain peak.
- **Tactile & Rough:** The physical environment is harsh. Hits, scrapes, and movements should have raw textures—grit, dirt, splintering wood, grinding stone, and tearing fiber.
- **Dirty & Unpolished:** No high-gloss "mobile-game shiny" chimes or "fantasy sparkle spam." If magic exists, it is dangerous, volatile, and heavy. If a metal blade strikes, it is slightly rusted, dull, and cold.

---

## 2. Sound Categories (Audio Buses)

Audio is routed through six coarse buses to let players balance their acoustic feedback.

| Bus | Description | Examples |
|---|---|---|
| **master** | Final multiplier applied to all sounds. | System volume cap. |
| **music** | Backing tracks defining the emotional weight. | Main theme, danger themes, camp loops, ambient pads. |
| **sfx** | Direct result of player action and physics. | Woodchopping impact, mining stone clinks, player swings, footsteps. |
| **ui** | Interface cues and non-diegetic game state. | Button clicks, tab switches, recipe discovered cues, inventory hover. |
| **ambient** | Constant environmental loops and world beds. | Forest wind, rain, river loops, campfire crackles. |
| **entities** | Creature, enemy, and NPC vocals/actions. | Wolf warning howls, boar snorts, creature footsteps/growls. |

---

## 3. Sound Placement Rules

Sounds should be triggered where they communicate meaningful physical or mechanical state:

- **Woodchopping (Tree Hit):** A dry, heavy impact transient layered with a dull bark scrape, followed by a slight leaf rustle. The sound volume or pitch could lower as the tree's health depletes.
- **Mining (Stone Hit):** A sharp grit-heavy clink with a metallic ringing decay, layered with falling gravel/dust debris.
- **Crafting Success:** A brief, tactile compilation sound showing the assembly (e.g., fiber tension tightening, wood friction sliding) followed by a low-pitched, resonant harmonic drone (no high-pitched fantasy glissandos).
- **Crafting Failure:** A weak thud, scraping slide, or the sound of materials crumbling/collapsing, communicating that physical effort went to waste.
- **Creature Proximity:** Creature snorts or footsteps must be spatialized in 2D coordinates so players can locate wolves or deer in the dark without seeing them.
- **Wolf warning:** A long-distance howling loop that triggers when the player approaches a wolf territory, providing early warnings before the target is aggressive.
- **Campfire:** A looping crackling sound. The crackle volume and fire hiss frequency should increase with higher fuel levels.
- **Rain:** An ambient, non-diegetic loop that crossfades or increases in volume based on the active storm intensity.

---

## 4. Modern Sound Effect Quality Notes (Layering)

Good game audio is rarely a single recorded sample. It is composed of multiple layers that convey details about the materials involved:

- **Wood Impact:**
  - *Layer 1 (Transient):* High-mid steel-on-bark impact click.
  - *Layer 2 (Body):* Low wood thud representing the weight/thickness of the tree.
  - *Layer 3 (Detail):* Small branch/leaf rustling or bark shards falling.
- **Flesh Strike:**
  - *Layer 1 (Transient):* Blunt force strike (cloth/leather compression).
  - *Layer 2 (Body):* Deep wet/squelch impact transient.
  - *Layer 3 (Detail):* Slight bone-crack or grit texture depending on target armor.
- **Armor Strike:**
  - *Layer 1 (Transient):* Sharp metallic ring or thick leather scrape.
  - *Layer 2 (Body):* Heavy iron thud or hollow wood thump.

---

## 5. Variation Rules (Anti-Fatigue)

Repetitive sounds ruin immersion. All gameplay events should implement variation:

- **Multi-samples:** Any sound played frequently (e.g., footsteps, wood hits, swings) must have at least 3-5 distinct sample variants.
- **Pitch Jitter:** Apply random micro-detuning (e.g., ±50 to ±150 cents) to every play request.
- **Volume Jitter:** Apply random micro-gain scales (e.g., ±5% to ±10%) so consecutive hits have natural variation.
- **Retrigger Cooldowns (Throttling):** Rapidly triggered sounds (like sword hits or rapid inventory clicks) must have a throttle cooldown (e.g., 60-100ms) to prevent clipping and comb filtering.
- **2D Distance Falloff:** World sounds must calculate gain attenuation using a logarithmic curve relative to the listener's center.

---

## 6. What Not To Do

- **No Volume Flooding:** Never play ambient background tracks at full volume. Keep SFX and UI clean, and make sure dialogue/tells are audible.
- **No Float Text Replacement:** Do not rely on floating combat text to tell the player they hit or missed. The sound should make it obvious.
- **No Direct UI Triggers for Game Events:** UI panels should not play sounds based on click events alone if they represent a gameplay action. The sound should trigger when the state updates or when the action resolves.
- **No Identical Spam:** Never let rapid hits trigger the exact same pitch, gain, and sample twice.

---

## 7. Future Audio API

The proposed future Audio API design will expand on our existing foundation, offering direct method access to sound handles and world emitters:

```typescript
export interface AudioEmitter {
  position: { x: number; y: number };
  play(soundId: string, options?: PlayOptions): void;
  stop(): void;
}

export interface SoundSystem {
  // Global controls
  setBusVolume(bus: AudioBusId, volume: number): void;
  getEffectiveVolume(bus: AudioBusId, baseVolume?: number): number;
  
  // Non-diegetic UI / HUD sounds
  play(soundId: string, options?: PlayOptions): void;
  
  // Diegetic world spatialized sounds
  playAt(soundId: string, position: { x: number; y: number }, options?: PlayOptions): void;
  
  // Loop management (e.g. storms, campfires, wind)
  startLoop(soundId: string, options?: PlayOptions): string; // returns loop handle id
  updateLoopPosition(handleId: string, position: { x: number; y: number }): void;
  updateLoopVolume(handleId: string, volumeScale: number): void;
  stopLoop(handleId: string): void;
}
```
