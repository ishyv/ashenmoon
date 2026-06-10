<script lang="ts">
import ArrowLeft from "lucide-svelte/icons/arrow-left";
import CheckCircle2 from "lucide-svelte/icons/check-circle-2";
import FileCode2 from "lucide-svelte/icons/file-code-2";
import LockKeyhole from "lucide-svelte/icons/lock-keyhole";
import Play from "lucide-svelte/icons/play";
import Save from "lucide-svelte/icons/save";
import Search from "lucide-svelte/icons/search";
import Settings2 from "lucide-svelte/icons/settings-2";
import Terminal from "lucide-svelte/icons/terminal";
import Trash2 from "lucide-svelte/icons/trash-2";
import BookOpen from "lucide-svelte/icons/book-open";
import { enhance } from "$app/forms";
import { page } from "$app/state";
import ScriptEditor from "$lib/components/ScriptEditor.svelte";
import RolePicker from "$lib/components/RolePicker.svelte";
import ChannelSelect from "$lib/components/ChannelSelect.svelte";
import { operationSummary, triggerSummary } from "$lib/scripts/presentation";
import CodeHighlight from "$lib/components/CodeHighlight.svelte";
import "$lib/scripts/workbench.css";
import type { ScriptOutputBlockDTO, ScriptRunResultDTO, ScriptTriggerDTO } from "$shared/bridge-types";
import { toastStore } from "@hyvnt/hyvui";
import { untrack } from "svelte";
import type { PageData } from "./$types";
import documentation from "$shared/script-docs";

interface Props {
  data: PageData;
}

const { data }: Props = $props();
const guildId = $derived(page.params.guildId);
const script = $derived(data.script);
const editable = $derived(script.editable);

function resolveSource(s: typeof data.script): string {
  return s.source || (!s.editable ? "// built-in script\n// source is compiled with the bot and cannot be edited here." : "");
}

// Snapshot for $state initialization — the $effect below handles navigation changes
const s0 = untrack(() => data.script);
let source = $state(resolveSource(s0));
let description = $state(s0.description);
let enabled = $state(s0.enabled);
let capabilities = $state(new Set(s0.capabilities));
let triggerKind = $state(s0.trigger.kind);
let intervalHours = $state(s0.trigger.kind === "schedule" ? String(s0.trigger.intervalHours) : "24");
let event = $state(s0.trigger.kind === "event" ? s0.trigger.event : "member-join");
let reportChannelId = $state(s0.reportChannelId ?? "");
let editorTheme = $state("tx-hextech");
let saving = $state(false);
let deleting = $state(false);
let dialog = $state<"delete" | "apply" | null>(null);
let runResult = $state<ScriptRunResultDTO | null>(null);
let running = $state(false);
let inputValues = $state<Record<string, string>>({});
let runChannelId = $state("");
let lastSource = $state(resolveSource(s0));
let loadedName = $state(s0.name);

let railTab = $state<"library" | "docs">("library");
let docQuery = $state("");
let selectedDocItem = $state<any>(null);
let selectedExample = $state<any>(null);

const docCategories = [
  { id: "context", label: "context (ctx)" },
  { id: "input", label: "input helpers" },
  { id: "output", label: "output helpers" },
  { id: "capability", label: "capabilities" }
];

const filteredDocItems = $derived(
  documentation.api.filter(item => 
    item.name.toLowerCase().includes(docQuery.trim().toLowerCase()) ||
    item.description.toLowerCase().includes(docQuery.trim().toLowerCase())
  )
);

const filteredExamples = $derived(
  documentation.examples.filter(ex => 
    ex.title.toLowerCase().includes(docQuery.trim().toLowerCase()) ||
    ex.code.toLowerCase().includes(docQuery.trim().toLowerCase())
  )
);

$effect(() => {
  const s = data.script;
  if (s.name === loadedName) return;
  untrack(() => {
    loadedName = s.name;
    source = resolveSource(s);
    lastSource = source;
    description = s.description;
    enabled = s.enabled;
    capabilities = new Set(s.capabilities);
    triggerKind = s.trigger.kind;
    intervalHours = s.trigger.kind === "schedule" ? String(s.trigger.intervalHours) : "24";
    event = s.trigger.kind === "event" ? s.trigger.event : "member-join";
    reportChannelId = s.reportChannelId ?? "";
    runResult = null;
    inputValues = {};
    runChannelId = "";
    inspectorTab = "settings";
  });
});
let scriptQuery = $state("");
let inspectorTab = $state<"settings" | "run">("settings");

