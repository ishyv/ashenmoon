# Feature Specification: Crafting System Rework

**Feature Branch**: `001-crafting-system-rework`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: "we need to write or plan for the spec of the rework of the crafting system"

## Background

An earlier review of crafting found it functionally flat: every crafted item of
a given recipe was identical, crafting was instant with no risk or ceremony,
and the Craftsmanship skill existed with nothing to grant it experience or
consume its bonus. A first slice of this rework — quality tiers and a hidden
curse mechanic — has already been delivered and is treated below as the
foundation the remaining user stories build on (see User Story 1). This spec
covers the full intended shape of the rework so the remaining work can be
planned against one document.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crafted items earn a quality that reflects skill and luck (Priority: P1) — DELIVERED

A player crafts a weapon or tool and the result is not guaranteed to be
identical every time: better skill and better materials make a fine result
more likely, a rare few crafts produce something exceptional, and — separately
— a small and rising chance exists for the item to come out subtly wrong in a
way nobody warns the player about.

**Why this priority**: This is the single highest-leverage fix identified in
the original critique — "every Stone Axe you'll ever craft is bit-for-bit
identical" — and is the foundation every other story in this spec depends on.

**Independent Test**: Craft the same recipe repeatedly at a fixed skill level
and observe the distribution of outcomes; repeat at a much higher skill level
and observe the distribution shift toward better outcomes.

**Acceptance Scenarios**:

1. **Given** a low-skill crafter with ordinary materials, **When** they craft
   a quality-bearing item, **Then** the result is very likely an ordinary or
   below-average outcome, and an exceptional outcome is effectively
   unreachable.
2. **Given** a high-skill crafter with high-quality materials, **When** they
   craft the same item repeatedly, **Then** above-average outcomes become
   common and, rarely, an exceptional "miracle" outcome can occur.
3. **Given** any craft regardless of skill, **When** the hidden affliction
   roll succeeds, **Then** the item carries one or more small disruptive
   behaviors for its entire lifetime, with no upfront indication that it is
   affected.
4. **Given** an item that already has a rolled quality or hidden affliction,
   **When** the player equips it, unequips it, or the game is saved and
   reloaded, **Then** that quality and affliction state is unchanged.

---

### User Story 2 - Quality changes how an item performs, not just how it looks (Priority: P2)

A player who crafts or acquires a higher-quality weapon or tool feels the
difference in play — it performs measurably better than a lower-quality
version of the same item — and a hidden affliction is something the player
eventually notices through unexplained, situational disruption rather than a
label.

**Why this priority**: Without this, quality is cosmetic. This is the natural
next step that makes the investment described in User Story 1 matter in
actual play, and was explicitly identified as not yet delivered.

**Independent Test**: Equip an ordinary-quality and an exceptional-quality
version of the same weapon in turn and compare their measurable effect (e.g.
damage dealt under identical conditions).

**Acceptance Scenarios**:

1. **Given** two instances of the same weapon recipe at different quality
   tiers, **When** each is used in combat under identical conditions, **Then**
   the higher-quality one performs measurably better, within a range
   appropriate to its tier.
2. **Given** an item with a hidden affliction, **When** the player carries or
   uses it during play, **Then** its disruptive behavior(s) occasionally and
   unpredictably manifest, without any on-screen confirmation that the item is
   afflicted.

---

### User Story 3 - Crafting costs meaningful time (Priority: P3)

A player who starts crafting something must wait for it to complete rather
than receiving it instantly, and a more skilled crafter waits less.

**Why this priority**: Addresses the "instant, no stakes" critique directly —
crafting is currently synchronous and risk-free, which sits at odds with the
survival tension the rest of the game maintains.

**Independent Test**: Start a craft and confirm the item is unavailable until
a visible duration elapses; compare that duration at two different skill
levels for the same recipe.

**Acceptance Scenarios**:

1. **Given** a recipe with a time cost, **When** a player starts crafting it,
   **Then** the resulting item is not available until that time has passed.
2. **Given** two crafters at different skill levels making the same recipe,
   **When** each starts crafting, **Then** the more skilled crafter's item
   completes sooner.
3. **Given** a player who is crafting, **When** they are attacked, move away,
   or close the crafting panel, **Then** the craft continues unattended in
   the background and completes normally — leaving never cancels it or loses
   materials, since a timed craft is anchored to a station rather than
   something carried in the player's pockets. Only an explicit cancel action
   aborts it (and refunds everything, since materials aren't deducted until
   completion).

