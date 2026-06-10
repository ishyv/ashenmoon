/**
 * Shared type contract for the bot ↔ webapp bridge.
 *
 * This file is the single source of truth for the bridge DTOs and the
 * `BotBridge` interface. Both the bot (`src/webapp/bridge.ts`) and the
 * SvelteKit webapp (`webapp/src/lib/server/bridge.ts`, via the
 * `$shared/bridge-types` alias) import from here.
 *
 * Keep this file type-only. Do not import bot-internal modules (e.g.
 * `@/core/result`) — the webapp bundle must not pull in bot runtime code.
 */

import type { EventEmitter } from "node:events";

// Structural mirror of `@/core/result` Ok/Err. Keeping it here means the
// webapp bundle does not need to resolve bot-internal imports while still
// being assignable from the bot's concrete `Ok`/`Err` class instances.
interface Ok<T, E> {
  readonly ok: true;
  readonly err: false;
  readonly value: T;
  isOk(): this is Ok<T, E>;
  isErr(): this is Err<T, E>;
  unwrap(): T;
}

interface Err<T, E> {
  readonly ok: false;
  readonly err: true;
  readonly error: E;
  isOk(): this is Ok<T, E>;
  isErr(): this is Err<T, E>;
  unwrap(): T;
}

export type Result<T, E = Error> = Ok<T, E> | Err<T, E>;

export interface DiscordChannel {
  readonly id: string;
  readonly name: string;
  readonly type:
    | "text"
    | "voice"
    | "category"
    | "forum"
    | "thread"
    | "announcement"
    | "stage"
    | "other";
  readonly parentId: string | null;
}

export interface DiscordRole {
  readonly id: string;
  readonly name: string;
  readonly color: number;
  readonly position: number;
  readonly managed: boolean;
}

export interface GuildStatus {
  readonly id: string;
  readonly name: string;
  readonly iconUrl: string | null;
  readonly memberCount: number;
  readonly enabledFeatures: readonly string[];
}

export interface FeatureSummary {
  readonly id: string;
  readonly enabled: boolean;
  readonly hasConfig: boolean;
}

export type GuideBadge =
  | "enabled"
  | "disabled"
  | "default_on"
  | "default_off"
  | "command"
  | "hidden"
  | "admin"
  | "guild_only"
  | "deferred"
  | "event"
  | "component"
  | "dashboard"
  | "passive";

export interface GuideCommandArg {
  readonly name: string;
  readonly description: string;
  readonly required: boolean;
}

export interface GuideCommand {
  readonly id: string;
  readonly featureId: string;
  readonly name: string;
  readonly description: string;
  readonly hidden: boolean;
  readonly requiresAdmin: boolean;
  readonly hints: readonly string[];
  readonly requires?: string;
  readonly badges: readonly GuideBadge[];
  readonly args: readonly GuideCommandArg[];
}

export interface GuideRuntimeRoute {
  readonly id: string;
  readonly featureId: string;
  readonly kind: "discord_event" | "framework_event" | "component";
  readonly label: string;
  readonly method: string;
  readonly badges: readonly GuideBadge[];
}

export interface GuideDashboardPage {
  readonly id: string;
  readonly featureId: string;
  readonly label: string;
  readonly path: string;
  readonly description: string;
  readonly badges: readonly GuideBadge[];
}

export interface GuideFeature {
  readonly id: string;
  readonly capabilityId: string;
  readonly name: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly defaultEnabled: boolean;
  readonly badges: readonly GuideBadge[];
  readonly commandIds: readonly string[];
  readonly runtimeRouteIds: readonly string[];
  readonly dashboardPageIds: readonly string[];
}

export interface GuideCapability {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly featureIds: readonly string[];
}

export interface GuideGraphSnapshot {
  readonly capabilities: readonly GuideCapability[];
  readonly features: readonly GuideFeature[];
  readonly commands: readonly GuideCommand[];
  readonly runtimeRoutes: readonly GuideRuntimeRoute[];
  readonly dashboardPages: readonly GuideDashboardPage[];
}

