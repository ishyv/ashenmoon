import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/svelte";
import DialogueBox from "./DialogueBox.svelte";
import { activeQuests, dialogueState } from "$lib/domain/quests.svelte";

beforeEach(() => {
  activeQuests.currentQuestId = null;
  dialogueState.activeNpc = { id: "npc_vane", name: "Commander Vane" };
});

afterEach(() => {
  dialogueState.activeNpc = null;
  activeQuests.currentQuestId = null;
  cleanup();
});

describe("DialogueBox.svelte", () => {
  it("lets the player leave Vane's first quest offer without accepting it", async () => {
    const { getByRole } = render(DialogueBox);

    expect(getByRole("button", { name: /accept quest/i })).toBeTruthy();

    await fireEvent.click(getByRole("button", { name: /leave/i }));

    expect(dialogueState.activeNpc).toBeNull();
    expect(activeQuests.currentQuestId).toBeNull();
  });
});
