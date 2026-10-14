import { Siege, STATION, flightHeight, type Enemy } from './model.ts';

class PracticeSiege extends Siege {
    get spawnDelay(){return Infinity;}
}
export class PlayableIntro {
    readonly game=new PracticeSiege(()=>.5,'easy');
    stage:'aim'|'shoot'|'radar'|'complete'='aim';
    constructor(){this.game.start();this.placeDrone(.55,10001);}
    private placeDrone(bearing:number,id:number){
        const enemy:Enemy={id,x:Math.sin(bearing)*24,z:Math.cos(bearing)*24,
            y:flightHeight('scout',0,id),hp:1,maxHp:1,radius:1.3,speed:0,kind:'scout',reveal:0,age:0};
        this.game.enemies=[enemy];
        this.game.pitch=Math.atan2(STATION.y-enemy.y,24);
    }
    update(){
        if(this.game.kills>=2){this.stage='complete';return;}
        if(this.game.kills===1&&this.stage!=='radar'){
            this.stage='radar';this.placeDrone(this.game.yaw+Math.PI/2,10002);
        }else if(this.stage==='aim'&&this.game.enemies[0]?.reveal>0){this.stage='shoot';}
    }
    get message(){
        if(this.stage==='aim')return 'Drag or use the arrow keys to sweep right. Find the practice drone with your searchlight.';
        if(this.stage==='shoot')return 'Drone spotted! Aim the crosshair at its body. Click, hold Space, or use FIRE to shoot.';
        if(this.stage==='radar')return this.game.enemies[0]?.reveal>0?'Target found. Shoot it down to complete training.':'Find the new red dot on the radar. Turn right toward it—even when it is outside your searchlight.';
        return 'A wave is a group of approaching drones. Destroy them before they breach the castle. Once every drone is destroyed or gets through, the wave ends and the upgrade shop opens. Later waves bring more, faster and tougher drones. Spend earned points or save them, then start the next wave.';
    }
}
