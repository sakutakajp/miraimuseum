<script setup lang="ts">
useHead({
  title: "ねこの宇宙宅配便 — みらい博物館",
  meta: [
    {
      name: "description",
      content:
        "ひっぱって飛ばす、ねこの宇宙宅配便。星の引力で道を曲げて、6つの配達へ。",
    },
    { name: "theme-color", content: "#0c1427" },
  ],
});
</script>
<template>
  <ClientOnly
    ><LazyGamesSpaceDeliveryGame /><template #fallback
      ><div class="delivery-loading" role="status">
        宇宙の配達所を準備中…
      </div></template
    ></ClientOnly
  >
</template>
<style scoped>
.delivery-loading {
  height: 100dvh;
  display: grid;
  place-items: center;
  background: #0c1427;
  color: #e4f3ef;
  font-size: 14px;
}
</style>
