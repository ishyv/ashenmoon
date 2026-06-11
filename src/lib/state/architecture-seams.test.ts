import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const srcRoot = join(repoRoot, "src");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    return stat.isDirectory() ? files(path) : [path];
  });
}

describe("architecture seams", () => {
  it("does not keep removed compatibility seams", () => {
    const self = fileURLToPath(import.meta.url);
    const haystack = files(srcRoot)
      .filter((path) => path !== self)
      .filter((path) => /\.(ts|svelte)$/.test(path))
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    for (const token of [
      ["rpg", "State"].join(""),
      ["set", "Rpg", "State"].join(""),
      ["rpg", "-state", ".svelte"].join(""),
      ["offline", "Player", "State"].join(""),
      ["offline", "-store"].join(""),
    ]) {
      expect(haystack).not.toContain(token);
    }
  });
});
