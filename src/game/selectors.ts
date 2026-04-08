import Decimal from "break_eternity.js";
import { RATES } from "@/game/constants";
import type { GameState } from "@/game/types";

export function getMachineClipRate(state: GameState): Decimal {
  return Decimal.mul(state.autoClippers, RATES.clipsPerSecondPerAutoClipper)
    .plus(Decimal.mul(state.megaClippers, RATES.clipsPerSecondPerMegaClipper))
    .times(state.multipliers.speed);
}

export function getWireRate(state: GameState): Decimal {
  return Decimal.mul(state.autoClippers, RATES.wirePerSecondPerAutoClipper)
    .plus(RATES.wirePerSecondBase)
    .plus(Decimal.mul(state.wireHarvesters, RATES.wirePerSecondPerHarvester))
    .times(state.multipliers.speed);
}
