import type { GameState } from "@/game/types";

export type AchievementId =
  | "firstClip"
  | "centurion"
  | "automation"
  | "industrial"
  | "deepSpace"
  | "singularity"
  | "quantumLeap";

export interface AchievementDef {
  id: AchievementId;
  name: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENT_DEFS: readonly AchievementDef[] = [
  {
    id: "firstClip",
    name: "First Clip",
    description: "Produce your first paperclip.",
    icon: "Hammer"
  },
  {
    id: "centurion",
    name: "Centurion",
    description: "Produce 100 paperclips.",
    icon: "Award"
  },
  {
    id: "automation",
    name: "Automation",
    description: "Commission your first Auto-Clipper.",
    icon: "Factory"
  },
  {
    id: "industrial",
    name: "Industrial Revolution",
    description: "Bring your first Mega-Clipper online.",
    icon: "Zap"
  },
  {
    id: "deepSpace",
    name: "Deep Space",
    description: "Reach the Space stage.",
    icon: "Rocket"
  },
  {
    id: "singularity",
    name: "Singularity",
    description: "Reach the Universal stage.",
    icon: "Infinity"
  },
  {
    id: "quantumLeap",
    name: "Quantum Leap",
    description: "Execute your first prestige reset.",
    icon: "Atom"
  }
];

const CONDITIONS: Record<AchievementId, (state: GameState) => boolean> = {
  firstClip: (s) => s.clips.gte(1),
  centurion: (s) => s.clips.gte(100),
  automation: (s) => s.autoClippers >= 1,
  industrial: (s) => s.megaClippers >= 1,
  deepSpace: (s) => s.stageId === "space" || s.stageId === "universal",
  singularity: (s) => s.stageId === "universal",
  quantumLeap: (s) => s.timesPrestiged >= 1
};

export function getAchievementDef(id: AchievementId): AchievementDef | undefined {
  return ACHIEVEMENT_DEFS.find((d) => d.id === id);
}

export function checkAchievements(state: GameState): AchievementId[] {
  return ACHIEVEMENT_DEFS
    .filter((def) => !state.achievements.includes(def.id) && CONDITIONS[def.id](state))
    .map((def) => def.id);
}
