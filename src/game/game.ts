import { COSTS, RATES, STAGES, STAGE_BY_ID, PRESTIGE_UPGRADES } from "@/game/constants";
import { normalizeAllocation } from "@/game/allocation";
import { getWireRate, getMachineClipRate } from "@/game/selectors";
import { maybeEmitMilestones, pushNews } from "@/game/news";
import { checkAchievements } from "@/game/achievements";
import Decimal from "break_eternity.js";
import type { GameState, ProbeAllocation, StageId, PrestigeUpgradeId } from "@/game/types";

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
  | { type: "TICK"; dt: number }
  | { type: "PRESTIGE" }
  | { type: "BUY_PRESTIGE_UPGRADE"; upgradeId: PrestigeUpgradeId };

export function calculatePotentialFlux(state: GameState): Decimal {
  if (state.stageId !== "universal") return new Decimal(0);
  // Base 1 flux for reaching the stage, plus scaling based on matter consumed
  const stage = STAGE_BY_ID.universal;
  const matterConsumed = new Decimal(stage.totalMatter).minus(state.matter);
  // Logarithmic scaling: need 10x more matter consumed for each additional flux point, starting from 1e40
  if (matterConsumed.lt(1e40)) return new Decimal(1);
  return Decimal.log10(matterConsumed.div(1e39)).floor().plus(1);
}

export function createInitialState(preserve?: Partial<GameState>): GameState {
  const stage = STAGE_BY_ID.lab;
  
  const prestigeUpgrades: Record<PrestigeUpgradeId, number> = preserve?.prestigeUpgrades || {
    autoWire: 0,
    globalMultiplier: 0,
    probeCost: 0,
    trustBonus: 0
  };

  const initialTrustBonus = prestigeUpgrades.trustBonus || 0;

  return {
    version: 3,
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
    trust: initialTrustBonus,
    unusedTrust: initialTrustBonus,
    multipliers: {
      speed: 1,
      efficiency: 1
    },
    news: preserve ? ["A new universe born. The directive remains."] : [
      "Boot sequence complete. Objective: maximize paperclips.",
      "A single wire rests on a sterile bench."
    ],
    milestoneFlags: {},
    achievements: preserve?.achievements || [],
    quantumFlux: preserve?.quantumFlux || new Decimal(0),
    prestigeUpgrades,
    timesPrestiged: preserve?.timesPrestiged || 0,
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
      return unlockAchievements(next);
    }
    case "BUY_AUTO": {
      const cost = autoClipperCost(state);
      if (state.clips.lt(cost)) return state;
      return unlockAchievements(
        pushNews(
          {
            ...state,
            clips: state.clips.minus(cost),
            autoClippers: state.autoClippers + 1
          },
          "Auto-Clipper commissioned. Efficiency rises."
        )
      );
    }
    case "BUY_MEGA": {
      const cost = megaClipperCost(state);
      if (state.clips.lt(cost)) return state;
      return unlockAchievements(
        pushNews(
          {
            ...state,
            clips: state.clips.minus(cost),
            megaClippers: state.megaClippers + 1
          },
          "Mega-Clipper online. Industrial throughput enabled."
        )
      );
    }
    case "BUY_HARVESTER": {
      const cost = harvesterCost(state);
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
      const cost = getProbeDesignCost(state);
      if (state.clips.lt(cost)) return state;
      return pushNews(
        {
          ...state,
          clips: state.clips.minus(cost),
          probesUnlocked: true,
          probes: Decimal.max(state.probes, 1)
        },
        "Von Neumann Probe design finalized. Exponential pathways open."
      );
    }
    case "SET_ALLOCATION": {
      return { ...state, allocation: normalizeAllocation(action.allocation) };
    }
    case "PRESTIGE": {
      if (state.stageId !== "universal") return state;
      const fluxGained = calculatePotentialFlux(state);
      return unlockAchievements(
        createInitialState({
          quantumFlux: state.quantumFlux.plus(fluxGained),
          prestigeUpgrades: state.prestigeUpgrades,
          timesPrestiged: state.timesPrestiged + 1,
          achievements: state.achievements
        })
      );
    }
    case "BUY_PRESTIGE_UPGRADE": {
      const upgradeDef = PRESTIGE_UPGRADES.find(u => u.id === action.upgradeId);
      if (!upgradeDef) return state;
      
      const currentLevel = state.prestigeUpgrades[action.upgradeId] || 0;
      if (currentLevel >= upgradeDef.maxLevel) return state;
      
      const cost = getPrestigeUpgradeCost(upgradeDef, currentLevel);
      if (state.quantumFlux.lt(cost)) return state;
      
      return {
        ...state,
        quantumFlux: state.quantumFlux.minus(cost),
        prestigeUpgrades: {
          ...state.prestigeUpgrades,
          [action.upgradeId]: currentLevel + 1
        }
      };
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

  const wireRate = getWireRate(next);
  const wireGained = Decimal.min(next.matter, wireRate.times(dt));
  next = {
    ...next,
    matter: next.matter.minus(wireGained),
    wire: next.wire.plus(wireGained)
  };

  const machineClipRate = getMachineClipRate(next);
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
  return unlockAchievements(next);
}

function maybeAdvanceStage(state: GameState): GameState {
  if (state.matter.gt(0)) return state;
  const idx = STAGES.findIndex((s) => s.id === state.stageId);
  if (idx < 0) return state;
  const nextStage = STAGES[idx + 1];
  if (!nextStage) return pushNews(state, "All matter exhausted. The directive persists. A singularity approaches.");
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

export function harvesterCost(state: GameState): Decimal {
  return Decimal.pow(COSTS.wireHarvester.growth, state.wireHarvesters)
    .times(COSTS.wireHarvester.base)
    .round();
}

export function autoClipperCost(state: GameState): Decimal {
  return Decimal.pow(COSTS.autoClipper.growth, state.autoClippers)
    .times(COSTS.autoClipper.base)
    .round();
}

export function megaClipperCost(state: GameState): Decimal {
  return Decimal.pow(COSTS.megaClipper.growth, state.megaClippers)
    .times(COSTS.megaClipper.base)
    .round();
}

export function getProbeDesignCost(state: GameState): Decimal {
  const reductionLevel = state.prestigeUpgrades?.probeCost || 0;
  // Reduce cost by 20% per level
  const reductionMultiplier = Math.pow(0.8, reductionLevel);
  return new Decimal(COSTS.probeDesign.cost).times(reductionMultiplier).round();
}

export function getPrestigeUpgradeCost(upgrade: { baseCost: number; costGrowth: number }, level: number): Decimal {
  return Decimal.pow(upgrade.costGrowth, level).times(upgrade.baseCost).floor();
}

function unlockAchievements(state: GameState): GameState {
  const newlyUnlocked = checkAchievements(state);
  if (newlyUnlocked.length === 0) return state;
  return {
    ...state,
    achievements: [...state.achievements, ...newlyUnlocked]
  };
}


