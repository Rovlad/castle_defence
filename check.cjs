const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
const storage = new Map();
(async () => {
function boot(blockStorage = false, withAudio = false) {
    let now = 100000;
    const events = {};
    const ctx = new Proxy({}, {get: (_, key) => key === 'createRadialGradient' ? () => ({addColorStop(){}}) : () => {}});
    class Element {
        constructor() { this.style = {}; this.value = ''; this.textContent = ''; this.innerHTML = ''; this.listeners = {}; }
        addEventListener(type, fn) { this.listeners[type] = fn; }
        focus() { sandbox.document.activeElement = this; }
        setPointerCapture() {}
        setAttribute() {}
        showModal() { this.open = true; }
        close() { const wasOpen = this.open; this.open = false; if (wasOpen) this.listeners.close?.(); }
    }
    class Input extends Element {}
    class Button extends Element {}
    const elements = {};
    for (const [, id] of html.matchAll(/id="([^"]+)"/g)) elements[id] = id === 'playerName' ? new Input() : /Btn$/.test(id) ? new Button() : new Element();
    elements.gameCanvas.width = elements.gameCanvas.height = 800;
    elements.gameCanvas.getContext = () => ctx;
    elements.radarCanvas.getContext = () => ctx;
    const sandbox = {console: {log(){},error(){}}, Math, Date: class extends Date {static now(){ return now; }},
        HTMLInputElement: Input, HTMLButtonElement: Button, alert(){}, requestAnimationFrame(){},
        localStorage: {getItem(k){if(blockStorage)throw Error();return storage.get(k)||null;},setItem(k,v){if(blockStorage)throw Error();storage.set(k,v);}},
        navigator: {audioSession:{type:'ambient'}},
        document: {getElementById: id => elements[id],addEventListener: (type, fn) => {events[type] = fn;}},
        window: {addEventListener: (type, fn) => {events[type] = fn;}}};
    sandbox.document.createElement = () => ({width:800,height:800,getContext:()=>ctx});
    const audio = {started:0, resumed:0, suspended:0, disconnected:0, pans:[], oscillators:[], gains:[], contexts:[]};
    if (withAudio) {
        const param = () => ({value:0,setValueAtTime(value){this.value=value;},exponentialRampToValueAtTime(){}});
        const node = () => ({connect(){},disconnect(){audio.disconnected++;}});
        sandbox.window.AudioContext = class {
            constructor(){this.state='running';this.currentTime=0;this.destination={};audio.contexts.push(this);}
            resume(){this.state='running';audio.resumed++;return Promise.resolve();}
            suspend(){this.state='suspended';audio.suspended++;return Promise.resolve();}
            createGain(){const gain={...node(),gain:param()};audio.gains.push(gain);return gain;}
            createStereoPanner(){const p={...node(),pan:param()};audio.pans.push(p);return p;}
            createOscillator(){const osc={...node(),frequency:param(),start(){audio.started++;},stop(){}};audio.oscillators.push(osc);return osc;}
        };
    }
    vm.createContext(sandbox);
    const instrumented = script.replace('        // Start game loop', '        window.test = {get state(){return gameState;}, keys, startGame, updateGame, saveScore, resetToStartScreen, showNameEntry, Monster, finishWave, chooseUpgrade, nextWave, updateBreak, playSound, breachThreat, explodeDrone, updateEffects, drawRadar};\n        // Start game loop');
    vm.runInContext(instrumented, sandbox);
    events.DOMContentLoaded();
    return {t:sandbox.window.test, elements, events, sandbox, audio, advance(ms){now+=ms;}, key(code,target){let prevented=false;events.keydown({code,target,repeat:false,preventDefault(){prevented=true;}});return prevented;},
        pressSpace(target=sandbox.document.activeElement) {
            let downPrevented=false,upPrevented=false;
            events.keydown({code:'Space',target,repeat:false,preventDefault(){downPrevented=true;}});
            events.keyup({code:'Space',target,preventDefault(){upPrevented=true;}});
            // Native button activation occurs on Space release unless its default is cancelled.
            if (target instanceof Button && !target.disabled && !downPrevented && !upPrevented) target.listeners.click?.();
        }};
}
const g = boot();
g.elements.startBtn.listeners.click();
assert(g.t.state.gameStarted);
g.elements.rotateLeftBtn.listeners.pointerdown({pointerId:1,preventDefault(){}});
g.advance(16); g.t.updateGame();
assert(g.t.state.beamAngle < -Math.PI/2);
g.events.blur(); assert.equal(g.t.keys.ArrowLeft,false);
for(let i=0;i<4;i++)g.elements.fireBtn.listeners.click();
assert.equal(g.t.state.bullets.length,3);
g.advance(12345);
const monster = new g.t.Monster(); monster.x=400;monster.y=400;monster.update(.016);
assert.equal(g.t.state.health,2);
assert.equal(g.t.state.blinkingPhase,false);
monster.update(.016);assert.equal(g.t.state.health,2); // A breach cannot damage twice.
const second = new g.t.Monster();second.x=400;second.y=400;second.update(.016);
assert.equal(g.t.state.health,1);assert.equal(g.t.state.blinkingPhase,false);
const third = new g.t.Monster();third.x=400;third.y=400;third.update(.016);
assert.equal(g.t.state.health,0);assert(g.t.state.blinkingPhase);
assert.equal(g.t.state.survivalTime,12);
g.advance(5000);g.t.updateGame();assert(g.t.state.gameOver);
const x = g.t.state.bullets[0].x;
g.advance(20000);g.t.updateGame();assert.equal(g.t.state.bullets[0].x,x);
g.t.showNameEntry();
assert.equal(g.key('Space',g.elements.playerName),false);
g.elements.playerName.value='<b> A B';
g.advance(30000);g.t.saveScore();
assert.equal(g.t.state.highScores[0].time,12);
assert(g.elements.scoresList.innerHTML.includes('&lt;b&gt; A B'));
assert(!g.elements.scoresList.innerHTML.includes('<b> A B'));
assert.equal(boot().t.state.highScores.length,1);
assert.equal(g.t.state.health,3);
assert.equal(g.t.state.particles.length,0);
const opening = boot();opening.t.startGame();opening.advance(2400);opening.t.updateGame();
assert.equal(opening.t.state.monsters.length,0);
opening.advance(150);opening.t.updateGame();
assert.equal(opening.t.state.monsters.length,1);
assert(opening.t.state.monsters[0].visible);
assert.equal(opening.t.state.firstSpawn,false);
// Settings pauses combat without consuming survival time or losing firing on return.
const settings=boot();settings.t.startGame();
settings.advance(1000);settings.t.updateGame();
settings.elements.settingsBtn.listeners.click();
assert(settings.t.state.settingsOpen);assert(settings.elements.settingsDialog.open);
const settingsStart=settings.t.state.gameStartTime;
settings.elements.fireBtn.listeners.click();assert.equal(settings.t.state.bullets.length,0);
settings.advance(15000);settings.t.updateGame();assert.equal(settings.t.state.waveSpawned,0);
settings.elements.closeSettingsBtn.listeners.click();
assert.equal(settings.t.state.settingsOpen,false);assert.equal(settings.elements.settingsDialog.open,false);
assert.equal(settings.t.state.gameStartTime,settingsStart+15000);
assert.equal(settings.elements.waveTime.textContent,'0:01');
settings.pressSpace();assert.equal(settings.t.state.bullets.length,1);
// Background time inside Settings is excluded once, not once per pause mechanism.
settings.elements.settingsBtn.listeners.click();settings.advance(2000);
settings.sandbox.document.hidden=true;settings.events.visibilitychange();settings.advance(10000);
settings.sandbox.document.hidden=false;settings.events.visibilitychange();settings.advance(2000);
settings.elements.closeSettingsBtn.listeners.click();
assert.equal(settings.sandbox.Date.now()-settings.t.state.gameStartTime,1000);
settings.elements.settingsBtn.listeners.click();settings.elements.settingsDialog.close();
assert.equal(settings.t.state.settingsOpen,false,'Native dialog close restores gameplay');
opening.t.state.beamAngle += Math.PI;
opening.advance(33);opening.t.updateGame();
assert(opening.t.state.monsters[0].reveal > 0); // Brief fade after the beam moves away.
for(let i=0;i<12;i++){opening.advance(33);opening.t.updateGame();}
assert.equal(opening.t.state.monsters[0].reveal,0);
opening.t.state.level=3;opening.t.state.monsterCount=1;
assert.equal(new opening.t.Monster().monsterType,'armored');
opening.t.state.level=5;opening.t.state.monsterCount=2;
const heavy = new opening.t.Monster();assert.equal(heavy.monsterType,'heavy');assert.equal(heavy.radius,22);
// A stationary target in the bullet path is killed once and emits bounded particles.
const combat = boot();combat.t.startGame();
const target = new combat.t.Monster();target.x=400;target.y=320;target.speed=0;target.hp=1;
combat.t.state.monsters=[target];combat.elements.fireBtn.listeners.click();
assert(combat.t.state.muzzleFlash > 0);
combat.advance(16);combat.t.updateGame();
assert.equal(combat.t.state.kills,1);assert.equal(combat.t.state.monsters.length,0);
assert.equal(combat.t.state.bullets.length,0);assert(combat.t.state.particles.length>0);
for(let i=0;i<40;i++){combat.advance(33);combat.t.updateGame();}
assert.equal(combat.t.state.particles.length,0);
const waves = boot(); waves.t.startGame();
for(let i=0;i<5;i++) {
    waves.advance(2700); waves.t.updateGame();
    assert.equal(waves.t.state.waveSpawned,i+1);
    assert.equal(waves.t.state.phase,'combat'); // Wave is not cleared while any enemy remains.
    waves.t.state.monsters=[];
}
waves.t.state.health=1;
waves.advance(16);waves.t.updateGame();
assert.equal(waves.t.state.phase,'intermission');assert.equal(waves.t.state.health,2);
assert.equal(waves.elements.waveResolved.textContent,'5 / 5');
assert.equal(waves.elements.waveProgress.value,5);
assert.equal(waves.elements.nextArrival.textContent,'—');
const displayedWaveTime=waves.elements.waveTime.textContent;
assert.equal(waves.t.state.bullets.length,0);
const clearedAt = waves.sandbox.Date.now();
const combatTime = clearedAt-waves.t.state.gameStartTime;
waves.elements.fireBtn.listeners.click();assert.equal(waves.t.state.bullets.length,0);
waves.t.nextWave();assert.equal(waves.t.state.level,1);
assert.equal(waves.t.state.points,20);waves.t.chooseUpgrade('ammo');assert.equal(waves.t.state.bulletLimit,3,'Unaffordable upgrade rejected');
waves.t.state.points=80;waves.t.chooseUpgrade('ammo');assert.equal(waves.t.state.bulletLimit,4);assert.equal(waves.t.state.points,30);
const beamBefore=waves.t.state.beamWidth;waves.t.chooseUpgrade('beam');assert(waves.t.state.beamWidth>beamBefore,'Multiple affordable purchases allowed');assert.equal(waves.t.state.points,0);
waves.t.nextWave();assert.equal(waves.t.state.phase,'intermission');
waves.advance(4200);waves.t.updateGame();assert.equal(waves.elements.nextWaveBtn.disabled,false);
assert.equal(waves.elements.waveTime.textContent,displayedWaveTime,'Wave timer freezes in resupply');
waves.advance(10000);waves.t.nextWave();
assert.equal(waves.elements.waveTime.textContent,'0:00');
assert.equal(waves.elements.waveResolved.textContent,'0 / 7');
assert.equal(waves.elements.nextArrival.textContent,'0:03');
assert.equal(waves.sandbox.document.activeElement,waves.elements.fireBtn);
waves.pressSpace();
assert.equal(waves.t.state.bullets.length,1,'Space must fire after nextWave focuses the Fire button');
waves.pressSpace();assert.equal(waves.t.state.bullets.length,2,'Each key press should fire exactly once');
waves.elements.fireBtn.listeners.click();assert.equal(waves.t.state.bullets.length,3,'Touch/click firing still works after a wave transition');
waves.t.state.bullets=[];
assert.equal(waves.t.state.level,2);assert.equal(waves.t.state.waveSize,7);
assert.equal(waves.t.state.waveSpawned,0);assert.equal(waves.t.state.phase,'combat');
assert.equal(waves.sandbox.Date.now()-waves.t.state.gameStartTime,combatTime);
for(let i=0;i<5;i++)waves.elements.fireBtn.listeners.click();assert.equal(waves.t.state.bullets.length,4);
waves.t.state.bullets=[];
for(let i=0;i<5;i++)waves.pressSpace();assert.equal(waves.t.state.bullets.length,4,'Keyboard firing honors the upgraded ammunition limit');
// Visibility pause excludes background time and prevents a spawn jump.
const spawnBefore=waves.t.state.lastSpawnTime;
waves.sandbox.document.hidden=true;waves.events.visibilitychange();
waves.advance(30000);waves.t.updateGame();assert.equal(waves.t.state.waveSpawned,0);
waves.sandbox.document.hidden=false;waves.events.visibilitychange();
assert.equal(waves.t.state.lastSpawnTime,spawnBefore+30000);
waves.t.updateGame();assert.equal(waves.elements.waveTime.textContent,'0:00','Wave timer excludes hidden-page pause');
assert.equal(waves.sandbox.Date.now()-waves.t.state.gameStartTime,combatTime);
// Upgrade maxima do not soft-lock a completed run.
waves.t.state.beamWidth=Math.PI/2;waves.t.state.rotationSpeed=5.4;waves.t.state.bulletLimit=6;
waves.t.finishWave();assert.equal(waves.elements.beamUpgradeBtn.disabled,true);
waves.advance(4100);waves.t.nextWave();assert.equal(waves.t.state.level,3);
waves.t.resetToStartScreen();assert.equal(waves.t.state.bulletLimit,3);assert.equal(waves.t.state.rotationSpeed,3);
assert.equal(waves.t.state.phase,'combat');assert.equal(waves.t.state.waveSpawned,0);
// Each upgrade is bounded and can be bought up to its cap.
for(const kind of ['beam','rotation','ammo']) {
    const u=boot();u.t.startGame();u.t.finishWave();u.t.state.points=1000;
    u.t.state.beamWidth=Math.PI/2-Math.PI/36;
    u.t.state.rotationSpeed=5.0;u.t.state.bulletLimit=5;
    u.t.chooseUpgrade(kind);
    assert.equal(kind==='beam'?u.t.state.beamWidth:kind==='rotation'?u.t.state.rotationSpeed:u.t.state.bulletLimit,
        kind==='beam'?Math.PI/2:kind==='rotation'?5.4:6);
}
assert.equal(combat.t.state.points,10,'Scout kill awards points');
assert.equal(combat.t.state.earnedPoints,10,'Earned total excludes spending');
for(const [kind,reward] of [['armored',20],['heavy',30]]){
    const tier=boot();tier.t.startGame();const drone=new tier.t.Monster();drone.monsterType=kind;drone.hp=1;drone.x=400;drone.y=320;drone.speed=0;
    tier.t.state.monsters=[drone];tier.elements.fireBtn.listeners.click();tier.advance(16);tier.t.updateGame();assert.equal(tier.t.state.points,reward,'Tier kill awards correct points');
    tier.advance(16);tier.t.updateGame();assert.equal(tier.t.state.points,reward,'Dead drones do not award twice');
}

const shop=boot();shop.t.startGame();shop.t.finishWave();assert.equal(shop.t.state.points,20);
shop.t.finishWave();assert.equal(shop.t.state.points,20,'Wave reward cannot repeat');
shop.advance(4100);shop.t.nextWave();assert.equal(shop.t.state.level,2,'Can save points and skip purchases');
shop.t.finishWave();shop.t.state.points=1000;
for(let i=0;i<5;i++)shop.t.chooseUpgrade('ammo');assert.equal(shop.t.state.bulletLimit,6);assert.equal(shop.t.state.points,850,'Capped purchases deduct only successful prices');
shop.t.resetToStartScreen();assert.equal(shop.t.state.points,0);assert.equal(shop.t.state.earnedPoints,0);
const radar=boot();radar.t.startGame();
const near=new radar.t.Monster();near.x=500;near.y=400;near.speed=1;near.reveal=0;
const urgent=new radar.t.Monster();urgent.x=400;urgent.y=250;urgent.speed=4;urgent.monsterType='heavy';
radar.t.state.monsters=[near,urgent];radar.t.state.beamAngle=Math.PI/2;
assert.equal(radar.t.breachThreat().drone,urgent,'Warning prioritizes breach time instead of distance');
radar.t.updateGame();assert.equal(radar.elements.breachWarning.hidden,false);assert(radar.elements.breachWarning.textContent.includes('behind'));
radar.t.drawRadar();assert.equal(radar.elements.radarCount.textContent,'2 targets','Hidden drones remain on radar');
radar.t.state.monsters=[];radar.t.updateGame();assert.equal(radar.elements.breachWarning.hidden,true,'Warning clears when threat disappears');
const effects=boot();effects.t.startGame();const damaged=new effects.t.Monster();damaged.hp=1;damaged.maxHp=2;damaged.reveal=1;damaged.x=600;damaged.y=400;damaged.speed=0;damaged.update(.2);
assert(effects.t.state.particles.some(p=>p.kind==='smoke'),'Damaged visible drones emit smoke');
for(let i=0;i<20;i++)effects.t.explodeDrone(damaged);
assert(effects.t.state.particles.length<=160&&effects.t.state.particles.some(p=>p.kind==='debris'),'Explosion effects share a bounded budget');
effects.t.updateEffects(2);assert.equal(effects.t.state.particles.length,0,'Smoke and debris expire');
const alerts=boot(false,true);alerts.t.startGame();const threatDrone=new alerts.t.Monster();threatDrone.x=500;threatDrone.y=400;threatDrone.speed=0;alerts.t.state.monsters=[threatDrone];
alerts.advance(250);alerts.t.updateGame();assert.equal(alerts.audio.oscillators.filter(o=>o.frequency.value===680).length,1,'Nearby threat emits warning audio');
alerts.advance(250);alerts.t.updateGame();assert.equal(alerts.audio.oscillators.filter(o=>o.frequency.value===680).length,1,'Alert audio is rate limited');
alerts.sandbox.document.hidden=true;alerts.advance(2000);alerts.t.updateGame();assert.equal(alerts.audio.oscillators.filter(o=>o.frequency.value===680).length,1,'Background tabs emit no alerts');
console.log('PASS: points rewards and purchases, optional continuation, caps, radar warnings, damaged smoke and bounded explosions.');
// Audio is unlocked by start, bounded, panned, muted, persisted and suspended while hidden.
const droneSound=boot(false,true);droneSound.t.startGame();
const distantDrone=new droneSound.t.Monster();distantDrone.x=700;distantDrone.y=400;distantDrone.speed=0;
droneSound.t.state.monsters=[distantDrone];droneSound.t.state.waveSpawned=1;
droneSound.advance(250);droneSound.t.updateGame();
assert.equal(droneSound.audio.started,1,'Drone beyond the former 220px sound radius emits rotor audio');
const farGain=droneSound.audio.gains.at(-1).gain.value;
droneSound.advance(100);droneSound.t.updateGame();assert.equal(droneSound.audio.started,1,'Rotor sound respects its cadence');
distantDrone.x=500;droneSound.advance(250);droneSound.t.updateGame();
const rotorIndex=droneSound.audio.oscillators.findLastIndex(osc=>osc.frequency.value===180);
assert(droneSound.audio.gains[rotorIndex+1].gain.value>farGain,'Drone audio grows louder toward the tower');
assert(droneSound.audio.pans.at(-1).pan.value>0,'Drone audio pans toward its position');
console.log('PASS: distant drone rotor audio, cadence, approach volume and directional panning.');
const sound=boot(false,true);sound.t.startGame();assert.equal(sound.audio.resumed,1);
sound.elements.fireBtn.listeners.click();assert.equal(sound.audio.started,1);
sound.t.playSound('drone',-.7);assert.equal(sound.audio.pans.at(-1).pan.value,-.7);
assert.equal(sound.audio.oscillators.at(-1).type,'sawtooth');assert.equal(sound.audio.oscillators.at(-1).frequency.value,180,'Rotor buzz uses an audible pitch');
for(let i=0;i<30;i++)sound.t.playSound('shot');assert.equal(sound.audio.started,12);
for(const osc of sound.audio.oscillators)osc.onended();assert.equal(sound.audio.disconnected,36);
sound.t.playSound('armor');assert.equal(sound.audio.started,13);
sound.elements.soundBtn.listeners.click();sound.t.playSound('breach');assert.equal(sound.audio.started,13);
assert.equal(sound.audio.gains[0].gain.value,0);assert.equal(storage.get('castle-defense-muted'),'true');
assert.equal(boot().elements.soundBtn.textContent,'Sound off');
sound.elements.soundBtn.listeners.click();assert.equal(sound.audio.gains[0].gain.value,.18);
sound.sandbox.document.hidden=true;sound.events.visibilitychange();assert.equal(sound.audio.suspended,1);
sound.t.playSound('drone');assert.equal(sound.audio.started,13);
sound.sandbox.document.hidden=false;sound.events.visibilitychange();assert.equal(sound.audio.resumed,4);
assert.equal(sound.sandbox.navigator.audioSession.type,'playback','Use the media session instead of iOS ambient audio');
const interrupted=sound.audio.contexts[0];interrupted.state='interrupted';interrupted.onstatechange();
assert(sound.elements.soundStatus.textContent.includes('Test sound'));
const resumedBefore=sound.audio.resumed;sound.elements.fireBtn.listeners.click();
assert.equal(sound.audio.resumed,resumedBefore+1);assert.equal(interrupted.state,'running');
sound.elements.soundBtn.listeners.click();assert.equal(storage.get('castle-defense-muted'),'true');
const beforeTest=sound.audio.started;
await sound.elements.testSoundBtn.listeners.click();
assert.equal(storage.get('castle-defense-muted'),'false');assert.equal(sound.audio.started,beforeTest+2);
assert(sound.elements.soundStatus.textContent.includes('Test chime'));
// Do not attempt the chime until asynchronous resume completes.
interrupted.state='suspended';let finishResume;
interrupted.resume=()=>new Promise(resolve=>{finishResume=()=>{interrupted.state='running';resolve();};});
const pendingTest=sound.elements.testSoundBtn.listeners.click();
const pendingVoices=sound.audio.started;
await Promise.resolve();assert.equal(sound.audio.started,pendingVoices);
finishResume();await pendingTest;assert.equal(sound.audio.started,pendingVoices+2);
interrupted.state='interrupted';interrupted.resume=()=>Promise.reject(Error('blocked'));
const blockedVoices=sound.audio.started;await sound.elements.testSoundBtn.listeners.click();
assert.equal(sound.audio.started,blockedVoices);assert(sound.elements.soundStatus.textContent.includes('Tap Test sound'));
interrupted.state='closed';await sound.elements.testSoundBtn.listeners.click();
assert.equal(sound.audio.contexts.length,2,'Recreate a closed context');
// A denied audio session setting should still leave normal Web Audio usable.
const denied=boot(false,true);
Object.defineProperty(denied.sandbox.navigator.audioSession,'type',{set(){throw Error('denied');}});
denied.t.startGame();assert.equal(denied.audio.contexts.length,1);
const unsupported=boot();assert.equal(unsupported.elements.testSoundBtn.disabled,true);
assert.equal(boot(true).t.state.highScores.length,0);
storage.set('castle-defense-scores-v1','broken json');assert.equal(boot().t.state.highScores.length,0);
storage.set('castle-defense-scores-v1','[{"name":"bad"}]');assert.equal(boot().t.state.highScores.length,0);
console.log('PASS: existing controls/combat/scoring plus finite waves, survivor gating, repairs, break/choice gating, paid capped upgrades, expanded ammo, reset, pause accounting, bounded/panned audio, mute persistence and hidden-page audio suspension.');
console.log('PASS: iOS playback session, gesture retry after interruption, unmute/test chime, async/denied resume, closed-context recovery, unsupported audio and denied session setting.');
})().catch(error => { console.error(error);process.exitCode=1; });






