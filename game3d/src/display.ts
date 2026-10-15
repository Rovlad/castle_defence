// Babylon divides CSS dimensions by hardwareScalingLevel. More pixels need a smaller value.
export function hardwareScale(quality:string,dpr:number,mobile:boolean){
    const cap=quality==='low'?1:quality==='high'?2:mobile?1.5:1.7;
    return 1/Math.min(Math.max(1,dpr||1),cap);
}
