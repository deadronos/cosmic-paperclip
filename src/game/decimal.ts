import Decimal, { type DecimalSource } from "break_eternity.js";

export type { DecimalSource };
export { Decimal };

/** Convenience constructor: D(123), D("1e42"), D(existingDecimal) */
export function D(value: DecimalSource): Decimal {
  return new Decimal(value);
}

export const ZERO = Decimal.dZero;
export const ONE = Decimal.dOne;

export function isDecimal(v: unknown): v is Decimal {
  return v instanceof Decimal;
}
