declare global {
  namespace App {
    interface Locals {
      session: import("$lib/server/auth").GameSession | null;
    }
  }
}

export {};
