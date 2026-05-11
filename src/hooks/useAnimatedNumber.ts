import * as React from 'react';
import Decimal from 'break_eternity.js';

export function useAnimatedNumber(
  target: Decimal,
  onChange: (value: Decimal) => void
): void {
  const targetRef = React.useRef(target);
  const currentRef = React.useRef(new Decimal(0));

  React.useLayoutEffect(() => {
    targetRef.current = target;
  }, [target]);

  React.useEffect(() => {
    let raf = 0;

    const t = targetRef.current;
    const current = currentRef.current;
    const distance = t.sub(current).abs().toNumber();

    if (distance < 0.01) {
      currentRef.current = t;
      onChange(t);
      return;
    }

    // Scale duration by distance: larger distance = longer duration
    const duration = Math.min(400, distance * 2);
    const startTimeRef = { value: 0 };
    const startValue = currentRef.current;

    const loop = (now: number) => {
      if (startTimeRef.value === 0) {
        startTimeRef.value = now;
      }

      raf = window.requestAnimationFrame(loop);

      const t = targetRef.current;
      const distance = t.sub(startValue).abs().toNumber();

      if (distance < 0.01) {
        window.cancelAnimationFrame(raf);
        currentRef.current = t;
        onChange(t);
        return;
      }

      const elapsed = now - startTimeRef.value;
      const progress = 1 - Math.pow(1 - Math.min(1, elapsed / duration), 3);
      const step = startValue.add(t.sub(startValue).mul(progress));
      currentRef.current = step;
      onChange(step);
    };

    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [onChange]);
}