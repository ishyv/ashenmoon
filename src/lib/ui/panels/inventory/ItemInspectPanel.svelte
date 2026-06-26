<script lang="ts">
import { canConsume, consumeItem, getConsumeVerb } from "$lib/state/rpg/consume-actions";
import { getItemDef, reactsInto, traitOf } from "$lib/domain/items";
import type { KnowledgeProperty } from "$lib/domain/knowledge/item-knowledge";
import ItemIcon from "$lib/ui/components/ItemIcon.svelte";
import { recipeKnown } from "$lib/state/rpg/crafting.svelte";

const KNOWLEDGE_LABELS: Record<KnowledgeProperty, string> = {
  edible: "edible",
  thirst_value: "quenches thirst",
  toxicity: "can sicken you",
  flammable: "flammable",
  perishable: "perishable",
  heat_sensitive: "heat-sensitive",
  boilable: "boilable",
  sharp: "sharp / can cut you",
};

let {
  itemId,
  inspectNotes,
  decayProgress,
  isEquipped,
  onClose,
  onEquip,
  onPlace,
  onStudy,
}: {
  itemId: string;
  inspectNotes: { known: KnowledgeProperty[]; unknown: KnowledgeProperty[] } | null;
  decayProgress: Record<string, number>;
  isEquipped: (itemId: string) => boolean;
  onClose: () => void;
  onEquip: (itemId: string) => void;
  onPlace: (itemId: string) => void;
  onStudy?: (itemId: string) => void;
} = $props();

const meta = $derived(getItemDef(itemId));
const knownProps = $derived(new Set(inspectNotes?.known ?? []));
const flammable = $derived(meta ? traitOf(meta, "flammable") : null);
const tempSensitive = $derived(meta ? traitOf(meta, "temperature_sensitive") : null);
const decayable = $derived(meta ? traitOf(meta, "decayable") : null);
const blueprintTrait = $derived(meta ? traitOf(meta, "blueprint") : null);
const blueprintAlreadyKnown = $derived(blueprintTrait ? recipeKnown(blueprintTrait.recipeId) : false);
</script>

{#if meta}
  <aside class="inspect-panel">
    <div class="inspect-header">
      <div class="inspect-visual">
        <ItemIcon def={meta} {itemId} />
      </div>
      <div>
        <div class="inspect-name">{meta.name.toLowerCase()}</div>
        <div class="inspect-subtitle">{meta.category} · {meta.rarity}</div>
      </div>
    </div>

    <p class="inspect-description">{meta.description}</p>

    <section>
      <div class="section-heading">field notes</div>
      <div class="notes-list">
        {#if inspectNotes && inspectNotes.known.length > 0}
          {#each inspectNotes.known as prop}
            <span class="note known">{KNOWLEDGE_LABELS[prop]}</span>
          {/each}
        {:else}
          <span class="note unknown">no reliable notes yet.</span>
        {/if}
        {#each inspectNotes?.unknown ?? [] as _unknown}
          <span class="note unknown">? ? ?</span>
        {/each}
      </div>
    </section>

    <section>
      <div class="section-heading">observed behavior</div>
      <div class="behavior-list">
        {#if flammable && knownProps.has("flammable")}
          <div class="behavior">ignites near {flammable.ignitionTemp} c, leaving {reactsInto(flammable.effect, meta.id)}.</div>
        {/if}
        {#if tempSensitive && knownProps.has("heat_sensitive")}
          <div class="behavior">safe between {tempSensitive.minSafeTemp} c and {tempSensitive.maxSafeTemp} c.</div>
        {/if}
        {#if decayable && knownProps.has("perishable")}
          <div class="behavior">freshness around {Math.round(decayProgress[itemId] ?? 100)} percent.</div>
        {/if}
        {#if !(flammable && knownProps.has("flammable")) && !(tempSensitive && knownProps.has("heat_sensitive")) && !(decayable && knownProps.has("perishable"))}
          <div class="behavior muted">nothing certain.</div>
        {/if}
      </div>
    </section>

    <div class="inspect-actions">
      {#if meta.category === "tool" || traitOf(meta, "wearable")}
        <button class="action-btn" disabled={isEquipped(itemId)} onclick={() => onEquip(itemId)}>
          {isEquipped(itemId) ? "equipped" : "equip"}
        </button>
      {/if}
      {#if getConsumeVerb(itemId)}
        <button class="action-btn" disabled={!canConsume(itemId)} onclick={() => consumeItem(itemId)}>
          {getConsumeVerb(itemId)}
        </button>
      {/if}
      {#if blueprintTrait && onStudy}
        <button class="action-btn" disabled={blueprintAlreadyKnown} onclick={() => onStudy?.(itemId)}>
          {blueprintAlreadyKnown ? "already known" : "study"}
        </button>
      {/if}
      {#if !isEquipped(itemId) && !blueprintTrait}
        <button class="action-btn" onclick={() => onPlace(itemId)}>
          place
        </button>
      {/if}
    </div>
  </aside>
{/if}

<style>
  .inspect-panel {
    width: 20rem;
    padding: var(--inv-space-lg);
    color: var(--inv-text);
    display: flex;
    flex-direction: column;
    font-family: "IBM Plex Mono", monospace;
  }

  .inspect-header {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin-bottom: 0.8rem;
  }

  .inspect-visual {
    width: 3rem;
    height: 3rem;
    display: grid;
    place-items: center;
    border: 1px solid var(--inv-border-muted);
    border-radius: var(--inv-radius-sm);
    background: var(--inv-surface-soft);
    font-weight: 700;
  }


  .inspect-name {
    font-family: "Cinzel", serif;
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--inv-accent);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .inspect-subtitle,
  .inspect-description,
  .behavior,
  .note {
    font-size: 0.72rem;
    line-height: 1.4;
  }

  .inspect-description {
    font-family: "Cardo", serif;
    font-style: italic;
    color: rgba(255, 255, 255, 0.65);
    line-height: 1.5;
  }

  .inspect-subtitle,
  .muted {
    color: var(--inv-text-muted);
  }

  section {
    margin-top: 0.9rem;
  }

  .section-heading {
    margin-bottom: 0.35rem;
    color: var(--inv-accent);
    font-family: "Cinzel", serif;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .notes-list,
  .behavior-list,
  .inspect-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .note,
  .behavior {
    border: 1px solid var(--inv-border-muted);
    border-radius: var(--inv-radius-sm);
    padding: 0.25rem 0.45rem;
    background: var(--inv-surface-soft);
  }

  .note.unknown {
    color: var(--inv-text-muted);
  }

  .action-btn {
    flex: 1 1 7rem;
    margin-top: 0.8rem;
    border: 1px solid var(--inv-border);
    border-radius: var(--inv-radius-sm);
    background: var(--inv-accent-dim);
    color: var(--inv-accent);
    padding: 0.45rem 0.6rem;
    font-family: "Cinzel", serif;
    font-size: 0.78rem;
    letter-spacing: 0.04em;
    font-weight: 600;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.1s;
  }

  .action-btn:hover:not(:disabled) {
    background: rgba(255, 220, 120, 0.22);
    border-color: var(--inv-accent);
    color: #fff;
  }

  .action-btn:disabled {
    cursor: default;
    opacity: 0.5;
  }
</style>

