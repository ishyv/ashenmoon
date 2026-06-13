# Game Mechanics Specification

## 1\. Stamina System

* **Overview:** A centralized resource management system governing player exertion.  
* **Configurable Parameters:**  
  * **Max Stamina:** Maximum capacity of the stamina pool.  
  * **Regeneration (Combat):** Stamina recovery rate during active combat engagements.  
  * **Regeneration (Passive):** Stamina recovery rate while out of combat.

## 2\. Movement Mechanics

### 2.1 Sprinting

* **Activation:** Hold SHIFT key.  
* **Effect:** Transitions player to sprint movement state.  
* **Resource Cost:** Continuous stamina depletion at a configurable rate.

### 2.2 Dash

* **Activation:** Double-tap SHIFT key.  
* **Mechanism:** A rapid impulse in the current movement direction.  
* **States:**  
  * **Directional Dash:** Rapid movement in the input direction.  
  * **Neutral Dash:** If no directional input is detected, the player performs an "upward dash," granting temporary invulnerability.  
  * **Post-Dash:** Transitions the player into a sprint state for a configurable duration. If no directional input is active post-dash, the player continues in the last stored direction.  
* **Configurable Parameters:**  
  * Dash Cooldown  
  * Dash Stamina Cost  
  * Dash Distance  
  * Invulnerability Duration (for Neutral Dash)  
  * Sprint-Lock Duration (post-dash sprint)

## 3\. Gathering Mechanics

* **Activation:** Press E while targeting a valid "gatherable source."  
* **Standard Process:** Continuous extraction of resources at a configurable rate.  
* **Advanced Interaction (Super-Gather):**  
  * **Activation:** Double-tap E during the active gathering process.  
  * **Effect:** Consumes an additional amount of stamina for an immediate doubling of resource yield.  
  * **Constraints:** Limited by a visible cooldown or UI indicator (e.g., a "star" icon above the player character). Potentially scalable as a skill, with levels impacting star count or cooldown duration.  
* **Configurable Parameters:**  
  * Base gathering rate  
  * Super-Gather stamina cost  
  * Cooldown duration  
  * Skill-level scaling factors

