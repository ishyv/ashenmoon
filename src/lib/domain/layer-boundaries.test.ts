import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const DOMAIN_ROOT = dirname(fileURLToPath(import.meta.url));

const FORBIDDEN_DOMAIN_IMPORTS: readonly RegExp[] = [
  /from\s+["']\$lib\/core(?:\/|["'])/,
  /from\s+["']\$lib\/ui(?:\/|["'])/,
  /from\s+["']\$lib\/audio(?:\/|["'])/,
  /from\s+["']\$lib\/state(?:\/|["'])/,
  /from\s+["']\$lib\/server(?:\/|["'])/,
  /from\s+["']pixi\.js["']/,
  /from\s+["']svelte(?:\/|["'])/,
  /from\s+["'][^"']+\.svelte(?:\.ts)?["']/,
  /import\s*\(["']\$lib\/(?:core|ui|audio|state|server)(?:\/|["'])/,
  /import\s*\(["']pixi\.js["']\)/,
  /import\s*\(["']svelte(?:\/|["'])/,
];

function sourceFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const fullPath = join(root, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) return sourceFiles(fullPath);
    if (extname(fullPath) !== ".ts") return [];
    if (fullPath.endsWith(".test.ts")) return [];
    return [fullPath];
  });
}

describe("domain layer boundaries", () => {
  it("keeps pure domain modules free of runtime, UI, audio, Svelte, and server imports", () => {
    const violations = sourceFiles(DOMAIN_ROOT).flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return FORBIDDEN_DOMAIN_IMPORTS.flatMap((pattern) =>
        pattern.test(source) ? [`${relative(DOMAIN_ROOT, file)} matches ${pattern}`] : [],
      );
    });

    expect(violations).toEqual([]);
  });
});
