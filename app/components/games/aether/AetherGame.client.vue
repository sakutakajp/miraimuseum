<script setup lang="ts">
import type { AetherWorld, WorldState, Quality } from '~/experiences/aether/world';
const canvas=ref<HTMLCanvasElement>();
const canvasKey=ref(0),mobile=ref(false),fullscreenSupported=ref(false);
const ready=ref(false),playing=ref(false),muted=ref(false),settings=ref(false),error=ref(''),errorInfo=ref('');
const quality=ref<Quality>('auto');
const state=ref<WorldState>({count:0,nearby:null,complete:false,quality:'最高',paused:false});
const completionVisible=ref(false),padOffset=ref({x:0,y:0});
let world:AetherWorld|undefined,disposed=false,generation=0,padPointer:number|null=null;
let completionTimer:ReturnType<typeof setTimeout>|undefined,startupTimer:ReturnType<typeof setTimeout>|undefined;
async function initialize(compatibility=false){
  const token=++generation;
  clearTimeout(startupTimer);clearTimeout(completionTimer);world?.dispose();world=undefined;
  ready.value=false;playing.value=false;settings.value=false;completionVisible.value=false;error.value='';resetPad();
  canvasKey.value++;await nextTick();
  let World:typeof AetherWorld|undefined,stage='module';
  const failed=(reason:unknown)=>{
    if(disposed||token!==generation)return;
    clearTimeout(startupTimer);
    const message=reason instanceof Error?`${reason.name}: ${reason.message}`:String(reason);
    errorInfo.value=`${stage} / ${message}\n${navigator.userAgent}`;
    world?.dispose();world=undefined;
    if(canvas.value)World?.disposeCanvasEngines(canvas.value);
    if(!compatibility&&!playing.value){void initialize(true);return;}
    ready.value=false;error.value='3Dの起動を完了できませんでした。軽量設定で再試行できます。アプリ内で開いている場合は、Safariでもお試しください。';
    console.error('[AETHER]',stage,message);
  };
  try{
    ({AetherWorld:World}=await import('~/experiences/aether/world'));
    if(disposed||token!==generation||!canvas.value)return;
    stage='graphics';
    world=new World(canvas.value,{compatibility,onReady:()=>{if(token!==generation)return;clearTimeout(startupTimer);ready.value=true;},onError:failed,onState:(next)=>{if(token!==generation)return;if(next.complete&&!state.value.complete){completionVisible.value=true;completionTimer=setTimeout(()=>{completionVisible.value=false;},12000);}state.value=next;}});
    world.setMuted(muted.value);
    if(import.meta.dev)(window as Window & {__aether?:AetherWorld}).__aether=world;
    startupTimer=setTimeout(()=>{if(!ready.value)failed(new Error('Startup timed out'));},30000);
  }catch(reason){failed(reason);}
}
onMounted(()=>{mobile.value=window.matchMedia('(pointer: coarse)').matches||/iPhone|iPad|Android/i.test(navigator.userAgent);fullscreenSupported.value=typeof document.documentElement.requestFullscreen==='function';void initialize(new URLSearchParams(location.search).get('compat')==='1');});
onBeforeUnmount(()=>{disposed=true;generation++;clearTimeout(startupTimer);clearTimeout(completionTimer);world?.dispose();if(import.meta.dev)delete (window as Window & {__aether?:AetherWorld}).__aether;});
watch(()=>state.value.paused,(paused)=>{if(paused)resetPad();});
function begin(){playing.value=true;world?.start();}
function sound(){muted.value=!muted.value;world?.setMuted(muted.value);}
function changeQuality(){world?.setQuality(quality.value);}
function resume(){settings.value=false;world?.resume();}
function restart(){completionVisible.value=false;resetPad();world?.reset();resume();}
function openSettings(){settings.value=!settings.value;if(settings.value&&playing.value)world?.pause();}
function fullscreen(){const result=document.fullscreenElement?document.exitFullscreen():canvas.value?.parentElement?.requestFullscreen?.();if(result)void result.catch(()=>{});}
function resetPad(){padPointer=null;padOffset.value={x:0,y:0};world?.setMoveInput(0,0);}
function movePad(e:PointerEvent){if(e.pointerId!==padPointer)return;const bounds=(e.currentTarget as HTMLElement).getBoundingClientRect();const radius=bounds.width*.34;let x=(e.clientX-bounds.left-bounds.width/2)/radius,y=(e.clientY-bounds.top-bounds.height/2)/radius;const length=Math.max(1,Math.hypot(x,y));x/=length;y/=length;padOffset.value={x:x*radius,y:y*radius};world?.setMoveInput(x,-y);}
function startPad(e:PointerEvent){if(padPointer!==null||state.value.paused)return;padPointer=e.pointerId;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);movePad(e);}
</script>
<template>
  <main class="aether-game" :class="{'aether-mobile':mobile}" aria-label="AETHER 水風の遺跡">
    <canvas :key="canvasKey" ref="canvas" class="aether-canvas" tabindex="0" aria-label="3D世界。WASDで移動、ドラッグで視点操作、祭壇の近くでEを押して灯をともす。" />
    <div class="aether-grain" aria-hidden="true" />
    <div v-if="!ready" class="aether-loading" role="status">
      <div class="loading-orbit" aria-hidden="true"><i /></div>
      <span>{{ error ? '遺跡に接続できませんでした' : '風と水の庭を開いています' }}</span>
      <p v-if="error">{{ error }}</p><button v-if="error" @click="initialize(true)">軽量設定で再試行</button><details v-if="error" class="aether-error-info"><summary>エラー情報</summary><pre>{{ errorInfo }}</pre></details>
    </div>
    <Transition name="aether-fade">
      <div v-if="ready" class="aether-overlay">
        <header class="aether-header">
          <div class="aether-signature"><svg viewBox="0 0 32 40" fill="none" aria-hidden="true"><path d="M2 36 16 4l14 32M8 24h16M16 0v40" stroke="currentColor" stroke-width="1"/><circle cx="16" cy="24" r="7" stroke="currentColor" stroke-width=".7"/></svg><span>AETHER<small>水風の遺跡</small></span></div>
          <div class="aether-tools">
            <div v-if="playing" class="aether-progress" :aria-label="`灯した祭壇 ${state.count}/3`"><i v-for="n in 3" :key="n" :class="{ lit:state.count>=n }"/><span>{{ state.count }} / 3</span></div>
            <button :aria-label="muted?'音を有効にする':'音を消す'" :title="muted?'音を有効にする':'音を消す'" @click="sound"><svg viewBox="0 0 24 24" fill="none"><path d="m11 5-5 4H3v6h3l5 4V5Z" stroke="currentColor" stroke-width="1.2"/><path v-if="!muted" d="M15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14" stroke="currentColor" stroke-width="1.2"/><path v-else d="m15 9 6 6m0-6-6 6" stroke="currentColor" stroke-width="1.2"/></svg></button>
            <button aria-label="画質と操作設定" title="画質と操作設定" @click="openSettings"><svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 17h16" stroke="currentColor" stroke-width="1.2"/><circle cx="9" cy="7" r="2" fill="#071C25" stroke="currentColor"/><circle cx="15" cy="17" r="2" fill="#071C25" stroke="currentColor"/></svg></button>
            <button v-if="fullscreenSupported&&!mobile" aria-label="全画面を切り替える" title="全画面" @click="fullscreen"><svg viewBox="0 0 24 24" fill="none"><path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5" stroke="currentColor" stroke-width="1.2"/></svg></button>
            <button v-if="mobile&&playing" aria-label="探索を休止する" @click="world?.pause()"><svg viewBox="0 0 24 24" fill="none"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="2"/></svg></button>
          </div>
        </header>
        <Transition name="aether-fade">
          <div v-if="!playing" class="aether-title">
            <div class="aether-title-copy"><p class="aether-eyebrow"><span /> THE LOST GARDENS OF AETHER</p><h1>AETHER</h1><p class="aether-japanese">水風の遺跡</p><p class="aether-description">遺跡に眠る、三つの灯を。</p></div>
            <div class="aether-entry"><button class="aether-enter" @click="begin"><span>遺跡へ</span><svg viewBox="0 0 48 16" fill="none" aria-hidden="true"><path d="M0 8h44m-8-6 8 6-8 6" stroke="currentColor"/></svg></button><p>橋を渡り、三つの祭壇に光を灯す。</p><small>音のある体験をおすすめします</small></div>
          </div>
        </Transition>
        <template v-if="playing">

          <Transition name="aether-fade"><div v-if="state.nearby&&!state.paused" class="aether-interact"><span>{{ state.nearby }}</span><button @click="world?.interact()"><kbd v-if="!mobile">E</kbd> 灯をともす</button></div></Transition>
          <div v-if="!state.nearby&&!state.complete" class="aether-objective">3つの祭壇に、光を灯す</div>
          <Transition name="aether-fade"><div v-if="completionVisible" class="aether-completion"><span class="completion-mark">✧</span><p>水と風が、遺跡を満たしていく。</p><small>THE GARDENS REMEMBER</small></div></Transition>
          <div v-if="mobile&&!state.paused&&!settings" class="aether-touch-pad" role="group" aria-label="移動パッド" @pointerdown.stop.prevent="startPad" @pointermove.stop.prevent="movePad" @pointerup.stop.prevent="resetPad" @pointercancel.stop.prevent="resetPad" @lostpointercapture="resetPad"><span class="pad-directions" aria-hidden="true">＋</span><i :style="{transform:`translate(${padOffset.x}px,${padOffset.y}px)`}" /><small>移動</small></div>
          <footer v-if="mobile" class="aether-controls aether-touch-hint">左のパッドで移動 · 画面をドラッグして視点操作</footer>
          <footer v-else class="aether-controls"><span><kbd>W A S D</kbd> 移動</span><span><kbd>DRAG</kbd> 視点</span><span><kbd>E</kbd> 灯をともす</span><span><kbd>ESC</kbd> 休止</span><span class="aether-coordinates">LOST GARDENS / {{ state.complete?'GARDENS AWAKEN':'GARDENS ASLEEP' }}</span></footer>
        </template>
        <div v-if="settings||state.paused" class="aether-menu">
          <p class="menu-eyebrow">AETHER / {{ state.paused?'PAUSED':'SETTINGS' }}</p><h2>{{ state.paused?'静寂のなかで':'体験の設定' }}</h2>
          <label>描画品質<select v-model="quality" @change="changeQuality"><option value="auto">自動調整</option><option value="ultra">最高品質</option><option value="balanced">標準</option><option value="low">低負荷</option></select></label>
          <p class="menu-note">現在：{{ state.quality }}<br><template v-if="mobile">左のパッドで移動、画面をドラッグして視点操作。<br>祭壇の近くで「灯をともす」をタップ。<br>端末に合わせて描画品質を調整します。</template><template v-else>WASDで移動、ドラッグまたは矢印キーで視点操作。<br>ドラッグで見渡し、ホイールで拡大・縮小。<br>Shiftで速く移動できます。</template></p>
          <button class="menu-primary" @click="resume">{{ playing?'探索を続ける':'閉じる' }} <span>→</span></button><button v-if="playing" class="menu-reset" @click="restart">遺跡を最初から訪れる</button>
        </div>
      </div>
    </Transition>
  </main>
