# Game Feel and Feedback Guidelines

Game code is not finished when the state changes. It is finished when the player can understand and feel the state change.

## Feedback Loop

Every important action should follow this loop:

```text
Intent → Anticipation → Action → Impact → Result → Recovery
```

Example: gathering a resource.

```text
Player targets node
→ node highlights
→ player starts gathering
→ progress / animation / sound begins
→ particles appear on gather ticks
→ resource is added
→ node changes visual state or disappears
→ UI/inventory confirms the gain
```

If this loop is missing, the mechanic may feel dead even if it is logically correct.

## Feedback Types

Use feedback intentionally. Not every action needs every category.

### Visual Feedback

- highlight selected/hovered objects;
- show interactable states;
- use particles for hits, gathering, crafting, pickups;
- show impact flashes or color changes;
- show disabled/error states;
- show progress bars or radial timers where useful.

### Audio Feedback

- action start sound;
- looping work sound;
- impact sound;
- success sound;
- failure/blocked sound;
- UI click/hover sound;
- enemy hurt/death sound.

### Motion Feedback

- animation state changes;
- hit reactions;
- squash/stretch if style allows;
- knockback;
- camera shake only for important impacts;
- short hit-stop for combat if appropriate.

### UI Feedback

- inventory count changes;
- damage numbers;
- health bars;
- cooldown timers;
- status icons;
- tooltips;
- action prompts;
- error messages.

## Mechanic Feedback Checklist

When implementing a mechanic, answer:

- How does the player know this object can be used?
- How does the player know the action started?
- How does the player know the action is progressing?
- How does the player know the action succeeded?
- How does the player know the action failed?
- How does the world visually change afterward?
- Is the feedback readable at gameplay speed?

## Combat Feedback Checklist

When implementing damage/combat:

- target reaction;
- hit VFX;
- hit SFX;
- damage number or clear health change;
- attacker animation;
- cooldown or recovery feedback;
- death feedback;
- miss/block/immune feedback;
- health bar update;
- state transition documentation.

## Gathering Feedback Checklist

When implementing gathering:

- node highlight/interact prompt;
- gathering animation;
- gathering progress or timing feedback;
- particles at contact/resource point;
- sound on start/tick/success;
- inventory/resource UI update;
- node depletion/change;
- failure state if inventory is full, tool missing, or player moves away.

## Rule of Thumb

If the mechanic changes state but the player cannot tell what happened, the mechanic is unfinished.
