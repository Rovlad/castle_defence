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
    reset(){this.angle=null;}
    move(x:number,y:number){
        // Crossing the hub must not produce a half-turn jump.
        if(Math.hypot(x,y)<16){this.reset();return 0;}
        const angle=Math.atan2(y,x),previous=this.angle;this.angle=angle;
        if(previous===null)return 0;
        return Math.atan2(Math.sin(angle-previous),Math.cos(angle-previous));
    }
}
