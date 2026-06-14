<script lang="ts">
import { fade, slide } from "svelte/transition";
import { feedbackLog, type FeedbackMessage } from "$lib/ui/player-feedback.svelte";

interface Toast extends FeedbackMessage {
  visible: boolean;
}

let activeToasts = $state<Toast[]>([]);
let lastLength = 0;

$effect(() => {
  const currentMessages = feedbackLog.messages;
  if (currentMessages.length > lastLength) {
    // New messages added
    const newItems = currentMessages.slice(lastLength);
    for (const msg of newItems) {
      const toast: Toast = { ...msg, visible: true };
      activeToasts = [...activeToasts, toast];

      // Fade out and remove toast after 3.5 seconds
      setTimeout(() => {
        toast.visible = false;
        // Clean up from list after fade-out transition completes
        setTimeout(() => {
          activeToasts = activeToasts.filter((t) => t.id !== msg.id);
        }, 300);
      }, 3500);
    }
  }
  lastLength = currentMessages.length;
});

function toneClass(tone: string): string {
  switch (tone) {
    case "good":
      return "tone-good";
    case "warning":
      return "tone-warning";
    case "danger":
      return "tone-danger";
    default:
      return "tone-info";
  }
}
</script>

<div class="toast-log-container" aria-live="polite">
  {#each activeToasts as toast (toast.id)}
    {#if toast.visible}
      <div
        in:slide={{ duration: 200 }}
        out:fade={{ duration: 250 }}
        class="toast-message {toneClass(toast.tone)}"
      >
        <span class="bullet">✦</span>
        <span class="text">{toast.text}</span>
      </div>
    {/if}
  {/each}
</div>

<style>
  .toast-log-container {
    position: fixed;
    top: 1.5rem;
    right: 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    z-index: 150;
    pointer-events: none;
    max-width: 320px;
  }

  .toast-message {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 1rem;
    background: rgba(18, 14, 12, 0.82);
    border: 1px solid rgba(255, 220, 120, 0.15);
    border-radius: 4px;
    backdrop-filter: blur(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    font-size: 0.8rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: rgb(210, 205, 195);
  }

  .bullet {
    font-size: 0.7rem;
    color: rgba(255, 220, 120, 0.6);
  }

  .text {
    line-height: 1.3;
  }

  /* Tone styling aligning with dark fantasy aesthetic */
  .tone-good {
    border-color: rgba(52, 211, 153, 0.25);
    color: rgb(167, 243, 208);
  }

  .tone-warning {
    border-color: rgba(251, 191, 36, 0.25);
    color: rgb(253, 230, 138);
  }

  .tone-danger {
    border-color: rgba(239, 68, 68, 0.3);
    color: rgb(252, 165, 165);
    text-shadow: 0 0 4px rgba(239, 68, 68, 0.2);
  }

  .tone-info {
    border-color: rgba(147, 197, 253, 0.25);
    color: rgb(219, 234, 254);
  }
</style>
