<script setup lang="ts">
import type { games } from "~/games/catalog";
import type { GameRecord } from "~/games/progress";
defineProps<{ game: (typeof games)[number]; record: GameRecord }>();
defineEmits<{ select: [] }>();
</script>
<template>
  <button
    class="v2-card"
    :style="{ '--accent': game.color }"
    @click="$emit('select')"
  >
    <div class="card-art">
      {{ game.icon }}<span>{{ game.visual }}</span>
    </div>
    <div class="card-info">
      <small
        ><RubyText :text="game.theme" /> / <RubyText :text="game.style"
      /></small>
      <h2><RubyText :text="game.title" /></h2>
      <p>
        STAGE
        {{ Object.values(record.stages).filter((s) => s.cleared).length }} /
        {{ game.stages.length }}
        <span>BEST {{ record.best.toLocaleString() }}</span>
      </p>
      <strong><RubyText text="ゲームを見る" /> →</strong>
    </div>
  </button>
</template>
