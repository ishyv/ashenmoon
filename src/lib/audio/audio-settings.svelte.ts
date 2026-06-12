/**
 * Reactive, persisted audio settings. Holds the user-facing volumes/mute as
 * runes `$state` (so the settings UI binds directly) and is the only writer of
 * the engine's bus gains — it pushes every change through `setBusVolume` /
 * `setMuted`. Mirrors the `uiPreferences` load/save pattern in
 * `runtime-ui-state.svelte.ts`.
 */

import { StorageKeys } from "$lib/domain/game-events";
import { setBusVolume, setMuted } from "./audio-engine";
import type { Bus } from "./sound-manifest";

export type VolumeKey = "master" | Bus;

export interface AudioSettings {
  master: number;
  sfx: number;
  ambient: number;
  ui: number;
  music: number;
  muted: boolean;
}

export const audioSettings = $state<AudioSettings>({
  master: 0.9,
  sfx: 1,
  ambient: 0.6,
  ui: 0.9,
  music: 0.7,
  muted: false,
});

const VOLUME_KEYS: VolumeKey[] = ["master", "sfx", "ambient", "ui", "music"];

function applyToEngine(): void {
  for (const key of VOLUME_KEYS) setBusVolume(key, audioSettings[key]);
  setMuted(audioSettings.muted);
}

function save(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(StorageKeys.audio, JSON.stringify(audioSettings));
  } catch (e) {
    console.error("failed to save audio settings:", e);
  }
}

export function loadAudioSettings(): void {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(StorageKeys.audio);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AudioSettings>;
        for (const key of VOLUME_KEYS) {
          if (typeof parsed[key] === "number") audioSettings[key] = parsed[key];
        }
        if (typeof parsed.muted === "boolean") audioSettings.muted = parsed.muted;
      }
    } catch (e) {
      console.error("failed to load audio settings:", e);
    }
  }
  applyToEngine();
}

export function setVolume(key: VolumeKey, value: number): void {
  audioSettings[key] = Math.max(0, Math.min(1, value));
  setBusVolume(key, audioSettings[key]);
  save();
}

export function setAudioMuted(value: boolean): void {
  audioSettings.muted = value;
  setMuted(value);
  save();
}
