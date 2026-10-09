import type { GameEvent } from './model';

export function targetFeedback(events: readonly GameEvent[]) {
    if (events.some(event => event.kind === 'kill')) return { text: 'TARGET DOWN', duration: 650 };
    const hit = events.find(event => event.kind === 'hit' && (event.hp ?? 0) > 0)
        ?? events.find(event => event.kind === 'hit');
    return hit ? { text: hit.hp && hit.hp > 0 ? `ARMOR HIT · ${hit.hp} HP` : 'HIT', duration: 450 } : null;
}
