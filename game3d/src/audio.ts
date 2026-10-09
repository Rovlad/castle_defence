export class GameAudio {
    context: AudioContext | null = null;
    master: GainNode | null = null;
    muted = false;
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
                this.master.gain.value = .2;this.master.connect(this.context.destination);this.generation++;this.voices = 0;
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
    tone(frequency:number,duration:number,volume:number,type:OscillatorType='triangle',pan=0,end=frequency) {
        const ctx = this.context;
        if(this.muted || !ctx || ctx.state!=='running' || !this.master || document.hidden || this.voices>=10)return;
        const osc=ctx.createOscillator(),gain=ctx.createGain(),panner=ctx.createStereoPanner?.();
        const now=ctx.currentTime,generation=this.generation;
        osc.type=type;osc.frequency.setValueAtTime(frequency,now);osc.frequency.exponentialRampToValueAtTime(Math.max(1,end),now+duration);
        gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
        osc.connect(gain);
        if(panner){panner.pan.value=pan;gain.connect(panner);panner.connect(this.master);}else gain.connect(this.master);
        this.voices++;osc.onended=()=>{if(generation===this.generation)this.voices--;osc.disconnect();gain.disconnect();panner?.disconnect();};
        osc.start();osc.stop(now+duration);
    }
    effect(kind:string,pan=0) {
        if(kind==='shot')this.tone(220,.12,.35,'sawtooth',0,60);
        else if(kind==='hit')this.tone(550,.12,.14,'square',pan,180);
        else if(kind==='breach')this.tone(130,.5,.28,'sawtooth',0,35);
        else if(kind==='engine')this.tone(110,.18,.12,'triangle',pan,95);
        else {this.tone(440,.28,.16,'sine');this.tone(660,.4,.13,'sine');}
    }
    suspend(){void this.context?.suspend().catch(()=>{});}
}
