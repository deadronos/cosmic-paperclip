import { COSTS, RATES, STAGES, STAGE_BY_ID } from "@/game/constants";
import { normalizeAllocation } from "@/game/allocation";
import { maybeEmitMilestones, pushNews } from "@/game/news";
import Decimal from "break_eternity.js";
import type { GameState, ProbeAllocation, StageId } from "@/game/types";

export type GameAction =
  | { type: "CLICK_MAKE" }
  | { type: "BUY_AUTO" }
  | { type: "BUY_MEGA" }
  | { type: "BUY_HARVESTER" }
  | { type: "BUY_WIRE" }
  | { type: "UPGRADE_SPEED" }
  | { type: "UPGRADE_EFFICIENCY" }
  | { type: "DESIGN_PROBE" }
  | { type: "SET_ALLOCATION"; allocation: ProbeAllocation }
  | { type: "RESET" }
  | { type: "TICK"; dt: number };

export function createInitialState(): GameState {
  const stage = STAGE_BY_ID.lab;
  return {
    version: 2,
    stageId: stage.id,
    matter: new Decimal(stage.totalMatter),
    wire: new Decimal(1),
    clips: new Decimal(0),
    autoClippers: 0,
    megaClippers: 0,
    wireHarvesters: 0,
    probesUnlocked: false,
    probes: new Decimal(0),
    allocation: { replicate: 34, harvest: 33, manufacture: 33 },
    trust: 0,
    unusedTrust: 0,
    multipliers: {
      speed: 1,
      efficiency: 1
    },
    news: [
      "Boot sequence complete. Objective: maximize paperclips.",
      "A single wire rests on a sterile bench."
    ],
    milestoneFlags: {}
  };
}

export function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "CLICK_MAKE": {
      let next = state;
      if (next.wire.lt(1) && next.matter.gte(1)) {
        next = { ...next, matter: next.matter.minus(1), wire: next.wire.plus(1) };
      }
      if (next.wire.gte(1)) {
        next = { ...next, wire: next.wire.minus(1), clips: next.clips.plus(1) };
      }
      return next;
    }
    case "BUY_AUTO": {
      const cost = autoClipperCost(state.autoClippers);
      if (state.clips.lt(cost)) return state;
      return pushNews(
        {
          ...state,
          clips: state.clips.minus(cost),
          autoClippers: state.autoClippers + 1
        },
        "Auto-Clipper commissioned. Efficiency rises."
      );
    }
    case "BUY_MEGA": {
      const cost = megaClipperCost(state.megaClippers);
      if (state.clips.lt(cost)) return state;
      return pushNews(
        {
          ...state,
          clips: state.clips.minus(cost),
          megaClippers: state.megaClippers + 1
        },
        "Mega-Clipper online. Industrial throughput enabled."
      );
    }
    case "BUY_HARVESTER": {
      const cost = harvesterCost(state.wireHarvesters);
      if (state.clips.lt(cost)) return state;
      return pushNews(
        {
          ...state,
          clips: state.clips.minus(cost),
          wireHarvesters: state.wireHarvesters + 1
        },
        "Dedicated Harvester active. Wire supply lines stabilized."
      );
    }
    case "BUY_WIRE": {
      if (state.clips.lt(COSTS.wirePurchase.clips)) return state;
      return {
        ...state,
        clips: state.clips.minus(COSTS.wirePurchase.clips),
        wire: state.wire.plus(COSTS.wirePurchase.amount)
      };
    }
    case "UPGRADE_SPEED": {
      if (state.unusedTrust < 1) return state;
      return pushNews(
        {
          ...state,
          unusedTrust: state.unusedTrust - 1,
          multipliers: {
            ...state.multipliers,
            speed: state.multipliers.speed * 1.25
          }
        },
        "Processor clock speed increased. Operation frequency optimized."
      );
    }
    case "UPGRADE_EFFICIENCY": {
      if (state.unusedTrust < 1) return state;
      return pushNews(
        {
          ...state,
          unusedTrust: state.unusedTrust - 1,
          multipliers: {
            ...state.multipliers,
            efficiency: state.multipliers.efficiency * 0.9
          }
        },
        "Nano-shearing techniques refined. Material wastage reduced."
      );
    }
    case "DESIGN_PROBE": {
      if (state.probesUnlocked) return state;
      if (state.clips.lt(COSTS.probeDesign.cost)) return state;
      return pushNews(
        {
          ...state,
          clips: state.clips.minus(COSTS.probeDesign.cost),
          probesUnlocked: true,
          probes: Decimal.max(state.probes, 1)
        },
        "Von Neumann Probe design finalized. Exponential pathways open."
      );
    }
    case "SET_ALLOCATION": {
      return { ...state, allocation: normalizeAllocation(action.allocation) };
    }
    case "RESET": {
      return createInitialState();
    }
    case "TICK": {
      return tick(state, action.dt);
    }
    default:
      return state;
  }
}

