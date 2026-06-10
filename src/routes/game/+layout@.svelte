<script lang="ts">
import "./../../app.css";
import type { Snippet } from "svelte";

interface Props {
  children: Snippet;
}
const { children }: Props = $props();
</script>

<!-- Layout reset: strips AppShell/nav so the game canvas owns the full viewport. -->
{@render children()}
