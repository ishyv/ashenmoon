<script lang="ts">
import { onMount } from "svelte";
import "$lib/../app.css";
import type { Snippet } from "svelte";

interface Props {
  children: Snippet;
}
const { children }: Props = $props();

function preventDefaultContextMenu(e: MouseEvent) {
  e.preventDefault();
}

onMount(() => {
  window.addEventListener("contextmenu", preventDefaultContextMenu);

  return () => {
    window.removeEventListener("contextmenu", preventDefaultContextMenu);
  };
});
</script>

<!-- Layout reset: strips AppShell/nav so the game canvas owns the full viewport. -->
{@render children()}
