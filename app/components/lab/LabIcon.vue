<script setup lang="ts">
defineProps<{name:string}>();
const paths:Record<string,string>={
  museum:'M3 9h18L12 3 3 9Zm2 2v8m5-8v8m4-8v8m5-8v8M3 21h18M3 19h18',
  orbit:'M17 3a10 10 0 1 0 4 9m-4-9v5h5M7 12h10M12 7v10',
  walk:'M13 4a1.5 1.5 0 1 0 0 .1M7 11l3-3 4 1 3 4 3 1M10 8l-1 7-4 5m4-5 5 1 2 5',
  sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5',
  moon:'M20 14a8 8 0 0 1-10-10A8.5 8.5 0 1 0 20 14Z',
  camera:'M4 6h4l2-3h4l2 3h4v14H4V6Zm8 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
  metrics:'M4 20V10m5 10V4m5 16v-7m5 7V7',
  arrow:'M5 12h14m-5-5 5 5-5 5',
  close:'m6 6 12 12M6 18 18 6',
  water:'M12 3s-6 7-6 12a6 6 0 0 0 12 0c0-5-6-12-6-12Zm-3 12a3 3 0 0 0 3 3',
  reset:'M4 11a8 8 0 1 1 2 7M4 4v7h7',
  pause:'M8 5v14M16 5v14',
  play:'m8 4 12 8-12 8V4Z',
  compass:'m16 8-3 5-5 3 3-5 5-3ZM12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
  check:'m5 12 4 4L19 6',
  book:'M3 5c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 1-3-2-6-2-9-1V5Zm9 1v15',
};
</script>
<template><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name] || paths.compass" /></svg></template>
