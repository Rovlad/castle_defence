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

export class TurretRoller {
    private x:number|null=null;
    reset(){this.x=null;}
    move(x:number){
        const previous=this.x;this.x=x;
        return previous===null?0:(x-previous)*.012;
    }
}

export class DoubleTap {
    private previous:{x:number;y:number;time:number}|null=null;
    reset(){this.previous=null;}
    tap(x:number,y:number,time:number){
        const previous=this.previous;
        if(previous&&time>previous.time&&time-previous.time<=320&&Math.hypot(x-previous.x,y-previous.y)<=32){
            this.reset();return true;
        }
        this.previous={x,y,time};return false;
    }
}
