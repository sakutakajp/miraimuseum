<script setup lang="ts">
defineProps<{ small?: boolean }>();
</script>
<template>
  <svg
    class="world-illustration"
    viewBox="0 0 480 400"
    role="img"
    aria-label="恐竜とシダが暮らす、ピクセルアートの小さな世界"
  >
    <defs>
      <linearGradient id="sky" x2="0" y2="1">
        <stop stop-color="#dce5ce" />
        <stop offset="1" stop-color="#eeeace" />
      </linearGradient>
    </defs>
    <rect width="480" height="400" fill="url(#sky)" />
    <circle cx="355" cy="83" r="36" fill="#f6d876" />
    <g fill="#f4f4e7" shape-rendering="crispEdges">
      <path d="M37 72h18V60h54v12h20v16H37zM237 38h15V27h40v11h18v14h-73z" />
    </g>
    <g fill="#afc2a0">
      <path
        d="m0 231 63-73 27 25 71-88 83 124 49-60 100 112 55-75 32 37v167H0z"
      />
    </g>
    <g fill="#86a686">
      <path d="m0 276 51-50 51 41 69-38 88 61 68-47 59 36 50-52 44 50v123H0z" />
    </g>
    <g fill="#567866" shape-rendering="crispEdges">
      <path
        d="M0 166h26v20h18v22h17v20H31v15H0zm444-24h36v104h-54v-18h-21v-26h16v-22h23z"
      />
      <path d="M16 205h8v123h-8zm437-7h9v135h-9z" />
    </g>
    <g fill="#c0cda3">
      <rect x="53" y="156" width="4" height="4" />
      <rect x="280" y="172" width="6" height="6" />
      <rect x="408" y="115" width="4" height="4" />
    </g>
    <PixelSprite
      name="tree"
      x="46"
      y="162"
      width="104"
      height="142"
      opacity=".85"
    />
    <PixelSprite name="rex" x="194" y="127" width="243" height="190" />
    <rect x="0" y="307" width="480" height="13" fill="#38594b" />
    <rect x="0" y="320" width="480" height="9" fill="#759068" />
    <rect x="0" y="329" width="480" height="71" fill="#b4906a" />
    <path d="M0 350h65v8h63v-8h79v11h128v-7h68v8h77v38H0z" fill="#9a7959" />
    <path d="M0 385h104v-9h59v12h145v-8h78v6h94v14H0z" fill="#7c624d" />
    <PixelSprite name="fern" x="9" y="266" width="59" height="59" />
    <PixelSprite name="fern" x="407" y="257" width="69" height="69" />
    <PixelSprite name="player" x="136" y="254" width="46" height="55" />
    <PixelSprite
      name="ammonite"
      x="60"
      y="346"
      width="33"
      height="30"
      opacity=".65"
    />
    <g fill="#dbc195">
      <rect x="168" y="343" width="12" height="5" />
      <rect x="291" y="368" width="7" height="7" />
      <rect x="395" y="342" width="11" height="5" />
    </g>
  </svg>
</template>
