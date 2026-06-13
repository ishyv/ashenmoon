# 18 — Crafting and Discovery Redesign

## Problem

Crafting is currently the central dependency for the first 10–20 minutes, but it risks being boring if it is only:

```txt
open menu
place ingredients
click button
receive item
```

That is not enough for Ashenmoon.

Crafting must answer:

- why is mixing items fun?
- how does the player learn recipes?
- what does physical processing mean?
- how does the system avoid becoming arbitrary keyword magic?
- why should the player care about items beyond icons in a grid?

## Design Position

Crafting in Ashenmoon is not just recipes.

It is a layered system:

```txt
Item traits + processing context + player experiment + world state = result
```

Recipes are not permission.

Recipes are memory, convenience, and UI shortcuts.

## Core Rule

```txt
The player can craft unknown recipes if they combine the right materials in the right context.
```

After success, the recipe becomes known/discovered.

## Crafting Pillars

### 1. Survival Problem Solving

Crafting should solve immediate problems:

- make water safer
- create fire
- process food
- treat wounds
- make tools
- create shelter
- create storage/markers

### 2. Physical Processing

Items change through processes:

- heating
- boiling
- drying
- cutting
- binding
- crushing
- mixing
- sealing
- cooking
- burning

### 3. Material Behavior Sandbox

Items have properties that matter:

- flammable
- sharp
- fibrous
- absorbent
- medicinal
- toxic
- edible
- wet/dry
- fragile
- container-like
- fuel-like

### 4. Discovery and Memory

The player learns through:

- experimentation
- inspecting item traits
- NPC teaching later
- suffering consequences
- using stations
- observing reactions

## Recipe as Shortcut

A discovered recipe should allow faster crafting through UI.

Before discovery:

```txt
Player manually combines/processes items.
If correct, output appears and recipe is learned.
```

After discovery:

```txt
Recipe appears in known recipe list.
Player can craft it quickly if requirements/context are met.
```

This makes the recipe list a reward, not a prison.

## Interaction Feedback

Mixing should be satisfying even when the result is small.

Every significant crafting/process attempt should provide at least one of:

- sound
- small animation
- particles
- material color/shape change
- smell/texture text in inspect panel
- item knowledge update
- floating feedback if appropriate

Examples:

```txt
mud + ash -> dark paste smears together
herb + boiled water -> water tints green/brown
wood + fire -> sparks, smoke, charcoal remains
clay + heat -> hardening crackle
flint + stick + fiber -> wrapping/binding animation
```

Do not make crafting silent. Silent crafting feels dead.

## Crafting Contexts

Crafting results may depend on context.

### Hand / Inventory Crafting

Good for:

- tying fiber
- combining small objects
- crude knife
- bark binding
- simple bundle

### Campfire

Good for:

- boiling
- cooking
- burning
- charcoal
- ash
- hardening clay

### Primitive Work Surface

Good for:

- tool assembly
- crushing
- cutting
- controlled mixing
- recipe UI anchor

### Drying Rack

Good for:

- drying herbs
- drying meat
- drying hide
- drying wet fiber/leaves

### Crude Shelter

Good for:

- resting
- weather protection
- cold mitigation
- simple camp identity

## Unknown Recipe Flow

```txt
Player selects item A + item B + optional station/context
  ↓
System checks valid reactions/recipes
  ↓
If valid:
    consume/transform inputs
    create output
    play feedback
    record discovered recipe/result
  ↓
If invalid but meaningful:
    play weak/no-result feedback
    maybe record observation
  ↓
If dangerous:
    apply consequence and record knowledge
```

## Meaningful Failure

Not every failed recipe should create content, but failures should sometimes teach.

Examples:

```txt
wet leaves near fire smoke heavily but do not ignite well
raw mushroom + dirty water makes foul slurry, no useful result
sharp flint handled carelessly can cut hand
poisonous mushroom eaten causes sickness/poison
```

## Recipe Categories

Use categories for organization:

- survival
- tools
- medicine
- food
- fuel/fire
- material processing
- structures
- notes/knowledge

## Early Crafting Must Support

- campfire creation/use
- water boiling
- food cooking
- weak medicine
- crude knife/tool
- charcoal/ash
- drying rack use
- simple shelter components
- marker/sign
- primitive work surface

## Implementation Shape

Avoid hardcoding everything as imperative if possible.

Definitions should describe:

- inputs
- required context/station
- process type
- time
- output
- discovered knowledge
- feedback tags

Systems execute:

- validation
- consumption
- transformation
- knowledge update
- station timing
- feedback event emission

## Example Recipe Definition Sketch

```ts
interface CraftingRecipeDefinition {
  id: RecipeId;
  name: string;
  category: CraftingCategory;
  inputs: RecipeInputRequirement[];
  requiredContext?: CraftingContextId;
  process: CraftingProcessId;
  durationMs?: number;
  outputs: RecipeOutput[];
  discoverable: boolean;
  discoveryText?: string;
  feedbackTags?: string[];
}
```

## Required Tests

- unknown valid recipe can be crafted
- successful unknown recipe becomes discovered
- discovered recipe appears as shortcut
- recipe requiring campfire fails without campfire
- processing recipe transforms items over time if timed
- dangerous consequence records knowledge
- invalid recipe does not corrupt inventory/state
