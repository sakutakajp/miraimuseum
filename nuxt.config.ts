export default defineNuxtConfig({
  compatibilityDate: "2026-10-05",
  devtools: { enabled: false },
  vite: {
    build: { target: ["es2020", "safari15"] },
  },
  app: {
    head: {
      htmlAttrs: { lang: "ja" },
      title: "開発中",
      meta: [{ name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" }],
    },
  },
});
