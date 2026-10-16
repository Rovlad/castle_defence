import { SPAWN_RADIUS, BREACH_RADIUS, type Siege, type Enemy } from './model.ts';

export const RADAR_SIZE = 160;
const CENTER = RADAR_SIZE / 2, RADIUS = 62;
const SCALE = RADIUS / (SPAWN_RADIUS + 4);

// North stays at the top: world +Z is north and +X is east.
export function radarPoint(x: number, z: number) {
    return { x: CENTER + x * SCALE, y: CENTER - z * SCALE };
}
export function radarSector(yaw: number, width: number) {
    return { start: yaw - Math.PI / 2 - width / 2, end: yaw - Math.PI / 2 + width / 2 };
}

// Echoes exist only on radar, never in combat counts, hitboxes, rewards or threat selection.
export function radarEchoes(enemies:readonly Enemy[]){
    return enemies.filter(enemy=>enemy.kind==='decoy').flatMap(enemy=>[-1,1].map(side=>{
        const bearing=Math.atan2(enemy.x,enemy.z)+side*.4;
        const distance=Math.min(SPAWN_RADIUS,Math.hypot(enemy.x,enemy.z)*(side<0?.82:1.08));
        return {x:Math.sin(bearing)*distance,z:Math.cos(bearing)*distance,age:enemy.age};
    }));
}
export class Radar {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D | null;
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.resize();
    }
    resize() {
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        this.canvas.width = this.canvas.height = RADAR_SIZE * ratio;
        this.context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    draw(game: Siege) {
        const ctx = this.context;
        if (!ctx) return;
        ctx.clearRect(0, 0, RADAR_SIZE, RADAR_SIZE);
        ctx.fillStyle = '#091924e8';
        ctx.beginPath(); ctx.arc(CENTER, CENTER, RADIUS, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3d5868'; ctx.lineWidth = 1;
        for (const radius of [RADIUS / 2, RADIUS]) {
            ctx.beginPath(); ctx.arc(CENTER, CENTER, radius, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.strokeStyle = '#233c4c';
        if(game.jamRemaining>0){
            const radius=RADIUS*((4-game.jamRemaining)%1);
            ctx.strokeStyle='#86d8e3';ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(CENTER,CENTER,radius,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;ctx.strokeStyle='#233c4c';
        }
        ctx.beginPath(); ctx.moveTo(CENTER - RADIUS, CENTER); ctx.lineTo(CENTER + RADIUS, CENTER);
        ctx.moveTo(CENTER, CENTER - RADIUS); ctx.lineTo(CENTER, CENTER + RADIUS); ctx.stroke();

        const sector = radarSector(game.yaw, game.beam);
        ctx.fillStyle = 'rgba(234,200,136,.18)'; ctx.strokeStyle = '#eac888'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(CENTER, CENTER);
        ctx.arc(CENTER, CENTER, RADIUS, sector.start, sector.end); ctx.closePath(); ctx.fill(); ctx.stroke();
        const heading = radarPoint(Math.sin(game.yaw) * (SPAWN_RADIUS + 4), Math.cos(game.yaw) * (SPAWN_RADIUS + 4));
        ctx.strokeStyle = '#f3dba6'; ctx.beginPath(); ctx.moveTo(CENTER, CENTER); ctx.lineTo(heading.x, heading.y); ctx.stroke();

        for(const echo of radarEchoes(game.enemies)){
            const point=radarPoint(echo.x,echo.z);ctx.strokeStyle='#bb93d5';ctx.globalAlpha=.35+.3*Math.sin(echo.age*5)**2;
            ctx.beginPath();ctx.arc(point.x,point.y,4,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
        }
        // All live targets appear, including targets outside the searchlight.
        for (const enemy of game.enemies) {
            const point = radarPoint(enemy.x, enemy.z);
            const close = Math.hypot(enemy.x, enemy.z) < 18;
            const color=enemy.kind==='repair'?'#86e6a8':enemy.kind==='shield'?'#73dcec':enemy.kind==='decoy'?'#c498ea':close?'#ff7367':'#ed9d89';
            ctx.fillStyle=color;ctx.strokeStyle=color;
            if (close) {
                ctx.globalAlpha = .4; ctx.beginPath();
                ctx.arc(point.x, point.y, 7 + Math.sin(enemy.age * 6), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
            }
            ctx.beginPath();
            if(enemy.kind==='repair'){ctx.rect(point.x-1.5,point.y-5,3,10);ctx.rect(point.x-5,point.y-1.5,10,3);}else if(enemy.kind==='shield'){for(let i=0;i<6;i++){const a=i*Math.PI/3;i?ctx.lineTo(point.x+Math.cos(a)*5,point.y+Math.sin(a)*5):ctx.moveTo(point.x+Math.cos(a)*5,point.y+Math.sin(a)*5);}ctx.closePath();}else if(enemy.kind==='decoy'){ctx.moveTo(point.x,point.y-5);ctx.lineTo(point.x+5,point.y+4);ctx.lineTo(point.x-5,point.y+4);ctx.closePath();}else if (enemy.kind === 'boss'){ctx.rect(point.x-6,point.y-6,12,12);} else if (enemy.kind === 'heavy') {
                ctx.moveTo(point.x, point.y - 4.5); ctx.lineTo(point.x + 4.5, point.y);
                ctx.lineTo(point.x, point.y + 4.5); ctx.lineTo(point.x - 4.5, point.y); ctx.closePath();
            } else ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
            ctx.fill();
            if (enemy.kind === 'armored') { ctx.beginPath(); ctx.arc(point.x, point.y, 5.5, 0, Math.PI * 2); ctx.stroke(); }
        }

        ctx.setLineDash([2, 3]); ctx.strokeStyle = '#78909f';
        ctx.beginPath(); ctx.arc(CENTER, CENTER, BREACH_RADIUS * SCALE, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#dce8ee'; ctx.fillRect(CENTER - 3.5, CENTER - 3.5, 7, 7);
        ctx.fillStyle = '#a9c0cf'; ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('N', CENTER, 8); ctx.fillText('S', CENTER, 153); ctx.fillText('E', 153, CENTER); ctx.fillText('W', 7, CENTER);
        const threat = game.threat;
        if (threat) {
            const angle = Math.atan2(threat.enemy.x,threat.enemy.z)-Math.PI/2;
            ctx.strokeStyle='#ff8876';ctx.lineWidth=3;ctx.globalAlpha=.65+.35*Math.sin(threat.enemy.age*7)**2;
            ctx.beginPath();ctx.arc(CENTER,CENTER,RADIUS+4,angle-.18,angle+.18);ctx.stroke();ctx.globalAlpha=1;
        }
    }
}
