export type V3 = { x: number; y: number; z: number };
export const DIFFICULTIES = {
    easy: { label: 'Easy', speed: .75, interval: 1.2, enemies: .8 },
    normal: { label: 'Normal', speed: 1, interval: 1, enemies: 1 },
    hard: { label: 'Hard', speed: 1.25, interval: .85, enemies: 1.2 },
    suicide: { label: 'Suicide', speed: 1.6, interval: .65, enemies: 1.5 }
} as const;
export type Difficulty = keyof typeof DIFFICULTIES;
export const UPGRADE_COSTS = { beam: 30, brightness: 40, turn: 40, ammo: 50, damage: 100, velocity: 60, blast: 150, jammer: 120 } as const;
export const KILL_POINTS = { scout: 10, armored: 20, heavy: 30, boss: 100, repair:30, shield:35, decoy:15 } as const;
export const WAVE_BONUS = 20;
export const FLAWLESS_BONUS = 50;
export function waveEncounter(wave:number){return wave%5===0?'boss':wave%5===2?'swarm':wave%5===3?'pincer':wave%5===4?'blackout':'standard';}
export const ENCOUNTERS={
    standard:{title:'Standard approach',description:'Sweep the darkness and defend all directions.'},
    swarm:{title:'Coordinated swarms',description:'Drones arrive in tight groups of three. Watch for clustered targets.'},
    pincer:{title:'Two-front attack',description:'Drones alternate between two opposite approach sectors. Keep checking behind you.'},
    blackout:{title:'Searchlight blackout',description:'The light cuts out 8 seconds into the wave for 4 seconds. Radar and weapons stay active.'},
    boss:{title:'Carrier boss',description:'Destroy the carrier. Its glowing front core takes double damage; it can deploy two scouts.'}
} as const;
export type WaveResult={wave:number;kills:number;shots:number;hits:number;breaches:number;time:number;points:number;flawless:boolean};
export type Phase = 'ready' | 'combat' | 'resupply' | 'lost';
export const UPGRADES = ['beam','brightness','turn','ammo','damage','velocity','blast','jammer'] as const;
export type Upgrade = typeof UPGRADES[number];
export type Enemy = { id: number; x: number; y: number; z: number; hp: number; maxHp: number; radius: number; speed: number; kind: 'scout' | 'armored' | 'heavy' | 'boss' | 'repair' | 'shield' | 'decoy'; reveal: number; age: number; hitFlash?: number; launches?:number; supportTime?:number; shieldCharge?:number };
export type Bullet = { id: number; pos: V3; direction: V3; age: number; speed: number; damage: number; blast: number };
export type GameEvent = { kind: 'spawn' | 'shot' | 'hit' | 'kill' | 'breach' | 'clear' | 'lost' | 'pulse' | 'blast' | 'launch' | 'heal' | 'shield'; id?: number; pos?: V3; hp?: number; targetKind?: Enemy['kind']; weak?:boolean };
export const STATION: Readonly<V3> = Object.freeze({ x: 0, y: 5.8, z: 0 });
export const SPAWN_RADIUS = 65;
export const BREACH_RADIUS = 8;
export const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
export const wrapAngle = (angle: number) => ((angle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
export function flightHeight(kind: Enemy['kind'], age: number, id: number) {
    const altitude = kind === 'boss' ? 3.9 : kind === 'heavy' ? 3.8 : kind === 'armored' ? 3.3 : 3;
    const frequency = kind === 'scout' ? 1.8 : kind === 'armored' ? .65 : .9;
    return altitude + Math.sin(age * frequency + id * .7) * (kind === 'armored' ? .1 : .24);
}
export function flightMotion(kind: Enemy['kind'], age: number, wave: number) {
    return { drift: kind === 'scout' && wave > 1 ? Math.sin(age*2.1)*.65 : 0,
        pace: kind === 'heavy' && age%6 > 4 ? 1.3 : 1 };
}
export function aimDirection(yaw: number, pitch: number): V3 {
    return { x: Math.sin(yaw) * Math.cos(pitch), y: -Math.sin(pitch), z: Math.cos(yaw) * Math.cos(pitch) };
}
// Closest intersection on a swept segment; avoids fast bullets skipping a hitbox.
export function segmentHit(a: V3, b: V3, center: V3, radius: number): number | null {
    const d = { x: b.x-a.x, y:b.y-a.y, z:b.z-a.z };
    const o = { x: a.x-center.x, y:a.y-center.y, z:a.z-center.z };
    const aa = d.x*d.x+d.y*d.y+d.z*d.z;
    const cc = o.x*o.x+o.y*o.y+o.z*o.z-radius*radius;
    if (cc <= 0) return 0;
    if (aa < 1e-10) return null;
    const bb = 2*(o.x*d.x+o.y*d.y+o.z*d.z);
    const discriminant = bb*bb-4*aa*cc;
    if (discriminant < 0) return null;
    const t = (-bb-Math.sqrt(discriminant))/(2*aa);
    return t >= 0 && t <= 1 ? t : null;
}
export function bossCore(enemy:Enemy):V3 {
    const distance=Math.max(.01,Math.hypot(enemy.x,enemy.z));
    return {x:enemy.x-enemy.x/distance*(enemy.radius-.2),y:enemy.y+.7,z:enemy.z-enemy.z/distance*(enemy.radius-.2)};
}
export const DRONE_ROLES={
    repair:{wave:6,label:'Repair drone',tip:'Green cross: repairs one nearby damaged drone every 4s within 10m. Shoot it first.'},
    shield:{wave:8,label:'Shield drone',tip:'Cyan emitter: blocks 1 damage per hit to nearby allies within 8m. Three charges recharge every 6s. The emitter is unprotected.'},
    decoy:{wave:10,label:'Decoy drone',tip:'Violet antenna: creates hollow radar echoes. Destroy the real drone to clear the false contacts.'}
} as const;
export function droneRole(wave:number,number:number):Enemy['kind']|null{
    return wave>=10&&number===4?'decoy':wave>=8&&number===3?'shield':wave>=6&&number===2?'repair':null;
}
export function roleBriefing(wave:number){
    return Object.values(DRONE_ROLES).filter(role=>wave>=role.wave).map(role=>`${role.label}: ${role.tip}`).join(' ');
}
export class Siege {
    phase: Phase = 'ready';
    wave = 1; health = 3; kills = 0; waveSize = 5; spawned = 0;
    yaw = 0; pitch = Math.atan2(STATION.y-3,SPAWN_RADIUS); beam = Math.PI/5; turnSpeed = 1.4; capacity = 3;
    brightnessLevel = 0;
    damage = 1; projectileSpeed = 62; blastRadius = 0; jammerOwned = false; jamRemaining = 0; jamCooldown = 0;
    elapsed = 0; waveElapsed = 0; spawnElapsed = 0; resupplyElapsed = 0; cooldown = 0;
    points = 0; earnedPoints = 0; paused = false;
    waveKills=0;waveShots=0;waveHits=0;waveBreaches=0;wavePoints=0;
    lastResult:Readonly<WaveResult>|null=null;
    private waveBearing=0;
    private deployed=0;
    readonly difficulty: Difficulty;
    enemies: Enemy[] = []; bullets: Bullet[] = []; events: GameEvent[] = [];
    private nextId = 0;
    private random: () => number;
    constructor(random: () => number = Math.random, difficulty: Difficulty = 'normal') {
        this.random = random; this.difficulty = difficulty; this.waveSize = this.sizeForWave;this.waveBearing=this.random()*Math.PI*2;
    }
    get rules() { return DIFFICULTIES[this.difficulty]; }
    get sizeForWave() { return Math.max(1,Math.round(Math.min(23,5+(this.wave-1)*2)*this.rules.enemies)); }
    setPaused(paused: boolean) {
        if (this.phase !== 'combat' && this.phase !== 'resupply') return false;
        this.paused = paused; return true;
    }
    private award(points: number) { this.points += points; this.earnedPoints += points;this.wavePoints+=points; }
    get encounter(){return waveEncounter(this.wave);}
    get briefing(){return ENCOUNTERS[this.encounter];}
    get blackoutActive(){return this.phase==='combat'&&this.encounter==='blackout'&&this.waveElapsed>=8&&this.waveElapsed<12;}
    get searchlightIntensity() { return this.blackoutActive?0:4.6 * (1 + this.brightnessLevel * .5); }
    get remaining() { return this.waveSize-this.spawned+this.enemies.length; }
    get resolved() { return this.spawned-this.enemies.length; }
    get spawnDelay() { const base=(this.spawned===0?2.5:Math.max(.9,2.8-(this.wave-1)*.12))*this.rules.interval;return this.encounter==='swarm'&&this.spawned>0?(this.spawned%3===0?base*1.5:.3*this.rules.interval):base; }
    get nextArrival() { return this.spawned < this.waveSize ? Math.max(0,this.spawnDelay-this.spawnElapsed) : null; }
    get threat() {
        if (this.phase !== 'combat') return null;
        let result: { enemy: Enemy; bearing: number; eta: number } | null = null;
        for (const enemy of this.enemies) {
            const distance = Math.hypot(enemy.x,enemy.z);
            if (distance > 24) continue;
            const pace=flightMotion(enemy.kind,enemy.age,this.wave).pace;
            const eta = Math.max(0,distance-BREACH_RADIUS)/Math.max(.2,enemy.speed*pace*(this.jamRemaining>0?.45:1));
            if (!result || eta < result.eta) result = {enemy,eta,bearing:wrapAngle(Math.atan2(enemy.x,enemy.z)-this.yaw)};
        }
        return result;
    }
    start() { if (this.phase === 'ready') this.phase = 'combat'; }
    aim(dx: number, dy: number) {
        this.yaw = wrapAngle(this.yaw+dx);
        this.pitch = clamp(this.pitch+dy,-.28,.60);
    }
    assistAim(dt: number) {
        if (this.paused || this.phase !== 'combat') return;
        const direction = aimDirection(this.yaw,this.pitch);
        let target: Enemy | null = null, best = Math.cos(Math.PI / 45);
        for (const enemy of this.enemies) {
            if (enemy.reveal < .5) continue;
            const pos=enemy.kind==='boss'?bossCore(enemy):enemy;
            const y = pos.y-STATION.y, distance = Math.hypot(pos.x,y,pos.z);
            const dot = (pos.x*direction.x+y*direction.y+pos.z*direction.z)/distance;
            if (dot > best && dot >= Math.cos(this.beam/2)) { best = dot; target = enemy; }
        }
        if (!target) return;
        const pos=target.kind==='boss'?bossCore(target):target;
        const yaw = wrapAngle(Math.atan2(pos.x,pos.z)-this.yaw);
        const pitch = Math.atan2(STATION.y-pos.y,Math.hypot(pos.x,pos.z))-this.pitch;
        const amount = Math.min(1,Math.max(0,dt)*3), limit = Math.max(0,dt)*.12;
        this.aim(clamp(yaw*amount,-limit,limit),clamp(pitch*amount,-limit,limit));
    }
    fire(): boolean {
        if (this.paused || this.phase !== 'combat' || this.cooldown > 0 || this.bullets.length >= this.capacity) return false;
        const direction = aimDirection(this.yaw,this.pitch);
        const pos = { x: STATION.x+direction.x*.9, y:STATION.y+direction.y*.9, z:STATION.z+direction.z*.9 };
        const bullet = { id:++this.nextId, pos, direction, age:0, speed:this.projectileSpeed, damage:this.damage, blast:this.blastRadius };
        this.bullets.push(bullet); this.cooldown = .14;
        this.waveShots++;this.events.push({kind:'shot',pos}); return true;
    }
    canUpgrade(kind: Upgrade) {
        return kind === 'brightness' ? this.brightnessLevel < 3 : kind === 'beam' ? this.beam < Math.PI/2-.001 : kind === 'turn' ? this.turnSpeed < 2.9-.001 :
            kind === 'ammo' ? this.capacity < 6 : kind === 'damage' ? this.damage < 3 :
            kind === 'velocity' ? this.projectileSpeed < 100 : kind === 'blast' ? this.blastRadius === 0 :
            kind === 'jammer' ? !this.jammerOwned : false;
    }
    upgrade(kind: Upgrade) {
        if (this.paused || this.phase !== 'resupply' || !this.canUpgrade(kind) || this.points < UPGRADE_COSTS[kind]) return false;
        if (kind === 'brightness') this.brightnessLevel++;
        if (kind === 'beam') this.beam = Math.min(Math.PI/2,this.beam+Math.PI/36);
        if (kind === 'turn') this.turnSpeed = Math.min(2.9,this.turnSpeed+.25);
        if (kind === 'ammo') this.capacity++;
        if (kind === 'damage') this.damage++;
        if (kind === 'velocity') this.projectileSpeed=Math.min(100,this.projectileSpeed+19);
        if (kind === 'blast') this.blastRadius=4;
        if (kind === 'jammer') this.jammerOwned=true;
        this.points -= UPGRADE_COSTS[kind]; return true;
    }
    pulse() {
        if(this.paused||this.phase!=='combat'||!this.jammerOwned||this.jamCooldown>0)return false;
        this.jamRemaining=4;this.jamCooldown=18;this.events.push({kind:'pulse'});return true;
    }
    shieldFor(enemy:Enemy){
        if(enemy.kind==='shield')return undefined;
        return this.enemies.find(source=>source.kind==='shield'&&source.hp>0&&(source.shieldCharge??3)>0&&
            Math.hypot(source.x-enemy.x,source.y-enemy.y,source.z-enemy.z)<=8);
    }
    private damageEnemy(enemy:Enemy,amount:number,weak=false) {
        const shield=this.shieldFor(enemy);
        if(shield){shield.shieldCharge=(shield.shieldCharge??3)-1;amount=Math.max(0,amount-1);this.events.push({kind:'shield',id:enemy.id,pos:{x:enemy.x,y:enemy.y,z:enemy.z}});}
        enemy.hp=Math.max(0,enemy.hp-amount);enemy.hitFlash=.16;
        const pos={x:enemy.x,y:enemy.y,z:enemy.z};
        this.events.push({kind:'hit',id:enemy.id,pos,hp:enemy.hp,targetKind:enemy.kind,weak});
        if(enemy.hp===0){
            this.enemies=this.enemies.filter(e=>e.id!==enemy.id);this.kills++;this.waveKills++;this.award(KILL_POINTS[enemy.kind]);
            this.events.push({kind:'kill',id:enemy.id,pos,targetKind:enemy.kind});
        }
    }
    nextWave() {
        if (this.paused || this.phase !== 'resupply' || this.resupplyElapsed < 4) return false;
        this.wave++; this.waveSize = this.sizeForWave; this.spawned = 0;
        this.waveElapsed = this.spawnElapsed = this.cooldown = 0;
        this.waveKills=this.waveShots=this.waveHits=this.waveBreaches=this.wavePoints=0;this.lastResult=null;this.deployed=0;this.waveBearing=this.random()*Math.PI*2;
        this.phase = 'combat'; return true;
    }
    tick(dt: number) {
        if (this.paused) return;
        // Resupply measures elapsed time, not capped combat simulation steps.
        if (this.phase === 'resupply') { this.resupplyElapsed += Math.max(0,dt); return; }
        dt = clamp(dt,0,.05);
        if (this.paused || this.phase !== 'combat') return;
        this.elapsed += dt; this.waveElapsed += dt; this.spawnElapsed += dt;
        this.cooldown = Math.max(0,this.cooldown-dt);
        this.jamRemaining=Math.max(0,this.jamRemaining-dt);this.jamCooldown=Math.max(0,this.jamCooldown-dt);
        if (this.spawned < this.waveSize && this.spawnElapsed >= this.spawnDelay) {
            if(this.encounter==='swarm'&&this.spawned%3===0)this.waveBearing=this.random()*Math.PI*2;
            const angle=this.wave===1&&this.spawned===0?this.yaw:this.encounter==='swarm'?this.waveBearing+(this.random()-.5)*.24:
                this.encounter==='pincer'?this.waveBearing+(this.spawned%2?Math.PI:0)+(this.random()-.5)*.32:this.random()*Math.PI*2;
            const number = ++this.spawned-this.deployed;
            const kind = this.encounter==='boss'&&number===1?'boss':droneRole(this.wave,number)??(this.wave >= 5 && number%3 === 0 ? 'heavy' : this.wave >= 3 && number%2 === 0 ? 'armored' : 'scout');
            const hp = kind==='boss'?8+2*Math.floor(this.wave/5):kind === 'heavy' ? 3 : kind === 'armored'||kind==='repair'||kind==='shield' ? 2 : 1;
            const id = ++this.nextId;
            const enemy: Enemy = { id, x:Math.sin(angle)*SPAWN_RADIUS, y:flightHeight(kind,0,id), z:Math.cos(angle)*SPAWN_RADIUS,
                hp,maxHp:hp,kind,radius:kind==='boss'?2.4:kind==='heavy'?1.35:kind==='armored'?1.05:.95,
                speed:(2.8+(this.wave-1)*.20)*this.rules.speed*(kind==='boss'?.5:kind==='heavy'?.65:kind==='armored'?.82:1),reveal:0,age:0 };
            this.enemies.push(enemy);this.spawnElapsed = 0;this.events.push({kind:'spawn',id:enemy.id,targetKind:kind});
        }
        const aim = aimDirection(this.yaw,this.pitch);
        for (const enemy of [...this.enemies]) {
            enemy.age += dt;
            enemy.hitFlash = Math.max(0,(enemy.hitFlash||0)-dt);
            enemy.y = flightHeight(enemy.kind,enemy.age,enemy.id);
            const d = Math.hypot(enemy.x,enemy.z);
            if (d <= BREACH_RADIUS) {
                this.enemies = this.enemies.filter(e=>e.id!==enemy.id);
                this.health--;this.waveBreaches++;this.events.push({kind:'breach',id:enemy.id,pos:{x:enemy.x,y:enemy.y,z:enemy.z}});
                if (this.health <= 0) { this.health = 0;this.phase = 'lost';this.bullets = [];this.events.push({kind:'lost'});return; }
                continue;
            }
            if(enemy.kind==='boss'&&Math.floor(enemy.age/8)>(enemy.launches||0)&&(enemy.launches||0)<2){
                enemy.launches=(enemy.launches||0)+1;const id=++this.nextId;
                this.enemies.push({id,kind:'scout',x:enemy.x+1.8,y:flightHeight('scout',0,id),z:enemy.z,hp:1,maxHp:1,radius:.95,
                    speed:(2.8+(this.wave-1)*.2)*this.rules.speed,reveal:0,age:0});
                this.waveSize++;this.spawned++;this.deployed++;this.events.push({kind:'launch',id:enemy.id});
            }
            const {drift,pace} = flightMotion(enemy.kind,enemy.age,this.wave);
            const ux = enemy.x/d, uz = enemy.z/d;
            const slow=this.jamRemaining>0?.45:1;
            enemy.x += (-ux-uz*drift)*enemy.speed*pace*slow*dt;
            enemy.z += (-uz+ux*drift)*enemy.speed*pace*slow*dt;
            const ey = enemy.y-STATION.y, distance = Math.hypot(enemy.x,ey,enemy.z);
            const dot = (enemy.x*aim.x+ey*aim.y+enemy.z*aim.z)/distance;
            enemy.reveal = !this.blackoutActive&&dot >= Math.cos(this.beam/2) ? 1 : Math.max(0,enemy.reveal-dt/.4);
        }
        for(const enemy of this.enemies){
            if(enemy.kind!=='repair'&&enemy.kind!=='shield')continue;
            enemy.supportTime=(enemy.supportTime||0)+dt;
            const interval=enemy.kind==='repair'?4:6;
            if(enemy.supportTime>=interval){
                enemy.supportTime-=interval;
                if(enemy.kind==='shield')enemy.shieldCharge=3;
                else{
                    const target=this.enemies.filter(ally=>ally.id!==enemy.id&&ally.hp>0&&ally.hp<ally.maxHp&&Math.hypot(ally.x-enemy.x,ally.y-enemy.y,ally.z-enemy.z)<=10)
                        .sort((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp)||a.id-b.id)[0];
                    if(target){target.hp=Math.min(target.maxHp,target.hp+1);this.events.push({kind:'heal',id:target.id,pos:{x:target.x,y:target.y,z:target.z}});}
                }
            }
        }
        const liveBullets: Bullet[] = [];
        for (const bullet of this.bullets) {
            const old = { ...bullet.pos };
            bullet.age += dt;
            bullet.pos = { x:old.x+bullet.direction.x*bullet.speed*dt, y:old.y+bullet.direction.y*bullet.speed*dt, z:old.z+bullet.direction.z*bullet.speed*dt };
            let closest: Enemy | null = null, closestT = Infinity;
            for (const enemy of this.enemies) {
                const t = segmentHit(old,bullet.pos,{x:enemy.x,y:enemy.y,z:enemy.z},enemy.radius+.12);
                if (t !== null && t < closestT) { closestT = t; closest = enemy; }
            }
            if (closest) {
                const pos = {x:closest.x,y:closest.y,z:closest.z};
                const extended={x:bullet.pos.x+bullet.direction.x*closest.radius*2,y:bullet.pos.y+bullet.direction.y*closest.radius*2,z:bullet.pos.z+bullet.direction.z*closest.radius*2};
                const weak=closest.kind==='boss'&&segmentHit(old,extended,bossCore(closest),.35)!==null;
                this.waveHits++;this.damageEnemy(closest,bullet.damage*(weak?2:1),weak);
                if(bullet.blast>0){
                    this.events.push({kind:'blast',pos});
                    for(const enemy of [...this.enemies])if(enemy.id!==closest.id&&Math.hypot(enemy.x-pos.x,enemy.y-pos.y,enemy.z-pos.z)<=bullet.blast)
                        this.damageEnemy(enemy,1);
                }
            } else if (bullet.age < 1.3 && bullet.pos.y > 0) liveBullets.push(bullet);
        }
        this.bullets = liveBullets;
        if (this.spawned === this.waveSize && this.enemies.length === 0) {
            this.phase = 'resupply';this.health = Math.min(3,this.health+1);
            this.bullets = [];this.resupplyElapsed = 0;this.award(WAVE_BONUS);
            const flawless=this.waveBreaches===0;if(flawless)this.award(FLAWLESS_BONUS);
            this.lastResult=Object.freeze({wave:this.wave,kills:this.waveKills,shots:this.waveShots,hits:this.waveHits,breaches:this.waveBreaches,time:this.waveElapsed,points:this.wavePoints,flawless});
            this.events.push({kind:'clear'});
        }
    }
    drainEvents() { const events = this.events;this.events = [];return events; }
}
