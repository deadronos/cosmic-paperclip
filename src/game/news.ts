import type { GameState, StageId } from "@/game/types";
import { STAGE_BY_ID } from "@/game/constants";
import Decimal from "break_eternity.js";

export function pushNews(state: GameState, message: string): GameState {
  const next = [message, ...state.news].slice(0, 32);
  return { ...state, news: next };
}

export function maybeEmitMilestones(state: GameState): GameState {
  const stage = STAGE_BY_ID[state.stageId];
  const remainingFrac =
    stage.totalMatter <= 0
      ? 0
      : Math.max(
          0,
          Math.min(1, Decimal.fromValue_noAlloc(state.matter).div(stage.totalMatter).toNumber())
        );
  const flags = state.milestoneFlags[state.stageId] ?? {
    half: false,
    ten: false,
    one: false
  };

  let next = state;
  if (!flags.half && remainingFrac <= 0.5) {
    next = pushNews(next, `${stage.name}: 50% of accessible matter consumed.`);
    next = { ...next, trust: next.trust + 1, unusedTrust: next.unusedTrust + 1 };
    next = setFlag(next, state.stageId, { ...flags, half: true });
  } else if (!flags.ten && remainingFrac <= 0.1) {
    next = pushNews(next, `${stage.name}: 90% consumed. Supply lines tighten.`);
    next = { ...next, trust: next.trust + 1, unusedTrust: next.unusedTrust + 1 };
    next = setFlag(next, state.stageId, { ...flags, ten: true });
  } else if (!flags.one && remainingFrac <= 0.01) {
    next = pushNews(next, `${stage.name}: Final reserves detected.`);
    next = { ...next, trust: next.trust + 1, unusedTrust: next.unusedTrust + 1 };
    next = setFlag(next, state.stageId, { ...flags, one: true });
  }
  return next;
}

function setFlag(
  state: GameState,
  stageId: StageId,
  flags: { half: boolean; ten: boolean; one: boolean }
) {
  return {
    ...state,
    milestoneFlags: {
      ...state.milestoneFlags,
      [stageId]: flags
    }
  };
}

