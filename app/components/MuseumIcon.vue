<script setup lang="ts">
defineProps<{ name: string }>();
const paths: Record<string, string> = {
  museum: "M3 9 12 4l9 5v3H3zM6 14v6m6-6v6m6-6v6M3 22h18",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  sound: "M4 9h4l5-4v14l-5-4H4zm12-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14",
  mute: "M4 9h4l5-4v14l-5-4H4zm13 0 5 6m0-6-5 6",
  star: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z",
  compass: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-6-3-2 4-4 2 2-4z",
  lock: "M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5zm7 5v2",
  close: "m6 6 12 12M6 18 18 6",
  check: "m5 12 4 4L19 6",
};
</script>
<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.65"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] || paths.star" />
  </svg>
</template>
