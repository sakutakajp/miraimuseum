<script setup lang="ts">
const { locale, t, setLocale } = useLanguage();
</script>
<template>
  <div class="language-switch" role="group" :aria-label="t('言語')">
    <button lang="ja" :aria-pressed="locale === 'ja'" @click="setLocale('ja')">日本語</button>
    <button lang="en" :aria-pressed="locale === 'en'" @click="setLocale('en')">English</button>
  </div>
</template>
