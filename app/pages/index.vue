<script setup lang="ts">
import LandingExperience from "~/components/landing/LandingExperience.vue";
useHead({
  htmlAttrs: { lang: "ja" },
  title: "MIRAI MUSEUM — Everything Is Connected.",
  meta: [
    {
      name: "description",
      content:
        "すべての学問は、つながっている。宇宙も、生命も、数も、機械も。見方を変えれば、同じ世界の一部になる。みらい博物館へようこそ。",
    },
    { name: "theme-color", content: "#08090b" },
  ],
});
</script>
<template><LandingExperience /></template>
