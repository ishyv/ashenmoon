<script lang="ts">
import { onMount } from "svelte";

let visible = $state(false);
let printedText = $state("");
let fadeOut = $state(false);

const lines = [
  "Ashenmoor. A blighted land of ash and shadow.",
  "Your wagon crashed in the night. The crew is scattered.",
  "With only the warmth of a dying campfire, you must survive."
];
const fullText = lines.join("\n\n");

onMount(() => {
  if (typeof window !== "undefined") {
    const shown = sessionStorage.getItem("ashenmoor_intro_shown");
    if (!shown) {
      visible = true;
      sessionStorage.setItem("ashenmoor_intro_shown", "true");
      
      let charIndex = 0;
      const typeInterval = setInterval(() => {
        if (charIndex < fullText.length) {
          printedText += fullText[charIndex];
          charIndex++;
        } else {
          clearInterval(typeInterval);
          // Automatically start fadeout after printing completes
          setTimeout(() => {
            fadeOut = true;
            setTimeout(() => {
              visible = false;
            }, 1000); // match transition duration
          }, 3500);
        }
      }, 35);

      const dismiss = () => {
        fadeOut = true;
        clearInterval(typeInterval);
        setTimeout(() => {
          visible = false;
        }, 800);
      };

      window.addEventListener("keydown", dismiss);
      window.addEventListener("mousedown", dismiss);
      
      return () => {
        window.removeEventListener("keydown", dismiss);
        window.removeEventListener("mousedown", dismiss);
        clearInterval(typeInterval);
      };
    }
  }
});
</script>

{#if visible}
  <div class="intro-overlay {fadeOut ? 'fade-out' : ''}">
    <div class="intro-card">
      <p class="intro-text">{printedText}<span class="cursor">|</span></p>
      <span class="dismiss-prompt">Press any key or click to continue...</span>
    </div>
  </div>
{/if}

<style>
.intro-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #08090b; /* Solid black to match critical styling */
  z-index: 300;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: opacity 0.8s ease-in-out;
  opacity: 1;
}

.intro-overlay.fade-out {
  opacity: 0;
  pointer-events: none;
}

.intro-card {
  max-width: 550px;
  width: 90%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3rem;
  padding: 2rem;
}

.intro-text {
  font-family: 'Cardo', serif;
  font-size: 1.35rem;
  line-height: 1.7;
  color: #f2ede4;
  margin: 0;
  white-space: pre-wrap;
  letter-spacing: 0.02em;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  min-height: 200px;
}

.cursor {
  color: #ffdc78;
  animation: blink 0.8s infinite;
}

.dismiss-prompt {
  font-family: 'Cinzel', serif;
  font-size: 0.65rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.25);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  animation: pulse 2s infinite ease-in-out;
}

@keyframes blink {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}

@keyframes pulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.75; }
}
</style>
