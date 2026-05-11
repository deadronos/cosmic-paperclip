import { describe, it, expect } from 'vitest';
import Decimal from 'break_eternity.js';
import {
  getTimeToAfford,
  getNextMilestoneClips,
  getTimeToMilestone,
  formatCountdown,
} from '@/game/projections';

describe('getTimeToAfford', () => {
  it('returns 0 when already affordable', () => {
    expect(getTimeToAfford(d(100), d(10), d(50))).toBe(0);
  });

  it('returns seconds needed at current rate', () => {
    const time = getTimeToAfford(d(0), d(10), d(100));
    expect(time).toBe(10);
  });

  it('accounts for existing clips', () => {
    const time = getTimeToAfford(d(40), d(10), d(100));
    expect(time).toBe(6);
  });

  it('returns null when rate is zero', () => {
    expect(getTimeToAfford(d(0), d(0), d(100))).toBeNull();
  });

  it('returns null when rate is negative', () => {
    expect(getTimeToAfford(d(0), d(-5), d(100))).toBeNull();
  });
});

describe('getNextMilestoneClips', () => {
  it('returns 100 for clips < 100', () => {
    expect(getNextMilestoneClips(d(0)).eq(100)).toBe(true);
    expect(getNextMilestoneClips(d(50)).eq(100)).toBe(true);
  });

  it('returns next power of 10', () => {
    expect(getNextMilestoneClips(d(100)).eq(1000)).toBe(true);
    expect(getNextMilestoneClips(d(500)).eq(1000)).toBe(true);
    expect(getNextMilestoneClips(d(999)).eq(1000)).toBe(true);
    expect(getNextMilestoneClips(d(1000)).eq(10000)).toBe(true);
  });
});

describe('getTimeToMilestone', () => {
  it('returns 0 when already at milestone', () => {
    expect(getTimeToMilestone(d(100), d(10), d(100))).toBe(0);
  });

  it('returns seconds to reach milestone', () => {
    expect(getTimeToMilestone(d(0), d(10), d(100))).toBe(10);
  });

  it('returns null when rate is zero', () => {
    expect(getTimeToMilestone(d(0), d(0), d(100))).toBeNull();
  });
});

describe('formatCountdown', () => {
  it('returns em dash for null', () => {
    expect(formatCountdown(null)).toBe('\u2014');
  });

  it('returns Ready for 0 or negative', () => {
    expect(formatCountdown(0)).toBe('Ready');
    expect(formatCountdown(-1)).toBe('Ready');
  });

  it('formats seconds', () => {
    expect(formatCountdown(30)).toBe('30s');
    expect(formatCountdown(59)).toBe('59s');
  });

  it('formats minutes and seconds', () => {
    expect(formatCountdown(60)).toBe('1m');
    expect(formatCountdown(90)).toBe('1m 30s');
    expect(formatCountdown(150)).toBe('2m 30s');
  });

  it('formats hours and minutes', () => {
    expect(formatCountdown(3600)).toBe('1h');
    expect(formatCountdown(3660)).toBe('1h 1m');
    expect(formatCountdown(5400)).toBe('1h 30m');
  });
});

function d(n: number): Decimal {
  return new Decimal(n);
}
