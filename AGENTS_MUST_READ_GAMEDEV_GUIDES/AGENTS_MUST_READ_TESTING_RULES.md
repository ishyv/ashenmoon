## Testing Rules: Protect Behavior, Do Not Perform Rituals

Tests are required when they protect meaningful behavior. They are not required as a mindless checkbox for every edited line of code.

A good test proves that an important rule in the game still works after future changes. A bad test only proves that the current implementation looks exactly like itself. Do not waste time writing brittle, shallow, or decorative tests just to satisfy the phrase “write tests.”

### Write Tests For

Write tests when the change includes rules, calculations, state transitions, or logic that can break silently.

Prioritize tests for:

* Pure helper functions.
* Combat formulas.
* Combo detection.
* Swipe/click intent classification.
* Crafting recipe resolution.
* Item trait/effect behavior.
* Survival meter changes.
* Status effect rules.
* Inventory mutations.
* World generation rules when deterministic seeds are available.
* Save/load migrations.
* Edge cases that previously caused bugs.
* Any API where future agents are likely to misunderstand the intended behavior.

Examples of things worth testing:

```txt
basic attack readiness clamps between 0 and 1
rushed attacks cost more stamina
Driving Thrust does not trigger from a fast click
Fourfold Slash requires four unique directions
dirty water can restore thirst but may cause sickness
unknown recipes can still be crafted if the ingredients are correct
item exposure changes depending on storage context
```

These tests protect game rules. They are worth the effort.

### Do Not Write Tests For

Do not write tests that only confirm implementation details, framework behavior, or obvious wiring.

Avoid tests for:

* Simple pass-through functions.
* One-line wrappers with no decision-making.
* Static data unless the data has invariants worth protecting.
* Pixi rendering details that are better checked visually.
* Exact animation timing unless gameplay depends on it.
* CSS/classes/layout unless there is a real regression risk.
* Svelte component internals when the important rule lives elsewhere.
* Mock-heavy tests that only prove that a mocked function was called.
* Snapshot tests that will fail every time harmless UI structure changes.
* Tests that duplicate the code instead of checking behavior.

Bad test example:

```txt
expect(createThing(x)).toEqual(the exact object created by copying createThing's implementation)
```

That is not protection. That is paperwork.

### Prefer Pure, Small, Testable Logic

When a feature is hard to test, first ask whether the logic is in the wrong place.

Good architecture makes important rules testable without needing Pixi, Svelte, the DOM, or the full game loop.

Prefer this:

```txt
pure helper calculates result
system applies result
UI displays result
Pixi renders result
```

Avoid this:

```txt
giant engine function reads input, mutates state, plays sound, spawns VFX, applies damage, updates UI, and decides crafting rules
```

That second version is how codebases become haunted.

### Manual Verification Is Valid For Some Work

Some things should be manually verified instead of unit-tested.

Manual verification is acceptable for:

* VFX readability.
* Animation feel.
* Screen shake.
* Sound timing.
* Visual layering.
* Juice/feedback.
* UI “does this feel clear?” checks.
* Combat feel tuning.
* Playtest-only balance values.

When using manual verification, the agent must say what was manually checked or what still needs to be checked.

Example:

```txt
No automated test added for the slash VFX because the change is visual/rendering-only. Manual check needed: confirm the arc appears above world objects, matches the hitbox radius, and fades cleanly.
```

### When No Tests Are Added

If a change does not include tests, the agent must explicitly explain why.

Acceptable reasons:

```txt
The change only updates comments/documentation.
The change only adjusts visual constants.
The behavior is already covered by existing tests.
The changed code is rendering-only and requires manual visual verification.
The change is temporary debug tooling.
```

Unacceptable reasons:

```txt
No tests because it was faster.
No tests because the code seems simple.
No tests because the agent forgot.
No tests because setting up the test was annoying.
```

### Testing Standard

Write fewer tests, but make them useful.

Every test should answer:

```txt
What rule does this protect?
What future mistake would this catch?
Would this still be valuable if the implementation changes?
```

If the answer is unclear, do not write the test yet. Improve the design first.
