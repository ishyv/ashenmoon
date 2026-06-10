<script lang="ts">
import { onDestroy, onMount } from "svelte";

interface Props {
  value: string;
  theme: string;
  readonly?: boolean;
}

let { value = $bindable(""), theme, readonly = false }: Props = $props();

let host: HTMLDivElement;
let handle:
  | {
      dispose(): void;
      layout(): void;
      setTheme(theme: string): void;
      setReadonly(readonly: boolean): void;
      setValue(value: string): void;
    }
  | null = null;
let editorValue = "";
let mounted = true;

onMount(async () => {
  const { createScriptEditor } = await import("$lib/scripts/monaco");
  if (!mounted || !host) return;
  editorValue = value;
  handle = createScriptEditor(host, value, theme, (nextValue) => {
    editorValue = nextValue;
    value = nextValue;
  }, readonly);
});

$effect(() => {
  if (handle) handle.setTheme(theme);
});

$effect(() => {
  if (handle) handle.setReadonly(readonly);
});

$effect(() => {
  if (handle && value !== editorValue) {
    editorValue = value;
    handle.setValue(value);
  }
});

onDestroy(() => {
  mounted = false;
  handle?.dispose();
});
</script>

<div class="editor-host" bind:this={host}></div>

<style>
  .editor-host {
    min-height: inherit;
    height: 100%;
    overflow: hidden;
  }
</style>
