import type { ScriptDraftDTO } from "$shared/bridge-types";

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string; field?: string };

const CAPABILITIES = ["roles", "messaging", "channels"] as const;
const EVENTS = ["member-join"] as const;

function ok<T>(value: T): ParseResult<T> {
  return { ok: true, value };
}

function err<T>(error: string, field?: string): ParseResult<T> {
  return { ok: false, error, field };
}

function text(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function nullableText(value: FormDataEntryValue | null): string | null {
  const valueText = text(value);
  return valueText ? valueText : null;
}

function parseCapabilities(raw: string): ParseResult<ScriptDraftDTO["capabilities"]> {
  if (!raw.trim()) return ok([]);
  const parts = raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const invalid = parts.filter((part) => !CAPABILITIES.includes(part as never));
  if (invalid.length > 0)
    return err(`unknown capabilities: ${invalid.join(", ")}.`, "capabilities");
  return ok([...new Set(parts)] as ScriptDraftDTO["capabilities"]);
}

function parseTrigger(data: FormData): ParseResult<ScriptDraftDTO["trigger"]> {
  const kind = text(data.get("triggerKind")) || "manual";
  if (kind === "manual") return ok({ kind: "manual" });
  if (kind === "schedule") {
    const hours = Number(text(data.get("intervalHours")) || "24");
    if (!Number.isInteger(hours) || hours < 1 || hours > 168) {
      return err("intervalHours must be between 1 and 168.", "intervalHours");
    }
    return ok({ kind: "schedule", intervalHours: hours });
  }
  if (kind === "event") {
    const event = text(data.get("event")) || "member-join";
    if (!EVENTS.includes(event as never)) return err("event must be member-join.", "event");
    return ok({ kind: "event", event: event as "member-join" });
  }
  return err("triggerKind must be manual, schedule, or event.", "triggerKind");
}

/**
 * Parses the script editor form. The bridge repeats validation because web form
 * data is untrusted; this parser exists to keep SvelteKit actions typed.
 */
export function parseScriptDraft(data: FormData): ParseResult<ScriptDraftDTO> {
  const source = text(data.get("source"));
  if (!source) return err("source required.", "source");
  const capabilities = parseCapabilities(text(data.get("capabilities")));
  if (!capabilities.ok) return capabilities;
  const trigger = parseTrigger(data);
  if (!trigger.ok) return trigger;
  return ok({
    source,
    description: text(data.get("description")),
    capabilities: capabilities.value,
    enabled: data.get("enabled") === "on",
    trigger: trigger.value,
    reportChannelId: nullableText(data.get("reportChannelId")),
  });
}

export interface ScriptRunInput {
  readonly input: Record<string, string>;
  readonly channelId: string | null;
}

/**
 * Parses the run console payload. Script input declarations are dynamic, so the
 * browser posts a JSON object keyed by script-declared field name.
 */
export function parseScriptRunInput(data: FormData): ParseResult<ScriptRunInput> {
  const raw = text(data.get("inputs")) || "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return err("inputs must be valid JSON.", "inputs");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return err("inputs must be an object.", "inputs");
  }
  const input = Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [key, String(value)]),
  );
  return ok({ input, channelId: nullableText(data.get("channelId")) });
}
