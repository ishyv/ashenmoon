# Feature Implementation Checklist

Before implementing:

- [ ] Define player-facing purpose.
- [ ] Identify affected state.
- [ ] Identify required components/data.
- [ ] Identify systems involved.
- [ ] Identify events/hooks needed.
- [ ] Identify visual/audio/UI feedback.
- [ ] Identify failure states.
- [ ] Identify reuse opportunities.
- [ ] Identify verification steps.

During implementation:

- [ ] Prefer reusable components over one-off logic.
- [ ] Keep core logic separate from UI/feedback.
- [ ] Use explicit types.
- [ ] Avoid broad `any` or careless casts.
- [ ] Avoid hardcoded entity-specific branches.
- [ ] Avoid unnecessary abstractions.
- [ ] Add comments only for non-obvious logic.

Before finishing:

- [ ] Mechanic works in normal case.
- [ ] Failure states are safe/readable.
- [ ] Player gets feedback.
- [ ] UI updates correctly.
- [ ] Types are not weaker.
- [ ] Documentation explains intent.
- [ ] Verification was performed or clearly listed.