const capabilityValue = $derived([...capabilities].join(","));
const inputsJson = $derived(JSON.stringify(inputValues));
const canApply = $derived(
  runResult !== null &&
    runResult.dryRun &&
    runResult.error === null &&
    runResult.operations.length > 0 &&
    !running,
);
const filteredScripts = $derived(
  data.scripts.filter((item) => item.name.toLowerCase().includes(scriptQuery.trim().toLowerCase())),
);
const statusLabel = $derived(script.kind === "library" ? "built-in" : enabled ? "enabled" : "disabled");
const activeTrigger = $derived.by((): ScriptTriggerDTO => {
  if (triggerKind === "schedule") return { kind: "schedule", intervalHours: Number(intervalHours) || 0 };
  if (triggerKind === "event") return { kind: "event", event };
  return { kind: "manual" };
});
const activeTriggerLabel = $derived(triggerSummary(activeTrigger));
const reportChannelLabel = $derived(
  reportChannelId
    ? (data.channels.find((channel) => channel.id === reportChannelId)?.name ?? reportChannelId)
    : "no channel",
);
const runAccent = $derived(runResult?.error ? "danger" : runResult?.accent ?? "mute");
const sourceLineCount = $derived(Math.max(1, source.split("\n").length));

const themeOptions = [
  { value: "tx-hextech", label: "hextech" },
  { value: "tx-github-dark", label: "github dark" },
  { value: "tx-catppuccin-mocha", label: "catppuccin mocha" },
  { value: "vs-dark", label: "vs dark" },
  { value: "hc-black", label: "high contrast" },
];

const triggerOptions = [
  { value: "manual", label: "manual" },
  { value: "schedule", label: "schedule" },
  { value: "event", label: "member join" },
];

const channelOptions = $derived([
  { value: "", label: "no channel" },
  ...data.channels
    .filter((channel) => channel.type === "text")
    .map((channel) => ({ value: channel.id, label: `#${channel.name}` })),
]);


function toggleCapability(capability: string, checked: boolean): void {
  const next = new Set(capabilities);
  if (checked) next.add(capability as never);
  else next.delete(capability as never);
  capabilities = next;
  runResult = null;
}

function setInput(name: string, value: string): void {
  inputValues = { ...inputValues, [name]: value };
  runResult = null;
}

$effect(() => {
  if (source !== lastSource) {
    lastSource = source;
    runResult = null;
  }
});

$effect(() => {
  const _ = JSON.stringify(inputValues);
  untrack(() => {
    runResult = null;
  });
});

function blockText(block: ScriptOutputBlockDTO): string {
  if (block.kind === "field") return `${block.name ?? ""}: ${block.value ?? ""}`;
  if (block.kind === "list") return block.items?.join(", ") ?? "";
  if (block.kind === "object") {
    return block.entries?.map((entry) => `${entry.key}: ${entry.value}`).join(", ") ?? "";
  }
  return block.text ?? "";
}
</script>

<svelte:head><title>script · {script.name}</title></svelte:head>