export interface EconomyDailyPatch {
  readonly dailyReward?: number;
  readonly dailyCooldownHours?: number;
  readonly dailyStreakBonus?: number;
  readonly dailyFeeRate?: number;
}

export interface EconomyWorkPatch {
  readonly workRewardBase?: number;
  readonly workCooldownMinutes?: number;
  readonly workDailyCap?: number;
  readonly workFailureChance?: number;
  readonly workBaseMintReward?: number;
  readonly workBonusFromWorksMax?: number;
}

export interface EconomyTaxPatch {
  readonly enabled?: boolean;
  readonly rate?: number;
  readonly minimumTaxableAmount?: number;
}

export interface EconomyPatch {
  readonly daily?: EconomyDailyPatch;
  readonly work?: EconomyWorkPatch;
  readonly sectors?: Readonly<Record<string, unknown>>;
}

export interface ModerationSettingsPatch {
  readonly modLogChannelId?: string | null;
  readonly appealsChannelId?: string | null;
  readonly quarantineRoleId?: string | null;
  readonly verifiedRoleId?: string | null;
}

export interface AutomodSettingsPatch {
  readonly linkSpam?: {
    readonly enabled?: boolean;
    readonly maxLinks?: number;
    readonly windowSeconds?: number;
    readonly timeoutSeconds?: number;
    readonly action?: "timeout" | "mute" | "delete" | "report";
    readonly reportChannelId?: string | null;
  };
  readonly domainWhitelist?: {
    readonly enabled?: boolean;
    readonly domains?: readonly string[];
  };
  readonly crossChannelSpam?: {
    readonly enabled?: boolean;
    readonly minChannels?: number;
    readonly windowSeconds?: number;
    readonly reportChannelId?: string | null;
    readonly autoTimeout?: boolean;
    readonly timeoutSeconds?: number;
  };
  readonly mentionSpam?: {
    readonly enabled?: boolean;
    readonly maxMentions?: number;
    readonly windowSeconds?: number;
    readonly action?: "timeout" | "delete" | "report";
    readonly timeoutSeconds?: number;
    readonly reportChannelId?: string | null;
  };
  readonly slowmode?: {
    readonly enabled?: boolean;
    readonly messagesPerWindow?: number;
    readonly windowSeconds?: number;
    readonly slowmodeSeconds?: number;
    readonly releaseAfterSeconds?: number;
  };
  readonly raidDetection?: {
    readonly enabled?: boolean;
    readonly joinsPerMinute?: number;
    readonly minAccountAgeDays?: number;
    readonly action?: "alert" | "lockdown" | "quarantine";
    readonly reportChannelId?: string | null;
  };
  readonly policy?: {
    readonly preset?: "relaxed" | "balanced" | "strict";
    readonly aiDetectorEnabled?: boolean;
    readonly staffBypass?: boolean;
    readonly profileRetentionDays?: number;
  };
  readonly perUserSlow?: {
    readonly enabled?: boolean;
    readonly rules?: readonly {
      readonly enabled: boolean;
      readonly roleId: string;
      readonly cooldownSeconds: number;
      readonly durationSeconds: number;
    }[];
  };
  readonly customPatterns?: readonly {
    readonly name: string;
    readonly pattern: string;
    readonly flags: string;
    readonly action: "delete" | "timeout" | "report";
    readonly timeoutSeconds: number;
  }[];
  readonly textRules?: readonly {
    readonly id: string;
    readonly enabled: boolean;
    readonly phrases: readonly string[];
    readonly action: "delete" | "timeout" | "report";
    readonly timeoutSeconds: number;
  }[];
  readonly imageDetection?: {
    readonly enabled?: boolean;
    readonly reportChannelId?: string | null;
    readonly tolerance?: ImageDetectionTolerance;
  };
}

export type ImageDetectionTolerance = "strict" | "balanced" | "loose";

export interface BannedImageDistanceDTO {
  readonly average: number;
  readonly difference: number;
  readonly verticalDifference: number;
  readonly total: number;
}

export interface BannedImageSummary {
  readonly id: string;
  readonly label: string | null;
  readonly reason: string;
  readonly sourceUrl: string | null;
  readonly sourceContentType: string | null;
  readonly sourceFilename: string | null;
  readonly addedBy: string;
  readonly addedAt: string;
}

