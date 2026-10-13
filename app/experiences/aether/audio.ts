export class SanctuaryAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private sources: (OscillatorNode | AudioBufferSourceNode)[] = [];
  private muted = false;
  async start() {
    if(this.context){await this.context.resume();return;}
    const Context=window.AudioContext??(window as Window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!Context)return;this.context=new Context();const c=this.context;void c.resume().catch(()=>{});this.master=c.createGain();this.master.gain.value=this.muted?0:.24;this.master.connect(c.destination);
    const low=c.createBiquadFilter();low.type='lowpass';low.frequency.value=850;low.connect(this.master);
    const data=c.createBuffer(1,c.sampleRate*5,c.sampleRate);let last=0;const values=data.getChannelData(0);for(let i=0;i<values.length;i++){last=(last+(Math.random()*2-1)*.015)/1.015;values[i]=last*3;}
    const wind=c.createBufferSource();wind.buffer=data;wind.loop=true;wind.connect(low);wind.start();this.sources.push(wind);
    for(const [i,freq] of [130.81,196,261.63].entries()){const o=c.createOscillator();o.type='sine';o.frequency.value=freq;const g=c.createGain();g.gain.value=.012/(1+i*.4);o.connect(g);g.connect(this.master);o.start();this.sources.push(o);}
  }
  chime(final=false){const c=this.context;if(!c||!this.master)return;[261.63,392,523.25,783.99,...(final?[880]:[])].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.frequency.value=f;o.type='sine';const t=c.currentTime+i*.15;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12,t+.05);g.gain.exponentialRampToValueAtTime(.001,t+(final?5:3));o.connect(g);g.connect(this.master!);o.start(t);o.stop(t+6);});}
  setMuted(muted:boolean){this.muted=muted;if(this.context&&this.master)this.master.gain.setTargetAtTime(muted?0:.24,this.context.currentTime,.15);}
  suspend(){void this.context?.suspend();} resume(){void this.context?.resume();}
  dispose(){this.sources.forEach(s=>s.stop());this.sources=[];void this.context?.close();this.context=null;}
}
