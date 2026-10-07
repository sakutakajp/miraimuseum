<script setup lang="ts">
const { locale, initializeLanguage } = useLanguage();
onMounted(initializeLanguage);
useHead(() => ({ htmlAttrs: { lang: locale.value } }));
</script>
<template><NuxtPage /></template>
