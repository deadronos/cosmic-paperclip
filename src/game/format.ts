import Decimal, { type DecimalSource } from "break_eternity.js";

const SUFFIXES: Array<[number, string]> = [
  [1e12, "T"],
  [1e9, "B"],
  [1e6, "M"],
  [1e3, "K"]
];

export function formatNumber(value: DecimalSource, opts?: { digits?: number }): string {
  const d = Decimal.fromValue_noAlloc(value);
  if (!d.isFinite()) return "∞";
  const digits = opts?.digits ?? 2;

  const abs = d.abs();
  // Small values: show as an integer with locale formatting
  if (abs.lt(1_000_000)) return Decimal.round(d).toNumber().toLocaleString();

  // Medium range: suffix formatting (avoid converting truly huge values to Number)
  if (abs.lt(1e15)) {
    const n = d.toNumber();
    const nAbs = Math.abs(n);
    for (const [cutoff, suffix] of SUFFIXES) {
      if (nAbs >= cutoff) {
        const scaled = n / cutoff;
        const precision = nAbs >= 1e12 ? 2 : digits;
        return `${trimZeros(scaled.toFixed(precision))} ${suffix}`;
      }
    }
  }

  // Large values: rely on Decimal's scientific formatting.
  // (For layer 0/1 it will look like 1e53; for higher layers it becomes ee...)
  return d.toString();
}

export function formatRate(perSecond: DecimalSource): string {
  return `${formatNumber(perSecond, { digits: 2 })}/s`;
}

function trimZeros(s: string) {
  return s.replace(/\.?0+$/, "");
}

