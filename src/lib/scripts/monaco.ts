import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import "monaco-editor/esm/vs/language/typescript/monaco.contribution";
import * as monaco from "monaco-editor";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import { mapWrappedMarkerToBody, wrapScriptBody } from "./monaco-mapping";

interface MonacoEnv {
  MonacoEnvironment: {
    getWorker(workerId: string, label: string): Worker;
  };
}

interface TypeScriptContribution {
  readonly typescriptDefaults: {
    setCompilerOptions(options: unknown): void;
    setModeConfiguration(options: unknown): void;
    addExtraLib(content: string, filePath?: string): void;
  };
  readonly ScriptTarget: { readonly ES2022: unknown };
  readonly ModuleKind: { readonly ESNext: unknown };
  getTypeScriptWorker(): Promise<TypeScriptWorkerAccessor>;
}

type TypeScriptWorkerAccessor = (...resources: monaco.Uri[]) => Promise<TypeScriptWorker>;

interface TypeScriptWorker {
  getSyntacticDiagnostics(fileName: string): Promise<readonly TypeScriptDiagnostic[]>;
  getSemanticDiagnostics(fileName: string): Promise<readonly TypeScriptDiagnostic[]>;
}

interface TypeScriptDiagnosticMessage {
  readonly messageText: string;
  readonly next?: readonly TypeScriptDiagnosticMessage[];
}

interface TypeScriptDiagnostic {
  readonly category: 0 | 1 | 2 | 3;
  readonly code: number;
  readonly start: number | undefined;
  readonly length: number | undefined;
  readonly messageText: string | TypeScriptDiagnosticMessage;
  readonly source?: string;
}

const SCRIPT_TYPES = `
type OutputAccent = "ok" | "warn" | "info" | "danger" | "mute";
type OutputToken =
  | { readonly _t: "title"; readonly text: string }
  | { readonly _t: "color"; readonly accent: OutputAccent }
  | { readonly _t: "sep" }
  | { readonly _t: "footer"; readonly text: string }
  | { readonly _t: "display"; readonly content: string }
  | { readonly _t: "field"; readonly name: string; readonly value: string };

interface MemberView {
  readonly id: string;
  readonly tag: string;
  readonly bot: boolean;
  readonly roleIds: readonly string[];
  readonly joinedAt: number | null;
  has_role(nameOrId: string): boolean;
  readonly joined_days_ago: number | null;
  readonly mention: string;
  readonly role_names: string[];
  add_role(role: string): void;
  remove_role(role: string): void;
  dm(content: string): void;
}

interface RoleSnapshot { readonly id: string; readonly name: string; }
interface ChannelSnapshot { readonly id: string; readonly name: string; }

interface ScriptApi {
  readonly guild: { readonly id: string; readonly name: string; readonly memberCount: number };
  readonly channel: { readonly id: string; readonly name: string } | null;
  readonly invoker: { readonly id: string; readonly tag: string } | null;
  readonly members: readonly MemberView[];
  readonly roles: readonly RoleSnapshot[];
  readonly channels: readonly ChannelSnapshot[];
  readonly now: number;
  readonly form: Readonly<Record<string, string>>;
  find_role(nameOrMention: string): RoleSnapshot | null;
  find_member(tagOrMention: string): MemberView | null;
  members_with_role(nameOrMention: string): MemberView[];
  createChannel?(opts: { name: string; type?: "text" | "voice" }): void;
  createRole?(opts: { name: string; color?: number }): void;
}

interface ScriptInput {
  text(name: string, label: string): void;
  number(name: string, label: string): void;
  role(name: string, label: string): void;
  member(name: string, label: string): void;
  channel(name: string, label: string): void;
}

declare const ctx: ScriptApi;
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

declare module "tx-discord-bot" {
  export type { OutputAccent, OutputToken, MemberView, RoleSnapshot, ChannelSnapshot, ScriptApi, ScriptInput };
  export const ctx: ScriptApi;
  export const input: ScriptInput;
  export function fail_input(message: string): never;
  export function title(text: string): OutputToken;
  export function display(content: string): OutputToken;
  export function field(name: string, value: string): OutputToken;
  export function color(accent: OutputAccent): OutputToken;
  export function sep(): OutputToken;
  export function footer(text: string): OutputToken;

  export const guild: ScriptApi["guild"];
  export const channel: ScriptApi["channel"];
  export const invoker: ScriptApi["invoker"];
  export const members: ScriptApi["members"];
  export const roles: ScriptApi["roles"];
  export const channels: ScriptApi["channels"];
  export const now: ScriptApi["now"];
  export const form: ScriptApi["form"];
  export const find_role: ScriptApi["find_role"];
  export const find_member: ScriptApi["find_member"];
  export const members_with_role: ScriptApi["members_with_role"];
  export const createChannel: ScriptApi["createChannel"];
  export const createRole: ScriptApi["createRole"];
}
`;

