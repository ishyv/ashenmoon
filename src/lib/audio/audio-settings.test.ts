import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  audioSettings,
  DEFAULT_AUDIO_SETTINGS,
  loadAudioSettings,
  setVolume,
  setAudioMuted,
  getEffectiveVolume,
} from "./audio-settings.svelte";

describe("audio settings", () => {
  beforeEach(() => {
    // Reset to defaults before each test
    Object.assign(audioSettings, DEFAULT_AUDIO_SETTINGS);
    vi.restoreAllMocks();
  });

  it("has correct default audio settings", () => {
    expect(DEFAULT_AUDIO_SETTINGS.master).toBe(0.8);
    expect(DEFAULT_AUDIO_SETTINGS.music).toBe(0.5);
    expect(DEFAULT_AUDIO_SETTINGS.sfx).toBe(0.8);
    expect(DEFAULT_AUDIO_SETTINGS.ui).toBe(0.7);
    expect(DEFAULT_AUDIO_SETTINGS.ambient).toBe(0.65);
    expect(DEFAULT_AUDIO_SETTINGS.entities).toBe(0.8);
    expect(DEFAULT_AUDIO_SETTINGS.muted).toBe(false);
  });

  it("calculates effective volume correctly with getEffectiveVolume", () => {
    const settings = {
      master: 0.8,
      music: 0.5,
      sfx: 0.8,
      ui: 0.7,
      ambient: 0.6,
      entities: 0.9,
      muted: false,
    };

    // Standard calculations
    expect(getEffectiveVolume({ settings, bus: "music" })).toBeCloseTo(0.4, 5); // 0.8 * 0.5
    expect(getEffectiveVolume({ settings, bus: "sfx", baseVolume: 0.5 })).toBeCloseTo(0.32, 5); // 0.8 * 0.8 * 0.5
    expect(getEffectiveVolume({ settings, bus: "ui", baseVolume: 0.5, requestVolume: 0.5 })).toBeCloseTo(0.14, 5); // 0.8 * 0.7 * 0.5 * 0.5

    // Clamping to [0, 1] bounds
    expect(getEffectiveVolume({ settings, bus: "entities", baseVolume: 2.0, requestVolume: 2.0 })).toBe(1.0);
    expect(getEffectiveVolume({ settings, bus: "music", baseVolume: -1.0 })).toBe(0.0);
  });

  it("clamps volume changes between 0 and 1", () => {
    setVolume("master", 1.5);
    expect(audioSettings.master).toBe(1.0);

    setVolume("music", -0.5);
    expect(audioSettings.music).toBe(0.0);

    setVolume("sfx", 0.4);
    expect(audioSettings.sfx).toBe(0.4);
  });

  it("saves and loads settings correctly from localStorage", () => {
    const mockStorage: Record<string, string> = {};
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) => mockStorage[key] ?? null);
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, val) => {
      mockStorage[key] = val;
    });

    // 1. Save settings
    setVolume("master", 0.6);
    setVolume("music", 0.45);
    setAudioMuted(true);

    expect(setItemSpy).toHaveBeenCalled();
    const storedStr = mockStorage["ashenmoon.settings.v1"];
    expect(storedStr).toBeDefined();

    // Reset settings state to defaults to verify loading works
    Object.assign(audioSettings, DEFAULT_AUDIO_SETTINGS);
    expect(audioSettings.master).toBe(DEFAULT_AUDIO_SETTINGS.master);

    // 2. Load settings
    loadAudioSettings();
    expect(getItemSpy).toHaveBeenCalledWith("ashenmoon.settings.v1");
    expect(audioSettings.master).toBe(0.6);
    expect(audioSettings.music).toBe(0.45);
    expect(audioSettings.muted).toBe(true);
  });

  it("handles corrupt localStorage data without crashing", () => {
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue("{invalid-json}");
    
    // Should run successfully and fall back to defaults
    loadAudioSettings();
    
    expect(audioSettings.master).toBe(DEFAULT_AUDIO_SETTINGS.master);
    expect(audioSettings.music).toBe(DEFAULT_AUDIO_SETTINGS.music);
    expect(audioSettings.muted).toBe(DEFAULT_AUDIO_SETTINGS.muted);
  });

  it("merges partially missing settings with defaults during loading", () => {
    const partialSettings = {
      master: 0.9,
      music: 0.1,
      // sfx is missing
      // entities is missing
      muted: true,
    };
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue(JSON.stringify(partialSettings));

    loadAudioSettings();

    expect(audioSettings.master).toBe(0.9);
    expect(audioSettings.music).toBe(0.1);
    expect(audioSettings.sfx).toBe(DEFAULT_AUDIO_SETTINGS.sfx); // Fallback
    expect(audioSettings.entities).toBe(DEFAULT_AUDIO_SETTINGS.entities); // Fallback
    expect(audioSettings.muted).toBe(true);
  });
});