export interface BannedImageUploadInput {
  readonly filename: string | null;
  readonly contentType: string | null;
  readonly bytes: Uint8Array;
  readonly reason: string;
  readonly label?: string | null;
}

export interface BannedImageEditPatch {
  readonly reason?: string;
  readonly label?: string | null;
}

export interface BannedImageTestInput {
  readonly filename: string | null;
  readonly contentType: string | null;
  readonly bytes: Uint8Array;
}

export interface BannedImageTestResult {
  readonly matched: boolean;
  readonly record: BannedImageSummary | null;
  readonly distance: BannedImageDistanceDTO | null;
}

export interface RolePolicyPatch {
  readonly roleId: string;
  readonly label?: string;
  readonly discordRoleId?: string | null;
  readonly reach?: Readonly<Record<string, "inherit" | "allow" | "deny">>;
  readonly limits?: Readonly<Record<string, unknown>>;
  readonly updatedBy?: string | null;
}

export interface RpgContentSnapshot {
  readonly items: Readonly<Record<string, unknown>>;
  readonly materials: Readonly<Record<string, unknown>>;
  readonly locations: Readonly<Record<string, unknown>>;
  readonly tools: Readonly<Record<string, unknown>>;
  readonly craftingRecipes: Readonly<Record<string, unknown>>;
  readonly processingRecipes: Readonly<Record<string, unknown>>;
}

export interface CaseSummary {
  readonly userId: string;
  readonly caseId: number;
  readonly type: string;
  readonly description: string;
  readonly date?: string;
  readonly moderatorId?: string;
  readonly source?: string;
  readonly evidenceSummary?: string;
}

export interface AppealSummary {
  readonly guildId: string;
  readonly caseId: number;
  readonly userId: string;
  readonly userTag: string;
  readonly submittedAt: string;
  readonly reason: string;
  readonly status: string;
  readonly threadId: string;
}

export type BotAction =
  | { readonly type: "send_message"; readonly channelId: string; readonly content: string }
  | { readonly type: "kick"; readonly userId: string; readonly reason?: string }
  | {
      readonly type: "ban";
      readonly userId: string;
      readonly reason?: string;
      readonly deleteMessageSeconds?: number;
    };

export type ModerationBridgeAction =
  | {
      readonly type: "warn";
      readonly moderatorId: string;
      readonly targetUserId: string;
      readonly reason: string;
    }
  | {
      readonly type: "timeout";
      readonly moderatorId: string;
      readonly targetUserId: string;
      readonly durationMs: number;
      readonly reason: string;
    }
  | {
      readonly type: "kick";
      readonly moderatorId: string;
      readonly targetUserId: string;
      readonly reason: string;
    }
  | {
      readonly type: "ban";
      readonly moderatorId: string;
      readonly targetUserId: string;
      readonly reason: string;
    }
  | {
      readonly type: "unban";
      readonly moderatorId: string;
      readonly targetUserId: string;
      readonly reason: string;
    }
  | {
      readonly type: "restrict";
      readonly moderatorId: string;
      readonly targetUserId: string;
      readonly roleId: string;
      readonly reason: string;
    };

export type EmbedScheduleIntervalHours = 1 | 6 | 12 | 24 | 168;

export interface EmbedFieldDTO {
  readonly name: string;
  readonly value: string;
  readonly inline: boolean;
}

/** The editable subset of an embed sent from the dashboard. Mirrors `EmbedConfigDraft`. */
export interface EmbedDraftDTO {
  readonly embedTitle: string | null;
  readonly embedDescription: string | null;
  readonly embedColor: number | null;
  readonly embedUrl: string | null;
  readonly embedThumbnail: string | null;
  readonly embedImage: string | null;
  readonly embedAuthorName: string | null;
  readonly embedAuthorIconUrl: string | null;
  readonly embedAuthorUrl: string | null;
  readonly embedFooterText: string | null;
  readonly embedFooterIconUrl: string | null;
  readonly embedFields: readonly EmbedFieldDTO[];
  readonly script: string | null;
  readonly scriptEnabled: boolean;
  readonly channelId: string | null;
  readonly scheduleEnabled: boolean;
  readonly scheduleIntervalHours: EmbedScheduleIntervalHours | null;
  readonly stickyEnabled: boolean;
}

