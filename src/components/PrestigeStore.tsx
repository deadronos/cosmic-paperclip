import * as React from "react";
import { Zap, Atom } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/game/format";
import { PRESTIGE_UPGRADES } from "@/game/constants";
import { getPrestigeUpgradeCost, calculatePotentialFlux } from "@/game/game";
import type { GameState, GameAction } from "@/game/types";

interface PrestigeStoreProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export default function PrestigeStore({ state, dispatch }: PrestigeStoreProps) {
  const potentialFlux = calculatePotentialFlux(state);
  const canPrestige = state.stageId === "universal" && potentialFlux.gt(0);

  return (
    <div className="space-y-4">
      {state.stageId === "universal" && (
        <Card className="border-purple-500/50 bg-purple-500/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-purple-400">
              <Atom className="h-5 w-5" />
              The Singularity Approaches
            </CardTitle>
            <CardDescription className="text-purple-300/80">
              The universe is nearing total consumption. You may initiate a singularity to collapse this reality, retaining your knowledge as Quantum Flux.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-purple-500/30 bg-background/40 p-4">
              <div>
                <div className="font-mono text-sm text-purple-400">Potential Quantum Flux</div>
                <div className="text-2xl font-bold text-foreground">+{formatNumber(potentialFlux)}</div>
              </div>
              <Button
                size="lg"
                variant="default"
                className="bg-purple-600 hover:bg-purple-700"
                disabled={!canPrestige}
                onClick={() => {
                  if (confirm("Are you sure you want to collapse the universe? This will reset all progress except Quantum Flux and purchased upgrades.")) {
                    dispatch({ type: "PRESTIGE" });
                  }
                }}
              >
                Initiate Singularity
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(state.quantumFlux.gt(0) || state.timesPrestiged > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>QUANTUM UPGRADES</CardTitle>
                <CardDescription>Permanent enhancements across realities.</CardDescription>
              </div>
              <Badge variant="secondary" className="text-sm font-mono text-purple-400">
                <Zap className="mr-1 h-3 w-3" />
                {formatNumber(state.quantumFlux)} Flux
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PRESTIGE_UPGRADES.map((upgrade) => {
                const currentLevel = state.prestigeUpgrades?.[upgrade.id] || 0;
                const isMaxed = currentLevel >= upgrade.maxLevel;
                const cost = getPrestigeUpgradeCost(upgrade, currentLevel);
                const canAfford = !isMaxed && state.quantumFlux.gte(cost);

                return (
                  <div key={upgrade.id} className="rounded-lg border bg-background/40 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm">{upgrade.name}</h4>
                        <Badge variant="outline">
                          {isMaxed ? "MAX" : `Lvl ${currentLevel}/${upgrade.maxLevel}`}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">{upgrade.description}</p>
                    </div>
                    <Button
                      variant={canAfford ? "default" : "secondary"}
                      className="w-full justify-between"
                      disabled={!canAfford || isMaxed}
                      onClick={() => dispatch({ type: "BUY_PRESTIGE_UPGRADE", upgradeId: upgrade.id })}
                    >
                      <span>{isMaxed ? "Maxed Out" : "Upgrade"}</span>
                      {!isMaxed && (
                        <span className="font-mono text-xs flex items-center">
                          {formatNumber(cost)} <Zap className="ml-1 h-3 w-3" />
                        </span>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
