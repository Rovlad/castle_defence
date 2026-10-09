export type V3 = { x: number; y: number; z: number };
export type Phase = 'ready' | 'combat' | 'resupply' | 'lost';
export type Upgrade = 'beam' | 'turn' | 'ammo';
export type Enemy = { id: number; x: number; z: number; hp: number; maxHp: number; radius: number; speed: number; kind: 'runner' | 'armored' | 'heavy'; reveal: number; age: number };
export type Bullet = { id: number; pos: V3; direction: V3; age: number };
export type GameEvent = { kind: 'spawn' | 'shot' | 'hit' | 'kill' | 'breach' | 'clear' | 'lost'; id?: number; pos?: V3 };
export const STATION: Readonly<V3> = Object.freeze({ x: 0, y: 5.8, z: 0 });
export const SPAWN_RADIUS = 46;
export const BREACH_RADIUS = 8;
export const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
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
export class Siege {
    phase: Phase = 'ready';
    wave = 1; health = 3; kills = 0; waveSize = 5; spawned = 0;
    yaw = 0; pitch = .10; beam = Math.PI/5; turnSpeed = 1.4; capacity = 3;
    elapsed = 0; waveElapsed = 0; spawnElapsed = 0; resupplyElapsed = 0; cooldown = 0;
    chosen: Upgrade | 'max' | null = null;
    enemies: Enemy[] = []; bullets: Bullet[] = []; events: GameEvent[] = [];
    private nextId = 0;
    private random: () => number;
    constructor(random: () => number = Math.random) { this.random = random; }
    get remaining() { return this.waveSize-this.spawned+this.enemies.length; }
    get resolved() { return this.spawned-this.enemies.length; }
    get spawnDelay() { return this.spawned === 0 ? 2.5 : Math.max(.9,2.8-(this.wave-1)*.12); }
    get nextArrival() { return this.spawned < this.waveSize ? Math.max(0,this.spawnDelay-this.spawnElapsed) : null; }
    start() { if (this.phase === 'ready') this.phase = 'combat'; }
    aim(dx: number, dy: number) {
        this.yaw = (this.yaw+dx+Math.PI*3)%(Math.PI*2)-Math.PI;
        this.pitch = clamp(this.pitch+dy,-.28,.60);
    }
    fire(): boolean {
        if (this.phase !== 'combat' || this.cooldown > 0 || this.bullets.length >= this.capacity) return false;
        const direction = aimDirection(this.yaw,this.pitch);
        const pos = { x: STATION.x+direction.x*.9, y:STATION.y+direction.y*.9, z:STATION.z+direction.z*.9 };
        const bullet = { id:++this.nextId, pos, direction, age:0 };
        this.bullets.push(bullet); this.cooldown = .14;
        this.events.push({kind:'shot',pos}); return true;
    }
    canUpgrade(kind: Upgrade) {
        return kind === 'beam' ? this.beam < Math.PI/2-.001 : kind === 'turn' ? this.turnSpeed < 2.9-.001 : this.capacity < 6;
    }
    upgrade(kind: Upgrade) {
        if (this.phase !== 'resupply' || this.chosen || !this.canUpgrade(kind)) return false;
        if (kind === 'beam') this.beam = Math.min(Math.PI/2,this.beam+Math.PI/36);
        if (kind === 'turn') this.turnSpeed = Math.min(2.9,this.turnSpeed+.25);
        if (kind === 'ammo') this.capacity++;
        this.chosen = kind; return true;
    }
    nextWave() {
        if (this.phase !== 'resupply' || !this.chosen || this.resupplyElapsed < 4) return false;
        this.wave++; this.waveSize = Math.min(23,5+(this.wave-1)*2); this.spawned = 0;
        this.waveElapsed = this.spawnElapsed = this.cooldown = 0;
        this.phase = 'combat'; this.chosen = null; return true;
    }
    tick(dt: number) {
        dt = clamp(dt,0,.05);
        if (this.phase === 'resupply') { this.resupplyElapsed += dt; return; }
        if (this.phase !== 'combat') return;
        this.elapsed += dt; this.waveElapsed += dt; this.spawnElapsed += dt;
        this.cooldown = Math.max(0,this.cooldown-dt);
        if (this.spawned < this.waveSize && this.spawnElapsed >= this.spawnDelay) {
            const angle = this.wave === 1 && this.spawned === 0 ? this.yaw : this.random()*Math.PI*2;
            const number = ++this.spawned;
            const kind = this.wave >= 5 && number%3 === 0 ? 'heavy' : this.wave >= 3 && number%2 === 0 ? 'armored' : 'runner';
            const hp = kind === 'heavy' ? 3 : kind === 'armored' ? 2 : 1;
            const enemy: Enemy = { id:++this.nextId, x:Math.sin(angle)*SPAWN_RADIUS, z:Math.cos(angle)*SPAWN_RADIUS,
                hp,maxHp:hp,kind,radius:kind==='heavy'?1.35:kind==='armored'?1.05:.82,
                speed:(2.8+(this.wave-1)*.20)*(kind==='heavy'?.65:kind==='armored'?.82:1),reveal:0,age:0 };
            this.enemies.push(enemy);this.spawnElapsed = 0;this.events.push({kind:'spawn',id:enemy.id});
        }
        const aim = aimDirection(this.yaw,this.pitch);
        for (const enemy of [...this.enemies]) {
            enemy.age += dt;
            const d = Math.hypot(enemy.x,enemy.z);
            if (d <= BREACH_RADIUS) {
                this.enemies = this.enemies.filter(e=>e.id!==enemy.id);
                this.health--;this.events.push({kind:'breach',id:enemy.id,pos:{x:enemy.x,y:1.1,z:enemy.z}});
                if (this.health <= 0) { this.health = 0;this.phase = 'lost';this.bullets = [];this.events.push({kind:'lost'});return; }
                continue;
            }
            const drift = this.wave >= 3 ? Math.sin(enemy.age*1.3)*.24 : 0;
            const ux = enemy.x/d, uz = enemy.z/d;
            enemy.x += (-ux-uz*drift)*enemy.speed*dt;
            enemy.z += (-uz+ux*drift)*enemy.speed*dt;
            const ey = 1.35-STATION.y, distance = Math.hypot(enemy.x,ey,enemy.z);
            const dot = (enemy.x*aim.x+ey*aim.y+enemy.z*aim.z)/distance;
            enemy.reveal = dot >= Math.cos(this.beam/2) ? 1 : Math.max(0,enemy.reveal-dt/.4);
        }
        const liveBullets: Bullet[] = [];
        for (const bullet of this.bullets) {
            const old = { ...bullet.pos };
            bullet.age += dt;
            bullet.pos = { x:old.x+bullet.direction.x*62*dt, y:old.y+bullet.direction.y*62*dt, z:old.z+bullet.direction.z*62*dt };
            let closest: Enemy | null = null, closestT = Infinity;
            for (const enemy of this.enemies) {
                const t = segmentHit(old,bullet.pos,{x:enemy.x,y:1.35,z:enemy.z},enemy.radius+.12);
                if (t !== null && t < closestT) { closestT = t; closest = enemy; }
            }
            if (closest) {
                closest.hp--;
                const pos = {x:closest.x,y:1.35,z:closest.z};
                this.events.push({kind:'hit',id:closest.id,pos});
                if (closest.hp <= 0) {
                    this.enemies = this.enemies.filter(e=>e.id!==closest!.id);this.kills++;
                    this.events.push({kind:'kill',id:closest.id,pos});
                }
            } else if (bullet.age < 1.3 && bullet.pos.y > 0) liveBullets.push(bullet);
        }
        this.bullets = liveBullets;
        if (this.spawned === this.waveSize && this.enemies.length === 0) {
            this.phase = 'resupply';this.health = Math.min(3,this.health+1);
            this.bullets = [];this.resupplyElapsed = 0;this.chosen = null;
            if (!(['beam','turn','ammo'] as Upgrade[]).some(kind=>this.canUpgrade(kind))) this.chosen = 'max';
            this.events.push({kind:'clear'});
        }
    }
    drainEvents() { const events = this.events;this.events = [];return events; }
}
