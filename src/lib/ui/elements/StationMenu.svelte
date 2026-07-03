<script lang="ts">
import { onDestroy } from "svelte";
import { getItemDef } from "$lib/domain/items";
import ItemIcon from "$lib/ui/components/ItemIcon.svelte";
import {
  ringPosition,
  groupByCategory,
  FLAT_RING_THRESHOLD,
  type StationMenuOption,
} from "$lib/domain/interaction-wheel";
import type { ActiveStationCraftStatus } from "$lib/core/types";
import { menuController, type MenuControllerItem } from "$lib/state/menu-controller.svelte";

let {
  options,
  anchorScreen,
  stationName,
  busyStatus,
  onSelect,
  onClose,
  onCancelBusy,
}: {
  options: readonly StationMenuOption[];
  anchorScreen: { x: number; y: number };
  stationName: string;
  /** Non-null when a process/craft is already active at this station — replaces the ring with a progress+cancel view. */
  busyStatus: ActiveStationCraftStatus | null;
  onSelect: (option: StationMenuOption) => void;
  onClose: () => void;
  onCancelBusy: () => void;
} = $props();

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const RING_RADIUS_PRIMARY = 85;
const RING_RADIUS_SECONDARY = 165;
const SECONDARY_ARC_SPAN_DEG = 130;
const MEDALLION_RADIUS = 30; // half of the rendered medallion size, for clamping padding
const BUSY_VIEW_RADIUS = 90; // footprint of the medallion + label + safety text + cancel button stack
const VIEWPORT_MARGIN = 12;
const DIAL_CIRCUMFERENCE = 94.2; // 2*pi*15, matches GameHud's dial-svg r=15 convention

const isBusy = $derived(!!busyStatus);
const grouped = $derived(options.length > FLAT_RING_THRESHOLD);
const groups = $derived(grouped ? groupByCategory(options) : []);

let expandedCategory = $state<string | null>(null);
const expandedGroup = $derived(groups.find((g) => g.category === expandedCategory) ?? null);

// Reserve space for the largest ring this menu could ever show (the secondary
// ring, if grouped) so the anchor never has to jump when a category expands.
const maxRadius = $derived(
  isBusy ? BUSY_VIEW_RADIUS : (grouped ? RING_RADIUS_SECONDARY : RING_RADIUS_PRIMARY) + MEDALLION_RADIUS,
);

const clampedAnchor = $derived.by(() => {
  if (typeof window === "undefined") return anchorScreen;
  const minX = maxRadius + VIEWPORT_MARGIN;
  const maxX = window.innerWidth - maxRadius - VIEWPORT_MARGIN;
  const minY = maxRadius + VIEWPORT_MARGIN + 24; // extra headroom for the station-name label above the ring
  const maxY = window.innerHeight - maxRadius - VIEWPORT_MARGIN;
  return {
    x: Math.min(Math.max(anchorScreen.x, minX), Math.max(minX, maxX)),
    y: Math.min(Math.max(anchorScreen.y, minY), Math.max(minY, maxY)),
  };
});

function angleFromPoint(p: { x: number; y: number }): number {
  // Inverse of ringPosition's convention: x = sin(theta), y = -cos(theta) (theta in degrees, 0 = up).
  return (Math.atan2(p.x, -p.y) * 180) / Math.PI;
}

// ---------------------------------------------------------------------------
// Keyboard navigation — reuses the existing world context-menu controller.
// ---------------------------------------------------------------------------

function mountPrimaryItems() {
  const items: MenuControllerItem[] = grouped
    ? groups.map((g) => ({ label: g.category.replace(/_/g, " "), action: () => expandCategory(g.category) }))
    : options.map((option) => ({ label: option.label.toLowerCase(), action: () => onSelect(option) }));
  items.push({ label: "close", role: "close", action: onClose });
  menuController.mount(items);
}

function expandCategory(category: string) {
  expandedCategory = category;
  const group = groups.find((g) => g.category === category);
  const items: MenuControllerItem[] = [
    { label: "back", action: collapseCategory },
    ...(group?.options.map((option) => ({ label: option.label.toLowerCase(), action: () => onSelect(option) })) ?? []),
  ];
  menuController.mount(items);
}

function collapseCategory() {
  expandedCategory = null;
  mountPrimaryItems();
}

// Only re-mounts on a busy/not-busy transition (isBusy is a stable boolean),
// not on every frame's fresh busyStatus object — expand/collapse re-mount
// imperatively above and are untouched by this.
$effect(() => {
  isBusy;
  expandedCategory = null;
  if (isBusy) {
    menuController.mount([
      { label: "cancel", role: "danger", action: onCancelBusy },
      { label: "close", role: "close", action: onClose },
    ]);
  } else {
    mountPrimaryItems();
  }
});