/** Full stored embed returned to the editor. Mirrors `EmbedConfig`. */
export interface EmbedConfigDTO extends EmbedDraftDTO {
  readonly _id: string;
  readonly guildId: string;
  readonly name: string;
  readonly createdBy: string;
  readonly stickyMessageId: string | null;
  readonly stickyLastResendAt: Date | null;
  readonly scheduledNextSendAt: Date | null;
  readonly scheduledLastSentAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Compact embed shape for the list page. */
export interface EmbedSummary {
  readonly name: string;
  readonly channelId: string | null;
  readonly stickyEnabled: boolean;
  readonly scheduleEnabled: boolean;
  readonly scheduleIntervalHours: EmbedScheduleIntervalHours | null;
  readonly updatedAt: Date;
}

export type ScriptCapabilityDTO = "roles" | "messaging" | "channels";

export type ScriptTriggerDTO =
  | { readonly kind: "manual" }
  | { readonly kind: "schedule"; readonly intervalHours: number }
  | { readonly kind: "event"; readonly event: "member-join" };

export interface ScriptSummaryDTO {
  readonly name: string;
  readonly kind: "stored" | "library";
  readonly editable: boolean;
  readonly description: string;
  readonly capabilities: readonly ScriptCapabilityDTO[];
  readonly enabled: boolean;
  readonly trigger: ScriptTriggerDTO;
  readonly reportChannelId: string | null;
  readonly updatedAt: Date | null;
}

export interface ScriptDetailDTO extends ScriptSummaryDTO {
  readonly source: string;
  readonly createdBy: string | null;
  readonly createdAt: Date | null;
}

export interface ScriptDraftDTO {
  readonly description: string;
  readonly source: string;
  readonly capabilities: readonly ScriptCapabilityDTO[];
  readonly enabled: boolean;
  readonly trigger: ScriptTriggerDTO;
  readonly reportChannelId: string | null;
}

export interface ScriptInputFieldDTO {
  readonly name: string;
  readonly type: "text" | "number" | "role" | "member" | "channel";
  readonly label: string;
  readonly required: boolean;
  readonly placeholder: string;
}

export type ScriptOperationDTO =
  | { readonly kind: "add_role"; readonly userId: string; readonly role: string }
  | { readonly kind: "remove_role"; readonly userId: string; readonly role: string }
  | { readonly kind: "dm"; readonly userId: string; readonly content: string }
  | {
      readonly kind: "create_channel";
      readonly name: string;
      readonly channelType: "text" | "voice";
    }
  | { readonly kind: "create_role"; readonly name: string; readonly color: number | null };

export interface ScriptOutputBlockDTO {
  readonly kind: "title" | "text" | "field" | "list" | "object" | "footer" | "separator";
  readonly text?: string;
  readonly name?: string;
  readonly value?: string;
  readonly items?: readonly string[];
  readonly entries?: readonly { readonly key: string; readonly value: string }[];
}

export interface ScriptRunResultDTO {
  readonly dryRun: boolean;
  readonly accent: "ok" | "warn" | "info" | "danger" | "mute";
  readonly output: readonly ScriptOutputBlockDTO[];
  readonly operations: readonly ScriptOperationDTO[];
  readonly applied: number;
  readonly failed: number;
  readonly failures: readonly { readonly operation: ScriptOperationDTO; readonly error: string }[];
  readonly error: string | null;
  readonly inputError: boolean;
}

export type BotEventType =
  | "automod_trigger"
  | "mod_action"
  | "config_changed"
  | "member_join"
  | "member_leave"
  | "appeal_submitted"
  | "appeal_decided"
  | "rpg_content_reloaded";

export interface BotEvent {
  readonly type: BotEventType;
  readonly guildId: string;
  readonly actorId?: string;
  readonly targetId?: string;
  readonly detail: string;
  readonly timestamp: number;
}

export interface BotBridge {
  getChannels(guildId: string): Promise<Result<readonly DiscordChannel[], Error>>;
  getRoles(guildId: string): Promise<Result<readonly DiscordRole[], Error>>;
  getGuildStatus(guildId: string): Promise<Result<GuildStatus, Error>>;
  /** Full guild config document as a plain JSON value. */
  getGuildConfig(guildId: string): Promise<Result<Record<string, unknown>, Error>>;
  getAdminState(guildId: string): Promise<Result<Record<string, unknown>, Error>>;
  listFeatures(guildId: string): Promise<Result<readonly FeatureSummary[], Error>>;
  saveChannels(
    guildId: string,
    slots: Record<string, string | null>,
    actorId?: string | null,
  ): Promise<Result<void, Error>>;
  saveModeration(
    guildId: string,
    patch: ModerationSettingsPatch,
    actorId?: string | null,
  ): Promise<Result<void, Error>>;
  saveAutomod(
    guildId: string,
    patch: AutomodSettingsPatch,
    actorId?: string | null,
  ): Promise<Result<void, Error>>;
  listBannedImages(guildId: string): Promise<Result<readonly BannedImageSummary[], Error>>;
  addBannedImage(
    guildId: string,
    input: BannedImageUploadInput,
    actorId?: string | null,
  ): Promise<Result<BannedImageSummary, Error>>;
  editBannedImage(
    guildId: string,
    id: string,
    patch: BannedImageEditPatch,
    actorId?: string | null,
  ): Promise<Result<BannedImageSummary, Error>>;
  removeBannedImage(
    guildId: string,
    id: string,
    actorId?: string | null,
  ): Promise<Result<BannedImageSummary, Error>>;
  testBannedImage(
    guildId: string,
    input: BannedImageTestInput,
  ): Promise<Result<BannedImageTestResult, Error>>;
  saveEconomy(
    guildId: string,
    patch: EconomyPatch,
    actorId?: string | null,
  ): Promise<Result<void, Error>>;
  saveEconomyTax(
    guildId: string,
    patch: EconomyTaxPatch,
    actorId?: string | null,
  ): Promise<Result<void, Error>>;
  saveRolePolicy(guildId: string, patch: RolePolicyPatch): Promise<Result<void, Error>>;
  listCases(guildId: string): Promise<Result<readonly CaseSummary[], Error>>;
  editCase(
    guildId: string,
    actorId: string,
    userId: string,
    caseId: number,
    description: string,
  ): Promise<Result<void, Error>>;
  deleteCase(
    guildId: string,
    actorId: string,
    userId: string,
    caseId: number,
  ): Promise<Result<void, Error>>;
  listAppeals(guildId: string): Promise<Result<readonly AppealSummary[], Error>>;
  resolveAppeal(
    guildId: string,
    caseId: number,
    reviewerId: string,
    status: "approved" | "denied",
    note: string,
  ): Promise<Result<void, Error>>;
  runModerationAction(
    guildId: string,
    action: ModerationBridgeAction,
  ): Promise<Result<void, Error>>;
  getRpgContent(): Promise<Result<RpgContentSnapshot, Error>>;
  saveRpgContent(snapshot: RpgContentSnapshot): Promise<Result<RpgContentSnapshot, Error>>;
  reloadRpgContent(): Promise<Result<RpgContentSnapshot, Error>>;
  applyConfig(
    guildId: string,
    paths: Record<string, unknown>,
    actorId?: string | null,
  ): Promise<Result<void, Error>>;
  toggleFeature(
    guildId: string,
    featureId: string,
    enabled: boolean,
    actorId?: string | null,
  ): Promise<Result<void, Error>>;
  triggerAction(guildId: string, action: BotAction): Promise<Result<void, Error>>;
  listEmbeds(guildId: string): Promise<Result<readonly EmbedSummary[], Error>>;
  getEmbed(guildId: string, name: string): Promise<Result<EmbedConfigDTO | null, Error>>;
  saveEmbed(
    guildId: string,
    name: string,
    draft: EmbedDraftDTO,
    actorId?: string | null,
  ): Promise<Result<EmbedConfigDTO, Error>>;
  deleteEmbed(
    guildId: string,
    name: string,
    actorId?: string | null,
  ): Promise<Result<boolean, Error>>;
  sendEmbed(
    guildId: string,
    name: string,
    actorId?: string | null,
  ): Promise<Result<{ readonly messageId: string }, Error>>;
  listScripts(guildId: string): Promise<Result<readonly ScriptSummaryDTO[], Error>>;
  getScript(guildId: string, name: string): Promise<Result<ScriptDetailDTO | null, Error>>;
  saveScript(
    guildId: string,
    name: string,
    draft: ScriptDraftDTO,
    actorId?: string | null,
  ): Promise<Result<ScriptDetailDTO, Error>>;
  deleteScript(
    guildId: string,
    name: string,
    actorId?: string | null,
  ): Promise<Result<boolean, Error>>;
  scanScriptInputs(
    guildId: string,
    name: string,
  ): Promise<Result<readonly ScriptInputFieldDTO[], Error>>;
  previewScriptRun(
    guildId: string,
    name: string,
    input: Record<string, string>,
    channelId: string | null,
    actorId?: string | null,
  ): Promise<Result<ScriptRunResultDTO, Error>>;
  applyScriptRun(
    guildId: string,
    name: string,
    input: Record<string, string>,
    channelId: string | null,
    actorId?: string | null,
  ): Promise<Result<ScriptRunResultDTO, Error>>;
  getRpgPlayerState(userId: string): Promise<Result<RpgPlayerState, Error>>;
  rpgGather(
    userId: string,
    action: "mine" | "forest",
    locationId: string,
  ): Promise<Result<RpgGatherResult, Error>>;
  rpgEquipTool(userId: string, itemId: string | null): Promise<Result<RpgPlayerState, Error>>;
  /** Evaluates items and loadout against environmental parameters, processing transformations. */
  rpgEnvironmentTick(
    userId: string,
    env: { temperature: number; humidity: number; toxins: number },
  ): Promise<Result<RpgEnvironmentTickResult, Error>>;
  readonly events: EventEmitter;
}

export interface RpgSkillState {
  readonly level: number;
  readonly xp: number;
  readonly nextXp: number;
}

export interface RpgPlayerState {
  readonly profile: {
    readonly hpCurrent: number;
    readonly stashSize: number;
    readonly loadout: {
      readonly weapon:
        | {
            readonly instanceId: string;
            readonly itemId: string;
            readonly durability: number;
          }
        | string
        | null;
      readonly shield: any;
      readonly helmet: any;
      readonly chest: any;
      readonly pants: any;
      readonly boots: any;
      readonly ring: any;
      readonly necklace: any;
    };
    readonly buildings?: readonly {
      readonly id: string;
      readonly type: string;
      readonly x: number;
      readonly y: number;
    }[];
    readonly gatheredPickups?: readonly string[];
  };
  readonly inventory: {
    readonly slots: Record<
      string,
      | { readonly qty: number }
      | {
          readonly instances: readonly {
            readonly instanceId: string;
            readonly durability: number;
          }[];
        }
    >;
  };
  readonly skills: {
    readonly lumberjacking: RpgSkillState;
    readonly mining: RpgSkillState;
    readonly evade: RpgSkillState;
    readonly superGather: RpgSkillState;
  };
}

export interface RpgGatherResult {
  readonly userId: string;
  readonly locationId: string;
  readonly locationName: string;
  readonly tier: number;
  readonly toolId: string;
  readonly materialsGained: readonly { readonly id: string; readonly quantity: number }[];
  readonly remainingDurability: number;
  readonly toolBroken: boolean;
  readonly playerState: RpgPlayerState;
}

/** Describes a single triggered reaction event in the player environment. */
export interface RpgReactionTriggered {
  readonly itemId: string;
  readonly event: "ignited" | "melted" | "rotted";
  readonly resultItemId: string;
  readonly quantity: number;
  readonly equippedSlot?: string;
}

/** State payload returned after processing an environmental tick. */
export interface RpgEnvironmentTickResult {
  readonly mutated: boolean;
  readonly reactions: readonly RpgReactionTriggered[];
  readonly playerState: RpgPlayerState;
}
