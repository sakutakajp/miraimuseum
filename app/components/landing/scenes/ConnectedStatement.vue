<script setup lang="ts">
defineProps<{ active: boolean }>();
</script>
<template>
  <section
    class="landing-connected landing-layer"
    data-testid="landing-connected"
    aria-labelledby="landing-connected-heading"
  >
    <div class="landing-connected-copy">
      <p class="landing-connected-overline">EVERYTHING IS CONNECTED.</p>
      <h2
        id="landing-connected-heading"
        lang="ja"
        aria-label="すべての学問は、つながっている。"
      >
        <span class="landing-connected-line"><span>すべての学問は、</span></span
        ><span class="landing-connected-line"
          ><span>つながっている。</span></span
        >
      </h2>
      <p class="landing-connected-support" lang="ja">
        宇宙も、生命も、数も、機械も。<br />見方を変えれば、同じ世界の一部になる。
      </p>
    </div>
    <NuxtLink
      to="/dinosaur"
      no-prefetch
      class="landing-end-link"
      :tabindex="active ? 0 : -1"
      ><span>恐竜ゲームへ</span><span aria-hidden="true">↗</span></NuxtLink
    >
    <p class="landing-connected-note" aria-hidden="true">
      NO BOUNDARIES.<br />ONLY CONNECTIONS.
    </p>
  </section>
</template>
