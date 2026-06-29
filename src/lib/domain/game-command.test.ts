import { describe, expect, it } from "vitest";
import { parseDevCommand } from "./game-command";

describe("parseDevCommand rpg item aliases", () => {
  it("resolves shorthand weapon aliases to canonical item ids", () => {
    expect(parseDevCommand("rpg give spear")).toEqual({
      ok: true,
      command: { type: "rpg.give", itemId: "wooden_spear", qty: 1 },
    });
    expect(parseDevCommand("rpg equip spear")).toEqual({
      ok: true,
      command: { type: "rpg.equip", itemId: "wooden_spear" },
    });
    expect(parseDevCommand("rpg give knife 2")).toEqual({
      ok: true,
      command: { type: "rpg.give", itemId: "crude_knife", qty: 2 },
    });
    expect(parseDevCommand("rpg equip axe")).toEqual({
      ok: true,
      command: { type: "rpg.equip", itemId: "stone_axe" },
    });
  });

  it("rejects unknown item ids instead of creating fake inventory entries", () => {
    expect(parseDevCommand("rpg give definitely_fake")).toMatchObject({
      ok: false,
      code: "invalid_args",
      message: "unknown item id or alias: definitely_fake",
    });
    expect(parseDevCommand("rpg equip definitely_fake")).toMatchObject({
      ok: false,
      code: "invalid_args",
      message: "unknown item id or alias: definitely_fake",
    });
  });
});
