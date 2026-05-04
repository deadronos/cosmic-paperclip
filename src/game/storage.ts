import Decimal from "break_eternity.js";
import { createInitialState } from "@/game/game";
import type { GameState, StageId, ProbeAllocation, PrestigeUpgradeId } from "@/game/types";

const KEY_V1 = "cosmic-paperclip:save:v1";
const KEY_V2 = "cosmic-paperclip:save:v2";
const KEY_V3 = "cosmic-paperclip:save:v3";

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

type SavedStateV3 = Omit<SavedStateV2, "version"> & {
  version: 3;
  quantumFlux: string;
  prestigeUpgrades: Record<PrestigeUpgradeId, number>;
  timesPrestiged: number;
};

export function loadState(): GameState | null {
  try {
    const rawV3 = localStorage.getItem(KEY_V3);
    if (rawV3) {
      const parsed = JSON.parse(rawV3) as unknown;
      if (isSavedStateV3(parsed)) return hydrateV3(parsed);
    }

    const rawV2 = localStorage.getItem(KEY_V2);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as unknown;
      if (isSavedStateV2(parsed)) {
        const migrated = migrateV2ToV3(parsed);
        try {
          localStorage.setItem(KEY_V3, JSON.stringify(migrated));
        } catch {
          // ignore
        }
        return hydrateV3(migrated);
      }
    }

    const rawV1 = localStorage.getItem(KEY_V1);
    if (rawV1) {
      const parsed = JSON.parse(rawV1) as unknown;
      if (isSavedStateV1(parsed)) {
        const migratedToV2 = migrateV1ToV2(parsed);
        const migratedToV3 = migrateV2ToV3(migratedToV2);
        try {
          localStorage.setItem(KEY_V3, JSON.stringify(migratedToV3));
        } catch {
          // ignore
        }
        return hydrateV3(migratedToV3);
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function saveState(state: GameState) {
  try {
    localStorage.setItem(KEY_V3, JSON.stringify(dehydrateV3(state)));
  } catch {
    // ignore
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY_V1);
    localStorage.removeItem(KEY_V2);
    localStorage.removeItem(KEY_V3);
  } catch {
    // ignore
  }
}

function dehydrateV3(state: GameState): SavedStateV3 {
  return {
    version: 3,
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
    milestoneFlags: state.milestoneFlags,
    quantumFlux: state.quantumFlux.toString(),
    prestigeUpgrades: state.prestigeUpgrades,
    timesPrestiged: state.timesPrestiged,
  };
}

function hydrateV3(saved: SavedStateV3): GameState {
  const initial = createInitialState();
  return {
    ...initial,
    ...saved,
    version: 3,
    multipliers: { ...initial.multipliers, ...saved.multipliers },
    allocation: saved.allocation ?? initial.allocation,
    news: Array.isArray(saved.news) ? saved.news : initial.news,
    milestoneFlags: saved.milestoneFlags ?? initial.milestoneFlags,
    matter: new Decimal(saved.matter),
    wire: new Decimal(saved.wire),
    clips: new Decimal(saved.clips),
    probes: new Decimal(saved.probes),
    quantumFlux: new Decimal(saved.quantumFlux),
    prestigeUpgrades: saved.prestigeUpgrades ?? initial.prestigeUpgrades,
  };
}

function migrateV2ToV3(saved: SavedStateV2): SavedStateV3 {
  return {
    ...saved,
    version: 3,
    quantumFlux: "0",
    prestigeUpgrades: {
      autoWire: 0,
      globalMultiplier: 0,
      probeCost: 0,
      trustBonus: 0
    },
    timesPrestiged: 0
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

function isSavedStateV3(v: unknown): v is SavedStateV3 {
  if (!v || typeof v !== "object") return false;
  const s = v as Partial<SavedStateV3>;
  const multUnknown = (s as { multipliers?: unknown }).multipliers;
  if (!multUnknown || typeof multUnknown !== "object") return false;
  const mult = multUnknown as { speed?: unknown; efficiency?: unknown };
  return (
    s.version === 3 &&
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
    typeof mult.efficiency === "number" &&
    typeof s.quantumFlux === "string" &&
    typeof s.prestigeUpgrades === "object" &&
    typeof s.timesPrestiged === "number"
  );
}

