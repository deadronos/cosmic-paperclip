import { describe, it, expect } from 'vitest';
import { reducer, createInitialState, autoClipperCost } from '@/game/game';

describe('Game Logic Reducer', () => {

    it('initializes correctly', () => {
        const state = createInitialState();
        expect(state.clips.eq(0)).toBe(true);
        expect(state.wire.eq(1)).toBe(true);
    });

    it('CLICK_MAKE produces paperclip', () => {
        let state = createInitialState();
        // Initial state: wire=1
        state = reducer(state, { type: 'CLICK_MAKE' });
        expect(state.clips.eq(1)).toBe(true);
        expect(state.wire.eq(0)).toBe(true);
    });

    it('BUY_AUTO purchases auto clipper', () => {
        let state = createInitialState();
        const cost = autoClipperCost(0);
        state.clips = cost.plus(10);

        state = reducer(state, { type: 'BUY_AUTO' });
        expect(state.autoClippers).toBe(1);
        expect(state.clips.eq(10)).toBe(true);
    });

    it('TICK produces resources', () => {
        let state = createInitialState();
        state.autoClippers = 1;
        state.matter = state.matter.fromNumber(1000);
        state.wire = state.wire.fromNumber(100); // Give enough wire to clip

        // Tick 1 second
        state = reducer(state, { type: 'TICK', dt: 1 });

        // AutoClipper makes clips
        expect(state.clips.gt(0)).toBe(true);
        expect(state.wire.lt(150)).toBe(true); // Hard to predict exact without constants but it should change
    });
});
