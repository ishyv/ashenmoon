<script lang="ts">
import { canConsume, consumeItem, getConsumeVerb } from "$lib/domain/consume-actions";
import { getItemDef, reactsInto, traitOf } from "$lib/domain/items";
import type { KnowledgeProperty } from "$lib/domain/knowledge/item-knowledge";

const KNOWLEDGE_LABELS: Record<KnowledgeProperty, string> = {
  edible: "edible",
  thirst_value: "quenches thirst",
  toxicity: "can sicken you",
  flammable: "flammable",
  perishable: "perishable",
  heat_sensitive: "heat-sensitive",
  boilable: "boilable",
};

let {
  itemId,
  inspectNotes,
  decayProgress,
  isEquipped,
  onClose,
  onEquip,
}: {
  itemId: string;
  inspectNotes: { known: KnowledgeProperty[]; unknown: KnowledgeProperty[] } | null;
  decayProgress: Record<string, number>;
  isEquipped: (itemId: string) => boolean;
  onClose: () => void;
  onEquip: (itemId: string) => void;
} = $props();

const meta = $derived(getItemDef(itemId));
const knownProps = $derived(new Set(inspectNotes?.known ?? []));
const flammable = $derived(meta ? traitOf(meta, "flammable") : null);
const tempSensitive = $derived(meta ? traitOf(meta, "temperature_sensitive") : null);
const decayable = $derived(meta ? traitOf(meta, "decayable") : null);
</script>

{#if meta}
  <aside class="inspect-panel">
    <button class="close-inspect-btn" onclick={onClose} aria-label="close inspect">x</button>

    <div class="inspect-header">
      <div class="inspect-visual">
        {#if meta.iconUrl}
          <img src={meta.iconUrl} alt={meta.name} class="item-icon-img" />
        {:else if meta.icon}
          <span class="inspect-icon-emoji">{meta.icon}</span>
        {:else}
          <span>{meta.name.slice(0, 2).toLowerCase()}</span>
        {/if}
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
      {#if meta.category === "tool"}
        <button class="action-btn" disabled={isEquipped(itemId)} onclick={() => onEquip(itemId)}>
          {isEquipped(itemId) ? "equipped" : "equip"}
        </button>
      {/if}
      {#if getConsumeVerb(itemId)}
        <button class="action-btn" disabled={!canConsume(itemId)} onclick={() => consumeItem(itemId)}>
          {getConsumeVerb(itemId)}
        </button>
      {/if}
    </div>
  </aside>
{/if}

<style>
  .inspect-panel {
    width: min(20rem, calc(100vw - 2rem));
    pointer-events: auto;
    padding: var(--inv-space-lg);
    border: 1px solid var(--inv-border);
    border-radius: var(--inv-radius);
    background: var(--inv-surface);
    box-shadow: 0 1rem 2rem var(--inv-shadow);
    color: var(--inv-text);
  }

  .close-inspect-btn {
    float: right;
    border: 0;
    background: transparent;
    color: var(--inv-text-muted);
    cursor: pointer;
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

  .inspect-icon-emoji {
    font-size: 1.8rem;
    line-height: 1;
  }

  .item-icon-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .inspect-name {
    font-weight: 700;
  }

  .inspect-subtitle,
  .inspect-description,
  .behavior,
  .note {
    font-size: 0.72rem;
    line-height: 1.4;
  }

  .inspect-subtitle,
  .inspect-description,
  .muted {
    color: var(--inv-text-muted);
  }

  section {
    margin-top: 0.9rem;
  }

  .section-heading {
    margin-bottom: 0.35rem;
    color: var(--inv-accent);
    font-size: 0.62rem;
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
    cursor: pointer;
  }

  .action-btn:disabled {
    cursor: default;
    opacity: 0.5;
  }
</style>
