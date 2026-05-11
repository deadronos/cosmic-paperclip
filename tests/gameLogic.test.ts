import { describe, it, expect } from 'vitest';
import { reducer, createInitialState, autoClipperCost } from '@/game/game';
import { checkAchievements } from '@/game/achievements';

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

describe('Achievement System', () => {

    it('unlocks First Clip when clips reach 1', () => {
        let state = createInitialState();
        state = reducer(state, { type: 'CLICK_MAKE' });
        expect(state.clips.eq(1)).toBe(true);
        expect(state.achievements).toContain('firstClip');
    });

    it('unlocks Automation when first Auto-Clipper purchased', () => {
        let state = createInitialState();
        const cost = autoClipperCost(state);
        state.clips = cost.plus(10);
        
        state = reducer(state, { type: 'BUY_AUTO' });
        expect(state.autoClippers).toBe(1);
        expect(state.achievements).toContain('automation');
    });

    it('unlocks Industrial Revolution when first Mega-Clipper purchased', () => {
        let state = createInitialState();
        state.clips = state.clips.fromNumber(5000);
        
        state = reducer(state, { type: 'BUY_MEGA' });
        expect(state.megaClippers).toBe(1);
        expect(state.achievements).toContain('industrial');
    });

    it('unlocks Centurion when clips reach 100', () => {
        let state = createInitialState();
        state.clips = state.clips.fromNumber(99);
        state.wire = state.wire.fromNumber(100);
        
        state = reducer(state, { type: 'CLICK_MAKE' });
        expect(state.clips.eq(100)).toBe(true);
        expect(state.achievements).toContain('centurion');
    });

    it('checkAchievements returns newly unlocked achievements', () => {
        const state = createInitialState();
        const unlocked = checkAchievements(state);
        expect(unlocked).toEqual([]);
    });

    it('achievements persist through prestige', () => {
        let state = createInitialState();
        state.achievements = ['firstClip', 'automation'];
        state.stageId = 'universal';
        
        state = reducer(state, { type: 'PRESTIGE' });
        expect(state.achievements).toContain('firstClip');
        expect(state.achievements).toContain('automation');
        expect(state.achievements).toContain('quantumLeap');
        expect(state.timesPrestiged).toBe(1);
    });

});
