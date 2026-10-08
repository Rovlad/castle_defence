const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
const storage = new Map();
function boot(blockStorage = false) {
    let now = 100000;
    const events = {};
    const ctx = new Proxy({}, {get: (_, key) => key === 'createRadialGradient' ? () => ({addColorStop(){}}) : () => {}});
    class Element {
        constructor() { this.style = {}; this.value = ''; this.textContent = ''; this.innerHTML = ''; this.listeners = {}; }
        addEventListener(type, fn) { this.listeners[type] = fn; }
        focus() {}
        setPointerCapture() {}
    }
    class Input extends Element {}
    class Button extends Element {}
    const elements = {};
    for (const [, id] of html.matchAll(/id="([^"]+)"/g)) elements[id] = id === 'playerName' ? new Input() : /Btn$/.test(id) ? new Button() : new Element();
    elements.gameCanvas.width = elements.gameCanvas.height = 800;
    elements.gameCanvas.getContext = () => ctx;
    const sandbox = {console: {log(){},error(){}}, Math, Date: class extends Date {static now(){ return now; }},
        HTMLInputElement: Input, HTMLButtonElement: Button, alert(){}, requestAnimationFrame(){},
        localStorage: {getItem(k){if(blockStorage)throw Error();return storage.get(k)||null;},setItem(k,v){if(blockStorage)throw Error();storage.set(k,v);}},
        document: {getElementById: id => elements[id],addEventListener: (type, fn) => {events[type] = fn;}},
        window: {addEventListener: (type, fn) => {events[type] = fn;}}};
    sandbox.document.createElement = () => ({width:800,height:800,getContext:()=>ctx});
    vm.createContext(sandbox);
    const instrumented = script.replace('        // Start game loop', '        window.test = {get state(){return gameState;}, keys, startGame, updateGame, saveScore, resetToStartScreen, showNameEntry, Monster};\n        // Start game loop');
    vm.runInContext(instrumented, sandbox);
    events.DOMContentLoaded();
    return {t:sandbox.window.test, elements, events, advance(ms){now+=ms;}, key(code,target){let prevented=false;events.keydown({code,target,repeat:false,preventDefault(){prevented=true;}});return prevented;}};
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
for(let i=0;i<30;i++){combat.advance(33);combat.t.updateGame();}
assert.equal(combat.t.state.particles.length,0);
assert.equal(boot(true).t.state.highScores.length,0);
storage.set('castle-defense-scores-v1','broken json');assert.equal(boot().t.state.highScores.length,0);
storage.set('castle-defense-scores-v1','[{"name":"bad"}]');assert.equal(boot().t.state.highScores.length,0);
console.log('PASS: syntax, touch controls, bullet limit, input reset, three distinct breaches, frozen final death time/state, score storage/escaping, reset health/effects, 2.5s opening, enemy reveal fade/tiers, collision kills and effect cleanup.');