</template>
<style scoped>
.aether-game,.aether-game *{box-sizing:border-box}.aether-game :where(button){background:none;border:0;cursor:pointer}.aether-game button:focus-visible,.aether-game select:focus-visible{outline:2px solid #e5cd9b;outline-offset:4px}.aether-game :where(p,h1,h2){margin:0}.aether-game svg{display:block}
.aether-game{position:fixed;inset:0;width:100%;height:100vh;height:100dvh;min-height:0;overflow:hidden;background:#07141d;color:#edf0e7;font-family:"Helvetica Neue",Arial,"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;font-weight:400;isolation:isolate}.aether-canvas{display:block;width:100%;height:100%;touch-action:none;outline:none;cursor:grab}.aether-canvas:active{cursor:grabbing}.aether-grain{position:absolute;inset:0;pointer-events:none;z-index:1;opacity:.035;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' opacity='.4' filter='url(%23n)'/%3E%3C/svg%3E")}.aether-overlay{position:absolute;inset:0;z-index:2;pointer-events:none;background:linear-gradient(180deg,rgba(2,12,21,.25),transparent 25%,transparent 65%,rgba(2,10,16,.35))}.aether-overlay button,.aether-overlay select{pointer-events:auto;color:inherit;font:inherit}.aether-header{display:flex;align-items:center;justify-content:space-between;position:absolute;top:36px;left:44px;right:38px}.aether-signature{display:flex;gap:15px;align-items:center;color:#e4d4af}.aether-signature svg{width:30px;height:40px}.aether-signature>span{font-size:12px;letter-spacing:.32em}.aether-signature small{display:block;margin-top:8px;font-size:9px;letter-spacing:.25em;color:#b0c4c8}.aether-tools{display:flex;align-items:center;gap:15px}.aether-tools button{display:grid;place-items:center;width:32px;height:32px;opacity:.65;transition:opacity .2s}.aether-tools button:hover{opacity:1}.aether-tools svg{width:20px;height:20px}.aether-title{position:absolute;left:7%;right:7%;bottom:11%;display:flex;justify-content:space-between;align-items:flex-end;gap:30px}.aether-eyebrow{font-size:9px;letter-spacing:.3em;color:#d2c09b;display:flex;align-items:center;gap:12px}.aether-eyebrow span{width:28px;height:1px;background:#d2c09b}.aether-title h1{font-size:clamp(58px,8vw,120px);font-family:Georgia,"Times New Roman",serif;letter-spacing:.14em;line-height:1.15;margin:15px 0 3px;font-weight:400;text-shadow:0 3px 30px #04111b55}.aether-japanese{font-size:12px;letter-spacing:.7em;color:#d3dcd9;padding-left:6px}.aether-description{font-size:12px;letter-spacing:.19em;color:#bdced0;margin-top:27px}.aether-entry{width:270px;margin-bottom:4px}.aether-enter{display:flex;align-items:center;justify-content:space-between;width:100%;padding:22px 0;border-top:1px solid #d8c69b80;border-bottom:1px solid #d8c69b80;font-size:15px!important;letter-spacing:.3em;color:#eadaba!important;transition:padding .3s,background .3s}.aether-enter:hover{padding-left:15px;padding-right:10px;background:#dcc3900b}.aether-enter svg{width:48px;height:16px}.aether-entry p{font-size:10px;letter-spacing:.12em;color:#c2cecc;margin-top:18px}.aether-entry small{display:block;margin-top:10px;font-size:9px;letter-spacing:.1em;color:#88a2a9}.aether-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:32px;background:radial-gradient(ellipse at center,#12323b,#060f18);z-index:5;color:#c8d8d5}.aether-loading>span{font-size:11px;letter-spacing:.3em}.aether-loading p{font-size:12px;line-height:2;max-width:360px;text-align:center;padding:20px}.aether-loading button{color:#e4d4af;border:1px solid;padding:12px 24px}.loading-orbit{width:72px;height:72px;border:1px solid #8aa59b66;border-radius:50%;position:relative;animation:orbit 8s linear infinite}.loading-orbit:before{content:'';position:absolute;inset:9px;border:1px solid #b2d3cb44;border-radius:50%;transform:rotateX(55deg)}.loading-orbit i{position:absolute;top:1px;left:36px;width:4px;height:4px;background:#e6d2a2;box-shadow:0 0 16px #ffe7a5;border-radius:50%}.aether-controls{position:absolute;bottom:27px;left:40px;right:40px;display:flex;gap:24px;align-items:center;color:#a4b6b9;font-size:9px;letter-spacing:.06em}.aether-controls kbd{font-family:inherit;font-size:9px;color:#d5ddda;margin-right:6px;letter-spacing:.09em}.aether-coordinates{margin-left:auto;font-size:8px;letter-spacing:.2em;color:#8faaa9}.aether-progress{display:flex;align-items:center;gap:8px;margin-right:18px}.aether-progress i{display:block;width:5px;height:5px;border:1px solid #afc7c5;transform:rotate(45deg)}.aether-progress i.lit{background:#edcf8b;border-color:#edcf8b;box-shadow:0 0 12px #edcf8b77}.aether-progress span{font-size:9px;letter-spacing:.16em;color:#bdcdca;margin-left:10px}.aether-crosshair{position:absolute;top:50%;left:50%;width:3px;height:3px;border-radius:50%;background:#e3ede780;box-shadow:0 0 5px #bbded550}.aether-objective{position:absolute;bottom:90px;left:0;right:0;text-align:center;font-size:10px;letter-spacing:.2em;color:#bdcecb}.aether-interact{position:absolute;bottom:15%;left:50%;transform:translateX(-50%);text-align:center;white-space:nowrap}.aether-interact>span{display:block;font-size:10px;letter-spacing:.25em;color:#d2dbd4;margin-bottom:14px}.aether-interact button{padding:12px 24px;background:#071c26b0;border:1px solid #c7d9cd55;font-size:12px;letter-spacing:.14em;backdrop-filter:blur(6px)}.aether-interact kbd{display:inline-grid;place-items:center;border:1px solid #c9ded0aa;width:22px;height:22px;margin-right:12px;font:12px Arial;color:#ebd69d}.aether-completion{position:absolute;top:24%;left:0;right:0;text-align:center;text-shadow:0 2px 30px #031c22}.completion-mark{display:block;font-size:30px;color:#e4d4ad;margin-bottom:16px}.aether-completion p{font-family:Georgia,"Yu Mincho",serif;font-size:21px;letter-spacing:.15em;font-weight:400}.aether-completion small{display:block;font-size:9px;letter-spacing:.32em;color:#c9d5ce;margin-top:18px}.aether-menu{position:absolute;right:40px;top:100px;width:330px;padding:32px;background:#071821ec;border:1px solid #afc2ba30;backdrop-filter:blur(20px);pointer-events:auto;box-shadow:0 20px 80px #0006}.menu-eyebrow{font-size:9px;letter-spacing:.25em;color:#bca982;margin-bottom:17px}.aether-menu h2{font-family:Georgia,"Yu Mincho",serif;font-size:23px;font-weight:400;letter-spacing:.06em;margin-bottom:28px}.aether-menu label{font-size:11px;display:flex;align-items:center;justify-content:space-between;padding:16px 0;border-top:1px solid #aac3ba25;border-bottom:1px solid #aac3ba25}.aether-menu select{background:#102c34;border:1px solid #849f9755;font-size:11px;padding:8px}.menu-note{font-size:10px;line-height:2.3;color:#93adaa;margin:20px 0}.menu-primary{width:100%;text-align:left;padding:15px 0;color:#dfcca7!important;border-bottom:1px solid #dfcca755;font-size:12px!important;letter-spacing:.14em}.menu-primary span{float:right}.menu-reset{font-size:10px!important;color:#91a6a8!important;margin-top:20px}.aether-fade-enter-active,.aether-fade-leave-active{transition:opacity 1.2s}.aether-fade-enter-from,.aether-fade-leave-to{opacity:0}.aether-fade-leave-active{pointer-events:none}@keyframes orbit{to{transform:rotate(360deg)}}@media(max-width:700px){.aether-header{top:24px;left:22px;right:18px}.aether-signature>span{font-size:10px}.aether-tools{gap:7px}.aether-title{left:8%;right:8%;bottom:10%;flex-direction:column;align-items:flex-start;gap:35px}.aether-title h1{font-size:65px}.aether-entry{width:240px}.aether-description{margin-top:20px}.aether-controls{left:20px;right:20px;bottom:20px;gap:14px;flex-wrap:wrap}.aether-coordinates{display:none}.aether-progress{margin-right:4px;gap:5px}.aether-menu{right:20px;left:20px;top:85px;width:auto;max-width:350px;margin-left:auto}.aether-completion p{font-size:17px}.aether-objective{bottom:100px}.aether-interact{bottom:20%}}@media(prefers-reduced-motion:reduce){.loading-orbit{animation:none}.aether-fade-enter-active,.aether-fade-leave-active{transition-duration:.1s}}
.aether-error-info{max-width:calc(100% - 40px);font-size:10px;color:#94b5b6}.aether-error-info summary{cursor:pointer;text-align:center}.aether-error-info pre{max-width:340px;white-space:pre-wrap;overflow-wrap:anywhere;max-height:120px;overflow:auto;font-size:9px;line-height:1.7}.aether-touch-pad{position:absolute;left:max(24px,env(safe-area-inset-left));bottom:calc(38px + env(safe-area-inset-bottom));width:104px;height:104px;border:1px solid #c6d8c748;border-radius:50%;background:#071d2580;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;backdrop-filter:blur(5px)}.aether-touch-pad i{position:absolute;left:34px;top:34px;width:34px;height:34px;border:1px solid #d6d6b780;border-radius:50%;background:#e4d4af25;pointer-events:none}.pad-directions{position:absolute;inset:0;display:grid;place-items:center;font-size:62px;font-weight:100;color:#aac6c329;pointer-events:none}.aether-touch-pad small{position:absolute;left:0;right:0;bottom:-21px;text-align:center;font-size:9px;letter-spacing:.12em;color:#a3beb9;pointer-events:none}.aether-touch-hint{bottom:calc(16px + env(safe-area-inset-bottom));left:148px;right:16px;font-size:8px;line-height:1.8;letter-spacing:0}.aether-mobile .aether-interact{bottom:calc(160px + env(safe-area-inset-bottom))}.aether-mobile .aether-objective{bottom:calc(180px + env(safe-area-inset-bottom))}@media(max-width:700px){.aether-header{top:calc(18px + env(safe-area-inset-top));left:max(18px,env(safe-area-inset-left));right:max(14px,env(safe-area-inset-right))}.aether-title h1{font-size:clamp(44px,15vw,65px)}.aether-title{bottom:calc(8% + env(safe-area-inset-bottom))}.aether-menu{max-height:calc(100dvh - 125px);overflow:auto}}@media(max-height:500px) and (pointer:coarse){.aether-title{flex-direction:row;align-items:flex-end;gap:20px;bottom:9%}.aether-title h1{font-size:45px;margin-top:8px}.aether-description{margin-top:12px;font-size:10px}.aether-japanese{font-size:10px}.aether-eyebrow{font-size:7px}.aether-entry{width:220px}.aether-entry small{display:none}.aether-title{left:5%;right:5%}.aether-touch-pad{width:90px;height:90px;bottom:28px}.aether-touch-pad i{left:28px;top:28px}.aether-touch-hint{display:none}.aether-mobile .aether-interact{bottom:34px}.aether-mobile .aether-objective{bottom:35px}.aether-menu{top:70px;padding:20px;max-height:calc(100dvh - 90px)}}
.aether-overlay.aether-fade-enter-from{opacity:1}.aether-title.aether-fade-leave-active{transition-duration:.45s}
</style>
