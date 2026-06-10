# Game UI/UX Guidelines

The UI should help the player understand the game quickly and act without friction.

## UI Philosophy

The UI should be:

- readable;
- fast to use;
- visually consistent;
- close to where the player expects it;
- informative without being noisy;
- responsive to game state;
- styled to match the game’s identity.

Do not make the player hunt for common actions.

## Layout Rules

Common player needs should be easy to access:

- health/status near the player’s attention area;
- inventory/resources in predictable locations;
- interact prompts near the object or player;
- combat feedback near the target;
- menus with clear grouping;
- tooltips close to hovered/focused items.

## Visual Hierarchy

The UI should clearly distinguish:

- primary actions;
- secondary actions;
- disabled actions;
- selected targets;
- warnings/errors;
- background decoration.

Use size, contrast, spacing, and position. Do not rely only on color.

## Feedback Rules

UI should reflect state changes:

- resource count changes;
- item gained/lost;
- damage received;
- cooldown active;
- ability unavailable;
- invalid action reason;
- quest/progress updates if relevant.

## Interaction Rules

Common actions should be fast:

- minimal clicks for frequent actions;
- consistent hotkeys;
- clear hover/focus/selected states;
- no hidden required interactions;
- no ambiguous buttons.

## Visual Style

The UI can be expressive, but clarity comes first.

Use:

- consistent spacing;
- consistent typography;
- intentional colors;
- readable contrast;
- subtle transitions;
- ornaments that support the theme.

Avoid:

- decorative clutter;
- tiny unreadable text;
- inconsistent button styles;
- excessive animation;
- UI that hides important information for aesthetics.

## UI Done Definition

A UI feature is done when:

- the player knows what it does;
- state changes are visible;
- failure states are visible;
- layout works at supported resolutions;
- controls are consistent;
- important elements have hover/focus states;
- styling matches the rest of the game;
- the feature is documented if it introduces new UI patterns.
