export default defineNuxtConfig({
  compatibilityDate: "2026-10-05",
  css: ["~/assets/css/museum.css"],
  devtools: { enabled: false },
  app: {
    head: {
      htmlAttrs: { lang: "ja" },
      title: "箱庭の展示室 | MIRAI MUSEUM",
    },
  },
});
