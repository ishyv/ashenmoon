import { describe, expect, it } from "vitest";
import {
  classifyFourfoldSlash,
  clearFourfoldSlashState,
  createInitialFourfoldSlashState,
  DEFAULT_FOURFOLD_SLASH_CONFIG,
  detectClickDirection,
  pushFourfoldSlashInput,
} from "./fourfold-slash";

describe("Fourfold Slash Combo Rules", () => {
  const config = DEFAULT_FOURFOLD_SLASH_CONFIG;

  it("detects top click", () => {
    expect(detectClickDirection({ x: 0, y: 0 }, { x: 0, y: -100 })).toBe("top");
    expect(detectClickDirection({ x: 10, y: 20 }, { x: 10, y: -50 })).toBe("top");
  });

  it("detects right click", () => {
    expect(detectClickDirection({ x: 0, y: 0 }, { x: 100, y: 0 })).toBe("right");
    expect(detectClickDirection({ x: 10, y: 20 }, { x: 80, y: 20 })).toBe("right");
  });

  it("detects bottom click", () => {
    expect(detectClickDirection({ x: 0, y: 0 }, { x: 0, y: 100 })).toBe("bottom");
    expect(detectClickDirection({ x: 10, y: 20 }, { x: 10, y: 90 })).toBe("bottom");
  });

  it("detects left click", () => {
    expect(detectClickDirection({ x: 0, y: 0 }, { x: -100, y: 0 })).toBe("left");
    expect(detectClickDirection({ x: 10, y: 20 }, { x: -60, y: 20 })).toBe("left");
  });

  it("rejects combo with repeated direction", () => {
    const state = createInitialFourfoldSlashState();
    const res1 = pushFourfoldSlashInput(state, config, "top", 1000);
    expect(res1.status).toBe("started");

    const res2 = pushFourfoldSlashInput(state, config, "top", 1200);
    expect(res2.status).toBe("failed_repeated");
    expect(res2.reason).toBe("duplicate_direction");
    expect(state.inputs).toEqual([]);
  });

  it("rejects combo over 1500ms", () => {
    const state = createInitialFourfoldSlashState();
    pushFourfoldSlashInput(state, config, "top", 1000);
    pushFourfoldSlashInput(state, config, "right", 1300);
    pushFourfoldSlashInput(state, config, "bottom", 1600);

    // Click at 2600ms (1600ms after the first click at 1000ms) exceeds 1500ms total window
    const res = pushFourfoldSlashInput(state, config, "left", 2600);
    // Buffer should reset and treat this click as a new first input
    expect(res.status).toBe("started");
    expect(res.direction).toBe("left");
    expect(state.inputs).toEqual(["left"]);
  });

  it("rejects combo if gap between inputs exceeds 600ms", () => {
    const state = createInitialFourfoldSlashState();
    pushFourfoldSlashInput(state, config, "top", 1000);
    
    // Click at 1700ms (700ms after last click) exceeds 600ms gap window
    const res = pushFourfoldSlashInput(state, config, "right", 1700);
    expect(res.status).toBe("started");
    expect(res.direction).toBe("right");
    expect(state.inputs).toEqual(["right"]);
  });

  it("accepts four unique directions within 1500ms", () => {
    const state = createInitialFourfoldSlashState();
    expect(pushFourfoldSlashInput(state, config, "top", 1000).status).toBe("started");
    expect(pushFourfoldSlashInput(state, config, "right", 1200).status).toBe("progressed");
    expect(pushFourfoldSlashInput(state, config, "bottom", 1400).status).toBe("progressed");
    
    const res = pushFourfoldSlashInput(state, config, "left", 1600);
    expect(res.status).toBe("completed");
    expect(res.finisherType).toBe("wheel_slash");
    expect(res.sequence).toEqual(["top", "right", "bottom", "left"]);
    expect(state.inputs).toEqual([]);
  });

  it("classifies T-R-B-L as Wheel Slash", () => {
    expect(classifyFourfoldSlash(["top", "right", "bottom", "left"])).toBe("wheel_slash");
  });

  it("classifies T-L-B-R as Wheel Slash", () => {
    expect(classifyFourfoldSlash(["top", "left", "bottom", "right"])).toBe("wheel_slash");
  });

  it("classifies T-R-L-B as Falling Wheel", () => {
    expect(classifyFourfoldSlash(["top", "right", "left", "bottom"])).toBe("falling_wheel");
  });

  it("classifies B-R-L-T as Rising Wheel", () => {
    expect(classifyFourfoldSlash(["bottom", "right", "left", "top"])).toBe("rising_wheel");
  });

  it("classifies T-B-L-R as Crosswind Cut", () => {
    expect(classifyFourfoldSlash(["top", "bottom", "left", "right"])).toBe("crosswind_cut");
  });

  it("clears input buffer after successful combo", () => {
    const state = createInitialFourfoldSlashState();
    pushFourfoldSlashInput(state, config, "top", 1000);
    pushFourfoldSlashInput(state, config, "right", 1100);
    pushFourfoldSlashInput(state, config, "bottom", 1200);
    pushFourfoldSlashInput(state, config, "left", 1300);

    expect(state.inputs).toEqual([]);
  });

  it("clears or resets buffer after failed repeated input", () => {
    const state = createInitialFourfoldSlashState();
    pushFourfoldSlashInput(state, config, "top", 1000);
    pushFourfoldSlashInput(state, config, "top", 1100);

    expect(state.inputs).toEqual([]);
  });
});
