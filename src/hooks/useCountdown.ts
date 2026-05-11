import * as React from "react";
import { formatCountdown } from "@/game/projections";

export function useCountdown(seconds: number | null): {
  display: string;
  immediate: boolean;
} {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    if (seconds === null || seconds <= 0) {
      setElapsed(0);
      return;
    }
    const id = window.setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [seconds]);

  if (seconds === null) return { display: "\u2014", immediate: false };
  if (seconds <= 0) return { display: "Ready", immediate: true };

  const remaining = Math.max(0, seconds - elapsed);
  return { display: formatCountdown(remaining), immediate: remaining <= 0 };
}
