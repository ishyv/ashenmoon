/**
 * Throttle state for the placed-reaction system. Environmental reactions evolve
 * over seconds, not frames, so the system batches real frame time and steps once
 * per `REACTION_STEP_SEC` rather than every render tick.
 */
export class ExposureResource {
  public accumulatorSec = 0;
}
