<script setup lang="ts">
withDefaults(defineProps<{ actor: "mii" | "koro"; happy?: boolean }>(), { happy: false });
</script>
<template>
  <svg class="adventure-character" :class="{ 'is-happy': happy }" viewBox="0 0 100 100" aria-hidden="true">
    <ellipse cx="50" cy="91" rx="32" ry="5" fill="#091721" opacity=".25" />
    <g v-if="actor === 'mii'">
      <path d="M72 75 Q100 82 88 48" fill="none" stroke="#bc884c" stroke-width="9" stroke-linecap="round" />
      <path d="M27 64 38 49 65 49 77 65 72 85 34 87Z" fill="#d9af72" />
      <path d="M38 49 50 73 34 87 27 64Z" fill="#be8c51" /><path d="M50 73 65 49 77 65 72 85Z" fill="#f0cc93" />
      <path d="M29 72 42 74 40 92 28 92Z M62 74 75 73 78 91 65 92Z" fill="#c3965e" />
      <path d="M24 29 25 8 43 20 62 18 78 7 80 30 75 50 51 59 28 49Z" fill="#e5bb7e" />
      <path d="M25 8 43 20 29 29Z" fill="#bb8249" /><path d="M62 18 78 7 76 29Z" fill="#ce9151" />
      <path d="M24 29 50 34 43 20Z M50 34 80 30 62 18Z" fill="#f5dba8" /><path d="M50 34 51 59 75 50 80 30Z" fill="#d3a166" />
      <path d="M32 42 50 47 69 42 60 55 42 56Z" fill="#f4dfb8" />
      <g v-if="happy" stroke="#25383b" stroke-width="3.2" fill="none" stroke-linecap="round"><path d="M32 35 37 32 42 35 M60 35 65 32 70 35" /></g>
      <g v-else fill="#25383b"><ellipse cx="37" cy="35" rx="3" ry="4" /><ellipse cx="65" cy="35" rx="3" ry="4" /></g>
      <path d="M46 43 56 43 51 48Z" fill="#a96f51" /><path d="M51 48 51 51 46 53 M51 51 56 53" fill="none" stroke="#805d44" stroke-width="1.8" />
      <path d="M28 55 51 62 74 54 67 63 53 69 34 64Z" fill="#437b7b" /><path d="M60 63 68 62 76 77 63 71Z" fill="#58a1a0" />
    </g>
    <g v-else>
      <path d="M22 52 10 61 13 73 30 70 M77 52 91 58 88 72 73 70" fill="#8a9893" />
      <path d="M26 29 37 17 64 16 78 31 80 66 67 83 32 82 21 65Z" fill="#aeb5a5" />
      <path d="M26 29 48 40 37 17Z M48 40 78 31 64 16Z" fill="#d3d3b8" /><path d="M48 40 47 79 21 65 26 29Z" fill="#879b96" /><path d="M48 40 78 31 80 66 67 83 47 79Z" fill="#b7baa4" />
      <path d="M33 81 45 82 44 92 28 92Z M57 82 69 81 74 92 58 92Z" fill="#8f9f97" />
      <g fill="#203e41"><circle cx="37" cy="48" r="3" /><circle cx="64" cy="48" r="3" /></g>
      <path d="M43 59 Q50 65 57 59" fill="none" stroke="#24464a" stroke-width="2.5" stroke-linecap="round" />
      <path d="M50 22 56 28 50 34 44 28Z" fill="#59cec4" /><path d="M50 69 55 74 50 79 45 74Z" fill="#cba668" />
    </g>
  </svg>
</template>
