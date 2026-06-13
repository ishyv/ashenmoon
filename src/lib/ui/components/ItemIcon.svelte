<script lang="ts">
import type { ItemDefinition } from "$lib/domain/items/item-types";

interface Props {
  def: ItemDefinition | undefined;
  itemId: string;
  class?: string;
}
let { def, itemId, class: cls = "" }: Props = $props();

const sheet = $derived(def?.iconSheet);
const iconUrl = $derived(def?.iconUrl);
</script>

{#if sheet}
  <div
    class="icon-sheet {cls}"
    style="background-image:url({sheet.src});background-position:-{sheet.col * sheet.size}px -{sheet.row * sheet.size}px;width:{sheet.size}px;height:{sheet.size}px;background-repeat:no-repeat;image-rendering:pixelated;"
    role="img"
    aria-label={def?.name ?? itemId}
  ></div>
{:else if iconUrl}
  <img src={iconUrl} alt={def?.name ?? itemId} class="item-icon-img {cls}" />
{:else if def?.icon}
  <span class="item-icon-emoji {cls}">{def.icon}</span>
{:else}
  <span class={cls}>{(def?.name ?? itemId).slice(0, 2).toLowerCase()}</span>
{/if}
