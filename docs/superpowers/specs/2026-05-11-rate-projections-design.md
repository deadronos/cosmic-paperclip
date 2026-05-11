# Rate Projections & Countdown Timers

## Overview

Add time-based feedback to the game: countdown timers to next affordable upgrade, milestone time projections, and clear rate displays.

## Architecture

### New File: `src/game/projections.ts` — Pure Math Functions

Stateless derived computations. No state needed — everything computed from current clips, rates, and costs.

```
getTimeToAfford(clips: Decimal, clipRate: Decimal, cost: Decimal) → number | null
```
Returns seconds until the player can afford `cost` at current `clipRate`. Returns `null` when clipRate is zero (not producing). Returns 0 if already affordable.

```
getNextMilestoneClips(clips: Decimal) → Decimal
```
Returns the next power-of-10 milestone above current clips (100, 1k, 10k, 100k, 1M, …). Used to calculate "1000 clips in ~X" projections.

```
getTimeToMilestone(clips: Decimal, clipRate: Decimal, milestone: Decimal) → number | null
```
Seconds to reach a given milestone value.

```
getNextAffordableUpgrade(state: GameState) → { upgrade: UpgradeInfo; time: number | null } | null
```
Returns whichever upgrade (auto, mega, harvester, probe design) is closest to being affordable and NOT already affordable, with estimated time.

```
formatCountdown(seconds: number) → string
```
Human-readable countdown: "2m 30s", "45s", "1h 15m", "—" for infinite.

### New File: `src/hooks/useCountdown.ts` — Live Countdown Hook

```
useCountdown(seconds: number | null): { display: string; immediate: boolean }
```
Takes a raw seconds value (from projections) and returns:
- `display`: formatted countdown string
- `immediate`: true if seconds is 0 or null

Updates at 1-second intervals for smooth countdown display. When seconds is null (not producing), shows "—". When 0 (already affordable), shows "Ready".

### New File: `src/components/RateProjection.tsx` — UI Component

Takes the game state and renders:
1. **Rate display**: Clip rate in both /sec and /min format
2. **Countdown to next upgrade**: Shows closest affordable upgrade with live countdown
3. **Milestone projection**: "Next milestone: 1,000 clips — ~2m 30s"

Props:
```
{
  state: GameState;
  clipRate: Decimal;
  wireRate: Decimal;
  autoCost: Decimal;
  megaCost: Decimal;
  harvesterCost: Decimal;
  probeDesignCost: Decimal;
  probesUnlocked: boolean;
}
```

### Edit: `src/App.tsx`

Insert `<RateProjection>` component between the "Output" rates section (line 197-213) and the action buttons section (line 215), inside the Control Center card.

### Edit: `__tests__/projections.test.ts` — Unit Tests

Test the pure math functions: time to afford (already affordable, zero rate, normal case), milestone calculations, countdown formatting edge cases.

## Data Flow

```
GameState → getMachineClipRate() → clipRate
GameState → upgradeCost() → costs
clipRate + costs → getTimeToAfford() → raw seconds
raw seconds → useCountdown() → display string
clipRate + clips → getNextMilestoneClips() → milestone value
milestone value + clipRate → getTimeToMilestone() → raw milestone seconds
raw milestone seconds → useCountdown() → display string
```

Everything is derived. No mutations to GameState. The existing requestAnimationFrame loop already triggers re-renders each frame; the countdown hook adds 1-second resolution for the display text.

## Edge Cases

- **Zero clip rate**: Show "—" for countdowns (no production rate)
- **Already affordable**: Show "Ready" or hide the countdown
- **Rate changes during countdown**: Countdown recalculates each frame naturally
- **Probes unlocked**: If probes contribute to clip rate (manufacture allocation), the clip rate already reflects this via the tick function — projections naturally account for it
- **Probe design cost** can be reduced by prestige upgrades; properly reflected via getProbeDesignCost()

## Styling

- Match existing dark sci-fi theme (monospace font, muted colors)
- Countdown text uses amber/orange (`text-orange-400`) for urgency
- Milestone projection uses subtle blue (`text-blue-400/80`)
- Compact layout to fit within the Control Center card
