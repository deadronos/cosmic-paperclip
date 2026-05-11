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

  it('interpolates from 0 to 100', () => {
    const onChange = vi.fn();
    renderHook(() =>
      useAnimatedNumber(new Decimal(100), onChange)
    );

    // Initial call sets up the animation
    act(() => {});

    // With distance=100, duration=min(400, 100*2)=200ms
    // After 100ms (half duration), value should be > 50 due to ease-out curve
    act(() => { vi.advanceTimersByTime(100); });

    const lastValue = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastValue.toNumber()).toBeGreaterThan(50);
  });

  it('completes and stops when within 0.01 of target', () => {
    const onChange = vi.fn();
    renderHook(() =>
      useAnimatedNumber(new Decimal(1), onChange)
    );

    act(() => { vi.advanceTimersByTime(1000); });

    const finalValue = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(Math.abs(finalValue.toNumber() - 1)).toBeLessThan(0.01);
  });
});