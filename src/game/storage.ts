import Decimal from "break_eternity.js";
import { createInitialState } from "@/game/game";
import type { GameState, StageId, ProbeAllocation } from "@/game/types";

const KEY_V1 = "cosmic-paperclip:save:v1";
const KEY_V2 = "cosmic-paperclip:save:v2";

type SavedStateV1 = {
  version: 1;
  stageId: StageId;
  matter: number;
  wire: number;
  clips: number;
  autoClippers: number;
  megaClippers: number;
  wireHarvesters: number;
  probesUnlocked: boolean;
  probes: number;
  allocation: ProbeAllocation;
  trust: number;
  unusedTrust: number;
  multipliers?: { speed: number; efficiency: number };
  news: string[];
  milestoneFlags?: Record<string, { half: boolean; ten: boolean; one: boolean }>;
};

type SavedStateV2 = {
  version: 2;
  stageId: StageId;
  matter: string;
  wire: string;
  clips: string;
  autoClippers: number;
  megaClippers: number;
  wireHarvesters: number;
  probesUnlocked: boolean;
  probes: string;
  allocation: ProbeAllocation;
  trust: number;
  unusedTrust: number;
  multipliers: { speed: number; efficiency: number };
  news: string[];
  milestoneFlags: Record<string, { half: boolean; ten: boolean; one: boolean }>;
};

export function loadState(): GameState | null {
  try {
    const rawV2 = localStorage.getItem(KEY_V2);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as unknown;
      if (isSavedStateV2(parsed)) return hydrateV2(parsed);
    }

    const rawV1 = localStorage.getItem(KEY_V1);
    if (rawV1) {
      const parsed = JSON.parse(rawV1) as unknown;
      if (isSavedStateV1(parsed)) {
        const migrated = migrateV1ToV2(parsed);
        // Best-effort: write migrated save forward.
        try {
          localStorage.setItem(KEY_V2, JSON.stringify(migrated));
        } catch {
          // ignore
        }
        return hydrateV2(migrated);
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function saveState(state: GameState) {
  try {
    localStorage.setItem(KEY_V2, JSON.stringify(dehydrateV2(state)));
  } catch {
    // ignore
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY_V1);
    localStorage.removeItem(KEY_V2);
  } catch {
    // ignore
  }
}

function dehydrateV2(state: GameState): SavedStateV2 {
  return {
    version: 2,
    stageId: state.stageId,
    matter: state.matter.toString(),
    wire: state.wire.toString(),
    clips: state.clips.toString(),
    autoClippers: state.autoClippers,
    megaClippers: state.megaClippers,
    wireHarvesters: state.wireHarvesters,
    probesUnlocked: state.probesUnlocked,
    probes: state.probes.toString(),
    allocation: state.allocation,
    trust: state.trust,
    unusedTrust: state.unusedTrust,
    multipliers: state.multipliers,
    news: state.news,
    milestoneFlags: state.milestoneFlags
  };
}

function hydrateV2(saved: SavedStateV2): GameState {
  const initial = createInitialState();
  return {
    ...initial,
    ...saved,
    version: 2,
    multipliers: { ...initial.multipliers, ...saved.multipliers },
    allocation: saved.allocation ?? initial.allocation,
    news: Array.isArray(saved.news) ? saved.news : initial.news,
    milestoneFlags: saved.milestoneFlags ?? initial.milestoneFlags,
    matter: new Decimal(saved.matter),
    wire: new Decimal(saved.wire),
    clips: new Decimal(saved.clips),
    probes: new Decimal(saved.probes)
  };
}

function migrateV1ToV2(saved: SavedStateV1): SavedStateV2 {
  const initial = createInitialState();
  return {
    version: 2,
    stageId: saved.stageId,
    matter: new Decimal(saved.matter).toString(),
    wire: new Decimal(saved.wire).toString(),
    clips: new Decimal(saved.clips).toString(),
    autoClippers: saved.autoClippers,
    megaClippers: saved.megaClippers,
    wireHarvesters: saved.wireHarvesters,
    probesUnlocked: saved.probesUnlocked,
    probes: new Decimal(saved.probes).toString(),
    allocation: saved.allocation,
    trust: saved.trust ?? initial.trust,
    unusedTrust: saved.unusedTrust ?? initial.unusedTrust,
    multipliers: { ...initial.multipliers, ...(saved.multipliers ?? {}) },
    news: saved.news ?? initial.news,
    milestoneFlags: saved.milestoneFlags ?? initial.milestoneFlags
  };
}

function isSavedStateV1(v: unknown): v is SavedStateV1 {
  if (!v || typeof v !== "object") return false;
  const s = v as Partial<SavedStateV1>;
  return (
    s.version === 1 &&
    typeof s.stageId === "string" &&
    typeof s.matter === "number" &&
    typeof s.wire === "number" &&
    typeof s.clips === "number" &&
    typeof s.autoClippers === "number" &&
    typeof s.megaClippers === "number" &&
    typeof s.wireHarvesters === "number" &&
    typeof s.probesUnlocked === "boolean" &&
    typeof s.probes === "number" &&
    typeof s.allocation === "object" &&
    Array.isArray(s.news)
  );
}

function isSavedStateV2(v: unknown): v is SavedStateV2 {
  if (!v || typeof v !== "object") return false;
  const s = v as Partial<SavedStateV2>;
  const multUnknown = (s as { multipliers?: unknown }).multipliers;
  if (!multUnknown || typeof multUnknown !== "object") return false;
  const mult = multUnknown as { speed?: unknown; efficiency?: unknown };
  return (
    s.version === 2 &&
    typeof s.stageId === "string" &&
    typeof s.matter === "string" &&
    typeof s.wire === "string" &&
    typeof s.clips === "string" &&
    typeof s.autoClippers === "number" &&
    typeof s.megaClippers === "number" &&
    typeof s.wireHarvesters === "number" &&
    typeof s.probesUnlocked === "boolean" &&
    typeof s.probes === "string" &&
    typeof s.allocation === "object" &&
    Array.isArray(s.news) &&
    typeof mult.speed === "number" &&
    typeof mult.efficiency === "number"
  );
}

