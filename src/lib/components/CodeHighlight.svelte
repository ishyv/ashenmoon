<script lang="ts">
import { onMount } from "svelte";

interface Props {
  code: string;
  theme: string;
}

let { code, theme }: Props = $props();

let html = $state("");
let highlightCode = $state<((code: string, theme?: string) => Promise<string>) | null>(null);

onMount(async () => {
  const monacoModule = await import("$lib/scripts/monaco");
  highlightCode = monacoModule.highlightCode;
});

const baseThemeClass = $derived(
  theme === "hc-black"
    ? "hc-black"
    : theme.includes("light") || theme.includes("latte") || theme === "vs"
      ? "vs"
      : "vs-dark"
);

$effect(() => {
  if (highlightCode && code) {
    highlightCode(code, theme).then((res) => {
      html = res;
    });
  }
});
</script>

{#if html}
  <pre class="sw-doc-example monaco-editor {baseThemeClass} {theme}"><code>{@html html}</code></pre>
{:else}
  <pre class="sw-doc-example"><code>{code}</code></pre>
{/if}
