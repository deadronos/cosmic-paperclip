import Decimal from "break_eternity.js";
import { RATES } from "@/game/constants";
import type { GameState } from "@/game/types";

export function getGlobalPrestigeMultiplier(state: GameState): Decimal {
  const level = state.prestigeUpgrades?.globalMultiplier || 0;
  // +50% production per level
  return new Decimal(1).plus(level * 0.5);
}

export function getMachineClipRate(state: GameState): Decimal {
  const rate = Decimal.mul(state.autoClippers, RATES.clipsPerSecondPerAutoClipper)
    .plus(Decimal.mul(state.megaClippers, RATES.clipsPerSecondPerMegaClipper));
  return rate.times(state.multipliers.speed).times(getGlobalPrestigeMultiplier(state));
}

export function getWireRate(state: GameState): Decimal {
  let baseRate = new Decimal(0);

  const autoWireLevel = state.prestigeUpgrades?.autoWire || 0;
  if (autoWireLevel > 0) {
    baseRate = baseRate.plus(new Decimal(RATES.wirePerSecondBase).times(autoWireLevel).times(5));
  } else {
    baseRate = baseRate.plus(RATES.wirePerSecondBase);
  }

  const rate = Decimal.mul(state.autoClippers, RATES.wirePerSecondPerAutoClipper)
    .plus(baseRate)
    .plus(Decimal.mul(state.wireHarvesters, RATES.wirePerSecondPerHarvester));

  return rate.times(state.multipliers.speed);
}
