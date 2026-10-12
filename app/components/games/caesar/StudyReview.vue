<script setup lang="ts">
import { feedback, type CaesarProgress } from "~/games/caesar/progress";
import { questions } from "~/games/caesar/questions";
defineProps<{ progress: CaesarProgress }>();
const labels = { self: "初回にヒントなしで正解", assisted: "ヒントを見て正解", tried: "試し直して正解", again: "まだ正解していません" };
</script>
<template>
  <section class="caesar-review" aria-labelledby="review-title">
    <h2 id="review-title">これまでの記録</h2>
    <p>ガイド付き練習は含みません。記録はこの端末に保存します。「もういちど」で新しい冒険を始めると記録をリセットします。</p>
    <div class="caesar-review__grid"><article v-for="question in questions" :key="question.id">
      <h3>{{ question.title }}{{ question.id === 'door' ? '（自力チャレンジ）' : '' }}</h3>
      <p>{{ progress.records[question.id].attempts === 0 ? '未挑戦' : labels[feedback(progress.records[question.id])] }}</p>
      <p>試行 {{ progress.records[question.id].attempts }}回 · ヒント {{ progress.records[question.id].hints }}段階</p>
      <small>初回：{{ progress.records[question.id].firstCorrect === null ? '未記録' : progress.records[question.id].firstCorrect ? '正解' : '再試行' }}</small>
    </article></div>
    <p>正解したことと、学びを十分に理解したことは同じではありません。お子さんの様子を見ながら一緒に遊んでください。</p>
  </section>
</template>