let configured = false;

function typescript(): TypeScriptContribution {
  return (monaco.languages as unknown as { typescript: TypeScriptContribution }).typescript;
}

function defineEditorThemes(): void {
  monaco.editor.defineTheme("tx-hextech", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "5c739c", fontStyle: "italic" },
      { token: "keyword", foreground: "5dd9f0" },
      { token: "number", foreground: "f4d77c" },
      { token: "string", foreground: "b8e6f2" },
      { token: "type", foreground: "d4a574" },
      { token: "function", foreground: "5dd9f0" },
      { token: "variable", foreground: "d8e2f3" },
    ],
    colors: {
      "editor.background": "#080f1c",
      "editor.foreground": "#d8e2f3",
      "editor.lineHighlightBackground": "#0f1f3b",
      "editorLineNumber.foreground": "#264f94",
      "editorLineNumber.activeForeground": "#5dd9f0",
      "editorCursor.foreground": "#5dd9f0",
      "editor.selectionBackground": "rgba(93, 217, 240, 0.2)",
      "editor.inactiveSelectionBackground": "rgba(93, 217, 240, 0.1)",
      "editorIndentGuide.background1": "rgba(93, 217, 240, 0.1)",
      "editorIndentGuide.activeBackground1": "rgba(93, 217, 240, 0.25)",
    },
  });

  monaco.editor.defineTheme("tx-github-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8b949e", fontStyle: "italic" },
      { token: "keyword", foreground: "ff7b72" },
      { token: "number", foreground: "79c0ff" },
      { token: "string", foreground: "a5d6ff" },
      { token: "type", foreground: "ffa657" },
      { token: "function", foreground: "d2a8ff" },
      { token: "variable", foreground: "c9d1d9" },
    ],
    colors: {
      "editor.background": "#0d1117",
      "editor.foreground": "#c9d1d9",
      "editor.lineHighlightBackground": "#161b22",
      "editorLineNumber.foreground": "#6e7681",
      "editorLineNumber.activeForeground": "#c9d1d9",
      "editorCursor.foreground": "#58a6ff",
      "editor.selectionBackground": "#264f78",
      "editor.inactiveSelectionBackground": "#1d3b53",
      "editorIndentGuide.background1": "#21262d",
      "editorIndentGuide.activeBackground1": "#30363d",
    },
  });

  monaco.editor.defineTheme("tx-github-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6e7781", fontStyle: "italic" },
      { token: "keyword", foreground: "cf222e" },
      { token: "number", foreground: "0550ae" },
      { token: "string", foreground: "0a3069" },
      { token: "type", foreground: "953800" },
      { token: "function", foreground: "8250df" },
      { token: "variable", foreground: "24292f" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#24292f",
      "editor.lineHighlightBackground": "#f6f8fa",
      "editorLineNumber.foreground": "#8c959f",
      "editorLineNumber.activeForeground": "#24292f",
      "editorCursor.foreground": "#0969da",
      "editor.selectionBackground": "#b6d7ff",
      "editor.inactiveSelectionBackground": "#d8e8ff",
      "editorIndentGuide.background1": "#d0d7de",
      "editorIndentGuide.activeBackground1": "#afb8c1",
    },
  });

  monaco.editor.defineTheme("tx-catppuccin-mocha", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "9399b2", fontStyle: "italic" },
      { token: "keyword", foreground: "cba6f7" },
      { token: "number", foreground: "fab387" },
      { token: "string", foreground: "a6e3a1" },
      { token: "type", foreground: "f9e2af" },
      { token: "function", foreground: "89b4fa" },
      { token: "variable", foreground: "cdd6f4" },
    ],
    colors: {
      "editor.background": "#1e1e2e",
      "editor.foreground": "#cdd6f4",
      "editor.lineHighlightBackground": "#313244",
      "editorLineNumber.foreground": "#7f849c",
      "editorLineNumber.activeForeground": "#cdd6f4",
      "editorCursor.foreground": "#f5e0dc",
      "editor.selectionBackground": "#45475a",
      "editor.inactiveSelectionBackground": "#313244",
      "editorIndentGuide.background1": "#313244",
      "editorIndentGuide.activeBackground1": "#585b70",
    },
  });

  monaco.editor.defineTheme("tx-catppuccin-latte", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8c8fa1", fontStyle: "italic" },
      { token: "keyword", foreground: "8839ef" },
      { token: "number", foreground: "fe640b" },
      { token: "string", foreground: "40a02b" },
      { token: "type", foreground: "df8e1d" },
      { token: "function", foreground: "1e66f5" },
      { token: "variable", foreground: "4c4f69" },
    ],
    colors: {
      "editor.background": "#eff1f5",
      "editor.foreground": "#4c4f69",
      "editor.lineHighlightBackground": "#e6e9ef",
      "editorLineNumber.foreground": "#9ca0b0",
      "editorLineNumber.activeForeground": "#4c4f69",
      "editorCursor.foreground": "#dc8a78",
      "editor.selectionBackground": "#bcc0cc",
      "editor.inactiveSelectionBackground": "#ccd0da",
      "editorIndentGuide.background1": "#ccd0da",
      "editorIndentGuide.activeBackground1": "#acb0be",
    },
  });
}

