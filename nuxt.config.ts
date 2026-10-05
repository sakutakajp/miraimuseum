export default defineNuxtConfig({
  compatibilityDate: "2026-10-05",
  devtools: { enabled: false },
  // Prebundle the lazy game dependency so Vite does not reload the page when
  // the first expedition starts in a fresh development container.
  vite: { optimizeDeps: { include: ["phaser"] } },
  css: ["~/assets/css/main.css", "~/assets/css/v2.css"],
  app: {
    head: {
      htmlAttrs: { lang: "ja" },
      title: "みらい博物館 — 遊びのなかに、発見を。",
      meta: [
        {
          name: "description",
          content:
            "タップして、走って、発見しよう。恐竜の世界を冒険する、小さなWeb博物館。",
        },
        { name: "theme-color", content: "#f6f3e9" },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1, viewport-fit=cover",
        },
      ],
      link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    },
  },
});
