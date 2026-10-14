import type { Siege, Upgrade } from './model.ts';

export function upgradeLevel(game:Siege,kind:Upgrade):{level:number;max:number}{
    const levels:Record<Upgrade,{level:number;max:number}>={
        beam:{level:Math.ceil((game.beam-Math.PI/5)/(Math.PI/36)-.0001),max:11},
        brightness:{level:game.brightnessLevel,max:3},
        turn:{level:Math.round((game.turnSpeed-1.4)/.25),max:6},
        ammo:{level:game.capacity-3,max:3},
        damage:{level:game.damage-1,max:2},
        velocity:{level:Math.round((game.projectileSpeed-62)/19),max:2},
        blast:{level:game.blastRadius>0?1:0,max:1},
        jammer:{level:game.jammerOwned?1:0,max:1}
    };
    const value=levels[kind];return {level:Math.max(0,Math.min(value.max,value.level)),max:value.max};
}
