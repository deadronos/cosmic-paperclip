import type { GameState } from "@/game/types";

const KEY = "cosmic-paperclip:save:v1";

export function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isGameState(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: GameState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

function isGameState(v: unknown): v is GameState {
  if (!v || typeof v !== "object") return false;
  const s = v as Partial<GameState>;
  return (
    s.version === 1 &&
    typeof s.stageId === "string" &&
    typeof s.matter === "number" &&
    typeof s.wire === "number" &&
    typeof s.clips === "number" &&
    typeof s.autoClippers === "number" &&
    typeof s.megaClippers === "number" &&
    typeof s.probesUnlocked === "boolean" &&
    typeof s.probes === "number" &&
    typeof s.allocation === "object" &&
    Array.isArray(s.news)
  );
}

