import type { ProbeAllocation } from "@/game/types";

export function normalizeAllocation(next: ProbeAllocation): ProbeAllocation {
  const clamped = {
    replicate: clampInt(next.replicate),
    harvest: clampInt(next.harvest),
    manufacture: clampInt(next.manufacture)
  };
  const sum = clamped.replicate + clamped.harvest + clamped.manufacture;
  if (sum === 100) return clamped;
  if (sum === 0) return { replicate: 34, harvest: 33, manufacture: 33 };

  const scale = 100 / sum;
  const scaled = {
    replicate: Math.floor(clamped.replicate * scale),
    harvest: Math.floor(clamped.harvest * scale),
    manufacture: Math.floor(clamped.manufacture * scale)
  };
  let diff = 100 - (scaled.replicate + scaled.harvest + scaled.manufacture);

  const order: Array<keyof ProbeAllocation> = ["replicate", "harvest", "manufacture"];
  let idx = 0;
  while (diff !== 0) {
    const key = order[idx % order.length];
    scaled[key] += diff > 0 ? 1 : -1;
    diff += diff > 0 ? -1 : 1;
    idx++;
  }

  return scaled;
}

export function setAllocationAxis(
  current: ProbeAllocation,
  axis: keyof ProbeAllocation,
  value: number
): ProbeAllocation {
  const next = { ...current, [axis]: clampInt(value) } as ProbeAllocation;
  const remainingAxes = (["replicate", "harvest", "manufacture"] as const).filter(
    (k) => k !== axis
  );

  const remaining = clampInt(100 - next[axis]);
  const currentRemainingSum =
    current[remainingAxes[0]] + current[remainingAxes[1]] || 1;

  const first = Math.round((current[remainingAxes[0]] / currentRemainingSum) * remaining);
  const second = remaining - first;

  next[remainingAxes[0]] = clampInt(first);
  next[remainingAxes[1]] = clampInt(second);

  return normalizeAllocation(next);
}

function clampInt(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

