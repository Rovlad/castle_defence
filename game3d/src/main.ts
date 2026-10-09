import './style.css';
import { Arena } from './arena';
import { Siege, type Upgrade } from './model';
import { GameAudio } from './audio';
import { Radar } from './radar';

const el = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id) as T;
const canvas = el<HTMLCanvasElement>('world');
const radarCanvas = el<HTMLCanvasElement>('radarCanvas');
const radar = new Radar(radarCanvas);
const settings = el<HTMLDialogElement>('settings'),resupply = el<HTMLDialogElement>('resupply'),defeat = el<HTMLDialogElement>('defeat');
let game = new Siege(), arena: Arena | null = null;
const audio = new GameAudio();
let lastTime = performance.now(), sensitivity = 1, toastUntil = 0, hitUntil = 0, damageUntil = 0, lastStep = 0;
const held = {left:false,right:false,up:false,down:false,fire:false};
let drag: {id:number;x:number;y:number;distance:number} | null = null;
let best: {wave:number;kills:number;time:number}|null = null;
try {
    const stored=JSON.parse(localStorage.getItem('night-siege-3d-best')||'null');
    if(stored && Number.isInteger(stored.wave)&&stored.wave>0&&Number.isInteger(stored.kills)&&stored.kills>=0&&Number.isFinite(stored.time)&&stored.time>=0)best=stored;
    sensitivity = Math.max(.5,Math.min(2,Number(localStorage.getItem('night-siege-3d-sensitivity'))||1));
} catch {}
el<HTMLInputElement>('sensitivity').value=String(sensitivity);
function formatTime(seconds:number){const n=Math.floor(seconds);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}
function toast(message:string){el('toast').textContent=message;toastUntil=performance.now()+2200;}
function clearInput(){Object.keys(held).forEach(key=>held[key as keyof typeof held]=false);drag=null;}
function blocked(){return document.hidden||settings.open||game.phase!=='combat';}
function soundStatus(){
    el('soundBtn').textContent=audio.muted?'Sound off':'Sound on';
    el('soundBtn').setAttribute('aria-pressed',String(audio.muted));
    el('soundStatus').textContent=audio.muted?'Sound is muted.':'Tap Test sound. If silent, check media volume and connected headphones.';
}
function showBest(){el('best').textContent=best?`Best defence: wave ${best.wave} · ${best.kills} kills · ${formatTime(best.time)}`:'';}
function shoot(){
    if(blocked())return;
    const wasRunning=audio.context?.state==='running';
    const ready=audio.unlock();
    if(game.fire()){
        if(!wasRunning)void ready.then(ok=>{if(ok)audio.effect('shot');});
        consumeEvents();updateHud();
    } else if(game.bullets.length>=game.capacity)toast('All bullet slots are in flight');
}
function start(){
    if(!arena)return;
    clearInput();game.start();el('screen').classList.add('hidden');lastTime=performance.now();void audio.unlock();
    canvas.focus();toast('Stay at your gun. Sweep the darkness.');updateHud();
}
function saveBest(){
    const result={wave:game.wave,kills:game.kills,time:Math.floor(game.elapsed)};
    if(!best||result.wave>best.wave||(result.wave===best.wave&&(result.kills>best.kills||(result.kills===best.kills&&result.time<best.time)))){
        best=result;try{localStorage.setItem('night-siege-3d-best',JSON.stringify(best));}catch{}
    }
    showBest();
}
function updateHud(){
    el('wave').textContent=String(game.wave);el('health').textContent=`${game.health} / 3`;
    el('ammo').textContent=`${game.capacity-game.bullets.length} / ${game.capacity}`;
    el('progressText').textContent=`${game.resolved} / ${game.waveSize}`;
    el<HTMLProgressElement>('progress').max=game.waveSize;el<HTMLProgressElement>('progress').value=game.resolved;
    el('time').textContent=formatTime(game.waveElapsed);el('remaining').textContent=String(game.remaining);
    el('arrival').textContent=game.phase==='ready'?'Next in 2.5s':game.phase==='resupply'?'Resupplying':game.phase==='lost'?'Run ended':
        game.nextArrival===null?'All spawned':`Next in ${game.nextArrival.toFixed(1)}s`;
    const degrees=(Math.round(game.yaw*180/Math.PI)+360)%360,points=['N','NE','E','SE','S','SW','W','NW'];
    el('bearing').textContent=`${points[Math.round(degrees/45)%8]} · ${String(degrees).padStart(3,'0')}°`;
    el('radarTargets').textContent=`${game.enemies.length} ${game.enemies.length===1?'target':'targets'}`;
    radarCanvas.setAttribute('aria-label',`Radar: ${game.enemies.length} approaching targets. Searchlight bearing ${degrees} degrees. North is up.`);
    if(game.phase==='resupply'){
        const wait=Math.max(0,Math.ceil(4-game.resupplyElapsed));
        el<HTMLButtonElement>('nextBtn').disabled=!game.chosen||wait>0;
        el('resupplyStatus').textContent=wait>0?`Resupply: ${wait}s · ${game.chosen?'Upgrade equipped':'Choose one upgrade'}`:
            game.chosen?'Ready when you are.':'Choose an upgrade to continue.';
    }
}
function consumeEvents(){
    for(const event of game.drainEvents()){
        arena?.event(event);
        if(event.kind==='shot')audio.effect('shot');
        if(event.kind==='hit'){audio.effect('hit');hitUntil=performance.now()+110;}
        if(event.kind==='breach'){audio.effect('breach');damageUntil=performance.now()+550;toast(`${game.health} castle health remaining`);}
        if(event.kind==='clear'){
            clearInput();audio.effect('clear');el('waveTitle').textContent=`Wave ${game.wave} cleared`;
            el('repairText').textContent=`One castle health restored, up to three. Choose one upgrade for this run.`;
            document.querySelectorAll<HTMLButtonElement>('[data-upgrade]').forEach(button=>button.disabled=!game.canUpgrade(button.dataset.upgrade as Upgrade));
            if(game.chosen==='max')el('repairText').textContent='All upgrades at maximum. Resupply, then continue.';
            resupply.showModal();
        }
        if(event.kind==='lost'){
            clearInput();saveBest();el('result').textContent=`Wave ${game.wave} · ${game.kills} kills · ${formatTime(game.elapsed)} in combat`;
            defeat.showModal();
        }
    }
}
el('startBtn').addEventListener('click',start);
el('restartBtn').addEventListener('click',()=>{defeat.close();arena?.reset();game=new Siege();lastStep=0;start();});
el('nextBtn').addEventListener('click',()=>{if(game.nextWave()){resupply.close();clearInput();lastTime=performance.now();lastStep=game.elapsed;canvas.focus();void audio.unlock();toast(`Wave ${game.wave}`);updateHud();}});
document.querySelectorAll<HTMLButtonElement>('[data-upgrade]').forEach(button=>button.addEventListener('click',()=>{
    if(game.upgrade(button.dataset.upgrade as Upgrade)){
        audio.effect('clear');document.querySelectorAll<HTMLButtonElement>('[data-upgrade]').forEach(choice=>choice.disabled=true);
        toast('Upgrade equipped');updateHud();
    }
}));
resupply.addEventListener('cancel',event=>event.preventDefault());defeat.addEventListener('cancel',event=>event.preventDefault());
function openSettings(){clearInput();settings.showModal();soundStatus();}
el('settingsBtn').addEventListener('click',openSettings);el('startSettingsBtn').addEventListener('click',openSettings);
el('closeSettingsBtn').addEventListener('click',()=>{settings.close();canvas.focus();});
settings.addEventListener('close',()=>{clearInput();lastTime=performance.now();canvas.focus();});
el('soundBtn').addEventListener('click',()=>{audio.toggle();soundStatus();});
el('testSoundBtn').addEventListener('click',async()=>{
    if(audio.muted)audio.toggle();
    const ready=await audio.unlock();soundStatus();
    if(ready){audio.effect('clear');el('soundStatus').textContent='Test chime played. Check media volume if you cannot hear it.';}
    else el('soundStatus').textContent='Audio could not start. Try tapping Test sound again.';
});
el<HTMLInputElement>('sensitivity').addEventListener('input',event=>{
    sensitivity=Number((event.target as HTMLInputElement).value);try{localStorage.setItem('night-siege-3d-sensitivity',String(sensitivity));}catch{}
});
el<HTMLSelectElement>('quality').addEventListener('change',event=>arena?.setQuality((event.target as HTMLSelectElement).value));
canvas.tabIndex=0;
canvas.addEventListener('pointerdown',event=>{
    if(blocked()||drag)return;void audio.unlock();canvas.setPointerCapture(event.pointerId);
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,distance:0};
});
canvas.addEventListener('pointermove',event=>{
    if(blocked()||!drag||drag.id!==event.pointerId)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    drag.distance+=Math.abs(dx)+Math.abs(dy);drag.x=event.clientX;drag.y=event.clientY;
    const factor=(event.pointerType==='touch'?.006:.003)*sensitivity*(game.turnSpeed/1.4);
    game.aim(dx*factor,dy*factor);
});
canvas.addEventListener('pointerup',event=>{if(drag?.id===event.pointerId){const click=drag.distance<5&&event.pointerType==='mouse';drag=null;if(click)shoot();}});
canvas.addEventListener('pointercancel',()=>drag=null);canvas.addEventListener('lostpointercapture',()=>drag=null);
function bindHold(id:string,key:'left'|'right'|'fire'){
    const button=el(id);
    button.addEventListener('pointerdown',event=>{event.preventDefault();if(blocked())return;button.setPointerCapture(event.pointerId);held[key]=true;if(key==='fire')shoot();else void audio.unlock();});
    const release=()=>held[key]=false;
    button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
    if(key==='fire')button.addEventListener('click',()=>{if(!held.fire)shoot();});
}
bindHold('leftBtn','left');bindHold('rightBtn','right');bindHold('fireBtn','fire');
const keyMap:Record<string,'left'|'right'|'up'|'down'>={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
window.addEventListener('keydown',event=>{
    if(settings.open||resupply.open||defeat.open)return;
    if(event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement)return;
    if(event.target instanceof HTMLButtonElement && event.target!==el('fireBtn'))return;
    if(event.code==='Enter'&&game.phase==='ready'){event.preventDefault();start();return;}
    if(blocked())return;
    if(keyMap[event.code]){held[keyMap[event.code]]=true;event.preventDefault();}
    if(event.code==='Space'){event.preventDefault();held.fire=true;if(!event.repeat)shoot();}
});
window.addEventListener('keyup',event=>{if(keyMap[event.code])held[keyMap[event.code]]=false;if(event.code==='Space'){held.fire=false;if(event.target===el('fireBtn'))event.preventDefault();}});
window.addEventListener('blur',clearInput);
document.addEventListener('visibilitychange',()=>{clearInput();lastTime=performance.now();if(document.hidden)audio.suspend();else void audio.unlock();});
window.addEventListener('resize',()=>{arena?.engine.resize();radar.resize();});
soundStatus();showBest();updateHud();
try{
    arena=new Arena(canvas);
    el<HTMLButtonElement>('startBtn').disabled=false;el('startBtn').textContent='Take your position';
    const render=()=>{
        const now=performance.now(),dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;
        if(!document.hidden&&!settings.open){
            if(game.phase==='combat'){
                game.aim(((held.right?1:0)-(held.left?1:0))*game.turnSpeed*dt,((held.down?1:0)-(held.up?1:0))*game.turnSpeed*.45*dt);
                game.tick(dt);if(held.fire&&game.cooldown===0)shoot();consumeEvents();
                const nearest=game.enemies.reduce<{x:number;z:number;d:number}|null>((best,e)=>{const d=Math.hypot(e.x,e.z);return !best||d<best.d?{x:e.x,z:e.z,d}:best;},null);
                if(nearest&&nearest.d<28&&game.elapsed-lastStep>.5){audio.effect('step',Math.sin(Math.atan2(nearest.x,nearest.z)-game.yaw));lastStep=game.elapsed;}
            } else game.tick(dt);
        }
        arena!.update(game,document.hidden||settings.open?0:dt);arena!.render();radar.draw(game);updateHud();
        el('hitFlash').style.opacity=now<hitUntil?'1':'0';el('damageFlash').style.opacity=now<damageUntil?'1':'0';
        if(now>toastUntil)el('toast').textContent='';
    };
    arena.engine.runRenderLoop(render);
}catch(error){
    console.error(error);el('startBtn').textContent='3D is unavailable';
    el('screen').querySelector('.instructions')!.textContent='This browser could not start the 3D battlefield. Try Safari or Chrome with WebGL enabled, or play the original game.';
}
