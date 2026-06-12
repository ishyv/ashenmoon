import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import type {
  InteractionContext,
  InteractionDefinition,
  RuntimeResourceMap,
} from "$lib/core/runtime/runtime";

export class InteractionDispatcher<TResources extends RuntimeResourceMap = RuntimeResourceMap> {
  private readonly handlers = new Map<string, InteractionDefinition<TResources>>();

  constructor(definitions: readonly InteractionDefinition<TResources>[] = []) {
    for (const definition of definitions) {
      this.register(definition);
    }
  }

  register(definition: InteractionDefinition<TResources>): void {
    if (this.handlers.has(definition.id)) throw new Error(`duplicate interaction: ${definition.id}`);
    this.handlers.set(definition.id, definition);
  }

  dispatch(ctx: InteractionContext<TResources>, target: Entity = ctx.target): boolean {
    const action = target.interactable?.action;
    if (!action) return false;

    const handler = this.handlers.get(action);
    if (!handler) {
      throw new Error(`missing interaction handler: ${action}`);
    }

    handler.handle({ ...ctx, target });
    return true;
  }
}