function configureMonaco(): void {
  if (configured) return;
  configured = true;
  (self as unknown as MonacoEnv).MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      if (label === "typescript" || label === "javascript") return new tsWorker();
      return new editorWorker();
    },
  };
  defineEditorThemes();
  const ts = typescript();
  ts.typescriptDefaults.setCompilerOptions({
    allowNonTsExtensions: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    strict: true,
    noEmit: true,
  });
  ts.typescriptDefaults.setModeConfiguration({
    completionItems: true,
    hovers: true,
    documentSymbols: true,
    definitions: true,
    references: true,
    documentHighlights: true,
    rename: true,
    diagnostics: false,
    documentRangeFormattingEdits: true,
    signatureHelp: true,
    onTypeFormattingEdits: true,
    codeActions: true,
    inlayHints: true,
  });
  ts.typescriptDefaults.addExtraLib(SCRIPT_TYPES, "file:///tx-script-globals.d.ts");
}

function diagnosticSeverity(category: TypeScriptDiagnostic["category"]): monaco.MarkerSeverity {
  if (category === 1) return monaco.MarkerSeverity.Error;
  if (category === 0) return monaco.MarkerSeverity.Warning;
  if (category === 2) return monaco.MarkerSeverity.Hint;
  return monaco.MarkerSeverity.Info;
}

function diagnosticText(message: string | TypeScriptDiagnosticMessage): string {
  if (typeof message === "string") return message;
  const next = message.next?.flatMap((child) => diagnosticText(child)) ?? [];
  return [message.messageText, ...next].join("\n");
}

function diagnosticMarker(
  wrappedModel: monaco.editor.ITextModel,
  diagnostic: TypeScriptDiagnostic,
): monaco.editor.IMarkerData {
  const start = diagnostic.start ?? 0;
  const length = Math.max(1, diagnostic.length ?? 1);
  const startPosition = wrappedModel.getPositionAt(start);
  const endPosition = wrappedModel.getPositionAt(start + length);
  return {
    severity: diagnosticSeverity(diagnostic.category),
    message: diagnosticText(diagnostic.messageText),
    startLineNumber: startPosition.lineNumber,
    startColumn: startPosition.column,
    endLineNumber: endPosition.lineNumber,
    endColumn: endPosition.column,
    code: String(diagnostic.code),
    source: diagnostic.source ?? "typescript",
  };
}

