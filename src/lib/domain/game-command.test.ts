import { describe, expect, it } from "vitest";
import { parseDevCommand } from "$lib/domain/game-command";
import { StatusId } from "$lib/domain/systems/status-types";

describe("parseDevCommand", () => {
  it("maps dev console input to typed commands", () => {
    expect(parseDevCommand("spawn oak_tree 10 12")).toEqual({
      ok: true,
      command: { type: "world.spawn", prefabId: "oak_tree", gx: 10, gy: 12 },
    });
    expect(parseDevCommand("rpg give grass_fiber 2")).toEqual({
      ok: true,
      command: { type: "rpg.give", itemId: "grass_fiber", qty: 2 },
    });
    expect(parseDevCommand("spend 15 burst")).toEqual({
      ok: true,
      command: { type: "stamina.spend", amount: 15, mode: "burst" },
    });
    expect(parseDevCommand("collision set stone_node 0.2 0.8 0.6 0.9")).toEqual({
      ok: true,
      command: {
        type: "collision.set",
        id: "stone_node",
        footprint: { minX: 0.2, maxX: 0.8, minY: 0.6, maxY: 0.9 },
      },
    });
  });

  it("validates command arguments before execution", () => {
    expect(parseDevCommand("tp 1 nope")).toMatchObject({ ok: false, code: "invalid_args" });
    expect(parseDevCommand("status apply fake_status")).toMatchObject({ ok: false, code: "invalid_args" });
    expect(parseDevCommand("sound maybe")).toMatchObject({ ok: false, code: "invalid_args" });
    expect(parseDevCommand("collision set stone_node 0.2 0.8")).toMatchObject({ ok: false, code: "invalid_args" });
  });

  it("accepts known status ids", () => {
    expect(parseDevCommand(`status apply ${StatusId.Cut} 5`)).toEqual({
      ok: true,
      command: { type: "status.apply", statusId: StatusId.Cut, durationSec: 5 },
    });
  });
});
