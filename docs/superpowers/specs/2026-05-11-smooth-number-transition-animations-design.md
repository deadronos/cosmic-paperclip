# Smooth Number Transition Animations — Design Spec

**Date:** 2026-05-11
**Issue:** #6
**Status:** Approved

---

## Overview

Add smooth tweening animations when numeric values change instead of instant jumps. Affects counters (clips, wire, matter), rate indicators, and progress bars.

---

## Animation Style

- **Easing:** Ease-out (cubic: `t = 1 - (1 - t)^3`)
- **Duration:** ~400ms for full transition, scales proportionally by distance
- **Threshold:** Animation completes when difference < 0.01

---

## Architecture

### Core Principle
The game logic always uses **actual** (non-animated) values. Animation is purely for display — zero impact on game calculations.

### New Hook: `useAnimatedNumber`

**Location:** `src/hooks/useAnimatedNumber.ts`

**Interface:**
```typescript
function useAnimatedNumber(target: Decimal, onChange: (v: Decimal) => void): void
```

**Behavior:**
1. RAF loop tweens from currently displayed value → target
2. Uses ease-out cubic: `progress = 1 - (1 - elapsed/duration)^3`
3. Duration scales by distance: `duration = min(400, distance * 2)` (ms)
4. Stops when |current - target| < 0.01
5. RAF cancels on unmount

---

## Affected Components

### Metric.tsx
- Wraps `value` prop with `useAnimatedNumber`
- Displays interpolated Decimal result (formatted after interpolation)
- `will-change: transform` hint on value element

### App.tsx (Rate Display)
- Extract rate values and animate them like Metric
- Output: `{formatNumber(animatedClipsRate)}/s`
- Wire intake: `{formatNumber(animatedWireRate)}/s`

### UniverseVisualizer.tsx
- Animate `remainingFrac` smoothly instead of jumping
- Use same ease-out approach for progress dots

---

## Performance

- RAF loop only runs when values actively changing
- No DOM thrashing — updates only when interpolation moves
- `will-change: transform` on animated elements
- Cleanup on unmount (no memory leaks)

---

## Testing

| Test | Description |
|------|-------------|
| Hook interpolation | Tween 0 → 100, value at 200ms should be ~70–90 |
| Hook completion | Stops when within 0.01 of target |
| Game logic integrity | Actual game values unaffected by animation |
| No jank | 60fps maintained during animations |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useAnimatedNumber.ts` | **New** — the animation hook |
| `src/components/Metric.tsx` | Use animated number for value display |
| `src/App.tsx` | Animate rate indicators |
| `src/components/UniverseVisualizer.tsx` | Animate remainingFrac |
| `src/hooks/index.ts` | Export the hook |