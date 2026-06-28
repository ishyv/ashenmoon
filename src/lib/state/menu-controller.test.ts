import { beforeEach, describe, expect, it, vi } from "vitest";
import { menuController } from "./menu-controller.svelte";

describe("menuController", () => {
  beforeEach(() => {
    menuController.clear();
  });

  it("is inactive with no items", () => {
    expect(menuController.active).toBe(false);
    expect(menuController.items).toHaveLength(0);
    expect(menuController.focusedItem).toBeUndefined();
  });

  it("becomes active after mount", () => {
    menuController.mount([{ label: "harvest", action: vi.fn() }]);
    expect(menuController.active).toBe(true);
    expect(menuController.items).toHaveLength(1);
    expect(menuController.focusedIndex).toBe(0);
  });

  it("resets focused index to 0 on mount", () => {
    menuController.mount([
      { label: "a", action: vi.fn() },
      { label: "b", action: vi.fn() },
    ]);
    menuController.moveDown();
    expect(menuController.focusedIndex).toBe(1);

    menuController.mount([{ label: "x", action: vi.fn() }]);
    expect(menuController.focusedIndex).toBe(0);
  });

  it("clear() deactivates and empties items", () => {
    menuController.mount([{ label: "x", action: vi.fn() }]);
    menuController.clear();
    expect(menuController.active).toBe(false);
    expect(menuController.items).toHaveLength(0);
    expect(menuController.focusedIndex).toBe(0);
  });

  describe("moveDown()", () => {
    it("advances focused index", () => {
      menuController.mount([
        { label: "a", action: vi.fn() },
        { label: "b", action: vi.fn() },
        { label: "c", action: vi.fn() },
      ]);
      menuController.moveDown();
      expect(menuController.focusedIndex).toBe(1);
      menuController.moveDown();
      expect(menuController.focusedIndex).toBe(2);
    });

    it("wraps from last to first", () => {
      menuController.mount([
        { label: "a", action: vi.fn() },
        { label: "b", action: vi.fn() },
      ]);
      menuController.moveDown();
      menuController.moveDown(); // wraps
      expect(menuController.focusedIndex).toBe(0);
    });

    it("no-ops when inactive", () => {
      menuController.moveDown();
      expect(menuController.focusedIndex).toBe(0);
    });
  });

  describe("moveUp()", () => {
    it("moves focused index back", () => {
      menuController.mount([
        { label: "a", action: vi.fn() },
        { label: "b", action: vi.fn() },
        { label: "c", action: vi.fn() },
      ]);
      menuController.moveDown();
      menuController.moveDown();
      menuController.moveUp();
      expect(menuController.focusedIndex).toBe(1);
    });

    it("wraps from first to last", () => {
      menuController.mount([
        { label: "a", action: vi.fn() },
        { label: "b", action: vi.fn() },
        { label: "c", action: vi.fn() },
      ]);
      menuController.moveUp(); // wraps to 2
      expect(menuController.focusedIndex).toBe(2);
    });

    it("no-ops when inactive", () => {
      menuController.moveUp();
      expect(menuController.focusedIndex).toBe(0);
    });
  });

  describe("activateFocused()", () => {
    it("calls the focused item's action", () => {
      const actionA = vi.fn();
      const actionB = vi.fn();
      menuController.mount([
        { label: "a", action: actionA },
        { label: "b", action: actionB },
      ]);
      menuController.moveDown();
      menuController.activateFocused();
      expect(actionB).toHaveBeenCalledOnce();
      expect(actionA).not.toHaveBeenCalled();
    });

    it("no-ops when inactive", () => {
      expect(() => menuController.activateFocused()).not.toThrow();
    });
  });

  describe("activateByRole()", () => {
    it("calls the first item with the matching role", () => {
      const harvest = vi.fn();
      const destroy = vi.fn();
      menuController.mount([
        { label: "harvest", action: harvest },
        { label: "destroy", role: "danger", action: destroy },
        { label: "close", role: "close", action: vi.fn() },
      ]);
      menuController.activateByRole("danger");
      expect(destroy).toHaveBeenCalledOnce();
      expect(harvest).not.toHaveBeenCalled();
    });

    it("treats items without a role as 'default'", () => {
      const action = vi.fn();
      menuController.mount([{ label: "harvest", action }]);
      menuController.activateByRole("default");
      expect(action).toHaveBeenCalledOnce();
    });

    it("no-ops when no item has the requested role", () => {
      const action = vi.fn();
      menuController.mount([{ label: "harvest", action }]);
      expect(() => menuController.activateByRole("danger")).not.toThrow();
      expect(action).not.toHaveBeenCalled();
    });

    it("no-ops when inactive", () => {
      expect(() => menuController.activateByRole("danger")).not.toThrow();
    });
  });

  it("focusedItem returns the current item", () => {
    const itemA = { label: "a", action: vi.fn() };
    const itemB = { label: "b", action: vi.fn() };
    menuController.mount([itemA, itemB]);
    expect(menuController.focusedItem?.label).toBe("a");
    menuController.moveDown();
    expect(menuController.focusedItem?.label).toBe("b");
  });
});
