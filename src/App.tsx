import * as React from "react";
import { Cpu, Factory, Hammer, RotateCcw, Satellite } from "lucide-react";
import Decimal from "break_eternity.js";

import Ticker from "@/components/Ticker";
import UniverseVisualizer from "@/components/UniverseVisualizer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { setAllocationAxis } from "@/game/allocation";
import { STAGE_BY_ID } from "@/game/constants";
import { formatNumber, formatRate } from "@/game/format";
import {
  autoClipperCost,
  createInitialState,
  harvesterCost,
  megaClipperCost,
  reducer
} from "@/game/game";
import { clearSave, loadState, saveState } from "@/game/storage";

export default function App() {
  const [state, dispatch] = React.useReducer(
    reducer,
    null,
    () => {
      const initial = createInitialState();
      const loaded = loadState();
      if (!loaded) return initial;
      // Shallow merge to ensure new properties (like multipliers) exist
      return { ...initial, ...loaded, multipliers: { ...initial.multipliers, ...loaded.multipliers } };
    }
  );
  const stateRef = React.useRef(state);
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const stage = STAGE_BY_ID[state.stageId];

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

  const machineClipRate = Decimal.mul(state.autoClippers, 0.5)
    .plus(Decimal.mul(state.megaClippers, 6))
    .times(state.multipliers.speed);
  const wireRate = Decimal.mul(state.autoClippers, 0.15)
    .plus(1.2)
    .plus(Decimal.mul(state.wireHarvesters, 2.5))
    .times(state.multipliers.speed);

  const autoCost = autoClipperCost(state.autoClippers);
  const megaCost = megaClipperCost(state.megaClippers);
  const harvesterCostVal = harvesterCost(state.wireHarvesters);
  const canAffordAuto = state.clips.gte(autoCost);
  const canAffordMega = state.clips.gte(megaCost);
  const canAffordHarvester = state.clips.gte(harvesterCostVal);
  const canAffordWire = state.clips.gte(100);
  const canDesignProbe = !state.probesUnlocked && state.clips.gte(100_000);

  const isShortOfWire =
    state.wire.lt(machineClipRate.times(0.5)) && machineClipRate.gt(wireRate);

  const remainingPct =
    stage.totalMatter > 0
      ? Math.round(state.matter.div(stage.totalMatter).times(100).toNumber())
      : 0;

  return (
    <div className="min-h-dvh bg-background">
      <Ticker messages={state.news} />

      <div className="mx-auto grid max-w-7xl gap-4 p-4 md:grid-cols-[420px_1fr]">
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
                    <span className="text-foreground">{formatRate(machineClipRate)}</span>
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    Wire intake:{" "}
                    <span
                      className={
                        wireRate.lt(machineClipRate) ? "text-red-500" : "text-foreground"
                      }
                    >
                      {formatRate(wireRate)}
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
                  Buy Wire (100)
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
                    subtitle={`+${formatRate(0.5 * state.multipliers.speed)} • Clip Prod`}
                    count={state.autoClippers}
                    cost={autoCost}
                    disabled={!canAffordAuto}
                    onBuy={() => dispatch({ type: "BUY_AUTO" })}
                  />
                  <BuyRow
                    title="Mega-Clipper"
                    subtitle={`+${formatRate(6 * state.multipliers.speed)} • Industrial`}
                    count={state.megaClippers}
                    cost={megaCost}
                    disabled={!canAffordMega}
                    onBuy={() => dispatch({ type: "BUY_MEGA" })}
                  />
                  <BuyRow
                    title="Wire Harvester"
                    subtitle={`+${formatRate(2.5 * state.multipliers.speed)} • Pure Wire`}
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
                        {formatNumber(100_000)} clips
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
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  className
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border bg-background/40 p-3 ${className || ""}`}>
      <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-lg text-foreground">{value}</div>
    </div>
  );
}

function BuyRow(props: {
  title: string;
  subtitle: string;
  count: number;
  cost: Decimal;
  disabled: boolean;
  onBuy: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/40 p-3">
      <div>
        <div className="font-mono text-sm">{props.title}</div>
        <div className="mt-0.5 font-mono text-xs text-muted-foreground">
          {props.subtitle}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline">x{props.count}</Badge>
        <Button
          variant={props.disabled ? "outline" : "default"}
          disabled={props.disabled}
          onClick={props.onBuy}
        >
          Buy {formatNumber(props.cost)}
        </Button>
      </div>
    </div>
  );
}

function AllocationRow(props: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs text-muted-foreground">{props.label}</div>
        <Badge variant="outline">{props.value}%</Badge>
      </div>
      <Slider
        value={[props.value]}
        max={100}
        step={1}
        onValueChange={(v) => props.onChange(v[0] ?? 0)}
      />
    </div>
  );
}

