<script lang="ts">
/**
 * Quake-style dev console overlay. Opens with `/`, closes with Escape. Renders
 * the `devConsole` log buffer and feeds typed commands back through `run()`.
 * While open, `devConsole.open` is true and the engine ignores game keys, so
 * typing here never moves the player.
 */
import { onMount, tick } from "svelte";
import { devConsole, type LogLine } from "$lib/game/dev-console";

let open = $state(false);
let input = $state("");
let lines = $state<readonly LogLine[]>([]);
let inputEl: HTMLInputElement | null = $state(null);
let scrollEl: HTMLDivElement | null = $state(null);

// Command history; histIdx of -1 means "not navigating, showing live input".
const history: string[] = [];
let histIdx = -1;

onMount(() => {
  lines = [...devConsole.snapshot()];
  return devConsole.subscribe(() => { lines = [...devConsole.snapshot()]; });
});

// Pin the view to the newest line whenever the buffer changes.
$effect(() => {
  void lines;
  if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
});

async function openConsole(): Promise<void> {
  open = true;
  devConsole.open = true;
  await tick();
  inputEl?.focus();
}

function closeConsole(): void {
  open = false;
  devConsole.open = false;
  input = "";
  histIdx = -1;
}

function onWindowKey(e: KeyboardEvent): void {
  if (!open) {
    let consoleKeys = ["/"];
    try {
      const data = localStorage.getItem("ashenmoor_input_bindings");
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && Array.isArray(parsed.CONSOLE)) {
          consoleKeys = parsed.CONSOLE;
        }
      }
    } catch (_) {}

    const keyLower = e.key.toLowerCase();
    if (consoleKeys.some(k => k.toLowerCase() === keyLower)) {
      e.preventDefault();
      void openConsole();
    }
    return;
  }
  if (e.key === "Escape") {
    e.preventDefault();
    closeConsole();
  }
}

function onInputKey(e: KeyboardEvent): void {
  if (e.key === "Enter") {
    e.preventDefault();
    if (input.trim()) history.push(input);
    devConsole.run(input);
    input = "";
    histIdx = -1;
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (history.length === 0) return;
    histIdx = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
    input = history[histIdx] ?? "";
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    if (histIdx < 0) return;
    histIdx += 1;
    if (histIdx >= history.length) {
      histIdx = -1;
      input = "";
    } else {
      input = history[histIdx] ?? "";
    }
  }
}
</script>

<svelte:window onkeydown={onWindowKey} />

{#if open}
  <div class="dev-console">
    <div bind:this={scrollEl} class="log">
      {#each lines as line (line.id)}
        <div class="line {line.level}">{line.text}</div>
      {/each}
    </div>
    <div class="prompt">
      <span class="caret">›</span>
      <!-- svelte-ignore a11y_autofocus -->
      <input
        bind:this={inputEl}
        bind:value={input}
        onkeydown={onInputKey}
        spellcheck="false"
        autocomplete="off"
        placeholder="type a command, 'help' for the list"
      />
    </div>
  </div>
{/if}

<style>
  .dev-console {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 38vh;
    display: flex;
    flex-direction: column;
    background: rgba(12, 10, 8, 0.92);
    border-top: 1px solid rgba(255, 220, 120, 0.25);
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.82);
    z-index: 50;
    backdrop-filter: blur(2px);
  }

  .log {
    flex: 1;
    overflow-y: auto;
    padding: 0.6rem 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .line {
    white-space: pre-wrap;
    line-height: 1.35;
  }

  .line.echo  { color: rgba(255, 220, 120, 0.85); }
  .line.warn  { color: rgba(255, 200, 90, 0.9); }
  .line.error { color: rgba(255, 130, 110, 0.95); }

  .prompt {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.8rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .caret {
    color: rgba(255, 220, 120, 0.8);
  }

  input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: inherit;
    font-family: inherit;
    font-size: inherit;
  }

  input::placeholder {
    color: rgba(255, 255, 255, 0.25);
  }
</style>
