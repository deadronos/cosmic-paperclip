import { Clock, TrendingUp } from "lucide-react";
import type Decimal from "break_eternity.js";
import type { GameState } from "@/game/types";
import {
  getNextAffordableUpgrade,
  getNextMilestoneClips,
  getTimeToMilestone,
} from "@/game/projections";
import { getMachineClipRate } from "@/game/selectors";
import { formatNumber } from "@/game/format";
import { useCountdown } from "@/hooks/useCountdown";

interface Props {
  state: GameState;
  clipRate: Decimal;
}

export default function RateProjection({ state, clipRate }: Props) {
  const clipRatePerMin = clipRate.times(60);
  const nearest = getNextAffordableUpgrade(state);
  const nextMilestone = getNextMilestoneClips(state.clips);
  const milestoneTime = getTimeToMilestone(state.clips, getMachineClipRate(state), nextMilestone);

  const upgradeCountdown = useCountdown(nearest?.time ?? null);
  const milestoneCountdown = useCountdown(milestoneTime);

  if (clipRate.lte(0) && !nearest && milestoneTime === null) return null;

  return (
    <div className="rounded-lg border bg-background/40 p-3 space-y-3">
      <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <TrendingUp className="h-3.5 w-3.5 text-primary" />
        Projections
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-muted-foreground">Clip Rate</span>
          <span>
            <span className="text-foreground">{formatNumber(clipRate)}/s</span>
            <span className="text-muted-foreground/60">
              {" "}= {formatNumber(clipRatePerMin)}/min
            </span>
          </span>
        </div>

        {nearest && (
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-muted-foreground">Next Upgrade</span>
            <span>
              <span className="text-orange-400">{nearest.name}</span>
              <span className="text-muted-foreground/60">
                {" "}in{" "}
              </span>
              <span className={upgradeCountdown.immediate ? "text-green-400" : "text-orange-400"}>
                {upgradeCountdown.display}
              </span>
            </span>
          </div>
        )}

        {milestoneTime !== null && (
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-muted-foreground">
              Next Milestone
            </span>
            <span>
              <span className="text-blue-400">
                {formatNumber(nextMilestone)} clips
              </span>
              <span className="text-muted-foreground/60">
                {" "}in ~
              </span>
              <span className={
                milestoneCountdown.immediate ? "text-green-400" : "text-blue-400"
              }>
                {milestoneCountdown.display}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
