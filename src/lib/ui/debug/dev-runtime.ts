/**
 * The dev console's evaluator. Input is treated as JavaScript, run against a scope
 * of game-facade namespaces (see `game-facade.ts`). Two conveniences keep simple
 * things terse without a per-command parser:
 *
 *   - `normalizeBareWord` rewrites command-shaped input (`tp 5 5`,
 *     `spawn wolf 5 5`) into a call, so muscle memory survives the move to JS.
 *   - `evaluate` runs expression-first with a statement-body fallback, so both
 *     `player.hp = 100` and `for (...) spawn(...)` work.
 *
 * This module is framework-free and knows nothing about the facade's shape, so its
 * three pieces are unit-tested against a stub scope.
 */

/** A token is JS the moment it contains anything other than word chars / spaces. */
const IS_JS = /[^\w\s]/;

function tokenToJs(token: string): string {
  if (/^-?\d+(\.\d+)?$/.test(token)) return token;
  if (token === "true" || token === "false") return token;
  return JSON.stringify(token);
}

/**
 * `tp 5 5` -> `tp(5, 5)`, `spawn wolf 5 5` -> `spawn("wolf", 5, 5)`, `help` ->
 * `help()`. A lone identifier that isn't callable is left as-is so it evaluates to
 * its value (e.g. `player` inspects the namespace). Anything containing JS syntax
 * passes through untouched.
 */
export function normalizeBareWord(src: string, isCallable: (name: string) => boolean = () => true): string {
  const s = src.trim();
  if (!s || IS_JS.test(s)) return s;

  const parts = s.split(/\s+/);
  const head = parts[0]!;
  if (!/^[A-Za-z_$][\w$]*$/.test(head)) return s;

  const args = parts.slice(1);
  if (args.length === 0 && !isCallable(head)) return s;
  return `${head}(${args.map(tokenToJs).join(", ")})`;
}

/** Renders a result for the log. Arrays print one item per line; handles use their toString. */
export function formatResult(value: unknown): string {
  if (value === undefined) return "";
  if (value === null) return "null";

  const t = typeof value;
  if (t === "string") return value as string;
  if (t === "number" || t === "boolean" || t === "bigint") return String(value);
  if (t === "function") return "[function]";
  if (Array.isArray(value)) return value.length ? value.map(formatResult).join("\n") : "[]";

  const obj = value as { toString?: () => string };
  if (typeof obj.toString === "function" && obj.toString !== Object.prototype.toString) {
    return obj.toString();
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function compile(code: string, names: string[]): (...args: unknown[]) => unknown {
  try {
    // Expression form: `player.hp = 100` returns 100, `1 + 1` returns 2.
    return new Function(...names, `return (${code});`) as (...args: unknown[]) => unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      // Statement body: `for (...) {}`, `let x = ...`. A real syntax error re-throws here.
      return new Function(...names, code) as (...args: unknown[]) => unknown;
    }
    throw error;
  }
}

/**
 * Evaluates `src` against `scope`, returning the formatted result. Syntax and
 * runtime errors are thrown so the console can log them at error level.
 */
export function evaluate(src: string, scope: Record<string, unknown>): string {
  const names = Object.keys(scope);
  const code = normalizeBareWord(src, (name) => typeof scope[name] === "function");
  const fn = compile(code, names);
  return formatResult(fn(...names.map((name) => scope[name])));
}