export interface ScriptEditorHandle {
  readonly editor: monaco.editor.IStandaloneCodeEditor;
  dispose(): void;
  layout(): void;
  setReadonly(readonly: boolean): void;
  setTheme(theme: string): void;
  setValue(value: string): void;
}

/**
 * Instantiates a Monaco editor instance bound to the target DOM node.
 *
 * Invariants protected:
 * - Uses unique URIs per session/instance to prevent registry collisions in Monaco's global ModelService.
 * - Synchronizes the editor content with a hidden TypeScript wrapper model every 600ms to map diagnostics accurately,
 *   bypassing top-level return limitations.
 *
 * Tradeoffs accepted:
 * - Employs a poll-based timer for background diagnostics synchronization to minimize main thread UI lag.
 */
export function createScriptEditor(
  target: HTMLElement,
  value: string,
  theme: string,
  onChange: (value: string) => void,
  readOnly = false,
): ScriptEditorHandle {
  configureMonaco();
  const editorId = Math.random().toString(36).substring(2, 11);
  const bodyUri = monaco.Uri.parse(`file:///script-body-${editorId}.ts`);
  const wrapperUri = monaco.Uri.parse(`file:///script-wrapper-${editorId}.ts`);

  const model = monaco.editor.createModel(value, "typescript", bodyUri);
  const wrapped = wrapScriptBody(value);
  const wrappedModel = monaco.editor.createModel(wrapped.code, "typescript", wrapperUri);
  const editor = monaco.editor.create(target, {
    model,
    theme,
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
    lineHeight: 22,
    tabSize: 2,
    insertSpaces: true,
    scrollBeyondLastLine: false,
    wordWrap: "on",
    fixedOverflowWidgets: true,
    readOnly,
    domReadOnly: readOnly,
  });
  let diagnosticRun = 0;

  async function syncDiagnostics(): Promise<void> {
    const run = ++diagnosticRun;
    const wrappedScript = wrapScriptBody(model.getValue());
    wrappedModel.setValue(wrappedScript.code);
    try {
      const worker = await (await typescript().getTypeScriptWorker())(wrappedModel.uri);
      const diagnostics = [
        ...(await worker.getSyntacticDiagnostics(wrappedModel.uri.toString())),
        ...(await worker.getSemanticDiagnostics(wrappedModel.uri.toString())),
      ];
      if (run !== diagnosticRun) return;
      const markers = diagnostics
        .map((diagnostic) => diagnosticMarker(wrappedModel, diagnostic))
        .map((marker) => mapWrappedMarkerToBody(wrappedScript, marker))
        .filter((marker): marker is NonNullable<typeof marker> => marker !== null);
      monaco.editor.setModelMarkers(model, "tx-script-wrapper", markers);
    } catch {
      if (run === diagnosticRun) monaco.editor.setModelMarkers(model, "tx-script-wrapper", []);
    }
  }

  const markerTimer = window.setInterval(syncDiagnostics, 600);
  const changeSub = model.onDidChangeContent(() => {
    onChange(model.getValue());
    syncDiagnostics();
  });
  syncDiagnostics();

  return {
    editor,
    dispose() {
      window.clearInterval(markerTimer);
      changeSub.dispose();
      editor.dispose();
      model.dispose();
      wrappedModel.dispose();
    },
    layout: () => editor.layout(),
    setReadonly: (nextReadonly) => {
      editor.updateOptions({ readOnly: nextReadonly, domReadOnly: nextReadonly });
    },
    setTheme: (nextTheme) => {
      monaco.editor.setTheme(nextTheme);
      editor.updateOptions({ theme: nextTheme });
    },
    setValue: (nextValue) => {
      if (model.getValue() === nextValue) return;
      model.setValue(nextValue);
    },
  };
}

/**
 * Asynchronously colorizes a block of TypeScript code using Monaco's tokenizer.
 * Enforces Monaco configuration before invocation.
 */
export async function highlightCode(code: string, _theme = "tx-hextech"): Promise<string> {
  configureMonaco();
  return monaco.editor.colorize(code, "typescript", { tabSize: 2 });
}
