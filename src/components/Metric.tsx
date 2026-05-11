import * as React from 'react';
import Decimal from 'break_eternity.js';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { formatNumber } from '@/game/format';

export default function Metric({
  label,
  value,
  className
}: {
  label: string;
  value: Decimal | string;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = React.useState<string>('');

  const decimalValue = React.useMemo(
    () => (typeof value === 'string' ? new Decimal(value) : value),
    [value]
  );

  const handleChange = React.useCallback((v: Decimal) => {
    setDisplayValue(formatNumber(v));
  }, []);

  useAnimatedNumber(decimalValue, handleChange);

  React.useLayoutEffect(() => {
    setDisplayValue(formatNumber(decimalValue));
  }, [decimalValue]);

  return (
    <div className={`rounded-lg border bg-background/40 p-3 ${className || ""}`}>
      <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-lg text-foreground will-change-transform">
        {displayValue}
      </div>
    </div>
  );
}