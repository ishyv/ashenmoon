import { error } from "@sveltejs/kit";
import { findGuideTopic } from "$lib/guide/routing";
import type { PageServerLoad } from "./$types";

/** Resolves the requested topic id to its metadata, 404 if unknown. */
export const load: PageServerLoad = ({ params }) => {
  const topic = findGuideTopic(params.topic);
  if (!topic) throw error(404, "guide topic not found.");
  return topic;
};
