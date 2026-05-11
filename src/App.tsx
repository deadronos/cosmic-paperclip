import * as React from "react";
import { Cpu, Factory, Hammer, RotateCcw, Satellite, Atom } from "lucide-react";

import Ticker from "@/components/Ticker";
import UniverseVisualizer from "@/components/UniverseVisualizer";
import Metric from "@/components/Metric";
import BuyRow from "@/components/BuyRow";
import AllocationRow from "@/components/AllocationRow";
import PrestigeStore from "@/components/PrestigeStore";
import AchievementToast from "@/components/AchievementToast";
import Achievements from "@/components/Achievements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { setAllocationAxis } from "@/game/allocation";
import { COSTS, RATES, STAGE_BY_ID } from "@/game/constants";
import { getWireRate, getMachineClipRate } from "@/game/selectors";
import { formatNumber, formatRate } from "@/game/format";
import {
  autoClipperCost,
  createInitialState,
  harvesterCost,
  megaClipperCost,
  reducer,
  getProbeDesignCost
} from "@/game/game";
import { clearSave, loadState, saveState } from "@/game/storage";
import { useAnimatedNumber } from "@/hooks";
import Decimal from "break_eternity.js";
import type { AchievementId } from "@/game/types";

export default function App() {
  const [activeTab, setActiveTab] = React.useState<"dashboard" | "singularity">("dashboard");
  const [state, dispatch] = React.useReducer(
    reducer,
    null,
    () => {
      const initial = createInitialState();
      const loaded = loadState();
      if (!loaded) return initial;
      // Shallow merge to ensure new properties (like multipliers) exist
      return { 
        ...initial, 
        ...loaded, 
        multipliers: { ...initial.multipliers, ...loaded.multipliers },
        prestigeUpgrades: { ...initial.prestigeUpgrades, ...(loaded.prestigeUpgrades || {}) }
      };
    }
  );
  const stateRef = React.useRef(state);
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const stage = STAGE_BY_ID[state.stageId];

  const [toasts, setToasts] = React.useState<AchievementId[]>([]);
  const prevAchievementsRef = React.useRef<AchievementId[]>(state.achievements);

  React.useEffect(() => {
    const prev = prevAchievementsRef.current;
    const curr = state.achievements;
    const newIds = curr.filter((id) => !prev.includes(id));
    if (newIds.length > 0) {
      setToasts((prev) => [...prev, ...newIds]);
    }
    prevAchievementsRef.current = curr;
  }, [state.achievements]);

  React.useEffect(() => {
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.25, Math.max(0, (now - last) / 1000));
      last = now;
      dispatch({ type: "TICK", dt });
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  React.useEffect(() => {
    const id = window.setInterval(() => saveState(stateRef.current), 4_000);
    const onVis = () => {
      if (document.visibilityState === "hidden") saveState(stateRef.current);
    };
    window.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const machineClipRate = getMachineClipRate(state);
  const wireRate = getWireRate(state);

  const [animatedMachineClipRate, setAnimatedMachineClipRate] = React.useState(machineClipRate);
  const [animatedWireRate, setAnimatedWireRate] = React.useState(wireRate);

  const onMachineClipRateChange = React.useCallback((value: Decimal) => {
    setAnimatedMachineClipRate(value);
  }, []);

  const onWireRateChange = React.useCallback((value: Decimal) => {
    setAnimatedWireRate(value);
  }, []);

  useAnimatedNumber(machineClipRate, onMachineClipRateChange);
  useAnimatedNumber(wireRate, onWireRateChange);

  const autoCost = autoClipperCost(state);
  const megaCost = megaClipperCost(state);
  const harvesterCostVal = harvesterCost(state);
  const canAffordAuto = state.clips.gte(autoCost);
  const canAffordMega = state.clips.gte(megaCost);
  const canAffordHarvester = state.clips.gte(harvesterCostVal);
  const canAffordWire = state.clips.gte(COSTS.wirePurchase.clips);
  
  const probeDesignCost = getProbeDesignCost(state);
  const canDesignProbe = !state.probesUnlocked && state.clips.gte(probeDesignCost);

  const isShortOfWire =
    state.wire.lt(machineClipRate.times(0.5)) && machineClipRate.gt(wireRate);

  const remainingPct =
    stage.totalMatter > 0
      ? Math.round(state.matter.div(stage.totalMatter).times(100).toNumber())
      : 0;

  const hasSingularityAccess = state.stageId === "universal" || state.timesPrestiged > 0;

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <Ticker messages={state.news} />
      
      {hasSingularityAccess && (
        <div className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-14 max-w-7xl items-center px-4 gap-4">
            <Button 
              variant={activeTab === "dashboard" ? "default" : "ghost"} 
              onClick={() => setActiveTab("dashboard")}
            >
              Control Center
            </Button>
            <Button 
              variant={activeTab === "singularity" ? "default" : "ghost"}
              onClick={() => setActiveTab("singularity")}
              className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
            >
              <Atom className="mr-2 h-4 w-4" />
              Singularity
            </Button>
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-7xl gap-4 p-4 md:grid-cols-[420px_1fr] flex-1 w-full">
        {activeTab === "dashboard" ? (
          <>
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>CONTROL CENTER</CardTitle>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{stage.name}</Badge>
                        <Badge>{stage.scopeLabel}</Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      title="Reset (clears save)"
                      onClick={() => {
                        clearSave();
                        dispatch({ type: "RESET" });
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <Metric label="Paperclips" value={formatNumber(state.clips)} />
                    <Metric
                      label="Wire"
                      value={formatNumber(state.wire)}
                      className={isShortOfWire ? "text-red-500 animate-pulse" : ""}
                    />
                    <Metric label="Matter" value={formatNumber(state.matter)} />
                  </div>

                  <div className="rounded-lg border bg-background/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-mono text-xs text-muted-foreground">
                        Output:{" "}
                        <span className="text-foreground">{formatRate(animatedMachineClipRate)}</span>
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        Wire intake:{" "}
                        <span
                          className={
                            animatedWireRate.lt(animatedMachineClipRate) ? "text-red-500" : "text-foreground"
                          }
                        >
                          {formatRate(animatedWireRate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      className="h-12 text-base"
                      onClick={() => dispatch({ type: "CLICK_MAKE" })}
                    >
                      <Hammer className="mr-2 h-4 w-4" />
                      Make Clip
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-12 text-base"
                      disabled={!canAffordWire}
                      onClick={() => dispatch({ type: "BUY_WIRE" })}
                    >
                      {`Buy Wire (${COSTS.wirePurchase.amount})`}
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
                      <Factory className="h-4 w-4 text-primary" />
                      Infrastructure
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <BuyRow
                        title="Auto-Clipper"
                        subtitle={`+${formatRate(RATES.clipsPerSecondPerAutoClipper * state.multipliers.speed)} • Clip Prod`}
                        count={state.autoClippers}
                        cost={autoCost}
                        disabled={!canAffordAuto}
                        onBuy={() => dispatch({ type: "BUY_AUTO" })}
                      />
                      <BuyRow
                        title="Mega-Clipper"
                        subtitle={`+${formatRate(RATES.clipsPerSecondPerMegaClipper * state.multipliers.speed)} • Industrial`}
                        count={state.megaClippers}
                        cost={megaCost}
                        disabled={!canAffordMega}
                        onBuy={() => dispatch({ type: "BUY_MEGA" })}
                      />
                      <BuyRow
                        title="Wire Harvester"
                        subtitle={`+${formatRate(RATES.wirePerSecondPerHarvester * state.multipliers.speed)} • Pure Wire`}
                        count={state.wireHarvesters}
                        cost={harvesterCostVal}
                        disabled={!canAffordHarvester}
                        onBuy={() => dispatch({ type: "BUY_HARVESTER" })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
                      <Cpu className="h-4 w-4 text-primary" />
                      Trust & Processing
                    </div>
                    <div className="rounded-lg border bg-background/40 p-3">
                      <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                        <span>Total Trust: {state.trust}</span>
                        <span className="text-foreground">Available: {state.unusedTrust}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        <Button
                          variant="outline"
                          className="justify-between"
                          disabled={state.unusedTrust < 1}
                          onClick={() => dispatch({ type: "UPGRADE_SPEED" })}
                        >
                          <span>Overclock CPU</span>
                          <Badge variant="secondary">1 Trust</Badge>
                        </Button>
                        <Button
                          variant="outline"
                          className="justify-between"
                          disabled={state.unusedTrust < 1}
                          onClick={() => dispatch({ type: "UPGRADE_EFFICIENCY" })}
                        >
                          <span>Nano-Shearing</span>
                          <Badge variant="secondary">1 Trust</Badge>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
                      <Satellite className="h-4 w-4 text-primary" />
                      Von Neumann Probes
                    </div>

                    {!state.probesUnlocked ? (
                      <div className="rounded-lg border bg-background/40 p-3">
                        <div className="font-mono text-xs text-muted-foreground">
                          Design cost:{" "}
                          <span className="text-foreground">
                            {formatNumber(probeDesignCost)} clips
                          </span>
                        </div>
                        <div className="mt-2">
                          <Button
                            className="w-full"
                            variant={canDesignProbe ? "default" : "outline"}
                            disabled={!canDesignProbe}
                            onClick={() => dispatch({ type: "DESIGN_PROBE" })}
                          >
                            Finalize Probe Design
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 rounded-lg border bg-background/40 p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-mono text-xs text-muted-foreground">
                            Probes:{" "}
                            <span className="text-foreground">{formatNumber(state.probes)}</span>
                          </div>
                          <Badge variant="outline">Compute Allocation</Badge>
                        </div>

                        <AllocationRow
                          label="Replicate"
                          value={state.allocation.replicate}
                          onChange={(v) =>
                            dispatch({
                              type: "SET_ALLOCATION",
                              allocation: setAllocationAxis(state.allocation, "replicate", v)
                            })
                          }
                        />
                        <AllocationRow
                          label="Harvest"
                          value={state.allocation.harvest}
                          onChange={(v) =>
                            dispatch({
                              type: "SET_ALLOCATION",
                              allocation: setAllocationAxis(state.allocation, "harvest", v)
                            })
                          }
                        />
                        <AllocationRow
                          label="Manufacture"
                          value={state.allocation.manufacture}
                          onChange={(v) =>
                            dispatch({
                              type: "SET_ALLOCATION",
                              allocation: setAllocationAxis(state.allocation, "manufacture", v)
                            })
                          }
                        />

                        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                          <Cpu className="h-4 w-4 text-primary" />
                          If matter reaches 0, probes stall.
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>VISUALIZER</CardTitle>
                      <div className="mt-2 font-mono text-xs text-muted-foreground">
                        Total available matter:{" "}
                        <span className="text-foreground">
                          {formatNumber(stage.totalMatter)} {stage.matterUnit}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline">Remaining: {Math.max(0, Math.min(100, remainingPct))}%</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-130">
                    <UniverseVisualizer
                      stageId={state.stageId}
                      matterRemaining={state.matter}
                      probes={state.probes}
                      probesUnlocked={state.probesUnlocked}
                      allocation={state.allocation}
                      className="h-full"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>EVENT LOG</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-48 space-y-2 overflow-auto pr-2 font-mono text-xs text-muted-foreground">
                    {state.news.slice(0, 18).map((m, i) => (
                      <div
                        key={`${i}-${m}`}
                        className="rounded-md border bg-background/40 px-3 py-2"
                      >
                        {m}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>ACHIEVEMENTS</CardTitle>
                </CardHeader>
                <CardContent>
                  <Achievements unlocked={state.achievements} />
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="col-span-1 md:col-span-2 max-w-4xl mx-auto w-full">
            <PrestigeStore state={state} dispatch={dispatch} />
          </div>
        )}
      </div>

      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((id) => (
          <div key={id} className="pointer-events-auto">
            <AchievementToast
              achievementId={id}
              onDone={() => setToasts((prev) => prev.filter((t) => t !== id))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}


