<script setup lang="ts">
import { exhibits } from '~/data/exhibits';
definePageMeta({ key: route => route.params.slug as string });
const route = useRoute();
const item = exhibits.find(entry => entry.slug === route.params.slug);
if (!item) throw createError({ statusCode: 404, statusMessage: 'この箱庭は見つかりません' });
useSeoMeta({ title: `${item.title}の箱庭 | MIRAI MUSEUM`, description: item.description });
const frame = ref<HTMLIFrameElement>();
const loading = ref(true);
const failed = ref(false);
let poll: ReturnType<typeof setInterval> | undefined;
let deadline: ReturnType<typeof setTimeout> | undefined;
const query = new URLSearchParams();
// 品質の比較・確認に使う値だけを作品へ渡す。
if (route.query.quality === 'low' || route.query.quality === 'high') query.set('quality', route.query.quality);
if (route.query.inspect === '1') query.set('inspect', '1');
const source = `/exhibits/${item.slug}/index.html${query.size ? `?${query}` : ''}`;
function stopPolling() { clearInterval(poll); clearTimeout(deadline); }
function checkReady() {
  const doc = frame.value?.contentDocument;
  if (doc?.querySelector('#scene[data-ready="true"]')) { loading.value = false; stopPolling(); }
  else if (doc?.querySelector('#scene-message:not([hidden])')) { loading.value = false; stopPolling(); }
}
onMounted(() => {
  poll = setInterval(checkReady, 500);
  deadline = setTimeout(() => { if (loading.value) failed.value = true; }, 120000);
});
onBeforeUnmount(() => {
  stopPolling();
  (frame.value?.contentWindow as (Window & { __disposeScene?: () => void }) | null)?.__disposeScene?.();
});
</script>

<template>
  <div class="museum viewing-room">
    <header class="masthead"><NuxtLink to="/" class="brand">MIRAI MUSEUM<span>みらい博物館</span></NuxtLink><NuxtLink to="/" class="back-link">← 展示室にもどる</NuxtLink></header>
    <main>
      <div class="viewer-heading"><div><p class="eyebrow">HAKONIWA {{ item!.number }} / 05</p><h1>{{ item!.title }}<span>の箱庭</span></h1></div><p>{{ item!.subtitle }}</p></div>
      <div class="scene-stage" :aria-busy="loading">
        <iframe ref="frame" :src="source" :title="`${item!.title}の箱庭。ドラッグや矢印キーで回転できます`" @load="checkReady" />
        <div v-if="loading" class="loading-note" role="status"><span class="loading-dot" />{{ failed ? '準備に時間がかかっています。' : '小さな世界を準備しています…' }}<a v-if="failed" :href="`/hakoniwa/${item!.slug}?quality=low`">軽量表示で開く</a></div>
      </div>
      <div class="viewer-caption"><p>{{ item!.description }}</p><details><summary>眺め方</summary><p>ドラッグで回転、ホイール・ピンチで拡大。右ドラッグ・2本指で移動。ダブルクリック・ダブルタップで元の向きに戻ります。キーボードでは画面を選んで矢印キー・＋・−・0で操作できます。</p></details></div>
      <nav class="world-nav" aria-label="箱庭を選ぶ"><NuxtLink v-for="entry in exhibits" :key="entry.slug" :to="`/hakoniwa/${entry.slug}`" :aria-current="entry.slug === item!.slug ? 'page' : undefined"><span>{{ entry.number }}</span>{{ entry.title }}<span v-if="entry.slug === item!.slug" class="current-dot" /></NuxtLink></nav>
    </main>
  </div>
</template>
