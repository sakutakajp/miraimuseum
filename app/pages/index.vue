<script setup lang="ts">
import FloatingEarthExperience from "~/components/landing/FloatingEarthExperience.vue";
const { locale } = useLanguage();
useHead(() => ({
  title: "MIRAI MUSEUM",
  meta: [
    {
      name: "description",
      content:
        locale.value === "ja"
          ? "浮かぶ地球に触れて、世界を回そう。恐竜の冒険が待つ、みらい博物館。"
          : "Touch a floating Earth and turn the world. A dinosaur adventure awaits at MIRAI MUSEUM.",
    },
    { name: "theme-color", content: "#000000" },
  ],
}));
</script>
<template><FloatingEarthExperience /></template>
