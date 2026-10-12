<script setup lang="ts">
import ReadableText from "./ReadableText.vue";
import { copy } from "~/games/caesar/copy";

defineEmits<{ start: [] }>();
</script>

<template>
  <section class="caesar-console caesar-intro" aria-labelledby="intro-title">
    <div class="caesar-console__corners" aria-hidden="true" />
    <div class="caesar-intro__story">
      <span class="caesar-eyebrow"><ReadableText :text="copy.intro.eyebrow" /></span>
      <h2 id="intro-title" :aria-label="copy.intro.heading"><ReadableText :text="copy.intro.heading" /></h2>
      <p><ReadableText :text="copy.intro.story" /> <ReadableText :text="copy.intro.mission" /></p>
    </div>
    <ol class="caesar-intro__journey">
      <li>
        <svg viewBox="0 0 96 72" fill="none" aria-hidden="true"><path d="M8 58V26h80v32M8 26V16h22v10m7 0V16h22v10m7 0V16h22v10M26 58a22 22 0 0 1 44 0M5 58h24m38 0h24" /><path d="M19 38h9m40 0h9M48 5v6" class="caesar-intro__spark" /></svg>
        <div><small>01</small><h3 :aria-label="copy.stage1"><ReadableText :text="copy.stage1" /></h3><p><ReadableText :text="copy.intro.bridge" /></p></div>
      </li>
      <li>
        <svg viewBox="0 0 96 72" fill="none" aria-hidden="true"><circle cx="48" cy="29" r="22" /><circle cx="48" cy="29" r="14" /><path d="M28 43v16h40V43M19 59h58v8H19zM48 1v6M20 29h6m44 0h6" /><path d="m52 18-10 13h11l-9 12" class="caesar-intro__spark" /></svg>
        <div><small>02</small><h3 :aria-label="copy.stage2"><ReadableText :text="copy.stage2" /></h3><p><ReadableText :text="copy.intro.machine" /></p></div>
      </li>
    </ol>
    <div class="caesar-intro__guide">
      <h3 :aria-label="copy.intro.controlsTitle"><span aria-hidden="true">◇</span> <ReadableText :text="copy.intro.controlsTitle" /></h3>
      <p><ReadableText :text="copy.intro.controls" /></p>
    </div>
    <div class="caesar-intro__start">
      <p><ReadableText :text="copy.intro.encouragement" /></p>
      <button class="caesar-button caesar-button--primary" :aria-label="copy.intro.start" @click="$emit('start')"><ReadableText :text="copy.intro.start" /> <span aria-hidden="true">→</span></button>
      <small><ReadableText :text="copy.noTimer" /></small>
    </div>
  </section>
</template>
