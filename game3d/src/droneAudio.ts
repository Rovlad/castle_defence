import { SPAWN_RADIUS, BREACH_RADIUS, type Enemy } from './model.ts';

// The nearest three sources retain their own direction instead of collapsing into one hum.
export function droneSoundSources(enemies: readonly Enemy[], yaw: number) {
    return enemies.map(enemy=>({enemy,distance:Math.hypot(enemy.x,enemy.z)}))
        .filter(source=>source.distance<=SPAWN_RADIUS)
        .sort((a,b)=>a.distance-b.distance).slice(0,3)
        .map(({enemy,distance})=>{
            const approach=Math.max(0,Math.min(1,(SPAWN_RADIUS-distance)/(SPAWN_RADIUS-BREACH_RADIUS)));
            return {pan:Math.sin(Math.atan2(enemy.x,enemy.z)-yaw),
                strength:.16+.84*approach*approach,
                pitch:enemy.kind==='repair'?180:enemy.kind==='shield'?125:enemy.kind==='decoy'?210:enemy.kind==='boss'?85:enemy.kind==='heavy'?105:enemy.kind==='armored'?135:165};
        });
}
