<script setup lang="ts">
import { ref,shallowRef,onBeforeUnmount,computed,watch } from 'vue';
import { LabRuntime } from '../../lab/shared/runtime';
import type { LabStatus } from '../../lab/shared/runtime';
import type { EngineId,Quality,ComparisonMode } from '../../lab/shared/types';
import { LANDMARKS } from '../../lab/shared/scene';
const props=defineProps<{engine:EngineId}>();
const canvas=ref<HTMLCanvasElement|null>(null);
const status=shallowRef<LabStatus|null>(null);
const loading=ref('小さなローマを準備しています');
const error=ref('');
const panel=ref(false);
const guide=ref(false);
const labels=ref(true);
const joystick=ref({x:0,y:0});
const runtime=shallowRef<LabRuntime|null>(null);
const engineName=computed(()=>props.engine==='three'?'Three.js':'Babylon.js');
const busy=computed(()=>status.value?.benchmark!==null && status.value?.benchmark!==undefined);
const landmark=(id:string)=>LANDMARKS.find(l=>l.id===id)!;
const metric=(n:number|null|undefined,places=0)=>n==null?'計測不可':n.toLocaleString('ja-JP',{maximumFractionDigits:places});
watch(canvas,async element=>{
  if(!element || runtime.value)return;
  const started=performance.now();
  runtime.value=new LabRuntime(element,s=>{status.value=s;});
  status.value={...runtime.value.status};
  try{await runtime.value.initialize(props.engine,started,label=>{loading.value=label;});}
  catch(e){error.value=e instanceof Error?e.message:String(e);console.error('Roman lab initialization',e);}
},{flush:'post'});
onBeforeUnmount(()=>{runtime.value?.dispose();runtime.value=null;});
function switchEngine(){runtime.value?.save();}
function quality(e:Event){runtime.value?.configure({quality:(e.target as HTMLSelectElement).value as Quality});}
function comparison(e:Event){runtime.value?.configure({comparison:(e.target as HTMLSelectElement).value as ComparisonMode});}
function stick(e:PointerEvent){
  const el=e.currentTarget as HTMLElement;const rect=el.getBoundingClientRect();
  const dx=e.clientX-rect.left-rect.width/2,dy=e.clientY-rect.top-rect.height/2;
  const length=Math.max(34,Math.hypot(dx,dy));
  joystick.value={x:dx/length*34,y:dy/length*34};
  if(runtime.value?.input)runtime.value.input.joystick={x:dx/length,z:dy/length};
}
let stickDown=false;
function stickStart(e:PointerEvent){stickDown=true;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);stick(e);}
function stickMove(e:PointerEvent){if(stickDown)stick(e);}
function stickEnd(){stickDown=false;joystick.value={x:0,y:0};if(runtime.value?.input)runtime.value.input.joystick={x:0,z:0};}
function closePuzzle(){const solved=status.value?.solved;runtime.value?.closePuzzle();if(solved && status.value?.mode==='diorama')runtime.value?.select('fountain');}
</script>
<template>
  <div class="roman-lab" :class="{'is-night':status?.settings.night,'is-explore':status?.mode==='explore'}" :data-engine="engine" :data-ready="String(!!status?.ready)" :data-mode="status?.mode" :data-night="String(!!status?.settings.night)" :data-solved="String(!!status?.solved)" :data-player-x="runtime?.game.world.player.position.x.toFixed(3)" :data-player-z="runtime?.game.world.player.position.z.toFixed(3)" :data-camera="runtime?JSON.stringify(runtime.camera.value):''" data-testid="roman-lab">
    <header class="lab-header">
      <NuxtLink to="/lab" class="lab-brand" @click="switchEngine"><span class="lab-brand-symbol"><LabIcon name="museum" /></span><span>MIRAI MUSEUM<small>EXPERIMENTAL GALLERY / 01</small></span></NuxtLink>
      <div class="lab-engine-tabs" aria-label="描画エンジン"><NuxtLink to="/lab/three" :aria-current="engine==='three'?'page':undefined" @click="switchEngine"><span class="lab-status-dot" />Three.js</NuxtLink><NuxtLink to="/lab/babylon" :aria-current="engine==='babylon'?'page':undefined" @click="switchEngine"><span class="lab-status-dot" />Babylon.js</NuxtLink></div>
      <NuxtLink to="/lab" class="lab-report-link" @click="switchEngine">比較を見る<LabIcon name="arrow" /></NuxtLink>
    </header>
    <main class="lab-stage">
      <div class="lab-canvas-wrap"><canvas ref="canvas" class="lab-canvas" tabindex="0" aria-label="古代ローマの3D箱庭。ドラッグで回転、ホイールでズーム。探索はWASD、矢印キー、タッチ操作。" /></div>
      <div class="lab-vignette" aria-hidden="true" />
      <div v-if="!status?.ready && !error" class="lab-loading" role="status"><span class="lab-loading-icon"><LabIcon name="museum" /></span><strong>ROMA, IN MINIATURE</strong><p>{{loading}}</p><span class="lab-loading-line" /></div>
      <div v-if="error" class="lab-error" role="alert"><LabIcon name="compass" /><h1>箱庭を開けませんでした。</h1><p>{{error}}</p><button class="lab-primary" @click="reloadNuxtApp()">もう一度読み込む</button><NuxtLink to="/lab">比較ページへ戻る</NuxtLink></div>
      <template v-if="status?.ready">
        <div class="lab-scene-title"><div class="lab-overline"><span /> A LIVING ROMAN DIORAMA</div><h1>City of Water<span>水がつなぐ、小さなローマ。</span></h1><p>{{status.settings.night?'灯りがともる、静かな夜の街。':'陽だまりの街に、今日も暮らしが息づく。'}}</p></div>
        <div class="lab-config"><label><span>比較条件</span><select :value="status.settings.comparison" :disabled="busy" @change="comparison"><option value="fair">A · 共通条件</option><option value="maximum">B · 最大品質</option></select></label><label><span>画質</span><select :value="status.settings.quality" :disabled="busy" @change="quality"><option value="mobile">モバイル</option><option value="balanced">バランス</option><option value="ultra">最高</option></select></label><button class="lab-config-metrics" :aria-pressed="panel" aria-label="計測パネル" @click="panel=!panel"><LabIcon name="metrics" /></button></div>
        <div v-if="labels && status.mode==='diorama'" class="lab-hotspots"><template v-for="p in status.hotspots" :key="p.id"><button v-if="p.visible" class="lab-hotspot" :class="{'is-selected':status.selected?.id===p.id}" :style="{left:p.x+'px',top:p.y+'px'}" :disabled="busy" :aria-label="landmark(p.id).title+'を調べる'" @click="runtime?.select(p.id)"><span class="lab-hotspot-dot">+</span><span class="lab-hotspot-label">{{landmark(p.id).title}}</span></button></template></div>
        <aside v-if="panel" class="lab-metrics" aria-label="パフォーマンス計測"><div class="lab-metrics-heading"><strong>RENDER MONITOR</strong><button aria-label="計測パネルを閉じる" @click="panel=false"><LabIcon name="close" /></button></div><div class="lab-metrics-engine">{{engineName}} {{engine==='three'?'r':''}}{{status.metrics?.version || '…'}} <span>WebGL 2</span></div><div class="lab-fps"><strong>{{metric(status.metrics?.fps,1)}}</strong><span>FPS <small>{{metric(status.metrics?.frameMs,2)}} ms / frame</small></span></div><dl><div><dt>Draw calls</dt><dd>{{metric(status.metrics?.drawCalls)}}</dd></div><div><dt>三角形</dt><dd>{{metric(status.metrics?.triangles)}}</dd></div><div><dt>テクスチャ</dt><dd>{{metric(status.metrics?.textures)}}</dd></div><div><dt>初期ロード</dt><dd>{{metric(status.metrics?.loadMs,0)}} ms</dd></div><div><dt>描画解像度</dt><dd>{{status.metrics?.resolution || '…'}}</dd></div><div><dt>GPUメモリ / 消費電力</dt><dd>計測不可</dd></div></dl><p>{{status.metrics?.api}}</p><p>Aは固定解像度。BのみAO・Bloomを追加。FPSは直近1秒、目標はPC 60 / スマホ30以上。</p><div class="lab-metric-actions"><button class="lab-primary" :disabled="busy" @click="runtime?.benchmark()">{{busy?`計測中 ${status.benchmark}s`:'同条件で10秒計測'}}</button><button :disabled="busy" @click="runtime?.exportMetrics()">JSON</button></div></aside>
        <div class="lab-navigation"><button aria-label="拡大" :disabled="busy" @click="runtime?.camera.zoom(-160)">＋</button><button aria-label="縮小" :disabled="busy" @click="runtime?.camera.zoom(160)">−</button><span /><button aria-label="街全体を見渡す" :disabled="busy || status.mode==='explore'" @click="runtime?.camera.reset()"><LabIcon name="reset" /></button><button aria-label="場所のラベル" :aria-pressed="labels" @click="labels=!labels"><LabIcon name="compass" /></button></div>
        <aside v-if="status.selected" class="lab-discovery" aria-live="polite"><button class="lab-close" aria-label="説明を閉じる" @click="runtime?.clearSelection()"><LabIcon name="close" /></button><div class="lab-overline">{{status.selected.category}} / {{status.selected.latin}}</div><h2>{{status.selected.title}}</h2><p>{{status.selected.description}}</p><details><summary>小さな発見を読む</summary><p>{{status.selected.fact}}</p></details><button v-if="status.selected.id==='aqueduct'" class="lab-primary" :disabled="busy" @click="runtime?.openPuzzle()"><LabIcon name="water" />水路パズルを遊ぶ<LabIcon name="arrow" /></button><span v-else class="lab-recorded"><LabIcon name="check" />発見を手帳に記録しました</span></aside>
        <div v-else-if="status.mode==='diorama'" class="lab-invitation"><span class="lab-invitation-rule" /><p>小さな世界を、ゆっくり巡る。<br>気になる場所に触れてみよう。</p><button @click="runtime?.select('aqueduct')">水の物語をはじめる<LabIcon name="arrow" /></button></div>
        <div class="lab-discoveries"><LabIcon name="book" /><span>発見の手帳 <strong>{{status.discoveries.length}} / 5</strong></span><span v-if="status.solved" class="lab-water-badge"><LabIcon name="water" />水が届いた</span></div>
        <div v-if="status.mode==='explore'" class="lab-explore-controls"><div class="lab-joystick" role="group" aria-label="移動ジョイスティック" @pointerdown.prevent="stickStart" @pointermove.prevent="stickMove" @pointerup="stickEnd" @pointercancel="stickEnd" @lostpointercapture="stickEnd"><span class="lab-joystick-cross" /><span class="lab-joystick-knob" :style="{transform:`translate(${joystick.x}px,${joystick.y}px)`}"><LabIcon name="compass" /></span></div><button v-if="status.nearby && !status.selected" class="lab-interact lab-primary" @click="runtime?.interact()"><span class="lab-key">E</span>{{status.nearby.title}}を調べる</button><span v-if="!status.selected" class="lab-explore-hint">WASD / 矢印キー · 道をタップして移動</span></div>
        <nav class="lab-toolbar" aria-label="箱庭の操作"><div class="lab-mode-tabs"><button :class="{'is-active':status.mode==='diorama'}" :aria-pressed="status.mode==='diorama'" :disabled="busy" @click="runtime?.setMode('diorama')"><LabIcon name="orbit" /><span>鑑賞</span></button><button :class="{'is-active':status.mode==='explore'}" :aria-pressed="status.mode==='explore'" :disabled="busy" @click="runtime?.setMode('explore')"><LabIcon name="walk" /><span>探索</span></button></div><span class="lab-toolbar-divider" /><button :aria-label="status.settings.night?'昼に切り替える':'夜に切り替える'" :disabled="busy" @click="runtime?.configure({night:!status.settings.night})"><LabIcon :name="status.settings.night?'moon':'sun'" /><span>{{status.settings.night?'夜':'昼'}}</span></button><button aria-label="同条件で撮影" :disabled="busy" @click="runtime?.screenshot()"><LabIcon name="camera" /><span>撮影</span></button><button :aria-label="status.paused?'再生':'一時停止'" :disabled="busy" @click="runtime?.pause()"><LabIcon :name="status.paused?'play':'pause'" /></button><button aria-label="操作ガイド" :aria-expanded="guide" @click="guide=!guide">?</button></nav>
        <div v-if="guide" class="lab-guide"><strong>この小さな街の歩き方</strong><p>回転：ドラッグ / 1本指<br>ズーム：ホイール / ピンチ / ＋−<br>パン：右ドラッグ・Shift / 2本指<br>調査：建物や ＋ に触れる<br>探索：WASD・矢印キー・スティック<br>移動：道をタップ（障害物を回避）<br>調べる：近づいて E / 調査ボタン</p><button @click="guide=false">わかった</button></div>
        <div v-if="status.notice" class="lab-toast" role="status">{{status.notice}}</div>
        <div class="lab-scene-caption"><span>{{status.settings.night?'NOCTE':'DIE'}} · ROMA</span><span>{{status.settings.comparison==='fair'?'A / COMMON BASELINE':'B / ENGINE ENHANCED'}} · {{engineName}}</span></div>
        <LabPuzzle v-if="status.puzzleOpen" :board="status.puzzle" :wet="status.wet" :solved="status.solved" @turn="i=>runtime?.turnPipe(i)" @close="closePuzzle" @reset="runtime?.resetPuzzle()" />
      </template>
    </main>
  </div>
</template>
