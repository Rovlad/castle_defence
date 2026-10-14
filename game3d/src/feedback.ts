import type { GameEvent } from './model';

export function targetFeedback(events: readonly GameEvent[]) {
    if (events.some(event => event.kind === 'kill')) return { text: events.some(event=>event.kind==='kill'&&event.targetKind==='boss')?'CARRIER DESTROYED':'TARGET DOWN', duration: 650 };
    const weak=events.find(event=>event.kind==='hit'&&event.weak);
    if(weak)return {text:`CORE HIT · ${weak.hp} HP`,duration:600};
    const hit = events.find(event => event.kind === 'hit' && (event.hp ?? 0) > 0)
        ?? events.find(event => event.kind === 'hit');
    return hit ? { text: hit.hp && hit.hp > 0 ? `ARMOR HIT · ${hit.hp} HP` : 'HIT', duration: 450 } : null;
}