onDestroy(() => menuController.clear());
</script>

<div
  class="station-menu"
  style="left:{clampedAnchor.x}px; top:{clampedAnchor.y}px"
  role="menu"
  aria-label="{stationName} options"
>
  <div class="station-menu-label">{stationName.toLowerCase()}</div>

  {#if busyStatus}
    <div class="busy-view">
      <div class="busy-medallion" class:safe={busyStatus.walkAwaySafe}>
        <svg class="busy-ring-svg" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(0, 0, 0, 0.4)" stroke-width="1.8" />
          <circle
            class="busy-ring-fill"
            cx="18"
            cy="18"
            r="15"
            stroke-dasharray={DIAL_CIRCUMFERENCE}
            stroke-dashoffset={DIAL_CIRCUMFERENCE - busyStatus.progress * DIAL_CIRCUMFERENCE}
          />
        </svg>
        <span class="glyph"><ItemIcon def={getItemDef(busyStatus.iconItemId)} itemId={busyStatus.iconItemId} /></span>
      </div>
      <div class="busy-label">{busyStatus.label.toLowerCase()}</div>
      <div class="busy-safety" class:safe={busyStatus.walkAwaySafe}>
        {busyStatus.walkAwaySafe ? "safe to walk away" : "stay close, leaving cancels this"}
      </div>
      <button class="busy-cancel" onclick={onCancelBusy}>cancel</button>
    </div>
  {:else if !grouped}
    {#each options as option, i (option.id)}
      {@const pos = ringPosition(i, options.length, RING_RADIUS_PRIMARY)}
      <button
        class="medallion affordable"
        class:focused={i === menuController.focusedIndex}
        style="transform: translate(calc(-50% + {pos.x}px), calc(-50% + {pos.y}px))"
        onclick={() => onSelect(option)}
      >
        {#if option.iconItemId}
          <span class="glyph"><ItemIcon def={getItemDef(option.iconItemId)} itemId={option.iconItemId} /></span>
        {:else if option.kind === "destroy"}
          <span class="glyph destroy-glyph">×</span>
        {/if}
        <span class="medallion-tooltip">{option.label.toLowerCase()}</span>
      </button>
    {/each}
  {:else}
    {#each groups as group, i (group.category)}
      {@const pos = ringPosition(i, groups.length, RING_RADIUS_PRIMARY)}
      {@const repIconItemId = group.options.find((o) => o.iconItemId)?.iconItemId}
      <button
        class="medallion affordable category"
        class:expanded={group.category === expandedCategory}
        class:focused={expandedCategory === null && i === menuController.focusedIndex}
        style="transform: translate(calc(-50% + {pos.x}px), calc(-50% + {pos.y}px))"
        onclick={() => expandCategory(group.category)}
      >
        {#if repIconItemId}
          <span class="glyph"><ItemIcon def={getItemDef(repIconItemId)} itemId={repIconItemId} /></span>
        {:else}
          <span class="glyph category-glyph">{group.category.charAt(0).toUpperCase()}</span>
        {/if}
        <span class="category-count-badge">{group.options.length}</span>
        <span class="medallion-tooltip">{group.category.replace(/_/g, " ")}</span>
      </button>
    {/each}

    {#if expandedGroup}
      {@const centerAngle = angleFromPoint(ringPosition(groups.findIndex((g) => g.category === expandedGroup!.category), groups.length, 1))}
      {#each expandedGroup.options as option, i (option.id)}
        {@const pos = ringPosition(i, expandedGroup.options.length, RING_RADIUS_SECONDARY, centerAngle, SECONDARY_ARC_SPAN_DEG)}
        <button
          class="medallion affordable secondary"
          class:focused={i + 1 === menuController.focusedIndex}
          style="transform: translate(calc(-50% + {pos.x}px), calc(-50% + {pos.y}px))"
          onclick={() => onSelect(option)}
        >
          {#if option.iconItemId}
            <span class="glyph"><ItemIcon def={getItemDef(option.iconItemId)} itemId={option.iconItemId} /></span>
          {:else if option.kind === "destroy"}
            <span class="glyph destroy-glyph">×</span>
          {/if}
          <span class="medallion-tooltip">{option.label.toLowerCase()}</span>
        </button>
      {/each}
    {/if}
  {/if}
</div>

<style>
  .station-menu {
    position: fixed;
    z-index: 200;
    width: 0;
    height: 0;
    pointer-events: none;
  }

  .station-menu-label {
    position: absolute;
    left: 0;
    top: -1.6rem;
    transform: translateX(-50%);
    font-family: "Cinzel", serif;
    font-variant: small-caps;
    letter-spacing: 0.1em;
    font-size: 0.78rem;
    color: var(--accent);
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.7);
    white-space: nowrap;
  }

  .medallion {
    position: absolute;
    left: 0;
    top: 0;
    width: 3.4rem;
    height: 3.4rem;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, var(--bg-elev), var(--bg) 78%);
    border: 1.5px solid color-mix(in srgb, var(--accent) 30%, transparent);
    display: grid;
    place-items: center;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
    transition: border-color 0.12s, box-shadow 0.12s, scale 0.12s ease;
    cursor: pointer;
    pointer-events: auto;
    padding: 0;
    font-family: inherit;
    z-index: 1;
  }

  .medallion.affordable {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent),
      0 0 14px color-mix(in srgb, var(--accent) 30%, transparent), 0 2px 10px rgba(0, 0, 0, 0.6);
  }

  .medallion.focused,
  .medallion:hover {
    border-color: var(--accent-strong);
    box-shadow: 0 0 0 1px var(--accent-strong), 0 0 20px color-mix(in srgb, var(--accent-strong) 45%, transparent);
    scale: 1.12;
    z-index: 20;
  }

  .medallion.category .category-glyph {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.85rem;
    color: var(--accent);
  }

  .destroy-glyph {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.3rem;
    font-weight: 700;
    line-height: 1;
    color: var(--color-danger, tomato);
  }

  .medallion.category.expanded {
    border-color: var(--signal);
    box-shadow: 0 0 0 1px var(--signal), 0 0 18px color-mix(in srgb, var(--signal) 40%, transparent);
  }

  .medallion .glyph {
    width: 1.5rem;
    height: 1.5rem;
    display: grid;
    place-items: center;
  }

  .category-count-badge {
    position: absolute;
    bottom: -0.3rem;
    right: -0.3rem;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.6rem;
    font-weight: 700;
    color: var(--text-soft);
    background: rgba(0, 0, 0, 0.85);
    border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
    border-radius: var(--radius-sm);
    padding: 0.05rem 0.3rem;
    line-height: 1.2;
  }

  .medallion-tooltip {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 0.35rem;
    white-space: nowrap;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.66rem;
    letter-spacing: 0.02em;
    color: var(--text-soft);
    background: rgba(0, 0, 0, 0.85);
    border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
    border-radius: var(--radius-sm);
    padding: 0.15rem 0.45rem;
    opacity: 0;
    transition: opacity 0.1s;
    pointer-events: none;
  }

  .medallion.focused .medallion-tooltip,
  .medallion:hover .medallion-tooltip {
    opacity: 1;
    color: var(--accent-strong);
  }

  .busy-view {
    position: absolute;
    left: 0;
    top: 0;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    pointer-events: auto;
  }

  .busy-medallion {
    position: relative;
    width: 4.4rem;
    height: 4.4rem;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, var(--bg-elev), var(--bg) 78%);
    border: 1.5px solid var(--signal);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--signal) 25%, transparent),
      0 0 14px color-mix(in srgb, var(--signal) 30%, transparent), 0 2px 10px rgba(0, 0, 0, 0.6);
    display: grid;
    place-items: center;
  }

  .busy-medallion:not(.safe) {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 25%, transparent),
      0 0 14px color-mix(in srgb, var(--accent) 30%, transparent), 0 2px 10px rgba(0, 0, 0, 0.6);
  }

  .busy-medallion .glyph {
    width: 1.9rem;
    height: 1.9rem;
    display: grid;
    place-items: center;
    z-index: 1;
  }

  .busy-ring-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .busy-ring-fill {
    fill: none;
    stroke: var(--signal);
    stroke-width: 2.4;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.15s linear;
  }

  .busy-medallion:not(.safe) .busy-ring-fill {
    stroke: var(--accent);
  }

  .busy-label {
    font-family: "Cinzel", serif;
    font-variant: small-caps;
    letter-spacing: 0.06em;
    font-size: 0.82rem;
    color: var(--text);
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.7);
    white-space: nowrap;
  }

  .busy-safety {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.68rem;
    letter-spacing: 0.02em;
    color: var(--signal);
    white-space: nowrap;
  }

  .busy-safety:not(.safe) {
    color: var(--accent);
  }

  .busy-cancel {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.7rem;
    letter-spacing: 0.04em;
    color: var(--text-soft);
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid color-mix(in srgb, var(--text-soft) 30%, transparent);
    border-radius: var(--radius-sm);
    padding: 0.25rem 0.7rem;
    cursor: pointer;
  }

  .busy-cancel:hover,
  .busy-cancel:focus-visible {
    color: var(--accent-strong);
    border-color: color-mix(in srgb, var(--accent) 50%, transparent);
  }
</style>