---

### User Story 4 - Completing a craft feels earned (Priority: P4)

A player who finishes crafting something receives feedback proportional to
what they just made — a routine result feels satisfying to complete, and a
rare or exceptional result feels distinctly more so — instead of the current
near-silent handoff.

**Why this priority**: Closes the "click produces a beep and silence" gap
identified in the original critique, where an accidental recipe discovery
currently gets more on-screen acknowledgment than a deliberate, successful
craft. Lower complexity and risk than Stories 2-3, but meaningfully improves
the moment-to-moment feel of the loop those stories depend on.

**Independent Test**: Complete a craft and observe that feedback is present
and scales with how notable the outcome was, without ever announcing a hidden
affliction outright.

**Acceptance Scenarios**:

1. **Given** an ordinary successful craft, **When** it completes, **Then**
   the player receives clear, distinct acknowledgment beyond the current
   generic sound cue.
2. **Given** a rare or exceptional outcome, **When** it completes, **Then**
   the acknowledgment is more pronounced than for an ordinary outcome, while
   an affliction (if present) is never explicitly announced.

---

### User Story 5 - One consistent way to make things (Priority: P5)

A player encountering two different ways to produce a similar result (for
example, cooking meat by hand versus at a station) experiences one consistent
set of rules for timing, quality, and discovery, rather than two unrelated
systems that happen to produce overlapping outputs.

**Why this priority**: An internal-consistency fix rather than a directly
felt player pain point today, but left alone it will keep producing confusing
duplicate content (already true for at least one item) as more of this rework
lands. Lowest priority because it is corrective rather than additive.

**Independent Test**: Identify an item currently producible through more than
one crafting path and confirm both paths now follow the same rules.

**Acceptance Scenarios**:

1. **Given** an item previously producible through two different crafting
   paths with different rules, **When** either path is used after this
   rework, **Then** timing, quality eligibility, and discovery behavior are
   consistent between them.

---

### Edge Cases

- What happens if a recipe consumes several different ingredients that
  themselves carry different quality tiers — how do they combine into the
  resulting item's quality odds?
- What happens to bulk, stackable materials (e.g. bandages, rope) — do they
  need individual quality tracking, or does the rework deliberately exclude
  them?
- What happens if a hidden affliction's disruptive behavior fires while the
  player is already in a dangerous situation (e.g. mid-combat) — is that
  considered part of the intended risk, or does it need a safeguard?
- What happens to an item's already-rolled quality and affliction state if
  the recipe that produced it is later changed or removed from the game?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST assign each crafted item, for recipes
  designated as quality-bearing, a discrete quality tier at the moment of
  crafting, ranging from a common baseline up to an exceptionally rare top
  tier. *(Delivered)*
- **FR-002**: The likelihood of a higher quality tier MUST increase with the
  crafter's skill and the quality of materials used, while the rarest tier
  MUST remain possible-but-vanishingly-rare regardless of skill. *(Delivered)*
- **FR-003**: The system MUST support an independent chance for a crafted
  item to become afflicted, where both the odds and severity of the
  affliction increase with crafter skill. *(Delivered)*
- **FR-004**: An afflicted item's disruptive behavior(s) MUST NOT be
  disclosed to the player at crafting time or ever explicitly confirmed;
  at most, vague and unreliable sensory hints are permitted. *(Delivered)*
- **FR-005**: A crafted item's quality tier and affliction state MUST persist
  correctly through equipping, unequipping, and saving/loading. *(Delivered)*
- **FR-006**: The system MUST NOT require individual quality tracking for
  bulk/stackable materials where item-level identity has no player-facing
  meaning. *(Delivered)*
- **FR-007**: The system MUST let a crafted item's quality tier influence its
  functional performance (e.g. combat effectiveness, durability) relative to
  the same item at a different quality tier.
- **FR-008**: The system MUST require a period of time to pass between
  starting and receiving a craft, for recipes designated as time-costed, and
  that period MUST decrease as the crafter's skill increases.
- **FR-009**: The system MUST [NEEDS CLARIFICATION: interruption behavior
  during a timed craft — see User Story 3, Acceptance Scenario 3].
- **FR-010**: The system MUST give the player distinguishable completion
  feedback for a craft, scaled to how rare or notable the outcome was.
