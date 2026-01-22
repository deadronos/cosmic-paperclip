import { COSTS, RATES, STAGES, STAGE_BY_ID } from "@/game/constants";
import { normalizeAllocation } from "@/game/allocation";
import { maybeEmitMilestones, pushNews } from "@/game/news";
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
    version: 1,
    stageId: stage.id,
    matter: stage.totalMatter,
    wire: 1,
    clips: 0,
    autoClippers: 0,
    megaClippers: 0,
    wireHarvesters: 0,
    probesUnlocked: false,
    probes: 0,
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
      if (next.wire < 1 && next.matter >= 1) {
        next = { ...next, matter: next.matter - 1, wire: next.wire + 1 };
      }
      if (next.wire >= 1) {
        next = { ...next, wire: next.wire - 1, clips: next.clips + 1 };
      }
      return next;
    }
    case "BUY_AUTO": {
      const cost = autoClipperCost(state.autoClippers);
      if (state.clips < cost) return state;
      return pushNews(
        { ...state, clips: state.clips - cost, autoClippers: state.autoClippers + 1 },
        "Auto-Clipper commissioned. Efficiency rises."
      );
    }
    case "BUY_MEGA": {
      const cost = megaClipperCost(state.megaClippers);
      if (state.clips < cost) return state;
      return pushNews(
        { ...state, clips: state.clips - cost, megaClippers: state.megaClippers + 1 },
        "Mega-Clipper online. Industrial throughput enabled."
      );
    }
    case "BUY_HARVESTER": {
      const cost = harvesterCost(state.wireHarvesters);
      if (state.clips < cost) return state;
      return pushNews(
        { ...state, clips: state.clips - cost, wireHarvesters: state.wireHarvesters + 1 },
        "Dedicated Harvester active. Wire supply lines stabilized."
      );
    }
    case "BUY_WIRE": {
      if (state.clips < COSTS.wirePurchase.clips) return state;
      return {
        ...state,
        clips: state.clips - COSTS.wirePurchase.clips,
        wire: state.wire + COSTS.wirePurchase.amount
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
      if (state.clips < COSTS.probeDesign.cost) return state;
      return pushNews(
        {
          ...state,
          clips: state.clips - COSTS.probeDesign.cost,
          probesUnlocked: true,
          probes: Math.max(1, state.probes)
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
    (RATES.wirePerSecondBase +
      state.autoClippers * RATES.wirePerSecondPerAutoClipper +
      state.wireHarvesters * RATES.wirePerSecondPerHarvester) *
    next.multipliers.speed;
  const wireGained = Math.min(next.matter, wireRate * dt);
  next = { ...next, matter: next.matter - wireGained, wire: next.wire + wireGained };

  const machineClipRate =
    (state.autoClippers * RATES.clipsPerSecondPerAutoClipper +
      state.megaClippers * RATES.clipsPerSecondPerMegaClipper) *
    next.multipliers.speed;
  const clipsWanted = machineClipRate * dt;
  const clipsMade = Math.min(next.wire / next.multipliers.efficiency, clipsWanted);
  next = {
    ...next,
    wire: next.wire - clipsMade * next.multipliers.efficiency,
    clips: next.clips + clipsMade
  };

  if (next.probesUnlocked && next.probes > 0 && next.matter > 0) {
    const alloc = normalizeAllocation(next.allocation);
    const rep = alloc.replicate / 100;
    const harvest = alloc.harvest / 100;
    const manuf = alloc.manufacture / 100;

    const newProbes = next.probes * RATES.probeReplicationPerSecond * rep * dt;
    next = { ...next, probes: next.probes + newProbes };

    const harvested = Math.min(
      next.matter,
      next.probes * stage.probeHarvestPerSecond * harvest * dt
    );
    next = { ...next, matter: next.matter - harvested, wire: next.wire + harvested };

    const manufactured = Math.min(
      next.wire,
      next.probes * stage.probeManufacturePerSecond * manuf * dt
    );
    next = { ...next, wire: next.wire - manufactured, clips: next.clips + manufactured };
  }

  next = maybeEmitMilestones(next);
  next = maybeAdvanceStage(next);
  return next;
}

function maybeAdvanceStage(state: GameState): GameState {
  if (state.matter > 0) return state;
  const idx = STAGES.findIndex((s) => s.id === state.stageId);
  if (idx < 0) return state;
  const nextStage = STAGES[idx + 1];
  if (!nextStage) return pushNews(state, "All matter exhausted. The directive persists.");
  const progressed: GameState = {
    ...state,
    stageId: nextStage.id as StageId,
    matter: nextStage.totalMatter
  };
  return pushNews(
    progressed,
    `Scale shift: ${nextStage.name}. Available matter recalibrated.`
  );
}

export function harvesterCost(count: number): number {
  return Math.round(COSTS.wireHarvester.base * Math.pow(COSTS.wireHarvester.growth, count));
}

export function autoClipperCost(count: number): number {
  return Math.round(COSTS.autoClipper.base * Math.pow(COSTS.autoClipper.growth, count));
}

export function megaClipperCost(count: number): number {
  return Math.round(COSTS.megaClipper.base * Math.pow(COSTS.megaClipper.growth, count));
}

