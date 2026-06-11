import { promises as fs } from "fs";
import path from "path";

/**
 * Minimalist, file-based JSON database for local-first persistence.
 * Replaces MongoDB for the standalone RPG experience.
 */

const DATA_DIR = path.resolve(process.cwd(), ".data");
const SAVE_FILE = path.join(DATA_DIR, "save.json");

/**
 * Ensures the data directory exists.
 */
async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create data directory:", err);
  }
}

/**
 * Persists a JSON object to the local save file.
 * Uses an atomic-ish write (writing to a temp file and renaming could be added
 * if corruption becomes a concern, but for a dev slice, direct write is fine).
 */
export async function saveLocalData<T>(data: T): Promise<void> {
  await ensureDataDir();
  try {
    await fs.writeFile(SAVE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("LocalDB: Failed to save data:", err);
    throw err;
  }
}

/**
 * Reads the JSON object from the local save file.
 * Returns null if the file does not exist.
 */
export async function loadLocalData<T>(): Promise<T | null> {
  try {
    const content = await fs.readFile(SAVE_FILE, "utf-8");
    return JSON.parse(content) as T;
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return null;
    }
    console.error("LocalDB: Failed to load data:", err);
    throw err;
  }
}

/**
 * Removes the save file (e.g. for character reset).
 */
export async function deleteLocalData(): Promise<void> {
  try {
    await fs.unlink(SAVE_FILE);
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      console.error("LocalDB: Failed to delete data:", err);
      throw err;
    }
  }
}