- **FR-011**: The system MUST apply one consistent set of rules for timing,
  quality eligibility, and discovery to any item producible through more than
  one crafting path. Resolved: simple items stay hand-craftable and instant;
  anything complex enough to require processed materials or meaningful time
  is station-gated and becomes the unattended, walk-away timed process —
  station processing is the converged model for that half of crafting, hand
  crafting remains the quick/simple half, rather than forcing everything
  into one shape. An attended player may additionally engage a skill-based
  minigame during a station craft to improve its odds (see FR-013); this is
  always optional and never makes an unattended craft worse than it is
  today.
- **FR-012**: The system MUST determine, for each recipe, whether it is
  "quality-bearing" (subject to FR-001–FR-007) automatically from the output
  item's category (at minimum: weapons and tools), so newly added items in
  those categories inherit quality-bearing status without a manual per-item
  flag; a recipe may still explicitly opt out for a specific exception (e.g.
  simple utility tools that aren't meant to feel like "gear").
- **FR-013**: The system MUST offer an optional skill-based minigame while a
  player is attending a timed station craft, where minigame performance
  contributes to the quality-tier roll alongside crafter skill and material
  quality. Not engaging the minigame (walking away, or standing by without
  playing) MUST reproduce the odds a craft would have gotten without this
  feature at all — never worse. Engaging and performing well MUST be the
  only path to the rarest top-tier outcomes, which are unreachable by an
  unattended craft regardless of crafter skill.

### Key Entities

- **Crafted Item Instance**: An individual result of crafting a
  quality-bearing recipe. Carries a quality tier, an optional affliction
  state, and — for the rarest tier — a unique, non-repeatable designation.
  Distinct from an ordinary stack of interchangeable materials.
- **Quality Tier**: An ordered rank, from common to exceptionally rare,
  describing how well a craft turned out. Determines a crafted item's
  functional performance and its visible presentation.
- **Affliction**: An optional, hidden, permanent condition attached to a
  crafted item, independent of its quality tier. Carries one or more small
  disruptive behaviors that manifest unpredictably during play and are never
  explicitly disclosed to the player.
- **Craftsmanship (skill)**: The player's crafting proficiency. Grows through
  crafting activity and governs quality-tier odds, affliction odds/severity,
  and crafting speed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Across many crafts of the same recipe, the observed
  distribution of quality tiers shifts measurably toward higher tiers as
  crafter skill and material quality increase.
- **SC-002**: A small, consistent proportion of crafted items carry a hidden
  affliction, discoverable only through play and never through pre-use
  inspection.
- **SC-003**: A top-tier crafted item measurably outperforms a common-tier
  item of the same recipe under identical conditions.
- **SC-004**: The time between starting and completing a timed craft is
  greater than zero and decreases measurably as crafter skill increases.
- **SC-005**: Players completing an ordinary craft report or demonstrate
  noticing clear completion feedback, not just a generic sound.
- **SC-006**: An item previously producible through two different crafting
  paths is, after this rework, indistinguishable in its rules regardless of
  which path was used.
- **SC-007**: The rarest quality outcomes only occur on crafts where the
  player actively engaged the attended minigame; unattended crafts of the
  same recipe never produce them, no matter how many attempts are made.

## Assumptions

- User Story 1 (quality tiers and hidden afflictions) is already delivered
  and is treated as a stable foundation, not re-specified from scratch.
- Manual playtest remains an acceptable way to verify subjective feel (e.g.
  SC-005), consistent with existing project practice; this spec does not
  require new analytics or telemetry infrastructure.
- Afflictions remain restricted to minor, non-fatal disruptions; this rework
  is not expected to introduce lethal or permanently crippling downside risk.
- The existing Craftsmanship skill continues to be the sole mechanism
  governing crafting proficiency; this spec does not introduce a second,
  separate crafting-skill system.
- Quality-bearing status, at minimum, applies to weapons and tools already
  identified as combat-relevant, derived automatically per FR-012; a small
  number of specific tool recipes may be excluded by deliberate exception
  where "quality-tiered gear" doesn't fit the item (e.g. simple utility
  tools consumed as crafting steps rather than carried as gear).
- The attended minigame (FR-013) reuses this game's existing category of
  precision-timing interactions (already used for gathering, butchering, and
  building placement) rather than introducing an unrelated minigame genre.
