"""DEEP TIME: original 150 BPM / 48 bar score and Foley, rendered offline.
Two synchronized stems (mineral/air and percussion/low strings), rendered
offline for MIRAI MUSEUM with a fixed seed. No third-party audio.
Requires numpy and ffmpeg. AAC for Safari, Vorbis for other browsers.
"""
from pathlib import Path
import numpy as np, wave, subprocess
R=24000; D=76.8; N=round(R*D); rng=np.random.default_rng(66000000)
OUT=Path('public/deep-time/audio'); OUT.mkdir(parents=True,exist_ok=True)
base=np.zeros((N,2)); rhythm=np.zeros((N,2))
def mix(dst, sound, at, vol=1, pan=0):
    i=round(at*R); n=min(len(sound),len(dst)-i)
    if i<0 or n<=0:return
    dst[i:i+n,0]+=sound[:n]*vol*(1-pan*.5); dst[i:i+n,1]+=sound[:n]*vol*(1+pan*.5)
def tone(freq,dur,kind='mineral'):
    t=np.arange(round(R*dur))/R
    if kind=='mineral':
        s=sum(np.sin(2*np.pi*freq*f*t)*np.exp(-t*(1.4+f*.4))*.45/f for f in [1,2.01,3.98,5.43]); return s*(1-np.exp(-t*120))
    if kind=='string':
        s=sum(np.sin(2*np.pi*freq*f*t+np.sin(t*.7)*.03)*.35/f**1.4 for f in range(1,9)); return s*np.minimum(1,t*12)*np.exp(-t*1.6)
    return np.sin(2*np.pi*freq*t)*np.minimum(1,t*30)*np.exp(-t*2)
def noise(dur,decay=6):
    t=np.arange(round(R*dur))/R; raw=rng.standard_normal(len(t)); smooth=np.convolve(raw,np.ones(18)/18,'same'); return smooth*np.exp(-t*decay)
def kick():
    t=np.arange(round(R*.38))/R; phase=2*np.pi*(43*t+45*.035*(1-np.exp(-t/.035))); return np.sin(phase)*np.exp(-t*13)*.8+noise(.38,45)*.3
roots=[73.416,65.406,55,65.406,49,73.416]
# Sustained, rough bowed overtones and stereo air; section 4's impact cuts the pulse.
for sec,root in enumerate(roots):
    at=sec*12.8; t=np.arange(round(R*12.8))/R
    envelope=np.minimum(1,t/1.1)*np.minimum(1,(12.8-t)/1.4)
    if sec==3: envelope*=np.minimum(1,np.maximum(0,t-.22)/.7)
    drone=sum(np.sin(2*np.pi*root*f*t+np.sin(t*.7+f)*.13)*.012/f for f in [1,1.5,2,3.01,4])
    air=np.convolve(rng.standard_normal(len(t)),np.ones(90)/90,'same')*.025
    mix(base,(drone+air)*envelope,at)
    for bar in range(8):
        b=at+bar*1.6
        if sec==3 and bar==0:continue
        if sec==5 and bar>4:continue
        notes=[root*4,root*6,root*5.333,root*3]
        for j in range(2 if sec in [0,5] else 4):
            mix(base,tone(notes[(bar+j)%4],2.1),b+j*.4, .068 if sec!=4 else .053,(-1 if j%2 else 1)*.55)
    for beat in range(32):
        b=at+beat*.4
        if sec==3 and beat<2: continue
        if sec==5 and beat>=20:continue
        v=[.11,.15,.18,.19,.22,.105][sec]
        if beat%4==0 or (sec>=2 and beat%2==0): mix(rhythm,kick(),b,v)
        if sec>0 and beat%4==2: mix(rhythm,noise(.22,18),b,.11)
        if sec in [2,3,4]:
            mix(rhythm,noise(.08,50),b+.2,.045, .5 if beat%2 else -.5)
            mix(rhythm,tone(root*2 if beat%4 else root,.35,'string'),b,.14)
        if sec==4 and beat%2: mix(rhythm,kick(),b+.2,.075)
# One impact with a low boom and mineral spray; ending falls back to breath and glass.
impact=np.arange(round(R*2.5))/R
boom=np.sin(2*np.pi*(28*impact+22*.08*(1-np.exp(-impact/.08))))*np.exp(-impact*2.5)
mix(base,boom,38.4,.38);mix(base,noise(2.5,2),38.4,.25)
for f in [293.665,440,587.33]:mix(base,tone(f,3.2),75.2,.05)
def write(name,arr):
    if arr.ndim==1:arr=np.column_stack([arr,arr])
    arr=np.tanh(arr*1.15)
    wav=Path('/tmp')/f'deep-time-{name}.wav'
    with wave.open(str(wav),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(R);f.writeframes((np.clip(arr,-1,1)*32767).astype('<i2').tobytes())
    for ext,args in [('ogg',['-c:a','libvorbis','-q:a','4']),('m4a',['-c:a','aac','-b:a','96k'])]:
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),*args,str(OUT/(name+'.'+ext))],check=True)
    wav.unlink()
write('mineral',base);write('pulse',rhythm)
sfx={
 'jump': tone(280,.17)*.28+noise(.17,20)*.15,
 'land': noise(.16,22)*.6+tone(75,.16,'string')*.4,
 'death': noise(.45,12)*.9+tone(45,.45,'string')*.6,
 'step': noise(.25,18)*.65+tone(38,.25,'string')*.7,
 'rock': noise(.3,16)*.9+tone(110,.3)*.25,
 'ui': tone(520,.13)*.3,
 'clear': sum(tone(f,1.6) for f in [293.665,440,587.33])*.2,
 'impact': boom*.8+noise(2.5,3)*.4,
}
# Organic rex presence: band-limited air, modulated subharmonics and irregular throaty harmonics.
t=np.arange(round(R*1.7))/R
roar=noise(1.7,1)*.6
for f in [38,57,86,119,174]: roar+=np.sin(2*np.pi*(f*t+2*np.sin(t*11)))*np.sin(np.pi*np.minimum(1,t/1.7))*.13
sfx['rex']=roar*np.minimum(1,t*8)
for name,s in sfx.items():write(name,s)
print('Rendered two 76.8-second stems and nine Foley/signature sounds')
