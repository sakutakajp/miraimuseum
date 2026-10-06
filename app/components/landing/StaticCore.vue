<script setup lang="ts">
const id = useId().replace(/:/g, "");
</script>
<template>
  <div class="landing-static-core">
    <svg viewBox="0 0 500 580" aria-hidden="true">
      <defs>
        <radialGradient :id="`${id}-stone`" cx="24%" cy="18%" r="90%">
          <stop stop-color="#666b6c" />
          <stop offset=".23" stop-color="#292e31" />
          <stop offset=".64" stop-color="#0f1216" />
          <stop offset="1" stop-color="#030405" />
        </radialGradient>
        <linearGradient :id="`${id}-rim`" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="#e1e1db" />
          <stop offset=".35" stop-color="#363d42" />
          <stop offset=".7" stop-color="#0d1013" />
          <stop offset="1" stop-color="#77786f" />
        </linearGradient>
        <filter
          :id="`${id}-relief`"
          x="-15%"
          y="-15%"
          width="130%"
          height="130%"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".038"
            numOctaves="3"
            seed="9"
            result="grain"
          />
          <feDiffuseLighting
            in="grain"
            surfaceScale="7"
            diffuseConstant=".55"
            lighting-color="#a0a5a8"
            result="light"
          >
            <feDistantLight azimuth="220" elevation="35" />
          </feDiffuseLighting>
          <feComposite
            in="light"
            in2="SourceGraphic"
            operator="in"
            result="relief"
          />
          <feBlend in="SourceGraphic" in2="relief" mode="multiply" />
        </filter>
      </defs>
      <path
        d="M263 43C356 47 426 118 443 234C464 357 398 482 287 521C179 560 71 456 54 336C35 220 61 99 158 61C191 42 224 37 263 43Z"
        :fill="`url(#${id}-stone)`"
        :stroke="`url(#${id}-rim)`"
        stroke-width="2"
        :filter="`url(#${id}-relief)`"
      />
    </svg>
  </div>
  <svg
    class="landing-static-constellation"
    viewBox="0 0 900 700"
    aria-hidden="true"
  >
    <g fill="none" stroke="currentColor" stroke-width=".6">
      <ellipse
        cx="520"
        cy="350"
        rx="250"
        ry="110"
        transform="rotate(-35 520 350)"
      />
      <ellipse
        cx="520"
        cy="350"
        rx="230"
        ry="130"
        transform="rotate(28 520 350)"
      />
      <circle cx="520" cy="350" r="155" stroke-dasharray="1 18" />
    </g>
    <g fill="currentColor">
      <circle cx="330" cy="450" r="2" />
      <circle cx="700" cy="234" r="2" />
      <circle cx="730" cy="430" r="1.5" />
      <circle cx="400" cy="215" r="1.5" />
      <circle cx="570" cy="370" r="2" />
    </g>
  </svg>
</template>
