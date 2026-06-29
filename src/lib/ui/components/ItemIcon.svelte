<script lang="ts">
import type { ItemDefinition } from "$lib/domain/items/item-types";
import { getAshenmoonItemIconPath } from "$lib/core/assets/render-resource-cache";

interface Props {
  def: ItemDefinition | undefined;
  itemId: string;
  class?: string;
}
let { def, itemId, class: cls = "" }: Props = $props();

const ashenmoonIconUrl = $derived(ashenmoonIconFor(itemId));

function ashenmoonIconFor(id: string): string {
  return getAshenmoonItemIconPath(id);
}
</script>

<img src={ashenmoonIconUrl} alt={def?.name ?? itemId} title={def?.name ?? itemId} class="item-icon-img ashenmoon-item-icon {cls}" />

<style>
  .ashenmoon-item-icon {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 2px 1px rgba(0, 0, 0, 0.55));
  }
</style>
