/**
 * In-game developer console: the single output sink and live control surface
 * for the game. Engine systems and UI both depend on this instead of the
 * browser console (which is invisible in this run context) or bespoke callbacks.
 *
 * The core is intentionally game-agnostic — it knows about log lines and
 * commands, nothing about players or resources. Game-specific commands are
 * registered from `dev-commands.ts`; the Svelte overlay in `DevConsole.svelte`
 * renders the buffer and feeds input back through `run()`.
 *
 * Exposed as a module singleton because there is exactly one game instance per
 * page; an injected instance would be ceremony with no second caller.
 */

/** Visual category for a log line. `echo` is the user's own typed input. */
export type LogLevel = "info" | "warn" | "error" | "echo";

/** A single rendered console line. `id` is monotonic so the UI can key on it. */
export interface LogLine {
  id: number;
  level: LogLevel;
  text: string;
}

/**
 * A registered console command. `run` returns a status line to print; return an
 * empty string to print nothing (commands that act silently, like `clear`).
 * Argument parsing/validation is the command's own job — it owns its usage.
 */
export interface Command {
  name: string;
  /** one-line usage shown by `help`, e.g. "tp <gx> <gy> : teleport player". */
  help: string;
  run: (args: string[]) => string;
}

/** Newest-line-last; capped so a long session can't grow unbounded. */
const MAX_LINES = 200;

class DevConsole {
  private lines: LogLine[] = [];
  private seq = 0;
  private commands = new Map<string, Command>();
  private listeners = new Set<() => void>();

  /**
   * Whether the overlay is open. Doubles as the input-capture flag: the engine
   * reads this each tick and ignores movement/interaction keys while true, so
   * typing a command never leaks into the game.
   */
  open = false;

  constructor() {
    this.register({
      name: "help",
      help: "help : list commands",
      run: () =>
        this.list()
          .map((c) => `  ${c.help}`)
          .join("\n"),
    });
    this.register({
      name: "clear",
      help: "clear : clear the console",
      run: () => {
        this.lines = [];
        this.notify();
        return "";
      },
    });
  }

  /** Appends a line and notifies subscribers. The only way to write output. */
  log(text: string, level: LogLevel = "info"): void {
    this.lines.push({ id: this.seq++, level, text });
    if (this.lines.length > MAX_LINES) this.lines.shift();
    this.notify();
  }

  /** Current buffer, newest last. Treat as read-only — clone before mutating. */
  snapshot(): readonly LogLine[] {
    return this.lines;
  }

  /** Subscribe to buffer changes; returns an unsubscribe fn. */
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Registers (or replaces) a command by name. Idempotent on re-register. */
  register(cmd: Command): void {
    this.commands.set(cmd.name, cmd);
  }

  /** Commands sorted by name, for `help` and any future palette UI. */
  list(): Command[] {
    return [...this.commands.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Parses `name arg arg…`, echoes it, and dispatches. Whitespace-only input is
   * ignored. Unknown commands report rather than throw — this is a REPL.
   */
  run(input: string): void {
    const trimmed = input.trim();
    if (!trimmed) return;
    this.log(`> ${trimmed}`, "echo");

    // trimmed is non-empty, so name is always present; the default satisfies TS.
    const [name = "", ...args] = trimmed.split(/\s+/);
    const cmd = this.commands.get(name);
    if (!cmd) {
      this.log(`unknown command: ${name}. type 'help'.`, "error");
      return;
    }

    const out = cmd.run(args);
    if (out) this.log(out);
  }

  private notify(): void {
    for (const fn of this.listeners) fn();
  }
}

/** The one console for the page. Import this everywhere. */
export const devConsole = new DevConsole();
