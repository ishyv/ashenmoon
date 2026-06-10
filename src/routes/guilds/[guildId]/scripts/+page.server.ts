import { fail, redirect } from "@sveltejs/kit";
import { getBridge } from "$lib/server/bridge";
import type { Actions, PageServerLoad } from "./$types";

function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 64);
}

export const load: PageServerLoad = async ({ params }) => {
  const result = await getBridge().listScripts(params.guildId);
  return { register: "hextech" as const, scripts: result.isOk() ? result.unwrap() : [] };
};

export const actions: Actions = {
  create: async ({ params, request, locals }) => {
    const data = await request.formData();
    const name = normalizeName(String(data.get("name") ?? ""));
    if (!name) return fail(400, { error: "name must contain letters, numbers, - or _." });
    const result = await getBridge().saveScript(
      params.guildId,
      name,
      {
        description: "",
        source: 'import { ctx } from "tx-discord-bot";\n\nreturn ctx.guild.memberCount;',
        capabilities: [],
        enabled: true,
        trigger: { kind: "manual" },
        reportChannelId: null,
      },
      locals.session?.userId,
    );
    if (result.isErr()) return fail(400, { error: result.error.message });
    throw redirect(303, `/guilds/${params.guildId}/scripts/${name}`);
  },
};
