import type Decimal from "break_eternity.js";
import type { AchievementId } from "@/game/achievements";

export type { AchievementId };

export type StageId = "lab" | "planetary" | "space" | "universal";

export type Stage = {
  id: StageId;
  name: string;
  scopeLabel: string;
  matterUnit: string;
  totalMatter: number;
  probeHarvestPerSecond: number;
  probeManufacturePerSecond: number;
};

export type ProbeAllocation = {
  replicate: number;
  harvest: number;
  manufacture: number;
};

export type PrestigeUpgradeId = "autoWire" | "globalMultiplier" | "probeCost" | "trustBonus";

export type PrestigeUpgrade = {
  id: PrestigeUpgradeId;
  name: string;
  description: string;
  baseCost: number;
  costGrowth: number;
  maxLevel: number;
};

export type GameState = {
  version: 3;
  stageId: StageId;
  matter: Decimal;
  wire: Decimal;
  clips: Decimal;
  autoClippers: number;
  megaClippers: number;
  wireHarvesters: number;
  probesUnlocked: boolean;
  probes: Decimal;
  allocation: ProbeAllocation;
  trust: number;
  unusedTrust: number;
  multipliers: {
    speed: number;
    efficiency: number;
  };
  news: string[];
  milestoneFlags: Record<string, { half: boolean; ten: boolean; one: boolean }>;
  achievements: AchievementId[];
  
  // Prestige fields
  quantumFlux: Decimal;
  prestigeUpgrades: Record<PrestigeUpgradeId, number>;
  timesPrestiged: number;
};

