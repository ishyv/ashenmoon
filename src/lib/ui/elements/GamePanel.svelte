<script lang="ts">
import { panelPositions, updatePanelPosition } from "$lib/state/panel-positions.svelte";
import type { Snippet } from "svelte";

let {
  id,
  title,
  width = "auto",
  height = "auto",
  onClose,
  children,
}: {
  id: string;
  title: string;
  width?: string;
  height?: string;
  onClose?: () => void;
  children: Snippet;
} = $props();

let isDragging = $state(false);
let startX = 0;
let startY = 0;
let initialX = 0;
let initialY = 0;

const position = $derived(panelPositions[id] || { x: 0, y: 0 });

function handleMouseDown(e: MouseEvent) {
  if (e.button !== 0) return; // Only left click
  const target = e.target as HTMLElement;
  if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('a')) {
    return;
  }
  
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  initialX = position.x;
  initialY = position.y;
  
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  e.preventDefault();
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging) return;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  updatePanelPosition(id, initialX + dx, initialY + dy);
}

function handleMouseUp() {
  isDragging = false;
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
}
</script>

<div 
  class="game-panel-wrapper" 
  class:is-dragging={isDragging}
  style="transform: translate({position.x}px, {position.y}px); width: {width}; height: {height};"
>
  <!-- Notched metallic RPG corner frames -->
  <div class="corner-ornament top-left"></div>
  <div class="corner-ornament top-right"></div>
  <div class="corner-ornament bottom-left"></div>
  <div class="corner-ornament bottom-right"></div>

  <div class="game-panel-inner">
    <header class="game-panel-header" onmousedown={handleMouseDown} role="presentation">
      <div class="panel-drag-handle" title="Drag to move">⋮⋮</div>
      <h3 class="panel-title">{title}</h3>
      {#if onClose}
        <button class="panel-close-btn" onclick={onClose} aria-label="Close panel">×</button>
      {/if}
    </header>
    <div class="game-panel-body">
      {@render children()}
    </div>
  </div>
</div>

<style>
  .game-panel-wrapper {
    position: relative;
    background: linear-gradient(135deg, rgba(20, 16, 14, 0.94), rgba(12, 10, 8, 0.97));
    border: 1px solid rgba(255, 220, 120, 0.16);
    border-radius: 4px;
    box-shadow: 
      0 10px 30px rgba(0, 0, 0, 0.75), 
      inset 0 0 16px rgba(255, 220, 120, 0.03);
    backdrop-filter: blur(12px);
    transition: box-shadow 0.15s, border-color 0.15s, width 0.2s ease-in-out, height 0.2s ease-in-out;
    user-select: none;
    pointer-events: auto;
    display: inline-flex;
    flex-direction: column;
  }

  .game-panel-wrapper.is-dragging {
    border-color: rgba(255, 220, 120, 0.45);
    box-shadow: 
      0 15px 40px rgba(0, 0, 0, 0.85), 
      0 0 15px rgba(255, 220, 120, 0.12),
      inset 0 0 16px rgba(255, 220, 120, 0.05);
    z-index: 150 !important;
  }

  /* Gothic metallic RPG corner notches */
  .corner-ornament {
    position: absolute;
    width: 6px;
    height: 6px;
    pointer-events: none;
    z-index: 5;
  }
  
  .corner-ornament.top-left {
    top: -1px;
    left: -1px;
    border-top: 2px solid #ffdc78;
    border-left: 2px solid #ffdc78;
  }
  
  .corner-ornament.top-right {
    top: -1px;
    right: -1px;
    border-top: 2px solid #ffdc78;
    border-right: 2px solid #ffdc78;
  }
  
  .corner-ornament.bottom-left {
    bottom: -1px;
    left: -1px;
    border-bottom: 2px solid #ffdc78;
    border-left: 2px solid #ffdc78;
  }
  
  .corner-ornament.bottom-right {
    bottom: -1px;
    right: -1px;
    border-bottom: 2px solid #ffdc78;
    border-right: 2px solid #ffdc78;
  }

  .game-panel-inner {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
  }

  .game-panel-header {
    display: flex;
    align-items: center;
    padding: 0.6rem 0.8rem;
    border-bottom: 1px solid rgba(255, 220, 120, 0.08);
    cursor: grab;
    background: rgba(255, 220, 120, 0.02);
  }

  .game-panel-header:active {
    cursor: grabbing;
  }

  .panel-drag-handle {
    font-size: 0.95rem;
    color: rgba(255, 220, 120, 0.35);
    margin-right: 0.6rem;
    line-height: 1;
    font-family: monospace;
    font-weight: bold;
    user-select: none;
  }

  .panel-title {
    flex: 1;
    font-family: "Cinzel", serif;
    font-size: 0.82rem;
    font-weight: 700;
    color: #ffdc78;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin: 0;
  }

  .panel-close-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.45);
    font-size: 1.1rem;
    font-weight: 400;
    line-height: 1;
    cursor: pointer;
    padding: 0 0.2rem;
    margin-left: 0.5rem;
    transition: color 0.1s;
  }

  .panel-close-btn:hover {
    color: #ff5555;
  }

  .game-panel-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
</style>
