<script setup lang="ts">
import FloatingEarthExperience from "~/components/landing/FloatingEarthExperience.vue";
useHead({
  htmlAttrs: { lang: "ja" },
  title: "MIRAI MUSEUM",
  meta: [
    {
      name: "description",
      content:
        "浮かぶ地球に触れて、世界を回そう。恐竜の冒険が待つ、みらい博物館。",
    },
    { name: "theme-color", content: "#000000" },
  ],
});
</script>
<template><FloatingEarthExperience /></template>
