<script setup lang="ts">
defineEmits<{ close: [] }>();
const { t } = useLanguage();
const panel = ref<HTMLElement>();
let previousFocus: HTMLElement | null = null;
function trapFocus(event: KeyboardEvent) {
  if (event.key !== "Tab" || !panel.value) return;
  const buttons = panel.value.querySelectorAll<HTMLButtonElement>("button");
  const first = buttons[0],
    last = buttons[buttons.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
onMounted(() => {
  previousFocus = document.activeElement as HTMLElement;
  panel.value?.querySelector("button")?.focus();
});
onBeforeUnmount(() => previousFocus?.focus());
</script>
<template>
  <div class="asteroid-exhibit-backdrop" @click.self="$emit('close')">
    <section
      ref="panel"
      class="asteroid-exhibit"
      role="dialog"
      aria-modal="true"
      :aria-label="t('小惑星の展示')"
      tabindex="-1"
      @keydown.esc="$emit('close')"
      @keydown="trapFocus"
    >
      <button
        class="dive-exhibit-close"
        :aria-label="t('閉じる')"
        autofocus
        @click="$emit('close')"
      >
        ×
      </button>
      <div class="exhibit-orbit" aria-hidden="true"><span>◆</span><i /></div>
      <span class="eyebrow">DISCOVERY 001 · ASTEROID</span>
      <h2><RubyText text="小惑星" /></h2>
      <p class="exhibit-fact">
        <RubyText text="小惑星は、太陽のまわりを回る、小さな岩の天体。" />
      </p>
      <p>
        <RubyText
          text="多くの小惑星は、火星と木星の間に集まっています。この場所を小惑星帯といいます。"
        />
      </p>
      <p>
        <RubyText
          text="小惑星には、太陽系が生まれたころの物質が残っています。岩を調べると、宇宙の大昔を知る手がかりになります。"
        />
      </p>
      <small
        ><RubyText text="ゲームの結晶トンネルは、想像から生まれた世界です。"
      /></small>
      <button class="button primary" @click="$emit('close')">
        <RubyText text="展示をとじる" />
      </button>
    </section>
  </div>
</template>
