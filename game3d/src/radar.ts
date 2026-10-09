import { SPAWN_RADIUS, BREACH_RADIUS, type Siege } from './model.ts';

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
        ctx.beginPath(); ctx.moveTo(CENTER - RADIUS, CENTER); ctx.lineTo(CENTER + RADIUS, CENTER);
        ctx.moveTo(CENTER, CENTER - RADIUS); ctx.lineTo(CENTER, CENTER + RADIUS); ctx.stroke();

        const sector = radarSector(game.yaw, game.beam);
        ctx.fillStyle = 'rgba(234,200,136,.18)'; ctx.strokeStyle = '#eac888'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(CENTER, CENTER);
        ctx.arc(CENTER, CENTER, RADIUS, sector.start, sector.end); ctx.closePath(); ctx.fill(); ctx.stroke();
        const heading = radarPoint(Math.sin(game.yaw) * (SPAWN_RADIUS + 4), Math.cos(game.yaw) * (SPAWN_RADIUS + 4));
        ctx.strokeStyle = '#f3dba6'; ctx.beginPath(); ctx.moveTo(CENTER, CENTER); ctx.lineTo(heading.x, heading.y); ctx.stroke();

        // All live targets appear, including targets outside the searchlight.
        for (const enemy of game.enemies) {
            const point = radarPoint(enemy.x, enemy.z);
            const close = Math.hypot(enemy.x, enemy.z) < 18;
            ctx.fillStyle = close ? '#ff7367' : '#ed9d89';
            ctx.strokeStyle = close ? '#ff7367' : '#ed9d89';
            if (close) {
                ctx.globalAlpha = .4; ctx.beginPath();
                ctx.arc(point.x, point.y, 7 + Math.sin(enemy.age * 6), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
            }
            ctx.beginPath();
            if (enemy.kind === 'heavy') {
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
    }
}
