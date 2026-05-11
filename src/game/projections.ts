import Decimal from "break_eternity.js";
import type { GameState } from "@/game/types";
import { autoClipperCost, megaClipperCost, harvesterCost, getProbeDesignCost } from "@/game/game";
import { getMachineClipRate } from "@/game/selectors";

export interface UpgradeInfo {
  name: string;
  cost: Decimal;
  time: number | null;
}

export function getTimeToAfford(
  clips: Decimal,
  clipRate: Decimal,
  cost: Decimal
): number | null {
  if (clips.gte(cost)) return 0;
  if (clipRate.lte(0)) return null;
  const needed = cost.minus(clips);
  return needed.div(clipRate).toNumber();
}

export function getNextMilestoneClips(clips: Decimal): Decimal {
  const abs = clips.abs();
  if (abs.lt(100)) return new Decimal(100);
  const exp = abs.log10().floor();
  const next = exp.plus(1);
  return Decimal.pow(10, next);
}

export function getTimeToMilestone(
  clips: Decimal,
  clipRate: Decimal,
  milestone: Decimal
): number | null {
  if (clips.gte(milestone)) return 0;
  if (clipRate.lte(0)) return null;
  const needed = milestone.minus(clips);
  return needed.div(clipRate).toNumber();
}

export function getNextAffordableUpgrade(state: GameState): UpgradeInfo | null {
  const clips = state.clips;
  const clipRate = getMachineClipRate(state);

  const upgrades: { name: string; cost: Decimal }[] = [
    { name: "Auto-Clipper", cost: autoClipperCost(state) },
    { name: "Mega-Clipper", cost: megaClipperCost(state) },
    { name: "Wire Harvester", cost: harvesterCost(state) },
  ];

  if (!state.probesUnlocked) {
    upgrades.push({ name: "Probe Design", cost: getProbeDesignCost(state) });
  }

  const unaffordable = upgrades
    .filter((u) => clips.lt(u.cost))
    .map((u) => ({
      ...u,
      time: getTimeToAfford(clips, clipRate, u.cost),
    }))
    .filter((u) => u.time !== null && u.time !== Infinity);

  if (unaffordable.length === 0) return null;

  unaffordable.sort((a, b) => (a.time! - b.time!));
  return unaffordable[0];
}

export function formatCountdown(seconds: number | null): string {
  if (seconds === null) return "\u2014";
  if (seconds <= 0) return "Ready";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.ceil(seconds % 60);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.ceil((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
