import type { Stage, StageId } from "@/game/types";

export const STAGES: readonly Stage[] = [
  {
    id: "lab",
    name: "The Lab",
    scopeLabel: "Grams",
    matterUnit: "g",
    totalMatter: 1_000,
    probeHarvestPerSecond: 40,
    probeManufacturePerSecond: 40
  },
  {
    id: "planetary",
    name: "Planetary",
    scopeLabel: "Earth Mass",
    matterUnit: "g",
    totalMatter: 5.972e27,
    probeHarvestPerSecond: 2.0e20,
    probeManufacturePerSecond: 2.0e20
  },
  {
    id: "space",
    name: "Space",
    scopeLabel: "Solar System",
    matterUnit: "g",
    totalMatter: 1.988e33,
    probeHarvestPerSecond: 7.5e24,
    probeManufacturePerSecond: 7.5e24
  },
  {
    id: "universal",
    name: "Universal",
    scopeLabel: "Observable Universe",
    matterUnit: "g",
    totalMatter: 1e53,
    probeHarvestPerSecond: 1.0e40,
    probeManufacturePerSecond: 1.0e40
  }
] as const;

export const STAGE_BY_ID: Record<StageId, Stage> = STAGES.reduce(
  (acc, stage) => {
    acc[stage.id] = stage;
    return acc;
  },
  {} as Record<StageId, Stage>
);

export const COSTS = {
  autoClipper: { base: 15, growth: 1.15 },
  megaClipper: { base: 500, growth: 1.22 },
  wireHarvester: { base: 100, growth: 1.25 },
  probeDesign: { cost: 100_000 },
  wirePurchase: { clips: 100, amount: 1000 }
} as const;

export const RATES = {
  wirePerSecondBase: 1.2,
  wirePerSecondPerAutoClipper: 0.15,
  wirePerSecondPerHarvester: 2.5,
  clipsPerSecondPerAutoClipper: 0.5,
  clipsPerSecondPerMegaClipper: 6,
  probeReplicationPerSecond: 0.0022
} as const;

export const MULTIPLIERS = {
  speedBoost: 1.25,
  efficiencyBoost: 0.9,
  trustCost: 1
} as const;

