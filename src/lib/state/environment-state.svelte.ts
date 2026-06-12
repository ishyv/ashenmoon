import { untrack } from "svelte";
import { emitEnvironmentChanged, type EnvironmentState } from "$lib/domain/systems/environment-system";

export const activeEnvironment = $state<EnvironmentState>({
  temperature: 20,
  humidity: 40,
  toxins: 0,
});

export function setEnvironment(next: Partial<EnvironmentState>): void {
  const previous = untrack<EnvironmentState>(() => ({
    temperature: activeEnvironment.temperature,
    humidity: activeEnvironment.humidity,
    toxins: activeEnvironment.toxins,
  }));

  if (typeof next.temperature === "number") {
    activeEnvironment.temperature = next.temperature;
  }

  if (typeof next.humidity === "number") {
    activeEnvironment.humidity = next.humidity;
  }

  if (typeof next.toxins === "number") {
    activeEnvironment.toxins = next.toxins;
  }

  const current: EnvironmentState = {
    temperature: activeEnvironment.temperature,
    humidity: activeEnvironment.humidity,
    toxins: activeEnvironment.toxins,
  };

  if (
    previous.temperature !== current.temperature ||
    previous.humidity !== current.humidity ||
    previous.toxins !== current.toxins
  ) {
    emitEnvironmentChanged({ previous, current });
  }
}
