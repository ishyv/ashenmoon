import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/svelte";
import SkillTreePanel from "./SkillTreePanel.svelte";
import { setRpgSkills } from "$lib/state/rpg-actions.svelte";

// Initialize skills state so it doesn't stay in loading state
setRpgSkills({
  lumberjacking: { level: 1, xp: 0, nextXp: 100 },
  mining: { level: 1, xp: 0, nextXp: 100 },
  evade: { level: 1, xp: 0, nextXp: 100 },
  superGather: { level: 1, xp: 0, nextXp: 100 },
});

afterEach(() => {
  cleanup();
});

describe("SkillTreePanel.svelte", () => {
  it("calls onClose when close button is clicked", async () => {
    const onClose = vi.fn();
    const { getByLabelText } = render(SkillTreePanel, { onClose });
    
    const closeBtn = getByLabelText("Close Skills");
    await fireEvent.click(closeBtn);
    
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop is clicked", async () => {
    const onClose = vi.fn();
    const { getByRole } = render(SkillTreePanel, { onClose });
    
    const backdrop = getByRole("dialog");
    await fireEvent.click(backdrop);
    
    expect(onClose).toHaveBeenCalled();
  });
});
