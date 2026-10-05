<script setup lang="ts">
import { getDiscovery, type DiscoveryId } from "~/data/discoveries";
const props = defineProps<{ id: DiscoveryId; visits: number }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement>();
const item = computed(() => getDiscovery(props.id));
onMounted(() => dialog.value?.showModal());
function outside(event: MouseEvent) {
  if (event.target === dialog.value) dialog.value?.close();
}
const { t } = useLanguage();
</script>
<template>
  <dialog
    ref="dialog"
    class="discovery-dialog"
    aria-labelledby="exhibit-title"
    @close="emit('close')"
    @click="outside"
  >
    <button
      class="icon-button dialog-close"
      :aria-label="t('展示を閉じる')"
      @click="dialog?.close()"
    >
      <MuseumIcon name="close" />
    </button>
    <div class="dialog-art" :style="{ '--exhibit-color': item.color }">
      <span class="art-orbit" /><PixelSprite
        :name="item.sprite"
        :label="t(item.name)"
      />
    </div>
    <div class="dialog-content">
      <span class="eyebrow"><RubyText :text="item.category" /></span>
      <h2 id="exhibit-title"><RubyText :text="item.name" /></h2>
      <p><RubyText :text="item.detail" /></p>
      <div class="fact-stack">
        <small><RubyText :text="'発見を重ねると、もっとわかる。'" /></small>
        <p
          v-for="(fact, i) in item.facts.slice(0, Math.min(visits, 3))"
          :key="fact"
        >
          <span>0{{ i + 1 }}</span
          ><RubyText :text="fact" />
        </p>
        <p v-if="visits < 3" class="unread-fact"><RubyText :text="'？　次の冒険で、新しいひとことに出会おう。'" /></p>
      </div>
      <small class="exhibit-visits"><RubyText :text="`${visits} 回見つけた発見`" /></small>
    </div>
  </dialog>
</template>
