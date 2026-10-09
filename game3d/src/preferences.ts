import type { Difficulty } from './model';

export type BestScore = { wave: number; kills: number; time: number };

// A damaged score must not prevent remembering the selected difficulty.
export function loadDifficultyPreferences(storage: Pick<Storage, 'getItem' | 'setItem'>, difficulty: Difficulty): BestScore | null {
    let best: BestScore | null = null;
    try {
        const stored = JSON.parse(storage.getItem(`night-siege-3d-best-${difficulty}`) ||
            (difficulty === 'normal' ? storage.getItem('night-siege-3d-best') : null) || 'null');
        if (stored && Number.isInteger(stored.wave) && stored.wave > 0 && Number.isInteger(stored.kills) &&
            stored.kills >= 0 && Number.isFinite(stored.time) && stored.time >= 0) best = stored;
    } catch {}
    try {
        storage.setItem('night-siege-3d-difficulty', difficulty);
    } catch {}
    return best;
}
