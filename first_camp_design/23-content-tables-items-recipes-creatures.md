# 23 — Content Tables: Items, Recipes, Structures, Creatures

## Purpose

This document provides the first content batch for Milestone 2: First Camp.

These tables are not sacred. They are a practical starting pool.

## Item Pool

### Raw Forest Materials

| Item | Category | Early Uses |
|---|---|---|
| Twig | wood/fuel | fire starter, small crafting |
| Stick | wood/tool | crude tools, drying rack, marker |
| Branch | wood/fuel/building | fuel, shelter, work surface, rack |
| Firewood Bundle | fuel | long-burning campfire fuel |
| Dry Leaves | tinder/plant | fire starter, shelter thatch |
| Wet Leaves | plant | can dry, poor fuel, shelter material |
| Grass Fiber | fiber | binding, rack, tools, shelter |
| Bark / Oak Peel | bark/fiber | binding, tinder, marker/sign |
| Resin | tree product | fire aid, sealing, adhesive later |
| Pine Cone | seed/fuel | fuel, small fire aid |
| Acorn | food/seed | food processing later |
| Berries | food | eating, drying, animal food later |
| Mushroom | food/risk | eating, poison/sickness, cooking later |
| Wild Herb | medicine | weak medicine, drying |
| Moss | absorbent/plant | bandage aid, tinder if dry later |
| Wild Root | food/medicine | food/processing |
| Loose Stone | stone | campfire ring, tool head, work surface |
| Flat Stone | stone/station | work surface, crushing |
| Flint Shard | sharp/stone | crude knife, sparks/cutting |
| River Pebble | stone | crafting, marker, throwing later |
| Clay | clay | container, sealing, hardened clay |
| Mud | mud | sealing paste, construction |
| Dirty Water | water/risk | thirst, boiling |
| Boiled Water | water/safe | thirst, medicine |
| Ash | byproduct | sealing paste, lye/medicine later |
| Charcoal | byproduct/fuel | notes, fuel, filtering later |
| Raw Meat | food | cooking, drying |
| Cooked Meat | food | hunger recovery |
| Dried Meat | food | preserved food |
| Bone Shard | bone/tool | crude tool, needle/hook later |
| Feather | animal | arrows/decoration/notes later |

## Processing Outputs

| Input / Context | Output | Notes |
|---|---|---|
| Wood + Fire | Charcoal + Ash | Teaches fire transforms items |
| Dirty Water + Fire + Container | Boiled Water | Core survival chain |
| Clay + Heat | Hardened Clay | Container/pottery path later |
| Mud + Ash | Sealing Paste | Simple material reaction |
| Fresh Herb + Drying Rack | Dried Herb | Preservation/medicine path |
| Raw Meat + Fire | Cooked Meat | Food chain |
| Raw Meat + Drying Rack | Dried Meat | Preservation chain |
| Wet Leaves + Drying Rack / Fire proximity | Dry Leaves | Tinder/shelter |
| Wet Fiber + Drying Rack | Dry Fiber | Binding quality |

## Recipe Pool

### Survival / Water

| Recipe | Inputs | Context | Output | Discovery Logic |
|---|---|---|---|---|
| Boil Water | Dirty Water + Container | Campfire | Boiled Water | discovered by boiling or sickness after raw water |
| Weak Herbal Tea | Wild Herb + Boiled Water | Campfire / Work Surface | Weak Medicine / Herbal Water | discovered by experimenting |
| Clay Cup / Crude Vessel | Clay + Heat | Campfire | Hardened Clay Container | discovered by heating clay |
| Sealed Vessel | Hardened Clay Container + Sealing Paste | Work Surface | Sealed Container | later/optional |

### Fire / Fuel

| Recipe | Inputs | Context | Output | Discovery Logic |
|---|---|---|---|---|
| Campfire | Stones + Twigs + Dry Leaves + Branch | Placement | Campfire | survival need / experimentation |
| Firewood Bundle | Branches/Sticks | Hand / Work Surface | Firewood Bundle | discovered by bundling fuel |
| Charcoal | Wood + Fire | Campfire | Charcoal + Ash | observed from burned wood |
| Tinder Bundle | Dry Leaves + Bark/Fiber | Hand | Tinder Bundle | discovered by inspecting dry materials |

