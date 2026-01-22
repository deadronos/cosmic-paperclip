const SUFFIXES: Array<[number, string]> = [
  [1e12, "T"],
  [1e9, "B"],
  [1e6, "M"],
  [1e3, "K"]
];

export function formatNumber(value: number, opts?: { digits?: number }): string {
  if (!Number.isFinite(value)) return "∞";
  const digits = opts?.digits ?? 2;
  const abs = Math.abs(value);
  if (abs < 1_000_000) return Math.round(value).toLocaleString();

  for (const [cutoff, suffix] of SUFFIXES) {
    if (abs >= cutoff) {
      const scaled = value / cutoff;
      const precision = abs >= 1e12 ? 2 : digits;
      return `${trimZeros(scaled.toFixed(precision))} ${suffix}`;
    }
  }

  return value.toExponential(2);
}

export function formatRate(perSecond: number): string {
  return `${formatNumber(perSecond, { digits: 2 })}/s`;
}

function trimZeros(s: string) {
  return s.replace(/\.?0+$/, "");
}

