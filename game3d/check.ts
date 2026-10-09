import { Siege, STATION, segmentHit, aimDirection, flightHeight, type Enemy } from './src/model.ts';
import { radarPoint, radarSector } from './src/radar.ts';
function assert(condition:unknown,message:string) {if(!condition)throw Error(message);}
const advance=(g:Siege,seconds:number)=>{for(let i=0;i<Math.ceil(seconds/.025);i++)g.tick(.025);};
assert(segmentHit({x:0,y:0,z:0},{x:10,y:0,z:0},{x:5,y:0,z:0},1)===.4,'Swept bullet hits between frames');
assert(segmentHit({x:0,y:0,z:0},{x:10,y:0,z:0},{x:5,y:3,z:0},1)===null,'Miss stays a miss');
assert(segmentHit({x:0,y:0,z:0},{x:0,y:0,z:0},{x:0,y:0,z:0},1)===0,'Inside-hit handles zero-length segments');
const g=new Siege(()=>.25);g.start();advance(g,2.55);
assert(g.enemies.length===1&&g.spawned===1,'First enemy appears after 2.5 seconds');
assert(g.enemies[0].reveal>0,'Opening enemy appears inside searchlight');
const position=JSON.stringify(STATION);g.aim(1,.1);g.aim(-1,-.1);assert(JSON.stringify(STATION)===position,'Aim cannot change station position');
g.aim(0,100);assert(g.pitch===.6,'Pitch is clamped');g.aim(0,-100);assert(g.pitch===-.28,'Upward pitch is clamped');
g.pitch=.1;for(let i=0;i<5;i++){g.fire();g.tick(.15);}assert(g.bullets.length<=3,'Bullet slots are capped');
const target=(id:number,hp=1,x=0,z=20):Enemy=>({id,x,y:flightHeight('scout',0,id),z,hp,maxHp:hp,radius:1,speed:0,kind:'scout',reveal:1,age:0});
const combat=new Siege();combat.start();combat.enemies=[target(100)];combat.pitch=Math.atan2(STATION.y-combat.enemies[0].y,20);combat.fire();advance(combat,.4);
assert(combat.kills===1&&combat.enemies.length===0,'Aimed swept bullet kills target');
assert(combat.drainEvents().filter(e=>e.kind==='hit').every(e=>e.pos&&e.pos.y>2.7),'Impacts occur at flight height');
const below=new Siege();below.start();below.enemies=[target(200)];below.pitch=Math.atan2(STATION.y-1.35,20);below.fire();advance(below,.45);
assert(below.kills===0&&below.enemies[0].hp===1,'Shots at former ground hitbox pass below flying targets');
for(const kind of ['scout','armored','heavy'] as const)for(let age=0;age<15;age+=.1){
    const y=flightHeight(kind,age,42);assert(y>2.7&&y<4.1&&y<STATION.y,'All target tiers stay low above ground and below the turret');
}
const armor=new Siege();armor.start();armor.pitch=combat.pitch;armor.enemies=[target(100,2)];armor.fire();advance(armor,.4);
assert(armor.enemies[0].hp===1&&armor.kills===0,'Armor needs another hit');armor.fire();advance(armor,.4);assert(armor.kills===1,'Second hit kills armor');
const breaches=new Siege();breaches.start();breaches.enemies=[target(1,1,0,7),target(2,1,7,0)];breaches.tick(.025);
assert(breaches.health===1&&breaches.phase==='combat'&&breaches.enemies.length===0,'Two breaches keep combat running');
breaches.enemies=[target(3,1,0,7)];breaches.tick(.025);assert(breaches.health===0&&breaches.phase==='lost','Third breach ends combat');
const frozen=breaches.elapsed;advance(breaches,10);assert(breaches.elapsed===frozen,'Lost-state time freezes');
const waves=new Siege();waves.start();waves.health=2;waves.spawned=waves.waveSize;waves.enemies=[target(50)];waves.tick(.025);
assert(waves.phase==='combat','Surviving enemies prevent wave completion');waves.enemies=[];waves.tick(.025);
assert(waves.phase==='resupply'&&waves.health===3,'Clearing repairs and enters resupply');
const elapsed=waves.elapsed;assert(!waves.fire(),'No firing during resupply');assert(!waves.nextWave(),'Choice and rest are required');
assert(waves.upgrade('ammo')&&waves.capacity===4,'Ammo upgrade works');assert(!waves.upgrade('beam'),'Only one upgrade per break');
advance(waves,4.1);assert(waves.elapsed===elapsed,'Resupply does not inflate combat time');assert(waves.nextWave(),'Next wave after break and choice');
assert(waves.wave===2&&waves.waveSize===7&&waves.waveElapsed===0&&waves.spawned===0,'Next wave resets counters');
assert(waves.fire()&&waves.bullets.length===1,'Gun fires immediately in the next wave');
waves.beam=Math.PI/2;waves.turnSpeed=2.9;waves.capacity=6;waves.spawned=waves.waveSize;waves.enemies=[];waves.tick(.025);advance(waves,4.1);
assert(waves.chosen==='max'&&waves.nextWave(),'All-maxed upgrades cannot soft-lock continuation');
const tiers=new Siege(()=>.25);tiers.wave=5;tiers.waveSize=3;tiers.start();
for(let i=0;i<3;i++){advance(tiers,3);tiers.enemies.forEach(e=>e.speed=0);}
assert(tiers.enemies.some(e=>e.kind==='armored')&&tiers.enemies.some(e=>e.kind==='heavy'),'Later waves include both armor tiers');
const direction=aimDirection(Math.PI/2,0);assert(Math.abs(direction.x-1)<1e-8,'Yaw points east');
const north=radarPoint(0,46),east=radarPoint(46,0),south=radarPoint(0,-46),west=radarPoint(-46,0);
assert(north.x===80&&north.y<80&&east.x>80&&east.y===80&&south.y>80&&west.x<80,'Radar cardinal directions match world coordinates');
assert(radarPoint(0,0).x===80&&radarPoint(0,0).y===80,'Castle stays at radar centre');
assert(Math.abs(radarPoint(0,20).y-80)<Math.abs(north.y-80),'Approaching targets move inward');
const sector=radarSector(Math.PI/2,Math.PI/5);
assert(Math.abs(sector.start+sector.end)<1e-8&&Math.abs(sector.end-sector.start-Math.PI/5)<1e-8,'Radar beam points east and matches searchlight width');
console.log('PASS: fixed station, flying-target heights and hitboxes, swept hits, armor, castle health, waves, upgrades, radar and timing.');
