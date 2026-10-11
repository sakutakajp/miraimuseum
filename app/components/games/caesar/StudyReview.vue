<script setup lang="ts">
import ReadableText from "~/components/games/caesar/ReadableText.vue";
import { copy } from "~/games/caesar/copy";
import { feedback, type CaesarProgress } from "~/games/caesar/progress";
import { questions } from "~/games/caesar/questions";
defineProps<{ progress: CaesarProgress }>();
</script>
<template>
  <section class="caesar-review" aria-labelledby="review-title">
    <h2 id="review-title"><ReadableText :text="copy.review" /></h2>
    <div class="caesar-review__grid">
      <article v-for="question in questions" :key="question.id">
        <small><ReadableText :text="question.skill" /></small>
        <h3><ReadableText :text="copy[feedback(progress.records[question.id])]" /></h3>
        <p><ReadableText :text="copy.attempts(progress.records[question.id].attempts)" /> · <ReadableText :text="copy.hintViews(progress.records[question.id].hints)" /></p>
        <p><ReadableText :text="progress.records[question.id].firstCorrect === null ? copy.untried : progress.records[question.id].firstCorrect ? copy.firstCorrect : copy.firstIncorrect" /></p>
        <small><ReadableText :text="feedback(progress.records[question.id]) === 'self' ? copy.reviewGood : copy.reviewMore" /></small>
      </article>
    </div>
  </section>
</template>
