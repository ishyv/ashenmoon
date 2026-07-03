import { describe, expect, it, vi } from "vitest";
import { evaluate, formatResult, normalizeBareWord } from "./dev-runtime";

describe("normalizeBareWord", () => {
  it("rewrites command-shaped input into calls, quoting non-numeric args", () => {
    expect(normalizeBareWord("tp 5 5")).toBe("tp(5, 5)");
    expect(normalizeBareWord("spawn wolf 5 5")).toBe('spawn("wolf", 5, 5)');
    expect(normalizeBareWord("give spear 3")).toBe('give("spear", 3)');
  });

  it("calls a lone identifier only when it is callable", () => {
    expect(normalizeBareWord("help", () => true)).toBe("help()");
    expect(normalizeBareWord("player", (n) => n !== "player")).toBe("player");
  });

  it("passes real JS through untouched", () => {
    expect(normalizeBareWord("player.hp = 100")).toBe("player.hp = 100");
    expect(normalizeBareWord("world.enemies.forEach(e => e.kill())")).toBe(
      "world.enemies.forEach(e => e.kill())",
    );
    expect(normalizeBareWord("1 + 1")).toBe("1 + 1");
  });
});

describe("formatResult", () => {
  it("renders primitives and empties", () => {
    expect(formatResult(undefined)).toBe("");
    expect(formatResult(42)).toBe("42");
    expect(formatResult(true)).toBe("true");
    expect(formatResult("hp set")).toBe("hp set");
  });

  it("prints arrays one item per line, using custom toString", () => {
    const handle = { toString: () => "enemy a hp 10/10" };
    expect(formatResult([handle, handle])).toBe("enemy a hp 10/10\nenemy a hp 10/10");
    expect(formatResult([])).toBe("[]");
  });

  it("json-encodes plain objects", () => {
    expect(formatResult({ gx: 1, gy: 2 })).toBe('{"gx":1,"gy":2}');
  });
});

describe("evaluate", () => {
  it("evaluates expressions against the scope", () => {
    expect(evaluate("1 + 1", {})).toBe("2");
    expect(evaluate("add 2 3", { add: (a: number, b: number) => a + b })).toBe("5");
  });

  it("runs assignment expressions and reports their value", () => {
    const player = { hp: 0 };
    expect(evaluate("player.hp = 100", { player })).toBe("100");
    expect(player.hp).toBe(100);
  });

  it("falls back to a statement body for loops", () => {
    const spawn = vi.fn();
    expect(evaluate("for (let i = 0; i < 3; i++) spawn(i)", { spawn })).toBe("");
    expect(spawn).toHaveBeenCalledTimes(3);
  });

  it("throws on runtime errors so the console can log them", () => {
    expect(() => evaluate("nope()", {})).toThrow();
  });
});
