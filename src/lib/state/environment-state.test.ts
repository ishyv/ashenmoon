import { describe, expect, it } from "vitest";
import { onEnvironmentChanged } from "$lib/domain/systems/environment-system";
import { activeEnvironment, setEnvironment } from "$lib/state/environment-state.svelte";

describe("environment state", () => {
  it("updates only provided fields and emits only when values change", () => {
    setEnvironment({ temperature: 20, humidity: 40, toxins: 0 });

    const events: Array<{
      previous: { temperature: number; humidity: number; toxins: number };
      current: { temperature: number; humidity: number; toxins: number };
    }> = [];
    const unsubscribe = onEnvironmentChanged((event) => {
      events.push(event);
    });

    setEnvironment({ temperature: 31 });
    setEnvironment({ temperature: 31 });
    setEnvironment({ humidity: 55, toxins: 2 });
    unsubscribe();

    expect(activeEnvironment).toEqual({ temperature: 31, humidity: 55, toxins: 2 });
    expect(events).toEqual([
      {
        previous: { temperature: 20, humidity: 40, toxins: 0 },
        current: { temperature: 31, humidity: 40, toxins: 0 },
      },
      {
        previous: { temperature: 31, humidity: 40, toxins: 0 },
        current: { temperature: 31, humidity: 55, toxins: 2 },
      },
    ]);
  });
});
