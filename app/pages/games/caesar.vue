<script setup lang="ts">
import ReadableText from "~/components/games/caesar/ReadableText.vue";
import CaesarGame from "~/components/games/caesar/CaesarGame.client.vue";
import { copy } from "~/games/caesar/copy";
import "~/assets/css/caesar.css";
useHead({ title: `${copy.title} — MIRAI MUSEUM`, meta: [{ name: "description", content: copy.subtitle }, { name: "theme-color", content: "#102332" }], htmlAttrs: { lang: "ja" } });
</script>
<template><ClientOnly><CaesarGame /><template #fallback><div class="caesar-loading" role="status"><ReadableText :text="copy.loading" /></div></template></ClientOnly></template>
