import type { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import type { PrefabDefinition, PrefabComponentSpec } from "$lib/domain/definition-registry";

export const SYSTEM_PHASES = ["input", "intent", "simulation", "effects", "render", "cleanup"] as const;

export type SystemPhase = (typeof SYSTEM_PHASES)[number];

export interface RuntimeResourceMap {
  [key: string]: unknown;
}

export interface RuntimeContext<TResources extends RuntimeResourceMap = RuntimeResourceMap> {
  world: World<Entity>;
  resources: TResources;
  events: RuntimeEvent[];
  emit(event: RuntimeEvent): void;
  getResource<T>(key: string): T;
}

export interface RuntimeEvent {
  type: string;
  payload?: unknown;
}

export interface ResourceFactory<TResources extends RuntimeResourceMap = RuntimeResourceMap> {
  key: keyof TResources & string;
  create(): TResources[keyof TResources];
}

export interface SystemDefinition<TResources extends RuntimeResourceMap = RuntimeResourceMap> {
  id: string;
  phase: SystemPhase;
  run(ctx: RuntimeContext<TResources>, dt: number): void;
}

export interface InteractionContext<TResources extends RuntimeResourceMap = RuntimeResourceMap> extends RuntimeContext<TResources> {
  target: Entity;
}

export interface InteractionDefinition<TResources extends RuntimeResourceMap = RuntimeResourceMap> {
  id: string;
  handle(ctx: InteractionContext<TResources>): void;
}

export interface RendererDefinition<TResources extends RuntimeResourceMap = RuntimeResourceMap> {
  id: string;
  canRender(prefab: PrefabDefinition): boolean;
  render(ctx: RuntimeContext<TResources>, entity: Entity, prefab: PrefabDefinition): void;
}

export interface ComponentFactoryContext {
  prefab: PrefabDefinition;
  component: PrefabComponentSpec;
  gx: number;
  gy: number;
}

export type ComponentFactory = (ctx: ComponentFactoryContext) => Partial<Entity>;

export type ComponentRegistry = Partial<Record<PrefabComponentSpec["type"], ComponentFactory>>;

export interface GameFeature<TResources extends RuntimeResourceMap = RuntimeResourceMap> {
  id: string;
  components?: ComponentRegistry;
  resources?: ResourceFactory<TResources>[];
  prefabs?: PrefabDefinition[];
  systems?: SystemDefinition<TResources>[];
  interactions?: InteractionDefinition<TResources>[];
  renderers?: RendererDefinition<TResources>[];
}

export interface RuntimeRegistry<TResources extends RuntimeResourceMap = RuntimeResourceMap> {
  components: Map<PrefabComponentSpec["type"], ComponentFactory>;
  interactions: Map<string, InteractionDefinition<TResources>>;
  prefabs: Map<string, PrefabDefinition>;
  renderers: Map<string, RendererDefinition<TResources>>;
  resources: Map<string, ResourceFactory<TResources>>;
  systems: SystemDefinition<TResources>[];
}

export function createRuntimeRegistry<TResources extends RuntimeResourceMap = RuntimeResourceMap>(
  features: readonly GameFeature<TResources>[] = [],
): RuntimeRegistry<TResources> {
  const registry: RuntimeRegistry<TResources> = {
    components: new Map(),
    interactions: new Map(),
    prefabs: new Map(),
    renderers: new Map(),
    resources: new Map(),
    systems: [],
  };

  for (const feature of features) {
    registerFeature(registry, feature);
  }

  return registry;
}

export function registerFeature<TResources extends RuntimeResourceMap>(
  registry: RuntimeRegistry<TResources>,
  feature: GameFeature<TResources>,
): void {
  for (const [type, factory] of Object.entries(feature.components ?? {}) as [PrefabComponentSpec["type"], ComponentFactory][]) {
    if (registry.components.has(type)) throw new Error(`duplicate component factory: ${type}`);
    registry.components.set(type, factory);
  }

  for (const resource of feature.resources ?? []) {
    if (registry.resources.has(resource.key)) throw new Error(`duplicate runtime resource: ${resource.key}`);
    registry.resources.set(resource.key, resource);
  }

  for (const prefab of feature.prefabs ?? []) {
    if (registry.prefabs.has(prefab.id)) throw new Error(`duplicate prefab: ${prefab.id}`);
    registry.prefabs.set(prefab.id, prefab);
  }

  for (const interaction of feature.interactions ?? []) {
    if (registry.interactions.has(interaction.id)) throw new Error(`duplicate interaction: ${interaction.id}`);
    registry.interactions.set(interaction.id, interaction);
  }

  for (const renderer of feature.renderers ?? []) {
    if (registry.renderers.has(renderer.id)) throw new Error(`duplicate renderer: ${renderer.id}`);
    registry.renderers.set(renderer.id, renderer);
  }

  for (const system of feature.systems ?? []) {
    if (!isSystemPhase(system.phase)) throw new Error(`invalid system phase for ${system.id}: ${system.phase}`);
    if (registry.systems.some((entry) => entry.id === system.id)) throw new Error(`duplicate system: ${system.id}`);
    registry.systems.push(system);
  }
}

export function isSystemPhase(value: string): value is SystemPhase {
  return (SYSTEM_PHASES as readonly string[]).includes(value);
}

export function validateRuntimeRegistry<TResources extends RuntimeResourceMap>(
  registry: RuntimeRegistry<TResources>,
): string[] {
  const problems: string[] = [];

  for (const system of registry.systems) {
    if (!isSystemPhase(system.phase)) problems.push(`system ${system.id} has invalid phase ${system.phase}`);
  }

  for (const prefab of registry.prefabs.values()) {
    for (const component of prefab.components) {
      if (!registry.components.has(component.type)) {
        problems.push(`prefab ${prefab.id} uses unsupported component ${component.type}`);
      }
    }

    const interactionId = prefab.interaction?.kind;
    if (interactionId && !registry.interactions.has(interactionId)) {
      problems.push(`prefab ${prefab.id} references missing interaction ${interactionId}`);
    }
  }

  return problems;
}

export class RuntimeScheduler<TResources extends RuntimeResourceMap = RuntimeResourceMap> {
  private readonly systemsByPhase: Map<SystemPhase, SystemDefinition<TResources>[]>;

  constructor(systems: readonly SystemDefinition<TResources>[]) {
    this.systemsByPhase = new Map(SYSTEM_PHASES.map((phase) => [phase, []]));
    for (const system of systems) {
      const phaseSystems = this.systemsByPhase.get(system.phase);
      if (!phaseSystems) throw new Error(`invalid system phase for ${system.id}: ${system.phase}`);
      phaseSystems.push(system);
    }
  }

  tick(ctx: RuntimeContext<TResources>, dt: number): void {
    for (const phase of SYSTEM_PHASES) {
      for (const system of this.systemsByPhase.get(phase) ?? []) {
        system.run(ctx, dt);
      }
    }
  }
}

export function createRuntimeContext<TResources extends RuntimeResourceMap>(
  world: World<Entity>,
  resources: TResources,
): RuntimeContext<TResources> {
  const events: RuntimeEvent[] = [];
  return {
    world,
    resources,
    events,
    emit: (event) => {
      events.push(event);
    },
    getResource: <T>(key: string) => {
      if (!(key in resources)) throw new Error(`missing runtime resource: ${key}`);
      return resources[key] as T;
    },
  };
}
