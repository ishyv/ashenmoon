import { describe, expect, it, vi } from "vitest";
import { InputAction, StorageKeys } from "$lib/domain/game-events";
import { InputResource } from "./input";

describe("InputResource bindings", () => {
  it("merges persisted bindings with new default actions", () => {
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => key === StorageKeys.inputBindings
        ? JSON.stringify({ [InputAction.MoveUp]: ["i"] })
        : null,
    });

    const inputs = new InputResource();

    expect(inputs.bindings[InputAction.MoveUp]).toEqual(["i"]);
    expect(inputs.bindings[InputAction.StanceModifier]).toEqual(["control"]);
    vi.unstubAllGlobals();
  });
});
