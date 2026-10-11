<script setup lang="ts">
const { hidden, dispose } = useMuseumMusic();
useHead({ htmlAttrs: { lang: "ja" } });
onMounted(() => document.addEventListener("visibilitychange", hidden));
onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", hidden);
  dispose();
});
</script>
<template><NuxtPage /></template>
