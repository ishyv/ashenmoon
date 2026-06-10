import { getBridge } from "$lib/server/legacy/bridge";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const features = await getBridge().listFeatures(params.guildId);
  return {
    register: "hextech" as const,
    features: features.isOk() ? features.unwrap() : [],
  };
};
