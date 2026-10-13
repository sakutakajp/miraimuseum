<script setup lang="ts">
import '~/assets/css/roman-lab.css';
useHead({title:'City of Water · Three.js | MIRAI MUSEUM LAB',bodyAttrs:{class:'has-roman-lab'}});
</script>
<template><ClientOnly><LabExperience engine="three" /><template #fallback><div class="lab-ssr">MIRAI MUSEUM · ローマの箱庭を読み込んでいます</div></template></ClientOnly></template>
