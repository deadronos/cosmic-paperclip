import * as React from "react";
import * as LucideIcons from "lucide-react";
import type { AchievementId } from "@/game/achievements";
import { ACHIEVEMENT_DEFS } from "@/game/achievements";
import { cn } from "@/lib/utils";

type IconComponent = React.ComponentType<{ className?: string }>;

const ICON_MAP: Record<string, IconComponent> = {
  Hammer: LucideIcons.Hammer,
  Award: LucideIcons.Award,
  Factory: LucideIcons.Factory,
  Zap: LucideIcons.Zap,
  Rocket: LucideIcons.Rocket,
  Infinity: LucideIcons.Infinity,
  Atom: LucideIcons.Atom,
};

interface AchievementsProps {
  unlocked: AchievementId[];
}

export default function Achievements({ unlocked }: AchievementsProps) {
  const unlockedSet = new Set(unlocked);
  const unlockedCount = unlocked.length;
  const totalCount = ACHIEVEMENT_DEFS.length;

  return (
    <div className="max-h-64 space-y-2 overflow-auto pr-2 font-mono">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>ACHIEVEMENTS</span>
        <span>{unlockedCount}/{totalCount}</span>
      </div>
      {ACHIEVEMENT_DEFS.map((def) => {
        const earned = unlockedSet.has(def.id);
        const Icon = ICON_MAP[def.icon] || LucideIcons.Award;
        return (
          <div
            key={def.id}
            className={cn(
              "flex items-start gap-3 rounded-md border p-2 transition-colors",
              earned
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-background/40 opacity-50"
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                earned ? "bg-primary/15" : "bg-muted"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  earned ? "text-primary" : "text-muted-foreground"
                )}
              />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-foreground">
                {earned ? def.name : "???"}
              </div>
              <div className="text-xs text-muted-foreground">
                {earned ? def.description : "Undiscovered"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
