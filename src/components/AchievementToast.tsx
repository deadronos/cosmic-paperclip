import * as React from "react";
import * as LucideIcons from "lucide-react";
import type { AchievementId } from "@/game/achievements";
import { getAchievementDef } from "@/game/achievements";
import { Card } from "@/components/ui/card";

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

interface AchievementToastProps {
  achievementId: AchievementId;
  onDone: () => void;
}

export default function AchievementToast({ achievementId, onDone }: AchievementToastProps) {
  const def = getAchievementDef(achievementId);
  const [visible, setVisible] = React.useState(false);
  const [exiting, setExiting] = React.useState(false);

  React.useEffect(() => {
    const showTimer = window.setTimeout(() => setVisible(true), 50);
    const hideTimer = window.setTimeout(() => {
      setExiting(true);
      window.setTimeout(onDone, 400);
    }, 5000);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [onDone]);

  if (!def) return null;

  const Icon = ICON_MAP[def.icon] || LucideIcons.Award;

  return (
    <div
      className={`transition-all duration-400 ease-out ${
        visible && !exiting
          ? "opacity-100 translate-x-0"
          : "opacity-0 translate-x-4"
      }`}
    >
      <Card className="glow-border w-72 p-4 border-primary/30 bg-card/95">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-mono text-xs text-primary">ACHIEVEMENT UNLOCKED</div>
            <div className="mt-0.5 font-mono text-sm font-semibold text-foreground">
              {def.name}
            </div>
            <div className="mt-0.5 font-mono text-xs text-muted-foreground">
              {def.description}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
