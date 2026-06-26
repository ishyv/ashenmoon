import { setBusVolume, setMuted } from "./audio-engine";
import type { Bus } from "./sound-manifest";

export type VolumeKey = "master" | Bus;

export interface AudioSettings {
  master: number;
  music: number;
  sfx: number;
  ui: number;
  ambient: number;
  entities: number;
  muted: boolean;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  master: 0.8,
  music: 0.5,
  sfx: 0.8,
  ui: 0.7,
  ambient: 0.65,
  entities: 0.8,
  muted: false,
};

export const audioSettings = $state<AudioSettings>({ ...DEFAULT_AUDIO_SETTINGS });

const VOLUME_KEYS: Bus[] = ["music", "sfx", "ui", "ambient", "entities"];

function applyToEngine(): void {
  setBusVolume("master", audioSettings.master);
  for (const key of VOLUME_KEYS) {
    setBusVolume(key, audioSettings[key]);
  }
  setMuted(audioSettings.muted);
}

const STORAGE_KEY = "ashenmoon.settings.v1";

function save(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(audioSettings));
  } catch (e) {
    console.error("failed to save audio settings:", e);
  }
}

export function loadAudioSettings(): void {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AudioSettings>;
        if (parsed && typeof parsed === "object") {
          // Validate and load master
          if (typeof parsed.master === "number" && !isNaN(parsed.master)) {
            audioSettings.master = Math.max(0, Math.min(1, parsed.master));
          } else {
            audioSettings.master = DEFAULT_AUDIO_SETTINGS.master;
          }
          // Validate and load buses
          for (const key of VOLUME_KEYS) {
            const val = parsed[key];
            if (typeof val === "number" && !isNaN(val)) {
              audioSettings[key] = Math.max(0, Math.min(1, val));
            } else {
              audioSettings[key] = DEFAULT_AUDIO_SETTINGS[key];
            }
          }
          // Validate and load mute
          if (typeof parsed.muted === "boolean") {
            audioSettings.muted = parsed.muted;
          } else {
            audioSettings.muted = DEFAULT_AUDIO_SETTINGS.muted;
          }
        }
      } else {
        // Fallback to defaults if no stored settings exist yet
        Object.assign(audioSettings, DEFAULT_AUDIO_SETTINGS);
      }
    } catch (e) {
      console.error("failed to load audio settings:", e);
      // Fallback to defaults on corrupt data
      Object.assign(audioSettings, DEFAULT_AUDIO_SETTINGS);
    }
  }
  applyToEngine();
}

export function setVolume(key: VolumeKey, value: number): void {
  const clamped = Math.max(0, Math.min(1, value));
  audioSettings[key] = clamped;
  setBusVolume(key, clamped);
  save();
}

export function setAudioMuted(value: boolean): void {
  audioSettings.muted = value;
  setMuted(value);
  save();
}

export function getEffectiveVolume(params: {
  settings: AudioSettings;
  bus: Bus;
  baseVolume?: number;
  requestVolume?: number;
}): number {
  const master = params.settings.master;
  const busVolume = params.settings[params.bus] ?? 1;
  const base = params.baseVolume ?? 1;
  const request = params.requestVolume ?? 1;

  return Math.max(0, Math.min(1, master * busVolume * base * request));
}

