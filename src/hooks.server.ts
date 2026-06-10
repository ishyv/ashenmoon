import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.session = {
    userId: "mock_user",
    username: "Survivor",
    avatarUrl: null,
  };

  return resolve(event);
};
