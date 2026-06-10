export interface ScriptPosition {
  readonly lineNumber: number;
  readonly column: number;
}

export interface ScriptMarker {
  readonly startLineNumber: number;
  readonly startColumn: number;
  readonly endLineNumber: number;
  readonly endColumn: number;
  readonly message: string;
  readonly severity: number;
}

export interface WrappedScript {
  readonly code: string;
  readonly bodyStartLine: number;
  readonly bodyLineCount: number;
}

const PREAMBLE = `declare const ctx: ScriptApi;
declare const input: ScriptInput;
declare function fail_input(message: string): never;
declare function title(text: string): OutputToken;
declare function display(content: string): OutputToken;
declare function field(name: string, value: string): OutputToken;
declare function color(accent: OutputAccent): OutputToken;
declare function sep(): OutputToken;
declare function footer(text: string): OutputToken;

declare const guild: ScriptApi["guild"];
declare const channel: ScriptApi["channel"];
declare const invoker: ScriptApi["invoker"];
declare const members: ScriptApi["members"];
declare const roles: ScriptApi["roles"];
declare const channels: ScriptApi["channels"];
declare const now: ScriptApi["now"];
declare const form: ScriptApi["form"];
declare const find_role: ScriptApi["find_role"];
declare const find_member: ScriptApi["find_member"];
declare const members_with_role: ScriptApi["members_with_role"];
declare const createChannel: ScriptApi["createChannel"];
declare const createRole: ScriptApi["createRole"];

async function __tx_script_main() {`;

const POSTAMBLE = `
}`;

/**
 * Wraps a stored script body in a valid async function so TypeScript language
 * services can analyze top-level `return` and `await` without changing storage.
 */
export function wrapScriptBody(body: string): WrappedScript {
  const cleanedBody = body.replace(
    /import\s+(?:type\s+)?{[\s\S]*?}\s+from\s+["']tx-discord-bot["'];?/g,
    (match) => {
      return "\n".repeat(match.split("\n").length - 1);
    },
  );
  const bodyStartLine = PREAMBLE.split("\n").length + 1;
  const bodyLineCount = Math.max(1, cleanedBody.split("\n").length);
  return {
    code: `${PREAMBLE}\n${cleanedBody}${POSTAMBLE}`,
    bodyStartLine,
    bodyLineCount,
  };
}

/** Maps a visible body position into the hidden wrapped model. */
export function bodyToWrappedPosition(
  wrapped: WrappedScript,
  position: ScriptPosition,
): ScriptPosition {
  return {
    lineNumber: wrapped.bodyStartLine + position.lineNumber - 1,
    column: position.column,
  };
}

function inBody(wrapped: WrappedScript, line: number): boolean {
  return line >= wrapped.bodyStartLine && line < wrapped.bodyStartLine + wrapped.bodyLineCount;
}

/**
 * Maps a hidden-wrapper diagnostic back to the visible body model. Diagnostics
 * outside the body are ignored because they point at generated scaffolding.
 */
export function mapWrappedMarkerToBody(
  wrapped: WrappedScript,
  marker: ScriptMarker,
): ScriptMarker | null {
  if (!inBody(wrapped, marker.startLineNumber) || !inBody(wrapped, marker.endLineNumber)) {
    return null;
  }
  const offset = wrapped.bodyStartLine - 1;
  return {
    ...marker,
    startLineNumber: marker.startLineNumber - offset,
    endLineNumber: marker.endLineNumber - offset,
  };
}
