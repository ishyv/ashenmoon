import dotenv from "dotenv";

dotenv.config();

export type DashboardSession = {
  userId: string;
  username: string;
  avatarUrl: string | null;
};

export type DashboardEnv = {
  MONGO_URI: string;
  DB_NAME: string;
};

const REQUIRED_KEYS = [
  "MONGO_URI",
  "DB_NAME",
] as const;

export function requireEnv(
  source: Partial<Record<keyof DashboardEnv, string | undefined>> = process.env,
): DashboardEnv {
  const missing = REQUIRED_KEYS.filter((key) => !source[key]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
  return Object.fromEntries(
    REQUIRED_KEYS.map((key) => [key, source[key] as string]),
  ) as DashboardEnv;
}