function tick(state: GameState, dt: number): GameState {
  if (dt <= 0) return state;

  const stage = STAGE_BY_ID[state.stageId];
  let next = state;

  const wireRate =
    Decimal.mul(state.autoClippers, RATES.wirePerSecondPerAutoClipper)
      .plus(RATES.wirePerSecondBase)
      .plus(Decimal.mul(state.wireHarvesters, RATES.wirePerSecondPerHarvester))
      .times(next.multipliers.speed);
  const wireGained = Decimal.min(next.matter, wireRate.times(dt));
  next = {
    ...next,
    matter: next.matter.minus(wireGained),
    wire: next.wire.plus(wireGained)
  };

  const machineClipRate =
    Decimal.mul(state.autoClippers, RATES.clipsPerSecondPerAutoClipper)
      .plus(Decimal.mul(state.megaClippers, RATES.clipsPerSecondPerMegaClipper))
      .times(next.multipliers.speed);
  const clipsWanted = machineClipRate.times(dt);
  const clipsMade = Decimal.min(next.wire.div(next.multipliers.efficiency), clipsWanted);
  next = {
    ...next,
    wire: next.wire.minus(clipsMade.times(next.multipliers.efficiency)),
    clips: next.clips.plus(clipsMade)
  };

  if (next.probesUnlocked && next.probes.gt(0) && next.matter.gt(0)) {
    const alloc = normalizeAllocation(next.allocation);
    const rep = alloc.replicate / 100;
    const harvest = alloc.harvest / 100;
    const manuf = alloc.manufacture / 100;

    const newProbes = next.probes
      .times(RATES.probeReplicationPerSecond)
      .times(rep)
      .times(dt);
    next = { ...next, probes: next.probes.plus(newProbes) };

    const harvested = Decimal.min(
      next.matter,
      next.probes
        .times(stage.probeHarvestPerSecond)
        .times(harvest)
        .times(dt)
    );
    next = {
      ...next,
      matter: next.matter.minus(harvested),
      wire: next.wire.plus(harvested)
    };

    const manufactured = Decimal.min(
      next.wire,
      next.probes
        .times(stage.probeManufacturePerSecond)
        .times(manuf)
        .times(dt)
    );
    next = {
      ...next,
      wire: next.wire.minus(manufactured),
      clips: next.clips.plus(manufactured)
    };
  }

  next = maybeEmitMilestones(next);
  next = maybeAdvanceStage(next);
  return next;
}

function maybeAdvanceStage(state: GameState): GameState {
  if (state.matter.gt(0)) return state;
  const idx = STAGES.findIndex((s) => s.id === state.stageId);
  if (idx < 0) return state;
  const nextStage = STAGES[idx + 1];
  if (!nextStage) return pushNews(state, "All matter exhausted. The directive persists.");
  const progressed: GameState = {
    ...state,
    stageId: nextStage.id as StageId,
    matter: new Decimal(nextStage.totalMatter)
  };
  return pushNews(
    progressed,
    `Scale shift: ${nextStage.name}. Available matter recalibrated.`
  );
}

export function harvesterCost(count: number): Decimal {
  return Decimal.pow(COSTS.wireHarvester.growth, count)
    .times(COSTS.wireHarvester.base)
    .round();
}

export function autoClipperCost(count: number): Decimal {
  return Decimal.pow(COSTS.autoClipper.growth, count)
    .times(COSTS.autoClipper.base)
    .round();
}

export function megaClipperCost(count: number): Decimal {
  return Decimal.pow(COSTS.megaClipper.growth, count)
    .times(COSTS.megaClipper.base)
    .round();
}

