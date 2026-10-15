export class AimSmoother {
    private x = 0;
    private y = 0;
    add(x: number, y: number) { this.x += x; this.y += y; }
    take(dt: number) {
        const fraction = 1 - Math.exp(-Math.max(0, dt) / .025);
        const result = { x: this.x * fraction, y: this.y * fraction };
        this.x -= result.x; this.y -= result.y;
        return result;
    }
    flush() { const result = { x: this.x, y: this.y }; this.clear(); return result; }
    clear() { this.x = this.y = 0; }
}

export class RotationWheel {
    private angle:number|null=null;
    private position:{x:number;y:number}|null=null;
    reset(){this.angle=null;this.position=null;}
    move(x:number,y:number){
        // Crossing the hub must not produce a half-turn jump.
        if(Math.hypot(x,y)<16){this.reset();return 0;}
        const last=this.position;
        const angle=Math.atan2(y,x),previous=this.angle;
        this.angle=angle;this.position={x,y};
        if(last){
            // Events may skip over the hub: test the whole segment, not just its endpoints.
            const dx=x-last.x,dy=y-last.y,lengthSquared=dx*dx+dy*dy;
            const t=lengthSquared>0?Math.max(0,Math.min(1,-(last.x*dx+last.y*dy)/lengthSquared)):0;
            if(Math.hypot(last.x+t*dx,last.y+t*dy)<=16)return 0;
        }
        if(previous===null)return 0;
        return Math.atan2(Math.sin(angle-previous),Math.cos(angle-previous));
    }
}
