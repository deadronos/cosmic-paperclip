# Smooth Number Transition Animations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add smooth ease-out tweening to all numeric displays (clips/wire/matter counters, rate indicators, progress dots) without affecting game logic.

**Architecture:** A `useAnimatedNumber` hook runs a RAF loop to interpolate Decimal values from current → target over ~400ms. Display components use this hook; game logic stays untouched.

**Tech Stack:** React hooks, requestAnimationFrame, Decimal (break_eternity.js), Vitest for tests

---

## File Structure

| File | Purpose |
|------|---------|
| `src/hooks/useAnimatedNumber.ts` | New — the animation hook |
| `src/hooks/index.ts` | New — exports |
| `src/__tests__/useAnimatedNumber.test.ts` | New — unit tests for the hook |
| `src/components/Metric.tsx` | Modify — use animated number for value |
| `src/App.tsx` | Modify — animate rate display spans |

---

## Task 1: Create `useAnimatedNumber` hook

**Files:**
- Create: `src/hooks/useAnimatedNumber.ts`
- Test: `src/__tests__/useAnimatedNumber.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/useAnimatedNumber.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import Decimal from 'break_eternity.js';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';

describe('useAnimatedNumber', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('interpolates from 0 to 100 over ~400ms', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useAnimatedNumber(new Decimal(100), onChange)
    );

    // Initial call sets up the animation
    act(() => {});

    // After 200ms (half the duration), value should be in the ease-out range (~75-90%)
    act(() => { vi.advanceTimersByTime(200); });

    const lastValue = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastValue.toNumber()).toBeGreaterThan(50);
    expect(lastValue.toNumber()).toBeLessThan(95);
  });

  it('completes and stops when within 0.01 of target', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useAnimatedNumber(new Decimal(1), onChange)
    );

    act(() => { vi.advanceTimersByTime(1000); });

    const finalValue = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(Math.abs(finalValue.toNumber() - 1)).toBeLessThan(0.01);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest src/__tests__/useAnimatedNumber.test.ts --run`
Expected: FAIL — `useAnimatedNumber` not defined

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/hooks/useAnimatedNumber.ts
import * as React from 'react';
import Decimal from 'break_eternity.js';

