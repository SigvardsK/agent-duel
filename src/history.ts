import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import type { HistoryEntry } from "./renderer.js";

const DEFAULT_PATH = "./data/history.json";

export function loadHistory(filepath: string = DEFAULT_PATH): HistoryEntry[] {
  try {
    if (!existsSync(filepath)) return [];
    const data = readFileSync(filepath, "utf-8");
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(history: HistoryEntry[], filepath: string = DEFAULT_PATH): void {
  try {
    const dir = dirname(filepath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(filepath, JSON.stringify(history, null, 2));
  } catch (err) {
    console.warn(`[history] Failed to save: ${err instanceof Error ? err.message : String(err)}`);
  }
}
