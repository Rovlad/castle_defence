export class GameAudio {
    context: AudioContext | null = null;
    master: GainNode | null = null;
    muted = false;
    private shotNoise: AudioBuffer | null = null;
    private voices = 0;
    private generation = 0;
    constructor() { try {this.muted = localStorage.getItem('night-siege-3d-muted') === 'true';} catch {} }
    async unlock() {
        if (this.muted || document.hidden) return false;
        try {
            const nav = navigator as Navigator & {audioSession?: {type:string}};
            try {if(nav.audioSession)nav.audioSession.type = 'playback';} catch {}
            const Audio = window.AudioContext || (window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
            if (!Audio) return false;
            if (!this.context || this.context.state === 'closed') {
                this.context = new Audio();this.master = this.context.createGain();
                this.master.gain.value = .2;this.master.connect(this.context.destination);this.generation++;this.voices = 0;this.shotNoise=null;
            }
            await this.context.resume();return this.context.state === 'running';
        } catch {return false;}
    }
    toggle() {
        this.muted = !this.muted;
        try {localStorage.setItem('night-siege-3d-muted',String(this.muted));} catch {}
        if(this.master && this.context)this.master.gain.setValueAtTime(this.muted?0:.2,this.context.currentTime);
        if(!this.muted)void this.unlock();
    }
    tone(frequency:number,duration:number,volume:number,type:OscillatorType='triangle',pan=0,end=frequency,rotor=false) {
        const ctx = this.context;
        if(this.muted || !ctx || ctx.state!=='running' || !this.master || document.hidden || this.voices>=18)return;
        const osc=ctx.createOscillator(),gain=ctx.createGain(),panner=ctx.createStereoPanner?.();
        const now=ctx.currentTime,generation=this.generation;
        osc.type=type;osc.frequency.setValueAtTime(frequency,now);osc.frequency.exponentialRampToValueAtTime(Math.max(1,end),now+duration);
        gain.gain.setValueAtTime(rotor?.001:volume,now);
        if(rotor){
            gain.gain.exponentialRampToValueAtTime(volume,now+.025);
            for(let t=.04;t<duration-.06;t+=.025){
                gain.gain.exponentialRampToValueAtTime(volume*.5,now+t);
                gain.gain.exponentialRampToValueAtTime(volume,now+t+.0125);
            }
        }
        gain.gain.exponentialRampToValueAtTime(.001,now+duration);
        osc.connect(gain);
        if(panner){panner.pan.value=pan;gain.connect(panner);panner.connect(this.master);}else gain.connect(this.master);
        this.voices++;osc.onended=()=>{if(generation===this.generation)this.voices--;osc.disconnect();gain.disconnect();panner?.disconnect();};
        osc.start();osc.stop(now+duration);
    }
    muzzleCrack() {
        const ctx=this.context;
        if(this.muted||!ctx||ctx.state!=='running'||!this.master||document.hidden||this.voices>=18)return;
        if(!this.shotNoise){
            this.shotNoise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.08),ctx.sampleRate);
            const samples=this.shotNoise.getChannelData(0);
            for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
        }
        const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
        const now=ctx.currentTime,generation=this.generation;
        source.buffer=this.shotNoise;
        filter.type='bandpass';filter.frequency.setValueAtTime(2200,now);filter.Q.value=.7;
        gain.gain.setValueAtTime(.55,now);gain.gain.exponentialRampToValueAtTime(.001,now+.075);
        source.connect(filter);filter.connect(gain);gain.connect(this.master);
        this.voices++;source.onended=()=>{if(generation===this.generation)this.voices--;source.disconnect();filter.disconnect();gain.disconnect();};
        source.start(now);source.stop(now+.08);
    }
    drone(pan:number,strength:number,pitch:number) {
        // Layer blade-pass buzz and electric motor whine; overlapping packets avoid beeps.
        this.tone(pitch,.32,.20*strength,'sawtooth',pan,pitch,true);
        this.tone(pitch*3.6,.32,.075*strength,'triangle',pan,pitch*3.55,true);
    }
    effect(kind:string,pan=0) {
        if(kind==='shot'){
            // A broadband muzzle snap over a low report and a short metallic bolt clack.
            this.muzzleCrack();
            this.tone(155,.10,.38,'triangle',0,42);
            this.tone(1500,.035,.07,'square',0,650);
        }
        else if(kind==='hit')this.tone(550,.12,.14,'square',pan,180);
        else if(kind==='breach')this.tone(130,.5,.28,'sawtooth',0,35);
        else if(kind==='warning')this.tone(920,.08,.10,'triangle',pan,720);
        else if(kind==='explosion')this.tone(85,.35,.32,'sawtooth',pan,25);
        else {this.tone(440,.28,.16,'sine');this.tone(660,.4,.13,'sine');}
    }
    suspend(){void this.context?.suspend().catch(()=>{});}
}
