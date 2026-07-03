# Quickstart & Verification: High-Fidelity Ecosystem

This document describes how to execute, verify, and test the biological lifecycles, ethological patterns, biome mutations, and trophic cascades in the codebase.

---

## 1. Unit Verification Scenarios

We verify pure rules and logic using unit tests in the domain layer. Run these tests to confirm calculation correctness:

### Scenario 1: Extended Needs & Lifecycle Growth
- **Goal**: Verify that animals age, decay needs (hunger, thirst, energy), scale stats/size, and transition stages.
- **Command**:
  ```bash
  bun test src/lib/domain/animals/needs.test.ts
  ```
- **Expected Outcome**:
  - Hunger/thirst increase, and energy decays while awake.
  - Life stages transition correctly: `juvenile` -> `adult` -> `elder` -> `dead` (natural death).
  - Stats (Max HP, speed, damage) scale up or down based on life stage.

### Scenario 2: Birth, Gestation & Denning Loop
- **Goal**: Verify that courtship selection occurs, gestation proceeds, the female retreats to her den, and emerges with follower offspring.
- **Command**:
  ```bash
  bun test src/lib/domain/animals/reproduction.test.ts
  ```
- **Expected Outcome**:
  - Two sated adults in proximity initiate courtship.
  - Female enters pregnant state, gestation timer counts down, and hunger decay doubles.
  - Female relocates to nest/den coordinate at 80% gestation and emerging spawns follow kit entities linked to her.

### Scenario 3: Wallowing, Rooting & Biome Mutations
- **Goal**: Verify boar soil-rooting cell changes, mud wallowing armor gains, and biome-specific trait variations.
- **Command**:
  ```bash
  bun test src/lib/domain/animals/mutations-wallowing.test.ts
  ```
- **Expected Outcome**:
  - Wallowing in mud pools adds mud coat armor.
  - Rooting grass cells transforms them to dirt cells and spawns pickups.
  - Biome mutations apply correct traits (e.g. Frostbane snow camouflage, Fungal Mire toxic armor, Scorched Wastes nocturnal sleep).

### Scenario 4: Trophic Cascades & Rotten Decomposition Spawning
- **Goal**: Verify herbivores eat/deplete vegetation, and rotting carcasses fertilize soil to spawn flora.
- **Command**:
  ```bash
  bun test src/lib/domain/animals/ecosystem-impact.test.ts
  ```
- **Expected Outcome**:
  - Rabbits/deer eating grass/shrub depletion deletes nodes.
  - Rotten carcass dissolution sets a fertilized flag on local coordinates and spawns 1-3 new plant/mushroom pickups.

---

## 2. Manual Smoke Verification Scenarios

To verify visual animations, sound clips, and VFX in the running game, start the dev server:
```bash
bun run dev
```

### Scenario 5: Visual Grazing & Drinking Animations
1. Locate a hungry herbivore (rabbit or deer).
2. Follow it as it approaches a grass patch or pond.
3. Observe:
   - Grazing: Animal tilts head down, chewing sound effect plays, green leaf particles fly from the ground.
   - Drinking: Animal approaches water edge, head bobs, ripple rings VFX appear at mouth, drinking slurp sound plays.

### Scenario 6: Rabbit Foot-Thumping & Alert Propagation
1. Approach a wild rabbit warren.
2. Step close enough to alert one rabbit but not the others.
3. Watch the alerted rabbit thump its hind legs.
4. Verify:
   - Dust ring VFX expands from the thumping rabbit.
   - Thumping sound effect plays.
   - Nearby rabbits in the warren immediately change their status to alert/fleeing and run to their burrows.

### Scenario 7: Boar Mud Wallowing & Soil Rooting
1. Locate a boar near a mud pool or wet swamp tile.
2. Watch it enter the wallow state.
3. Verify:
   - Splash mud particle VFX and squelching sound play.
   - Boar sprite gains a visible mud-covered texture/tint.
   - HUD examination confirms "Mud Coated" status armor buff.
4. Watch the boar root the soil.
5. Verify:
   - Grass tile turns into dirt.
   - A stone or root pickup spawns.

### Scenario 8: Wolf Howling & Pack Hunts
1. Walk into wolf territory at night.
2. Watch the alpha wolf howl.
3. Verify:
   - Howling sound effect plays.
   - Soundwave ring VFX pulses outward.
   - Nearby wolves join the hunt, moving at increased speed.
4. Observe a wolf hunt on a deer:
   - One wolf chases the deer from behind.
   - Two other wolves run to the sides (flank vectors) to intercept the deer.

### Scenario 9: Spectator Mode & Real-time Debug Overlays
1. Open the Developer Console (press backtick key `~`).
2. Type `player.spectator(true)` and press Enter.
3. Verify:
   - The player sprite becomes completely invisible.
   - The player can fly through walls, water, and obstacles (noclip is enabled).
   - Speed is tripled when flying.
   - The player's survival needs (hunger, thirst, etc.) stop decaying.
   - A floating Svelte HUD card "spectator mode" appears in the top-left showing telemetry.
   - Floating debug labels appear in real-time above every animal entity on the screen, showing its ID, lifeStage, HP, behavior state, hunger, thirst, and energy.
4. Type `player.spectator(false)` to exit spectator mode. Verify standard player rendering, collision, and survival needs resume.

