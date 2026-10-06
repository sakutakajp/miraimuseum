<script setup lang="ts">
import type { GameId } from "~/games/catalog";
defineProps<{ game: GameId }>();
const uid = useId().replace(/:/g, "");
const scatter = (seed: number) => {
  const n = Math.sin(seed) * 43758.5453;
  return n - Math.floor(n);
};
const stars = Array.from({ length: 45 }, (_, i) => ({
  x: scatter(i * 12.9898 + 1) * 480,
  y: scatter(i * 78.233 + 3) * 280,
  r: i % 4 === 0 ? 1.8 : 0.8,
}));
</script>
<template>
  <div class="game-artwork" :class="game" aria-hidden="true">
    <WorldIllustration
      v-if="game === 'dinosaur-run'"
      preserveAspectRatio="xMidYMid slice"
    />
    <svg v-else viewBox="0 0 480 280" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient :id="uid + 'sky'" x2="1" y2="1">
          <stop stop-color="#10194e" />
          <stop offset=".5" stop-color="#33236e" />
          <stop offset="1" stop-color="#096078" />
        </linearGradient>
        <radialGradient :id="uid + 'nebula'">
          <stop stop-color="#ba64f0" stop-opacity=".55" />
          <stop offset="1" stop-color="#834bc4" stop-opacity="0" />
        </radialGradient>
        <linearGradient :id="uid + 'planet'" x2="1" y2="1">
          <stop stop-color="#9bf2e7" />
          <stop offset=".5" stop-color="#3683c5" />
          <stop offset="1" stop-color="#19245e" />
        </linearGradient>
        <linearGradient :id="uid + 'hull'" x2=".5" y2="1">
          <stop stop-color="#fffbed" />
          <stop offset="1" stop-color="#94bfd4" />
        </linearGradient>
        <linearGradient :id="uid + 'flame'" x2="0" y2="1">
          <stop stop-color="#edffff" />
          <stop offset=".3" stop-color="#67e9ff" stop-opacity=".9" />
          <stop offset="1" stop-color="#3987ff" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="480" height="280" :fill="`url(#${uid}sky)`" />
      <ellipse
        cx="160"
        cy="90"
        rx="250"
        ry="170"
        :fill="`url(#${uid}nebula)`"
      />
      <circle
        v-for="(star, i) in stars"
        :key="i"
        :cx="star.x"
        :cy="star.y"
        :r="star.r"
        fill="#e8fbff"
        :opacity="i % 3 === 0 ? 0.9 : 0.45"
      />
      <g transform="translate(380 76) rotate(-24)">
        <ellipse
          rx="89"
          ry="22"
          fill="none"
          stroke="#81cee2"
          stroke-width="6"
          opacity=".45"
        />
        <circle r="53" :fill="`url(#${uid}planet)`" />
        <path
          d="M-82 12Q0 38 83 10"
          fill="none"
          stroke="#c3f4ef"
          stroke-width="4"
          opacity=".7"
        />
      </g>
      <path
        d="M38 202L115 142M52 232L102 193M315 245L343 220"
        stroke="#a5e6ff"
        stroke-width="2"
        opacity=".3"
      />
      <g transform="translate(224 152) rotate(24)">
        <ellipse cy="54" rx="57" ry="12" fill="#00091d" opacity=".25" />
        <path
          d="M-22 37L-13 106L-4 36M4 36L13 106L22 37"
          :fill="`url(#${uid}flame)`"
        />
        <path
          d="M-14-25L-76 39L-30 30L-9 4M14-25L76 39L30 30L9 4"
          fill="#ffad59"
          stroke="#ffddaa"
          stroke-width="2"
        />
        <path d="M-13-18L-54 26L-28 20M13-18L54 26L28 20" fill="#fbefe1" />
        <path d="M0-72L20 15L13 42L-13 42L-20 15Z" :fill="`url(#${uid}hull)`" />
        <path d="M0-72L8-37L-8-37Z" fill="#ffb96d" />
        <path
          d="M0-30Q17-3 10 13L-10 13Q-17-3 0-30"
          fill="#153f68"
          stroke="#7ef1ff"
          stroke-width="2"
        />
        <path
          d="M-3-20L-6 4"
          stroke="#c6ffff"
          stroke-width="3"
          stroke-linecap="round"
        />
        <rect x="-22" y="24" width="12" height="23" rx="3" fill="#395574" />
        <rect x="10" y="24" width="12" height="23" rx="3" fill="#395574" />
        <path d="M-19 46h7M12 46h7" stroke="#b8ffff" stroke-width="4" />
      </g>
    </svg>
    <div class="artwork-grid" />
  </div>
</template>
