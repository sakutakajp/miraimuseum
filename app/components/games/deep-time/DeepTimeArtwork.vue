<script setup lang="ts">
const uid = useId().replace(/:/g, "");
</script>
<template>
  <svg
    viewBox="0 0 480 280"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
  >
    <defs>
      <linearGradient :id="uid + 'sky'" x2="0" y2="1">
        <stop stop-color="#747f70" />
        <stop offset="1" stop-color="#c5bda6" />
      </linearGradient>
    </defs>
    <rect width="480" height="280" :fill="`url(#${uid}sky)`" />
    <circle cx="390" cy="87" r="40" fill="#e9e4d8" opacity=".3" />
    <path d="M0 179Q80 98 170 142T290 139T480 106V280H0Z" fill="#8d957b" />
    <path d="M0 205Q89 130 181 178T323 160T480 158V280H0Z" fill="#53654b" />
    <image
      href="/deep-time/rex-near-1.svg"
      x="-155"
      y="84"
      width="390"
      height="198"
    />
    <image
      href="/deep-time/tri-far-0.svg"
      x="305"
      y="169"
      width="90"
      height="48"
      opacity=".7"
    />
    <path d="M0 234H480V280H0Z" fill="#10110f" />
    <path
      d="M0 235H480M0 249Q70 256 140 250T300 249T480 256M0 270Q80 258 170 271T340 267T480 273"
      stroke="#b7a68a"
      stroke-width="1"
      fill="none"
      opacity=".65"
    />
    <image
      href="/deep-time/brachiosaurus-3.svg"
      x="242"
      y="183"
      width="64.8"
      height="54"
    />
    <image href="/deep-time/rock.svg" x="361" y="207" width="41" height="31" />
  </svg>
</template>
