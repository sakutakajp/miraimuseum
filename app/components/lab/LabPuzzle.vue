<script setup lang="ts">
import { computed,onMounted,onBeforeUnmount,ref } from 'vue';
import { ports } from '../../lab/shared/puzzle';
import type { Pipe } from '../../lab/shared/puzzle';
const props=defineProps<{board:Pipe[];wet:number[];solved:boolean}>();
const emit=defineEmits<{turn:[index:number];close:[];reset:[]}>();
const dialog=ref<HTMLElement|null>(null);
const help=ref(false);
const active=computed(()=>new Set(props.wet));
function line(p:Pipe){return ports(p).map(d=>['M50 50V0','M50 50H100','M50 50V100','M50 50H0'][d]).join(' ');}
let previous:HTMLElement|null=null;
function keys(e:KeyboardEvent){
  if(e.key==='Escape')emit('close');
  if(e.key!=='Tab')return;
  const items=Array.from(dialog.value?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]')??[]);
  const first=items[0],last=items[items.length-1];
  if(e.shiftKey && document.activeElement===first){e.preventDefault();last?.focus();}
  else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first?.focus();}
}
onMounted(()=>{previous=document.activeElement as HTMLElement;dialog.value?.querySelector('button')?.focus();window.addEventListener('keydown',keys);});
onBeforeUnmount(()=>{window.removeEventListener('keydown',keys);previous?.focus();});
</script>
<template>
  <div class="lab-modal" @pointerdown.self="emit('close')">
    <section ref="dialog" role="dialog" aria-modal="true" aria-labelledby="water-title" class="lab-puzzle">
      <button class="lab-close" aria-label="パズルを閉じる" @click="emit('close')"><LabIcon name="close" /></button>
      <div class="lab-overline"><LabIcon name="water" /> AQUAEDUCTUS · 水の技術</div>
      <h2 id="water-title">街に、水を届けよう。</h2>
      <p class="lab-puzzle-intro">水路をタップして回転。青い水を、<br>左の泉から右の噴水へつなげよう。</p>
      <div class="lab-puzzle-ends"><span>泉 / SOURCE</span><span>噴水 / FOUNTAIN</span></div>
      <div class="lab-pipe-wrap"><div class="lab-source" aria-hidden="true">→</div>
        <div class="lab-pipe-grid" :class="{'is-solved':solved}">
          <button v-for="(p,i) in board" :key="i" class="lab-pipe" :class="{'is-wet':active.has(i)}" :disabled="solved" :aria-label="`水路 ${Math.floor(i/4)+1} 行 ${i%4+1} 列を回転`" :data-rotation="p.rotation" :data-pipe="i" @click="emit('turn',i)">
            <svg viewBox="0 0 100 100" aria-hidden="true"><path :d="line(p)" class="lab-pipe-stone" /><path :d="line(p)" class="lab-pipe-flow" /><circle cx="50" cy="50" r="5" class="lab-pipe-center" /></svg>
            <span class="lab-pipe-index">{{i+1}}</span>
          </button>
        </div><div class="lab-sink" :class="{'is-wet':solved}" aria-hidden="true"><LabIcon name="water" /></div>
      </div>
      <div v-if="solved" class="lab-puzzle-success" role="status"><LabIcon name="check" /><div><strong>水が、街に届いた！</strong><p>噴水が蘇り、街の人たちも喜んでいる。</p></div></div>
      <p v-else class="lab-puzzle-tip">{{help?'泉 → 5 → 6 → 2 → 3 → 7 → 11 → 12 → 噴水。角の向きを確かめよう。':'つながった水路は青く光ります。行き止まりを探してみよう。'}}</p>
      <div class="lab-puzzle-actions"><button @click="solved?emit('reset'):help=!help">{{solved?'もう一度遊ぶ':'ヒントを見る'}}</button><button class="lab-primary" @click="emit('close')">{{solved?'噴水を見に行く':'街に戻る'}}<LabIcon name="arrow" /></button></div>
    </section>
  </div>
</template>
