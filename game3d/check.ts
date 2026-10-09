import { Siege, STATION, segmentHit, aimDirection, flightHeight, flightMotion, UPGRADES, type Enemy } from './src/model.ts';
import { radarPoint, radarSector } from './src/radar.ts';
import { AimSmoother } from './src/controls.ts';
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
waves.beam=Math.PI/2;waves.turnSpeed=2.9;waves.capacity=6;waves.damage=3;waves.projectileSpeed=100;waves.blastRadius=4;waves.jammerOwned=true;waves.spawned=waves.waveSize;waves.enemies=[];waves.tick(.025);advance(waves,4.1);
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
const smoother=new AimSmoother();smoother.add(.3,.1);const first=smoother.take(.016);
assert(first.x>0&&first.x<.3,'Touch input eases without an instant jump');const rest=smoother.flush();
assert(Math.abs(first.x+rest.x-.3)<1e-9&&Math.abs(first.y+rest.y-.1)<1e-9,'Firing flushes the full pending aim');
smoother.add(1,1);smoother.clear();assert(smoother.take(.1).x===0,'Pausing clears pending movement');
const assisted=new Siege();assisted.start();assisted.enemies=[target(1,1,Math.sin(.035)*20,Math.cos(.035)*20)];
assisted.pitch=Math.atan2(STATION.y-assisted.enemies[0].y,20);assisted.assistAim(.05);
assert(assisted.yaw>0&&assisted.yaw<.035,'Near-crosshair assistance is gentle');
assisted.yaw=0;assisted.enemies[0].reveal=0;assisted.assistAim(.05);assert(assisted.yaw===0,'Hidden drones receive no aim assistance');
assisted.enemies[0].reveal=1;assisted.enemies[0].x=12;assisted.assistAim(.05);assert(assisted.yaw===0,'Aim assistance does not snap toward distant bearings');
const warnings=new Siege();warnings.start();warnings.enemies=[{...target(10,1,0,-20),speed:4},{...target(11,1,9,0),speed:.2}];
assert(warnings.threat?.enemy.id===10&&Math.abs(warnings.threat.bearing)>3,'Warning selects earliest breach and points behind');
warnings.yaw=Math.PI;assert(Math.abs(warnings.threat!.bearing)<1e-8,'Warnings rotate with the turret');
warnings.enemies=[target(1,1,0,30)];assert(warnings.threat===null,'Distant drones do not crowd the HUD');
assert(flightMotion('scout',.7,2).drift>0&&flightMotion('scout',2,2).drift<0,'Scouts zigzag in both directions');
assert(flightMotion('scout',1,1).drift===0&&flightMotion('armored',1,5).drift===0,'Opening scouts and armored drones fly steadily');
assert(flightMotion('heavy',5,5).pace>flightMotion('heavy',3,5).pace,'Heavies have short attack runs');
for(const kind of ['scout','armored','heavy'] as const){
    const closing=new Siege();closing.wave=5;closing.waveSize=0;closing.start();closing.enemies=[{...target(55,1,0,46),kind,speed:3}];
    let previous=46;
    for(let i=0;i<500;i++){closing.tick(.025);if(!closing.enemies.length)break;const d=Math.hypot(closing.enemies[0].x,closing.enemies[0].z);assert(d<previous,'Each flight pattern makes progress toward the castle');previous=d;}
}
for(const kind of UPGRADES){
    const upgraded=new Siege();upgraded.phase='resupply';assert(upgraded.upgrade(kind)&&upgraded.chosen===kind,`${kind} upgrade equips`);
    assert(!upgraded.upgrade(kind),'Upgrade cannot be selected twice in one break');
}
const strong=new Siege();strong.start();strong.damage=3;strong.enemies=[target(100,3)];strong.pitch=combat.pitch;strong.fire();advance(strong,.4);
assert(strong.kills===1,'Stronger shot destroys three-hit armor');
const fast=new Siege();fast.start();fast.projectileSpeed=100;fast.fire();fast.tick(.025);
assert(Math.abs(Math.hypot(fast.bullets[0].pos.x,fast.bullets[0].pos.y-STATION.y,fast.bullets[0].pos.z)-3.4)<1e-8,'Velocity upgrade changes physical projectile speed');
const explosive=new Siege();explosive.start();explosive.damage=2;explosive.blastRadius=4;explosive.enemies=[target(100,2),target(101,1,2,20),target(102,2,3,20),target(103,1,6,20)];
explosive.pitch=combat.pitch;explosive.fire();advance(explosive,.4);
assert(explosive.kills===2&&explosive.enemies.find(e=>e.id===102)?.hp===1&&explosive.enemies.find(e=>e.id===103)?.hp===1,'Splash damages nearby targets once and leaves distant targets intact');
assert(explosive.drainEvents().filter(e=>e.kind==='blast').length===1,'One explosive impact per shell');
const damaged=new Siege();damaged.start();damaged.enemies=[target(100,3)];damaged.pitch=combat.pitch;damaged.fire();advance(damaged,.30);
assert(damaged.enemies[0].hp===2&&(damaged.enemies[0].hitFlash||0)>0,'Armor impact starts a short damage flash');advance(damaged,.3);
assert(damaged.enemies[0].hitFlash===0,'Damage flash expires');
const jammer=new Siege();jammer.start();assert(!jammer.pulse(),'Jammer requires an upgrade');jammer.jammerOwned=true;
jammer.enemies=[{...target(1,1,0,40),speed:4}];assert(jammer.pulse()&&!jammer.pulse(),'Jammer starts once and enforces its cooldown');jammer.tick(.025);
assert(Math.abs(jammer.enemies[0].z-(40-4*.45*.025))<1e-8,'Active jammer slows incoming drones');
const active=jammer.jamRemaining,cooldown=jammer.jamCooldown;jammer.phase='resupply';jammer.tick(.05);
assert(jammer.jamRemaining===active&&jammer.jamCooldown===cooldown,'Ability timers freeze outside combat');jammer.phase='combat';advance(jammer,4.1);
assert(jammer.jamRemaining===0&&jammer.jamCooldown>0,'Slowdown expires before recharge');
jammer.enemies=[];jammer.waveSize=1000;advance(jammer,14);assert(jammer.jamCooldown===0&&jammer.pulse(),'Jammer recharges on combat time');
assert(new Siege().damage===1&&!new Siege().jammerOwned,'Restart begins with the base loadout');
console.log('PASS: stationary combat, swept hits, flying patterns, damage feedback, touch smoothing, aim assistance, directional warnings, waves, all seven upgrades, splash damage and jammer timing.');
