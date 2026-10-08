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
assert.equal(boot(true).t.state.highScores.length,0);
storage.set('castle-defense-scores-v1','broken json');assert.equal(boot().t.state.highScores.length,0);
storage.set('castle-defense-scores-v1','[{"name":"bad"}]');assert.equal(boot().t.state.highScores.length,0);
console.log('PASS: script syntax, start, touch rotation/fire and bullet limit, blur reset, frozen death time/state, name input, escaped names, persistent/blocked/corrupt storage.');
