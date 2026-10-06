<script setup lang="ts">
import type { StageResult } from "~/games/catalog";
import AsteroidExhibit from "./AsteroidExhibit.vue";
defineProps<{ result: StageResult; best: number; newBest: boolean }>();
defineEmits<{ retry: []; leave: [] }>();
const exhibit = ref(false);
</script>
<template>
  <main class="v2-main v2-result dive-result">
    <span class="eyebrow">MIRAI: STAR DIVE · ASTEROID BELT</span>
    <div class="dive-result-emblem" aria-hidden="true">
      {{ result.cleared ? "✦" : "◇" }}
    </div>
    <h1>
      <RubyText
        :text="result.cleared ? 'ステージクリア！' : 'もう一度、チャレンジ！'"
      />
    </h1>
    <div class="score-panel">
      <small>{{ result.cleared ? "CLEAR SCORE" : "RUN SCORE" }}</small
      ><strong>{{ result.score.toLocaleString() }}</strong
      ><span v-if="newBest && result.cleared" class="dive-new-best"
        >NEW BEST</span
      ><span>BEST {{ best.toLocaleString() }}</span>
    </div>
    <dl class="dive-result-stats">
      <div>
        <dt>MAX CHAIN</dt>
        <dd>{{ result.stats?.maxChain || 0 }}</dd>
      </div>
      <div>
        <dt>NEAR</dt>
        <dd>{{ result.stats?.near || 0 }}</dd>
      </div>
      <div>
        <dt>SHIELD</dt>
        <dd>{{ result.health }} / 3</dd>
      </div>
    </dl>
    <section v-if="result.cleared" class="dive-discovery">
      <span class="eyebrow">DISCOVERY · 001</span>
      <h2><RubyText text="小惑星" /></h2>
      <p><RubyText text="小惑星は、太陽のまわりを回る、小さな岩の天体。" /></p>
      <button class="text-button" @click="exhibit = true">
        <RubyText text="展示でもっと知る" /> →
      </button>
    </section>
    <p v-if="result.cleared">
      <RubyText text="次のステージは、これから登場！" />
    </p>
    <div class="result-actions">
      <button class="button primary" @click="$emit('retry')">
        <RubyText text="もう一度あそぶ" /></button
      ><button class="button" @click="$emit('leave')">
        <RubyText text="博物館にもどる" />
      </button>
    </div>
    <AsteroidExhibit v-if="exhibit" @close="exhibit = false" />
  </main>
</template>
