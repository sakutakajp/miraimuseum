export default defineNuxtConfig({
  compatibilityDate: "2026-10-05",
  css: ["~/assets/css/museum.css"],
  devtools: { enabled: false },
  // package名からの自動生成に任せず、既存の配信先Worker名に合わせる。
  nitro: { cloudflare: { wrangler: { name: "miraimuseum" } } },
  app: {
    head: {
      htmlAttrs: { lang: "ja" },
      title: "箱庭の展示室 | MIRAI MUSEUM",
    },
  },
});