### Tools

| Recipe | Inputs | Context | Output | Discovery Logic |
|---|---|---|---|---|
| Crude Knife | Stick + Flint Shard + Grass Fiber | Work Surface / Hand | Crude Knife | experiment / sharp trait |
| Stone Scraper | Flint/Sharp Stone + Fiber | Work Surface | Stone Scraper | experiment |
| Simple Binding | Grass Fiber + Bark | Hand | Binding Cord | experiment |
| Stone Hammer | Stick + Loose Stone + Fiber | Work Surface | Crude Hammer | later if needed |

### Medicine / Wounds

| Recipe | Inputs | Context | Output | Discovery Logic |
|---|---|---|---|---|
| Weak Medicine | Wild Herb + Boiled Water | Campfire / Work Surface | Weak Medicine | experiment / NPC later |
| Moss Dressing | Moss + Dry Fiber | Hand / Work Surface | Crude Dressing | inspect absorbent trait |
| Ash Poultice | Ash + Wild Herb + Water | Work Surface | Crude Poultice | risky/experimental |

### Food

| Recipe | Inputs | Context | Output | Discovery Logic |
|---|---|---|---|---|
| Cooked Meat | Raw Meat | Campfire | Cooked Meat | obvious fire use |
| Dried Meat | Raw Meat | Drying Rack | Dried Meat | station use |
| Dried Berries | Berries | Drying Rack | Dried Berries | preservation experiment |
| Roasted Root | Wild Root | Campfire | Roasted Root | cooking experiment |
| Roasted Acorn | Acorn | Campfire | Roasted Acorn | cooking experiment |

### Camp Structures

| Structure | Inputs | Purpose |
|---|---|---|
| Campfire | Stone + Twigs + Dry Leaves + Branch | warmth, fire processing, light |
| Drying Rack | Sticks/Branches + Fiber | drying food/herbs/materials |
| Primitive Work Surface | Flat Stone/Log + Branch + Binding | controlled crafting |
| Crude Shelter | Branches + Leaves + Fiber + Bark | cold/rain protection |
| Marker/Sign | Stick + Bark/Flat Wood + Charcoal | navigation/camp marking |

## Creature Table

| Creature | Role | Default Attitude | Main Behaviors | Player Lesson |
|---|---|---|---|---|
| Rabbit | small prey | fearful | wander, graze, flee | animals can be hunted/flee |
| Deer | large prey | fearful | graze, flee, lead movement | forest has life and movement |
| Boar | neutral danger | territorial | forage, threaten, charge | not all danger is evil/predator |
| Wolf | predator | hostile if hungry/territorial | patrol, hunt, howl, attack | woods are dangerous, fire matters |

## Events Table

| Event | Trigger | Feedback | Gameplay Meaning |
|---|---|---|---|
| Wolf Howl | near wolf territory / dusk / random | directional howl audio | predator warning |
| Animal Hunt | predator/prey nearby | chase/combat movement | ecology exists |
| Bird Flock Reveal | corpse/berries/water/landmark exists | birds rise/circle/caw | natural exploration clue |
| Rain | weather roll/time | rain visuals/audio, darker world | fire/drying/cold pressure |
| Dusk/Night | time of day | darkness/cold | campfire/shelter matter |

## Content Priorities

### Must Implement First

- campfire
- primitive work surface
- dirty water -> boiled water
- wood -> charcoal/ash
- crude knife
- drying rack
- raw meat -> cooked/dried meat
- wild herb -> weak medicine
- wolf howl event
- rabbits/deer fleeing

### Implement Second

- boar threat/charge
- wolf hunting prey
- rain affecting campfire/drying rack
- shelter cold/rain protection
- bird flock reveal
- marker/sign

### Later

- dropped food attracting animals
- NPC recipe teaching
- advanced containers
- infection/complex wounds
- detailed smell/sound investigation
