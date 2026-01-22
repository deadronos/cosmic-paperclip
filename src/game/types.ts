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

export type GameState = {
  version: 1;
  stageId: StageId;
  matter: number;
  wire: number;
  clips: number;
  autoClippers: number;
  megaClippers: number;
  probesUnlocked: boolean;
  probes: number;
  allocation: ProbeAllocation;
  news: string[];
  milestoneFlags: Record<string, { half: boolean; ten: boolean; one: boolean }>;
};

