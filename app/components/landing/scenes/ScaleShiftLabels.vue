<script setup lang="ts">
import type { CoreState } from "~/experiences/landing/types";
defineProps<{ state: CoreState }>();
const labels = ["SPACE", "LIFE", "MATTER", "MACHINE"] as const;
</script>
<template>
  <section
    class="landing-scale landing-layer"
    data-testid="landing-scale-shift"
    aria-labelledby="landing-scale-heading"
  >
    <h2 id="landing-scale-heading" class="landing-sr-only">
      見方を変える — 宇宙、生命、物質、機械
    </h2>
    <div class="landing-classification" aria-hidden="true">
      <span class="landing-classification-heading">WAYS OF SEEING</span>
      <div
        v-for="(label, index) in labels"
        :key="label"
        :data-active="state === label"
      >
        <span>0{{ index + 1 }}</span
        ><span>{{ label }}</span
        ><i />
      </div>
    </div>
    <p class="landing-scale-caption" aria-hidden="true">
      ONE OBJECT.<br />INFINITE PERSPECTIVES.
    </p>
  </section>
</template>
