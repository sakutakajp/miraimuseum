<script setup lang="ts">
import type { Snapshot } from "~/games/star-dive/config";
defineProps<{ state: Snapshot; muted: boolean }>();
defineEmits<{ pause: []; mute: [] }>();
const { t } = useLanguage();
</script>
<template>
  <div class="dive-hud" @pointerdown.stop @pointermove.stop>
    <div
      class="dive-shield"
      :aria-label="`${t('残りシールド')} ${state.shield}`"
    >
      <span v-for="i in 3" :key="i" :class="{ empty: i > state.shield }">⬡</span
      ><small>SHIELD</small>
    </div>
    <div class="dive-score">
      <small>SCORE</small><strong>{{ state.score.toLocaleString() }}</strong>
    </div>
    <button
      class="dive-control"
      :aria-label="t(muted ? '音を出す' : '音を消す')"
      @click="$emit('mute')"
    >
      {{ muted ? "♪̸" : "♪" }}
    </button>
    <button
      class="dive-control"
      :aria-label="t('一時停止')"
      @click="$emit('pause')"
    >
      Ⅱ
    </button>
    <div class="dive-stage-progress">
      <i :style="{ width: `${(state.time / 80) * 100}%` }" />
    </div>
    <div v-if="state.chain > 1" class="dive-chain">
      CHAIN <strong>×{{ state.chain }}</strong>
    </div>
    <div
      class="dive-risk"
      :class="{ gold: state.risk >= 2.5, purple: state.risk >= 1.5 }"
    >
      RISK <b>×{{ state.risk.toFixed(1) }}</b>
    </div>
  </div>
</template>
