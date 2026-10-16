import type { GameEvent } from './model';

export function targetFeedback(events: readonly GameEvent[]) {
    const kills=events.filter(event=>event.kind==='kill');
    if(kills.length){
        const boss=kills.some(event=>event.targetKind==='boss');
        const role=kills.find(event=>event.targetKind==='repair'||event.targetKind==='shield'||event.targetKind==='decoy')?.targetKind;
        return {text:boss?'CARRIER DESTROYED':role==='repair'?'REPAIR DRONE DOWN':role==='shield'?'SHIELD EMITTER DOWN':role==='decoy'?'DECOY SIGNAL LOST':'TARGET DOWN',duration:650};
    }
    if(events.some(event=>event.kind==='shield'))return {text:'SHIELD HIT · TARGET THE EMITTER',duration:700};
    const weak=events.find(event=>event.kind==='hit'&&event.weak);
    if(weak)return {text:`CORE HIT · ${weak.hp} HP`,duration:600};
    const hit = events.find(event => event.kind === 'hit' && (event.hp ?? 0) > 0)
        ?? events.find(event => event.kind === 'hit');
    return hit ? { text: hit.hp && hit.hp > 0 ? `ARMOR HIT · ${hit.hp} HP` : 'HIT', duration: 450 } : null;
}
