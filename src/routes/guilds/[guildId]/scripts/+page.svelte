<script lang="ts">
import ArrowRight from "lucide-svelte/icons/arrow-right";
import FileCode2 from "lucide-svelte/icons/file-code-2";
import Plus from "lucide-svelte/icons/plus";
import { enhance } from "$app/forms";
import { page } from "$app/state";
import "$lib/scripts/workbench.css";
import { toastStore } from "@hyvnt/hyvui";
import type { PageData } from "./$types";

interface Props {
  data: PageData;
}

const { data }: Props = $props();
const guildId = $derived(page.params.guildId);
let newName = $state("");
let creating = $state(false);

function triggerLabel(trigger: PageData["scripts"][number]["trigger"]): string {
  if (trigger.kind === "manual") return "manual";
  if (trigger.kind === "schedule") return `every ${trigger.intervalHours}h`;
  return trigger.event.replace(/-/g, " ");
}
</script>

<svelte:head><title>Scripts</title></svelte:head>

<section class="scripts-index" aria-labelledby="scripts-title">
  <div class="scripts-index-hero">
    <div class="scripts-index-copy">
      <span class="sw-eyebrow">automation workbench</span>
      <h1 id="scripts-title">scripts</h1>
      <p>
        write typescript-backed server scripts, preview the resulting discord operations,
        then apply them only after the dry run is clear.
      </p>
    </div>

    <form
      method="POST"
      action="?/create"
      class="scripts-index-create"
      use:enhance={() => {
        creating = true;
        return async ({ result, update }) => {
          creating = false;
          if (result.type === "failure") {
            toastStore.push(String(result.data?.error ?? "could not create"), "fail");
          }
          await update({ reset: false });
        };
      }}
    >
      <div>
        <h2>new script</h2>
        <p class="sw-field-help">letters, numbers, hyphens, and underscores</p>
      </div>
      <div class="scripts-index-form">
        <input class="sw-input" bind:value={newName} placeholder="role-cleanup" />
        <input type="hidden" name="name" value={newName} />
        <button class="sw-button sw-button-primary" type="submit" disabled={creating || newName.trim() === ""}>
          <Plus size={15} strokeWidth={1.9} />
          <span>{creating ? "creating" : "create"}</span>
        </button>
      </div>
    </form>
  </div>

  <div class="scripts-index-card">
    <div class="sw-rail-head">
      <h2>workspace</h2>
      <span class="sw-rail-count">{data.scripts.length} scripts</span>
    </div>

    {#if data.scripts.length === 0}
      <p class="sw-empty">no scripts yet. create one above to open the editor.</p>
    {:else}
      <ul class="scripts-index-list">
        {#each data.scripts as script (script.name)}
          <li class="scripts-index-row">
            <div class="scripts-index-main">
              <span class="scripts-index-name">{script.name}</span>
              <span class="scripts-index-description">{script.description || "no description"}</span>
            </div>
            <div class="scripts-index-pills">
              <span class="sw-pill" class:sw-pill-accent={script.kind === "library"}>
                <FileCode2 size={12} strokeWidth={1.8} />
                {script.kind}
              </span>
              <span class="sw-pill" class:sw-pill-ok={script.enabled} class:sw-pill-warn={!script.enabled}>
                {script.enabled ? "enabled" : "disabled"}
              </span>
              <span class="sw-pill">{triggerLabel(script.trigger)}</span>
            </div>
            <a class="sw-button" href={`/guilds/${guildId}/scripts/${script.name}`}>
              <span>open</span>
              <ArrowRight size={14} strokeWidth={1.9} />
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>