export function useAnimatedNumber(
  target: Decimal,
  onChange: (value: Decimal) => void
): void {
  const targetRef = React.useRef(target);
  const currentRef = React.useRef<Decimal | null>(null);

  React.useLayoutEffect(() => {
    targetRef.current = target;
  }, [target]);

  React.useEffect(() => {
    let raf = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      raf = window.requestAnimationFrame(loop);

      const t = targetRef.current;
      if (currentRef.current === null) {
        currentRef.current = t;
      }

      const current = currentRef.current;
      const diff = t.sub(current).abs().toNumber();

      if (diff < 0.01) {
        currentRef.current = t;
        onChange(t);
        return;
      }

      const elapsed = Math.min(400, (now - lastTime));
      const progress = 1 - Math.pow(1 - Math.min(1, elapsed / 400), 3);
      const step = current.add(t.sub(current).mul(progress));
      currentRef.current = step;
      onChange(step);
      lastTime = now;
    };

    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [onChange]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest src/__tests__/useAnimatedNumber.test.ts --run`
Expected: PASS

- [ ] **Step 5: Create hooks index**

```typescript
// src/hooks/index.ts
export { useAnimatedNumber } from './useAnimatedNumber';
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useAnimatedNumber.ts src/hooks/index.ts src/__tests__/useAnimatedNumber.test.ts
git commit -m "feat: add useAnimatedNumber hook for smooth transitions"
```

---

## Task 2: Animate Metric component

**Files:**
- Modify: `src/components/Metric.tsx:1-18`
- Test: `src/__tests__/Metric.test.tsx` (new)

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/Metric.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Metric from '@/components/Metric';

describe('Metric', () => {
  it('displays a label and formatted value', () => {
    render(<Metric label="Clips" value="42" />);
    expect(screen.getByText('Clips')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it passes (existing behavior)**

Run: `npx vitest src/__tests__/Metric.test.tsx --run`
Expected: PASS

- [ ] **Step 3: Update Metric to use animated number**

```tsx
// src/components/Metric.tsx
import * as React from 'react';
import Decimal from 'break_eternity.js';
import { useAnimatedNumber } from '@/hooks';
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

  const decimalValue = typeof value === 'string' ? new Decimal(value) : value;

  useAnimatedNumber(decimalValue, (v) => {
    setDisplayValue(formatNumber(v));
  });

  React.useLayoutEffect(() => {
    setDisplayValue(formatNumber(decimalValue));
  }, [decimalValue]);

  return (
    <div className={`rounded-lg border bg-background/40 p-3 ${className || ''}`}>
      <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-lg text-foreground will-change-transform">
        {displayValue}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run all tests to verify nothing broke**

Run: `npx vitest --run`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/Metric.tsx src/__tests__/Metric.test.tsx
git commit -m "feat: animate Metric value with smooth transitions"
```

---

## Task 3: Animate rate indicators in App.tsx

**Files:**
- Modify: `src/App.tsx:77-79` (rate declarations), `src/App.tsx:164-181` (rate display)

- [ ] **Step 1: Add animated rate state after the existing rate declarations (line 78)**

Add two pieces of state right after `const wireRate = getWireRate(state);` (around line 78):

```tsx
const [animatedMachineClipRate, setAnimatedMachineClipRate] = React.useState(machineClipRate);
const [animatedWireRate, setAnimatedWireRate] = React.useState(wireRate);
```

- [ ] **Step 2: Add useEffect calls after the rate declarations (after line 78)**

```tsx
React.useEffect(() => {
  setAnimatedMachineClipRate(machineClipRate);
}, [machineClipRate]);

React.useEffect(() => {
  setAnimatedWireRate(wireRate);
}, [wireRate]);
```

Note: The `useAnimatedNumber` hook updates the state imperatively via `setAnimatedMachineClipRate(machineClipRate)` etc. from within the RAF loop. Because React state updates are batched, we pass the setter as `onChange` directly.

- [ ] **Step 3: Update rate display to use animated values (lines 167-178)**

In the rate display section:
- Change `{formatRate(machineClipRate)}` → `{formatRate(animatedMachineClipRate)}`
- Change `{formatRate(wireRate)}` → `{formatRate(animatedWireRate)}`

The `animatedMachineClipRate` and `animatedWireRate` are Decimal state variables updated by the `useAnimatedNumber` RAF loop.

- [ ] **Step 4: Run all tests to verify nothing broke**

Run: `npx vitest --run`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: animate rate indicators with smooth transitions"
```

---

## Task 4: Animate UniverseVisualizer progress

**Files:**
- Modify: `src/components/UniverseVisualizer.tsx` — add animated `matterRemaining` state and update draw loop

- [ ] **Step 1: Add animated matter remaining state at the top of the component (after line 15)**

```tsx
const [animatedMatter, setAnimatedMatter] = React.useState(matterRemaining);

React.useEffect(() => {
  let raf = 0;
  let current = animatedMatter;
  let target = matterRemaining;
  let startTime = performance.now();

  const DURATION = 400;

  const loop = (now: number) => {
    raf = window.requestAnimationFrame(loop);
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / DURATION);
    const eased = 1 - Math.pow(1 - t, 3);
    current = current.add(target.sub(current).mul(eased));
    setAnimatedMatter(current);
    if (t >= 1) return;
  };

  raf = window.requestAnimationFrame(loop);
  return () => window.cancelAnimationFrame(raf);
}, [matterRemaining]);
```

- [ ] **Step 2: Update `inputsRef` to use animated value (line 20-23)**

Change:
```tsx
const inputsRef = React.useRef<{ stageId: StageId; matterRemaining: Decimal }>({
  stageId,
  matterRemaining
});
```
To:
```tsx
const inputsRef = React.useRef<{ stageId: StageId; matterRemaining: Decimal }>({
  stageId,
  matterRemaining: animatedMatter
});
```

- [ ] **Step 3: Update the `useEffect` that syncs inputs (lines 25-27)**

Change the effect that updates `inputsRef.current` to use `animatedMatter` instead of `matterRemaining`:
```tsx
React.useEffect(() => {
  inputsRef.current = { stageId, matterRemaining: animatedMatter };
}, [stageId, animatedMatter]);
```

This makes the draw loop use the animated value instead of the raw game value, so dots transition smoothly.

- [ ] **Step 4: Run all tests to verify nothing broke**

Run: `npx vitest --run`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/UniverseVisualizer.tsx
git commit -m "feat: animate universe visualizer progress smoothly"
```

---

## Task 5: Final verification

- [ ] **Step 1: Run all tests**

Run: `npx vitest --run`
Expected: PASS (all tests)

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: Successful build