<div class="script-workbench">
  <header class="sw-topbar">
    <div class="sw-identity">
      <a class="sw-back" href={`/guilds/${guildId}/scripts`} aria-label="back to scripts">
        <ArrowLeft size={16} strokeWidth={1.9} />
      </a>
      <div class="sw-titleblock">
        <span class="sw-eyebrow">scripts / {script.kind}</span>
        <h1 class="sw-title">{script.name}</h1>
      </div>
      <span class="sw-pill" class:sw-pill-ok={enabled} class:sw-pill-warn={!enabled}>{statusLabel}</span>
      {#if !editable}
        <span class="sw-pill"><LockKeyhole size={13} strokeWidth={1.8} /> read-only</span>
      {/if}
    </div>

    <div class="sw-actions">
      <label class="sw-field-inline">
        <span class="sw-label">theme</span>
        <select class="sw-select" bind:value={editorTheme}>
          {#each themeOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </label>
      <button class="sw-button" type="submit" form="script-preview-form" disabled={running}>
        <Play size={15} strokeWidth={1.9} />
        <span>{running ? "running" : "dry run"}</span>
      </button>
      <button class="sw-button sw-button-primary" type="submit" form="script-save-form" disabled={!editable || saving}>
        <Save size={15} strokeWidth={1.9} />
        <span>{saving ? "saving" : "save"}</span>
      </button>
      <button class="sw-button sw-button-danger" type="button" disabled={!canApply} onclick={() => (dialog = "apply")}>
        <CheckCircle2 size={15} strokeWidth={1.9} />
        <span>apply</span>
      </button>
    </div>
  </header>

  <div class="sw-grid">
    <aside class="sw-rail" class:sw-rail-docs={railTab === "docs"} aria-label="script library">
      <div class="sw-rail-head">
        <div class="sw-rail-tabs">
          <button
            class="sw-rail-tab"
            class:active={railTab === "library"}
            type="button"
            onclick={() => (railTab = "library")}
            title="Workspace Scripts"
          >
            <FileCode2 size={15} strokeWidth={1.8} />
            <span>library</span>
          </button>
          <button
            class="sw-rail-tab"
            class:active={railTab === "docs"}
            type="button"
            onclick={() => (railTab = "docs")}
            title="API Documentation"
          >
            <BookOpen size={15} strokeWidth={1.8} />
            <span>docs</span>
          </button>
        </div>
        {#if railTab === "library"}
          <span class="sw-rail-count">{data.scripts.length}</span>
        {/if}
      </div>

      {#if railTab === "library"}
        <label class="sw-search">
          <Search size={15} strokeWidth={1.8} />
          <input bind:value={scriptQuery} placeholder="filter scripts" />
        </label>
        <nav class="sw-list" aria-label="scripts">
          {#each filteredScripts as item (item.name)}
            <a
              class:active={item.name === script.name}
              class="sw-script-row"
              href={`/guilds/${guildId}/scripts/${item.name}`}
            >
              <span class="sw-script-name">{item.name}</span>
              <span class="sw-script-meta">{item.kind} · {triggerSummary(item.trigger)}</span>
            </a>
          {:else}
            <p class="sw-empty">no matches</p>
          {/each}
        </nav>
      {:else}
        {#if selectedDocItem}
          <div class="sw-doc-detail">
            <button class="sw-doc-back" type="button" onclick={() => (selectedDocItem = null)}>
              <ArrowLeft size={13} />
              <span>back to docs</span>
            </button>
            <div class="sw-doc-item-card">
              <div class="sw-doc-header">
                <span class="sw-doc-name">{selectedDocItem.name}</span>
                {#if selectedDocItem.capability}
                  <span class="sw-pill sw-pill-danger">{selectedDocItem.capability} cap</span>
                {/if}
              </div>
              <code class="sw-doc-signature">{selectedDocItem.signature}</code>
              <p class="sw-doc-description">{selectedDocItem.description}</p>
              {#if selectedDocItem.example}
                <div class="sw-doc-example-container">
                  <span class="sw-kicker">example</span>
                  <CodeHighlight code={selectedDocItem.example} theme={editorTheme} />
                </div>
              {/if}
            </div>
          </div>
        {:else if selectedExample}
          <div class="sw-doc-detail">
            <button class="sw-doc-back" type="button" onclick={() => (selectedExample = null)}>
              <ArrowLeft size={13} />
              <span>back to docs</span>
            </button>
            <div class="sw-doc-item-card">
              <div class="sw-doc-header">
                <span class="sw-doc-name">{selectedExample.title}</span>
              </div>
              <div class="sw-doc-example-container">
                <CodeHighlight code={selectedExample.code} theme={editorTheme} />
              </div>
            </div>
          </div>
        {:else}
          <label class="sw-search">
            <Search size={15} strokeWidth={1.8} />
            <input bind:value={docQuery} placeholder="search api & examples" />
          </label>
          <div class="sw-list sw-doc-list">
            {#each docCategories as cat}
              {@const items = filteredDocItems.filter(item => item.category === cat.id)}
              {#if items.length > 0}
                <div class="sw-doc-category-group">
                  <span class="sw-kicker sw-doc-category-title">{cat.label}</span>
                  {#each items as item}
                    <button
                      class="sw-doc-row"
                      type="button"
                      onclick={() => {
                        selectedDocItem = item;
                        selectedExample = null;
                      }}
                    >
                      <span class="sw-doc-row-name">{item.name}</span>
                      <span class="sw-doc-row-desc">{item.description}</span>
                    </button>
                  {/each}
                </div>
              {/if}
            {/each}

            {#if filteredExamples.length > 0}
              <div class="sw-doc-category-group">
                <span class="sw-kicker sw-doc-category-title">examples</span>
                {#each filteredExamples as ex}
                  <button
                    class="sw-doc-row"
                    type="button"
                    onclick={() => {
                      selectedExample = ex;
                      selectedDocItem = null;
                    }}
                  >
                    <span class="sw-doc-row-name">{ex.title}</span>
                  </button>
                {/each}
              </div>
            {/if}

            {#if filteredDocItems.length === 0 && filteredExamples.length === 0}
              <p class="sw-empty">no matches</p>
            {/if}
          </div>
        {/if}
      {/if}
    </aside>

    <main class="sw-editor">
      <div class="sw-editor-strip">
        <div class="sw-editor-title">
          <strong>{script.name}.ts</strong>
          <span>{editable ? "editable typescript body" : "compiled built-in source"}</span>
        </div>
        <div class="sw-editor-metrics">
          <span>{sourceLineCount} lines</span>
          <span>{activeTriggerLabel}</span>
          <span>{[...capabilities].length || 0} caps</span>
        </div>
      </div>
      <div class="sw-editor-frame" class:readonly={!editable}>
        <ScriptEditor bind:value={source} theme={editorTheme} readonly={!editable} />
      </div>
    </main>

    <aside class="sw-inspector">
      <div class="sw-tabs" role="tablist" aria-label="script workspace panels">
        <button
          class="sw-tab"
          class:active={inspectorTab === "settings"}
          type="button"
          onclick={() => (inspectorTab = "settings")}
        >
          <Settings2 size={15} strokeWidth={1.8} />
          <span>settings</span>
        </button>
        <button
          class="sw-tab"
          class:active={inspectorTab === "run"}
          type="button"
          onclick={() => (inspectorTab = "run")}
        >
          <Terminal size={15} strokeWidth={1.8} />
          <span>console</span>
        </button>
      </div>

      {#if inspectorTab === "settings"}
        <section class="sw-panel">
          <div class="sw-kicker">
            <span>metadata</span>
            <button class="sw-danger-link" type="button" disabled={!editable || deleting} onclick={() => (dialog = "delete")}>
              <Trash2 size={14} strokeWidth={1.8} />
              <span>delete</span>
            </button>
          </div>

          <label class="sw-field">
            <span class="sw-label">description</span>
            <textarea
              class="sw-textarea"
              bind:value={description}
              disabled={!editable}
              placeholder="what this script does"
              rows="3"
            ></textarea>
          </label>

          <div class="sw-form-grid">
            <label class="sw-field">
              <span class="sw-label">trigger</span>
              {#if editable}
                <select class="sw-select" bind:value={triggerKind}>
                  {#each triggerOptions as option}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              {:else}
                <span class="sw-readonly-box">{triggerSummary(script.trigger)}</span>
              {/if}
            </label>

            {#if triggerKind === "schedule"}
              <label class="sw-field">
                <span class="sw-label">interval hours</span>
                {#if editable}
                  <input class="sw-input" bind:value={intervalHours} inputmode="numeric" />
                {:else}
                  <span class="sw-readonly-box">{intervalHours}h</span>
                {/if}
              </label>
            {:else if triggerKind === "event"}
              <label class="sw-field">
                <span class="sw-label">event</span>
                {#if editable}
                  <select class="sw-select" bind:value={event}>
                    <option value="member-join">member join</option>
                  </select>
                {:else}
                  <span class="sw-readonly-box">{event.replace(/-/g, " ")}</span>
                {/if}
              </label>
            {:else}
              <div class="sw-field">
                <span class="sw-label">mode</span>
                <span class="sw-readonly-box">manual</span>
              </div>
            {/if}
          </div>

          <label class="sw-field">
            <span class="sw-label">report channel</span>
            {#if editable}
              <select class="sw-select" bind:value={reportChannelId}>
                {#each channelOptions as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
            {:else}
              <span class="sw-readonly-box">{reportChannelLabel}</span>
            {/if}
          </label>

          <div class="sw-toggle-row">
            <div>
              <span class="sw-label">availability</span>
              <strong>{enabled ? "enabled" : "disabled"}</strong>
            </div>
            {#if editable}
              <label class="sw-toggle" class:checked={enabled} aria-label="toggle script availability">
                <input type="checkbox" bind:checked={enabled} />
                <span></span>
              </label>
            {:else}
              <span class="sw-pill">locked</span>
            {/if}
          </div>

          <div class="sw-field">
            <span class="sw-label">capabilities</span>
            <div class="sw-capabilities">
              {#each ["roles", "messaging", "channels"] as capability}
                <label class="sw-chip" class:checked={capabilities.has(capability as never)}>
                  <input
                    type="checkbox"
                    checked={capabilities.has(capability as never)}
                    disabled={!editable}
                    onchange={(event) => toggleCapability(capability, event.currentTarget.checked)}
                  />
                  <span>{capability}</span>
                </label>
              {/each}
            </div>
          </div>
        </section>
      {:else}
        <section class="sw-panel">
          <div class="sw-kicker">
            <span>run input</span>
            <span class="sw-pill" class:sw-pill-accent={data.inputs.length > 0}>{data.inputs.length} fields</span>
          </div>

          <label class="sw-field">
            <span class="sw-label">context channel</span>
            <select class="sw-select" bind:value={runChannelId}>
              {#each channelOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </label>

          <div class="sw-input-stack">
            {#if data.inputs.length === 0}
              <p class="sw-empty">no declared inputs</p>
            {:else}
              {#each data.inputs as field (field.name)}
                {@const idPlaceholder = field.type === "role" ? "role id" : field.type === "channel" ? "channel id" : field.type === "member" ? "member id" : (field.placeholder || field.name)}
                <label class="sw-field">
                  <span class="sw-label">{field.label}</span>
                  {#if field.type === "role"}
                    <RolePicker
                      name={field.name}
                      bind:value={inputValues[field.name]}
                      roles={data.roles}
                      excludeManaged={false}
                      placeholder={`select ${field.label}`}
                    />
                  {:else if field.type === "channel"}
                    <ChannelSelect
                      name={field.name}
                      bind:value={inputValues[field.name]}
                      channels={data.channels}
                      placeholder={`select ${field.label}`}
                    />
                  {:else}
                    <input
                      class="sw-input"
                      value={inputValues[field.name] ?? ""}
                      inputmode={field.type === "number" ? "numeric" : "text"}
                      placeholder={idPlaceholder}
                      oninput={(event) => setInput(field.name, event.currentTarget.value)}
                    />
                  {/if}
                </label>
              {/each}
            {/if}
          </div>

          <div class="sw-result">
            <div class="sw-output-head">
              <span class="sw-kicker">output</span>
              {#if runResult}
                <span
                  class="sw-pill"
                  class:sw-pill-ok={runAccent === "ok"}
                  class:sw-pill-warn={runAccent === "warn"}
                  class:sw-pill-danger={runAccent === "danger"}
                  class:sw-pill-accent={runAccent === "info"}
                >
                  {runResult.dryRun ? "preview" : "applied"}
                </span>
              {/if}
            </div>

            {#if !runResult}
              <p class="sw-empty">run preview appears here</p>
            {:else if runResult.error}
              <p class="sw-error">{runResult.error}</p>
            {:else}
              <div class="sw-output-stack">
                {#if runResult.output.length === 0}
                  <p class="sw-empty">no display output</p>
                {:else}
                  {#each runResult.output as block}
                    {#if block.kind === "separator"}
                      <hr class="sw-output-separator" />
                    {:else if block.kind === "title"}
                      <div class="sw-output-block"><h2>{block.text}</h2></div>
                    {:else}
                      <div class="sw-output-block" class:footer={block.kind === "footer"}>
                        <p>{blockText(block)}</p>
                      </div>
                    {/if}
                  {/each}
                {/if}
              </div>

              <div class="sw-section">
                <div class="sw-operation-head">
                  <span class="sw-kicker">{runResult.dryRun ? "operation plan" : "apply report"}</span>
                  <span class="sw-pill">{runResult.operations.length}</span>
                </div>
                <p class="sw-output-caption">
                  {runResult.applied} applied · {runResult.failed} failed
                </p>

                {#if runResult.operations.length === 0}
                  <p class="sw-empty">no operations</p>
                {:else}
                  <ul class="sw-operation-list">
                    {#each runResult.operations as operation}
                      {@const summary = operationSummary(operation)}
                      <li class="sw-operation">
                        <div>
                          <strong>{summary.label}</strong>
                          <div class="sw-operation-detail">{summary.detail}</div>
                        </div>
                        <details>
                          <summary>raw</summary>
                          <code>{JSON.stringify(operation, null, 2)}</code>
                        </details>
                      </li>
                    {/each}
                  </ul>
                {/if}

                {#if runResult.failures.length > 0}
                  <div class="sw-section">
                    <span class="sw-kicker">failures</span>
                    {#each runResult.failures as failure}
                      <p class="sw-error">{failure.error}</p>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </section>
      {/if}
    </aside>
  </div>
</div>

<form
  method="POST"
  action="?/save"
  id="script-save-form"
  hidden
  use:enhance={() => {
    saving = true;
    return async ({ result, update }) => {
      saving = false;
      if (result.type === "success") toastStore.push("script saved", "ok");
      else if (result.type === "failure") toastStore.push(String(result.data?.error ?? "save failed"), "fail");
      await update({ reset: false });
    };
  }}
>
  <input type="hidden" name="source" value={source} />
  <input type="hidden" name="description" value={description} />
  <input type="hidden" name="triggerKind" value={triggerKind} />
  <input type="hidden" name="intervalHours" value={intervalHours} />
  <input type="hidden" name="event" value={event} />
  <input type="hidden" name="reportChannelId" value={reportChannelId} />
  <input type="hidden" name="enabled" value={enabled ? "on" : ""} />
  <input type="hidden" name="capabilities" value={capabilityValue} />
</form>

<form
  method="POST"
  action="?/preview"
  id="script-preview-form"
  hidden
  use:enhance={() => {
    running = true;
    inspectorTab = "run";
    return async ({ result, update }) => {
      running = false;
      if (result.type === "success") {
        runResult = (result.data as { run: ScriptRunResultDTO }).run;
        toastStore.push("dry run complete", "ok");
      } else if (result.type === "failure") {
        toastStore.push(String(result.data?.error ?? "run failed"), "fail");
      }
      await update({ reset: false });
    };
  }}
>
  <input type="hidden" name="inputs" value={inputsJson} />
  <input type="hidden" name="channelId" value={runChannelId} />
</form>

<form
  method="POST"
  action="?/apply"
  id="script-apply-form"
  hidden
  use:enhance={() => {
    running = true;
    return async ({ result, update }) => {
      running = false;
      dialog = null;
      inspectorTab = "run";
      if (result.type === "success") {
        runResult = (result.data as { run: ScriptRunResultDTO }).run;
        toastStore.push("script applied", "ok");
      } else if (result.type === "failure") {
        toastStore.push(String(result.data?.error ?? "apply failed"), "fail");
      }
      await update({ reset: false });
    };
  }}
>
  <input type="hidden" name="inputs" value={inputsJson} />
  <input type="hidden" name="channelId" value={runChannelId} />
</form>

<form
  method="POST"
  action="?/delete"
  id="script-delete-form"
  hidden
  use:enhance={() => {
    deleting = true;
    return async ({ result, update }) => {
      deleting = false;
      if (result.type === "failure") toastStore.push(String(result.data?.error ?? "delete failed"), "fail");
      await update();
    };
  }}
></form>

{#if dialog}
  <div class="sw-modal-backdrop">
    <button class="sw-modal-scrim" type="button" aria-label="close dialog" onclick={() => (dialog = null)}></button>
    <div
      class="sw-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="script-dialog-title"
    >
      {#if dialog === "apply"}
        <h2 id="script-dialog-title">apply {script.name}</h2>
        <p>run this script again with the current inputs and perform the operations from the resulting plan.</p>
        <div class="sw-modal-actions">
          <button class="sw-button" type="button" onclick={() => (dialog = null)}>cancel</button>
          <button
            class="sw-button sw-button-danger"
            type="button"
            onclick={() => (document.getElementById("script-apply-form") as HTMLFormElement | null)?.requestSubmit()}
          >
            apply
          </button>
        </div>
      {:else}
        <h2 id="script-dialog-title">delete {script.name}</h2>
        <p>remove this saved script from the guild workspace.</p>
        <div class="sw-modal-actions">
          <button class="sw-button" type="button" onclick={() => (dialog = null)}>keep</button>
          <button
            class="sw-button sw-button-danger"
            type="button"
            onclick={() => (document.getElementById("script-delete-form") as HTMLFormElement | null)?.requestSubmit()}
          >
            {deleting ? "deleting" : "delete"}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}
