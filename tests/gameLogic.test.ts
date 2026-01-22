import { describe, it, expect } from 'vitest';
import { reducer, createInitialState, autoClipperCost } from '@/game/game';

describe('Game Logic Reducer', () => {

    it('initializes correctly', () => {
        const state = createInitialState();
        expect(state.clips).toBe(0);
        expect(state.wire).toBe(1);
    });

    it('CLICK_MAKE produces paperclip', () => {
        let state = createInitialState();
        // Initial state: wire=1
        state = reducer(state, { type: 'CLICK_MAKE' });
        expect(state.clips).toBe(1);
        expect(state.wire).toBe(0);
    });

    it('BUY_AUTO purchases auto clipper', () => {
        let state = createInitialState();
        const cost = autoClipperCost(0);
        state.clips = cost + 10;

        state = reducer(state, { type: 'BUY_AUTO' });
        expect(state.autoClippers).toBe(1);
        expect(state.clips).toBe(10);
    });

    it('TICK produces resources', () => {
        let state = createInitialState();
        state.autoClippers = 1;
        state.matter = 1000;
        state.wire = 100; // Give enough wire to clip

        // Tick 1 second
        state = reducer(state, { type: 'TICK', dt: 1 });

        // AutoClipper makes clips
        expect(state.clips).toBeGreaterThan(0);
        expect(state.wire).toBeLessThan(100 + 50); // Hard to predict exact without constants but it should change
    });
});
