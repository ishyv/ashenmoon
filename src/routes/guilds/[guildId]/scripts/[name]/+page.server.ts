import { error, fail, redirect } from "@sveltejs/kit";
import { getBridge } from "$lib/server/bridge";
import { parseScriptDraft, parseScriptRunInput } from "$lib/server/script-parsers";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const bridge = getBridge();
  const [scriptResult, scriptsResult, channelsResult, rolesResult, inputsResult] =
    await Promise.all([
      bridge.getScript(params.guildId, params.name),
      bridge.listScripts(params.guildId),
      bridge.getChannels(params.guildId),
      bridge.getRoles(params.guildId),
      bridge.scanScriptInputs(params.guildId, params.name),
    ]);

  if (scriptResult.isErr()) throw error(404, scriptResult.error.message);
  const script = scriptResult.unwrap();
  if (!script) throw redirect(303, `/guilds/${params.guildId}/scripts`);

  return {
    register: "hextech" as const,
    script,
    scripts: scriptsResult.isOk() ? scriptsResult.unwrap() : [],
    channels: channelsResult.isOk() ? channelsResult.unwrap() : [],
    roles: rolesResult.isOk() ? rolesResult.unwrap() : [],
    inputs: inputsResult.isOk() ? inputsResult.unwrap() : [],
  };
};

export const actions: Actions = {
  save: async ({ params, request, locals }) => {
    const data = await request.formData();
    const draft = parseScriptDraft(data);
    if (!draft.ok) return fail(400, { error: draft.error, field: draft.field });
    const result = await getBridge().saveScript(
      params.guildId,
      params.name,
      draft.value,
      locals.session?.userId,
    );
    if (result.isErr()) return fail(400, { error: result.error.message });
    return { success: true, script: result.unwrap() };
  },

  preview: async ({ params, request, locals }) => {
    const data = await request.formData();
    const input = parseScriptRunInput(data);
    if (!input.ok) return fail(400, { error: input.error, field: input.field });
    const result = await getBridge().previewScriptRun(
      params.guildId,
      params.name,
      input.value.input,
      input.value.channelId,
      locals.session?.userId,
    );
    if (result.isErr()) return fail(400, { error: result.error.message });
    return { success: true, run: result.unwrap() };
  },

  apply: async ({ params, request, locals }) => {
    const data = await request.formData();
    const input = parseScriptRunInput(data);
    if (!input.ok) return fail(400, { error: input.error, field: input.field });
    const result = await getBridge().applyScriptRun(
      params.guildId,
      params.name,
      input.value.input,
      input.value.channelId,
      locals.session?.userId,
    );
    if (result.isErr()) return fail(400, { error: result.error.message });
    return { success: true, run: result.unwrap() };
  },

  delete: async ({ params, locals }) => {
    const result = await getBridge().deleteScript(
      params.guildId,
      params.name,
      locals.session?.userId,
    );
    if (result.isErr()) return fail(400, { error: result.error.message });
    throw redirect(303, `/guilds/${params.guildId}/scripts`);
  },
};
